const AWS = require('aws-sdk');

const loadCfOutput = async (stackName, region, profile, sls) => {
    let cfOutputs = {};
    let credentials;
    if (sls.service.provider.profile) {
      credentials = new AWS.SharedIniFileCredentials({profile: sls.service.provider.profile});
    } else {
      credentials = new AWS.RemoteCredentials({
        httpOptions: { timeout: 5000 }, // 5 second timeout
        maxRetries: 10, // retry 10 times
        retryDelayOptions: { base: 200 }
      })
    }
    AWS.config.credentials = credentials;
    const cf = new AWS.CloudFormation({ region });
    const response = await cf.describeStacks({ StackName: stackName }).promise()
    const outputs = response.Stacks[0].Outputs;
    outputs.forEach(o => {
        cfOutputs[o.OutputKey] = o.OutputValue;
    });
    return cfOutputs;
};

const updateConfiguration = async (func, environment, sls) => {
  AWS.config.region = sls.service.provider.region;
  let credentials;
  if (sls.service.provider.profile) {
    credentials = new AWS.SharedIniFileCredentials({profile: sls.service.provider.profile});
  } else {
    credentials = new AWS.RemoteCredentials({
      httpOptions: { timeout: 5000 }, // 5 second timeout
      maxRetries: 10, // retry 10 times
      retryDelayOptions: { base: 200 }
    })
  }
  AWS.config.credentials = credentials;
  const lambda = new AWS.Lambda();
  const params = {
    FunctionName: func.name,
    Environment: {
      Variables: {
        environment
      }
    }
  };
  await lambda.updateFunctionConfiguration(params).promise();
};

const lambdaEnv = async (sls, outputs) => {
  const functions = sls.service.functions;
  const funcKeys = Object.keys(functions);
  await Promise.all(
    funcKeys.map(async funcKey => {
      let func = functions[funcKey];
      const { UsagePlanId, AdminUsagePlanId} = outputs;
      let environment = provider.environment;
      environment.UsagePlanId = UsagePlanId;
      environment.AdminUsagePlanId = AdminUsagePlanId;
      await updateConfiguration(func, environment, sls);
    })
  );
}

const checkUserAttributes = async (sls, userPoolId) => {
  let credentials;
  if (sls.service.provider.profile) {
    credentials = new AWS.SharedIniFileCredentials({profile: sls.service.provider.profile});
  } else {
    credentials = new AWS.RemoteCredentials({
      httpOptions: { timeout: 5000 }, // 5 second timeout
      maxRetries: 10, // retry 10 times
      retryDelayOptions: { base: 200 }
    })
  }
  AWS.config.credentials = credentials;
  const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
  const params = {
    UserPoolId: userPoolId,
    Username: sls.service.provider.config.adminUser
  }
  const user = await cognitoidentityserviceprovider.adminGetUser(params).promise();
  for (let att in user.UserAttributes) {
    if (user.UserAttributes[att].Name === 'custom:APIKey') {
      sls.cli.log('Api Key found');
      return true
    }
  }
  return false;
}


module.exports = async (sls) => {
  let credentials;
  if (sls.service.provider.profile) {
    credentials = new AWS.SharedIniFileCredentials({profile: sls.service.provider.profile});
  } else {
    credentials = new AWS.RemoteCredentials({
      httpOptions: { timeout: 5000 }, // 5 second timeout
      maxRetries: 10, // retry 10 times
      retryDelayOptions: { base: 200 }
    })
  }
  AWS.config.credentials = credentials;
  AWS.config.update({
    region: sls.service.provider.region
  });
  const apigateway = new AWS.APIGateway();
  sls.cli.log('Pulling CF Outputs');
  const { stackName, region, profile } = sls.service.provider;
  const stackOutputs = await loadCfOutput(stackName, region, profile, sls);
  const userName = sls.service.provider.config.adminUser;
  sls.cli.log('Checking for API key in Admin user attributes');
  const keyExists = await checkUserAttributes(sls, stackOutputs.UserPoolId);
  if (keyExists) {
    sls.cli.log('Exiting create API action');
    return stackOutputs;
  }
  const apiKeyParams = {
    customerId: userName,
    description: `Noiiice Admin user ${userName} API key`,
    enabled: true,
    generateDistinctId: true,
    name: `${userName}-NoiiiceKey`,
  };
  sls.cli.log('Creating Admin API Key');
  const apiKey = await apigateway.createApiKey(apiKeyParams).promise();
  console.log('Api Key:', JSON.stringify(apiKey, null, 2));
  const planKeyParams = {
    keyId: apiKey.id,
    keyType: 'API_KEY',
    usagePlanId: stackOutputs.AdminUsagePlanId
  };

  const planKey = await apigateway.createUsagePlanKey(planKeyParams).promise();
  sls.cli.log('Plan Key:', JSON.stringify(planKey, null, 2));

  const userAttributeParams = {
    UserAttributes: [ /* required */
      {
        Name: 'custom:APIKey',
        Value: apiKey.value
      }
    ],
    UserPoolId: stackOutputs.UserPoolId,
    Username: userName
  };
  const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
  const userUpdate = await cognitoidentityserviceprovider.adminUpdateUserAttributes(userAttributeParams).promise();
  console.log('User Attribute Update', JSON.stringify(userUpdate, null, 2));

  return stackOutputs;
}

const loadCfOutput = async (stackName, region, profile, sls, provider) => {
    let cfOutputs = {};
    const response = await provider.request('CloudFormation', 'describeStacks', { StackName: stackName });
    const outputs = response.Stacks[0].Outputs;
    outputs.forEach(o => {
        cfOutputs[o.OutputKey] = o.OutputValue;
    });
    return cfOutputs;
};

const updateConfiguration = async (func, environment, sls, provider) => {
  const params = {
    FunctionName: func.name,
    Environment: {
      Variables: {
        environment
      }
    }
  };
  await provider.request('lambda', 'updateFunctionConfiguration', params);
};

const lambdaEnv = async (sls, outputs, provider) => {
  const functions = sls.service.functions;
  const funcKeys = Object.keys(functions);
  await Promise.all(
    funcKeys.map(async funcKey => {
      let func = functions[funcKey];
      const { UsagePlanId, AdminUsagePlanId} = outputs;
      let environment = provider.environment;
      environment.UsagePlanId = UsagePlanId;
      environment.AdminUsagePlanId = AdminUsagePlanId;
      await updateConfiguration(func, environment, sls, provider);
    })
  );
}

const checkUserAttributes = async (sls, userPoolId, provider) => {
  const params = {
    UserPoolId: userPoolId,
    Username: sls.service.provider.config.adminUser
  }
  const user = await provider.request('CognitoIdentityServiceProvider', 'adminGetUser', params);
  for (let att in user.UserAttributes) {
    if (user.UserAttributes[att].Name === 'custom:APIKey') {
      sls.cli.log('Api Key found');
      return true
    }
  }
  return false;
}


module.exports = async (sls, provider) => {
  sls.cli.log('Pulling CF Outputs');
  const { stackName, region, profile } = sls.service.provider;
  const stackOutputs = await loadCfOutput(stackName, region, profile, sls, provider);
  const userName = sls.service.provider.config.adminUser;
  sls.cli.log('Checking for API key in Admin user attributes');
  const keyExists = await checkUserAttributes(sls, stackOutputs.UserPoolId, provider);
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
  const apiKey = await provider.request('APIGateway', 'createApiKey', apiKeyParams);
  console.log('Api Key:', JSON.stringify(apiKey, null, 2));
  const planKeyParams = {
    keyId: apiKey.id,
    keyType: 'API_KEY',
    usagePlanId: stackOutputs.AdminUsagePlanId
  };

  const planKey = await provider.request('APIGateway', 'createUsagePlanKey', planKeyParams);
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
  const userUpdate = await provider.request('CognitoIdentityServiceProvider', 'adminUpdateUserAttributes', userAttributeParams);
  console.log('User Attribute Update', JSON.stringify(userUpdate, null, 2));

  return stackOutputs;
}

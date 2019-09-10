const fs = require("fs");
const AWS = require("aws-sdk");
let s3 = new AWS.S3();
const findAndReplaceDependencies = async (functions, sls, planId) => {
  sls.cli.log('Find and replace variables');
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
  const funcKeys = Object.keys(functions);
  await Promise.all(
    funcKeys.map(async funcKey => {
      let func = functions[funcKey];
      let environment = await getLambdaVariables(func.name, sls);
      environment['apiPlanId'] = planId;
      await updateConfiguration(func, environment, sls);
    })
  );
  sls.cli.log('Lambda variables updated');
};

const getLambdaVariables = async (functionName, sls) => {
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
  FunctionName: functionName
 };
 const data = await lambda.getFunctionConfiguration(params).promise();
 return data.Environment.Variables;
}

const updateConfiguration = async (func, environment, sls) => {
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
      Variables: environment
    }
  };
  const lambdaupdate = await lambda.updateFunctionConfiguration(params).promise();
  return lambdaupdate;
};

module.exports = {
  findAndReplaceDependencies
};

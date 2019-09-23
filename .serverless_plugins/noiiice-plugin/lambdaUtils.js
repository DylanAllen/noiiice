const fs = require("fs");

const findAndReplaceDependencies = async (functions, sls, planId, provider) => {
  sls.cli.log('Find and replace variables');
  const funcKeys = Object.keys(functions);
  await Promise.all(
    funcKeys.map(async funcKey => {
      let func = functions[funcKey];
      let environment = await getLambdaVariables(func.name, sls, provider);
      environment['apiPlanId'] = planId;
      await updateConfiguration(func, environment, sls, provider);
    })
  );
  sls.cli.log('Lambda variables updated');
};

const getLambdaVariables = async (functionName, sls, provider) => {
  const params = {
  FunctionName: functionName
 };
 const data = await provider.request('Lambda', 'getFunctionConfiguration', params);
 return data.Environment.Variables;
}

const updateConfiguration = async (func, environment, sls, provider) => {
  const params = {
    FunctionName: func.name,
    Environment: {
      Variables: environment
    }
  };
  const lambdaupdate = await provider.request('Lambda', 'updateFunctionConfiguration', params);
  return lambdaupdate;
};

module.exports = {
  findAndReplaceDependencies
};

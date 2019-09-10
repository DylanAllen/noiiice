const AWS = require('aws-sdk');
const apigateway = new AWS.APIGateway();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));

  const apiKeyParams = {
    customerId: event.userName,
    description: `Noiiice user ${event.userName} API key`,
    enabled: true,
    generateDistinctId: true,
    name: `${event.userName}-NoiiiceKey`
  };

  const apiKey = await apigateway.createApiKey(apiKeyParams).promise();
  console.log('Api Key:', JSON.stringify(apiKey, null, 2));
  const planKeyParams = {
    keyId: apiKey.id,
    keyType: 'API_KEY',
    usagePlanId: process.env.apiPlanId
  };

  const planKey = await apigateway.createUsagePlanKey(planKeyParams).promise();
  console.log('Plan Key:', JSON.stringify(planKey, null, 2));

  const userAttributeParams = {
    UserAttributes: [ /* required */
      {
        Name: 'custom:APIKey',
        Value: apiKey.value
      }
    ],
    UserPoolId: process.env.userPoolId,
    Username: event.userName
  };
  const userUpdate = await cognitoidentityserviceprovider.adminUpdateUserAttributes(userAttributeParams).promise();
  console.log('User Atribute Update', JSON.stringify(userUpdate, null, 2));

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*"
    },
    body: JSON.stringify(userUpdate)
  };

  return response;
};

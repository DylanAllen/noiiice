const AWS = require('aws-sdk');

exports.handler = async (event, context, callback) => {
  const { identityPoolId, userPoolId, appClientId } = process.env;
  const identityProviderName = `cognito-idp.${process.env.region}.amazonaws.com/${userPoolId}:${appClientId}`;
  const cognitoidentity = new AWS.CognitoIdentity();

  var params = {
    IdentityPoolId: identityPoolId,
    Roles: {
      authenticated: process.env.authorizedRole,
    },
    RoleMappings: {
      [identityProviderName]: {
        Type: "Token",
        AmbiguousRoleResolution: "AuthenticatedRole"
      }
    }
  };

  const update = await cognitoidentity.setIdentityPoolRoles(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
      return data;
    }
  }).promise();

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(update)
  };

  return response;
};

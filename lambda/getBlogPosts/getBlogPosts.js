const AWS = require('aws-sdk');

 exports.handler = async (event, context, callback) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  const params = {
      TableName: process.env.blogPostDB,
  };

  const resp = await dynamodb.scan(params).promise();

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*"
    },
    body: JSON.stringify(resp.Items)
  };
  return response;
};

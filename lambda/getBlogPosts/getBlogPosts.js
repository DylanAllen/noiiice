const AWS = require('aws-sdk');

 exports.handler = async (event, context, callback) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  const params = {
      TableName: process.env.blogPostDB,
  };

  const resp = await dynamodb.scan(params, function(err, data) {
     if (err) {
       console.log(err, err.stack);
       return err;
     } else {
       return data.Items;
     }
  }).promise();

  console.log(resp);
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*"
    },
    body: JSON.stringify(resp)
  };
  return response;
}

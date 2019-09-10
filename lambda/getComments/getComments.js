const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const scanComments = async (group) => {

  const params = {
    TableName: process.env.blogCommentsDB
  };

  const resp = await dynamodb.scan(params, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      return err;
    } else {
      const result = (group === 'admin') ? data.Items : data.Items.filter(Item => Item.status === 'approved');
      return result
    }
  }).promise();
  return resp;
};

const queryComments = async (uid) => {
  const params = {
    ExpressionAttributeValues: {
      ":v1": uid
    },
    KeyConditionExpression: "postuid = :v1",
    TableName: process.env.blogCommentsDB
  };

  const resp = await dynamodb.query(params).promise();
  const comments = resp.Items.filter(Item => {
   const approved = (Item.status === 'approved');
   return approved;
  });
  resp.Items = comments;
  return resp;
};

exports.handler = async (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  let comments;
  let response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*"
    },
    body: ''
  };
  switch (event.resource) {
    case '/api/comment/get/{uid}':
      const uid = event.pathParameters.uid;
      comments = await queryComments(uid);
      break;
    case '/api/comment/getall':
      const group = event.requestContext.authorizer.claims["cognito:groups"];
      response.headers['Access-Control-Allow-Credentials'] = true;
      comments = await scanComments(group);
      break;
  }

  response.body = JSON.stringify(comments);
  return response;
};

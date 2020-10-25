const AWS = require('aws-sdk');
const ses = new AWS.SES();

const verifyCommentAction = (event) => {
  let body = new Buffer(event.body, 'base64').toString('ascii');
  const group = event.requestContext.authorizer.claims["cognito:groups"];
  const restricted = process.env.restrictedStrings.split(',');
  const { comment } = JSON.parse(body);
  if (comment.length > 505) {
    return {
      err: "Comment length exceeded limit"
    };
  }

  const lowerComment = comment.toLowerCase();

  for (let i in restricted) {
    if (lowerComment.includes(restricted[i])) {
      console.log(`You can't say ${restricted[i]} on this blog`);
      return  {
        err: `You can't say "${restricted[i]}" on this blog.`
      };
    }
  }

  let response = {
    body: JSON.parse(body),
    admin: false,
    err: null
  };

  if (group === 'admin') {
    response.admin = true;
  }

  return response;
};

const generateID = () => {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  console.log('uuid');
  return uuid;
};

const sendEmail = async (data) => {
  const sesParams = {
    Destination: {
      ToAddresses: [process.env.ADMINEMAIL]
    },
    Message: {
      Subject: {
        Data: `${process.env.DOMAIN} | New Comment from ${data.user} | Noiiice`
      },
      Body: {
        Html: {
          Data: `New comment on ${process.env.DOMAIN}.

          From: ${data.user}
          Comment: ${data.comment}`
        }
      }
    },
    Source: `noreply@${process.env.DOMAIN.substring(process.env.DOMAIN.indexOf('.')+1)}`
  };

  let response;
  try {
      response = await ses.sendEmail(sesParams).promise();
  } catch(err) {
    console.log('SES Error');
    console.log(JSON.stringify(err, null, 2));
    return null;
  }
  return response;
};

const postComment = async (event) => {

  const { body, admin, err } = verifyCommentAction(event);

  if (err) {
    return  {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({err: err})
    };
  }

  var dynamodb = new AWS.DynamoDB.DocumentClient();
  const { title, slug, comment, created, user, uid } = body;
  let { status } = body;

  if (!admin) {
    status = 'pending';
  } else {
    status = 'approved';
  }

  const params = {
    TableName: process.env.blogCommentsDB,
    Item: {
      'slug': slug,
      'postuid': uid,
      'uid': generateID(),
      'comment': comment,
      'created': created,
      'user': user,
      'title': title,
      'status': status
    }
  };

  let post;
  try {
    post = await dynamodb.put(params).promise();
  } catch(err) {
    console.log("Error", err);
    return err;
  }

  console.log("Success", post);
  await sendEmail({ user, comment });

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    },
    body: JSON.stringify(post)
  };

  return response;
};

const updateComment = async (event) => {

  const { body, admin, err } = verifyCommentAction(event);
  var dynamodb = new AWS.DynamoDB.DocumentClient();
  const { uid, postuid } = body;
  let { status } = body;

  if (!admin) {
    status = 'pending';
  }

  var params = {
    Key: {
      postuid: postuid,
      uid: uid
    },
    AttributeUpdates: {
      status: {
        Action: 'PUT',
        Value: status
      }
    },
    TableName: process.env.blogCommentsDB
  };
  const post = await dynamodb.update(params, (err, data) => {
    if (err) {
      console.log("Error", err);
      return err;
    } else {
      console.log("Success", data);
      return data;
    }
  }).promise();

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    },
    body: JSON.stringify(post)
  };

  return response;
};

const deleteComment = async (event) => {
  var dynamodb = new AWS.DynamoDB.DocumentClient();
  const { uid, postuid } = event.pathParameters;

  const params = {
    TableName: process.env.blogCommentsDB,
    Key: {
      postuid: postuid,
      uid: uid
    }
  };

  const del = await dynamodb.delete(params, (err, data) => {
    if (err) {
      console.log("Error", err);
      return err;
    } else {
      console.log("Success", data);
      return data;
    }
  }).promise();

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    },
    body: JSON.stringify(del)
  };

  return response;
};

exports.handler = async (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  switch (event.resource) {
    case '/api/comment/post':
      return postComment(event);
    case '/api/comment/delete/{postuid}/{uid}':
      return deleteComment(event);
    case '/api/comment/update':
      return updateComment(event);
    default:
      return  {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify({err: "valid path not found"})
      };
  }
};

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const postBlog = async (event) => {
  let body = new Buffer(event.body, 'base64').toString('ascii');
  const group = event.requestContext.authorizer.claims["cognito:groups"];
  if (group !== 'admin') {
    return { err: `Must be an admin to post blogs.` };
  }
  const { title, content, author, status, created, excerpt, slug, modified, featuredImage, uid } = JSON.parse(body);

  function generateID() {
    let d = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  }

  const queryParams = {
    TableName: process.env.blogPostDB,
    IndexName: 'slug',
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: {
      ':slug': slug
    }
  };

  const queryCheck = await dynamodb.query(queryParams, (err, data) => {
    if (err) {
      console.log('Query errors:', err);
      return false;
    } else {
      console.log('Query:', data);
      console.log('Count:', data.Count);
      return data;
    }
  }).promise();

  if (!queryCheck) {
    console.log('Query error');
    return { err: 'Query error' };
  }

  if (queryCheck.Count && uid !== queryCheck.Items[0].uid) {
    console.log('Duplicate slug');
    return { err: `Slug "${slug}" already exists!` };
  }

  const postParams = {
    TableName: process.env.blogPostDB,
    Item: {
      'category' : 'blog',
      'uid': uid || generateID(),
      'slug' : slug,
      'title' : title,
      'content' : content,
      'status' : status,
      'author' : author,
      'created' : created,
      'modified' : modified,
      'excerpt' : excerpt,
      'featuredImage' : featuredImage
    }
  };

  const post = await dynamodb.put(postParams, (err, data) => {
    if (err) {
      console.log("Error", err);
      return err;
    } else {
      console.log("Put Success", data);
      return data;
    }
  }).promise();

  return post;
};

const queryComments = async (uid) => {
  const params = {
    ExpressionAttributeValues: {
      ":v1": uid
    },
    KeyConditionExpression: "postuid = :v1",
    TableName: process.env.blogCommentsDB
  };

  const resp = await dynamodb.query(params, (err, data) => {
     if (err) {
       console.log(err, err.stack);
       return err;
     } else {
       return data.Items;
     }
  }).promise();

  console.log(resp);
  return resp;
};


const deleteComment = async (postuid, uid) => {
  console.log('Deleting comment: ' + uid);
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

  return del;
};

const deleteBlog = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  const { uid } = event.pathParameters;

  const params = {
    TableName: process.env.blogPostDB,
    Key: {
      uid: uid
    }
  };

  const deletePost = await dynamodb.delete(params).promise();
  console.log("Delete Post Response: ", deletePost);
  const comments = await queryComments(uid);
  console.log('Retrieved Comments:');
  console.log(JSON.stringify(comments, null, 2));
  const deleteAllComments = await Promise.all(comments.map(comment => {
    deleteComment(uid, comment.uid);
  }));
  return deleteAllComments;
};

const apiResponse = (data) => {
  return  {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Credentials" : true
    },
    body: JSON.stringify(data)
  };
};

exports.handler = async (event, context, callback) => {
  console.log(JSON.stringify(event, null, 2));
  switch (event.resource) {
    case '/api/blog/post':
      return apiResponse(await postBlog(event));
    case '/api/blog/delete/{uid}':
      return apiResponse(await deleteBlog(event));
    default:
      return apiResponse({err: "valid path not found"});
  }
};

const AWS = require('aws-sdk');

exports.handler = async (event, context, callback) => {
  const body = JSON.parse(event.body, null, 2);
  var s3 = new AWS.S3();
  var bucketName = process.env.mediaBucket;
  if (!body.hasOwnProperty('contentType')) {
    console.log('Content type error');
    context.fail({ err: 'Missing contentType' })
  }

  if (!body.hasOwnProperty('filePath')) {
    console.log('filepath error');
    context.fail({ err: 'Missing filePath' })
  }

  var params = {
    Bucket: bucketName,
    Key: body.filePath,
    Expires: 3600,
    ContentType: body.contentType
  }

  const sig = new Promise((resolve, reject) => {
    s3.getSignedUrl('putObject', params, (err, url) => {
      if (err) {
        console.log(err);
        context.fail({ err })
        resolve(err);
      } else {
        resolve({ url });
      }
    })
  });

  const sigresp = await sig;
  console.log(APIResp(sigresp));

  return APIResp(sigresp);
}

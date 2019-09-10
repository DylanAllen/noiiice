const AWS = require('aws-sdk');
const packageLambdaFunctions = require('./package');
const createAdminAPIKey = require("./createAdminAPIKey");
const { findAndReplaceDependencies } = require("./lambdaUtils");

const createCertificate = async (sls) => {
  const profile = sls.service.provider.profile;
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
  const acm = new AWS.ACM({ region: sls.service.provider.region});
  const domain = sls.service.provider.config.domain;
  const rootDomain = domain.substring(domain.indexOf('.')+1)

  // request cert
  const params = {
    DomainName: domain,
    ValidationMethod: "DNS"
  };
  sls.cli.log(JSON.stringify(params));
  const cert = await acm.requestCertificate(params).promise();
  sls.cli.log(JSON.stringify(cert));

  const addTagsToCertificate = (sls, domain, arn) => {
    const params = {
      CertificateArn: arn,
      Tags: [
        {
          Key: 'Name',
          Value: domain
        }
      ]
    };
    return acm.addTagsToCertificate(params).promise()
  };

  const describeCertificate = async (arnObj) => {

    const params = arnObj
    sls.cli.log('About to describe', JSON.stringify(params));
    const cert = await acm.describeCertificate(params).promise();
    sls.cli.log(JSON.stringify(cert, null, 2));
    return cert
  }

  const verifyCertificate = async (sls, arnObj) => {
    let descParams = arnObj
    let validationData = null;
    let validationCount = 0;

    const describePromise = await new Promise((resolve, reject) => {
      sls.cli.log('Describe Promise');
      const checkLoop = setInterval(async () => {
        const certDescription = await describeCertificate(descParams);
        sls.cli.log(`Describe ${validationCount}`);
        sls.cli.log(JSON.stringify(certDescription.Certificate, null, 2));
        if (certDescription.Certificate.DomainValidationOptions[0].ResourceRecord) {
          validationData = certDescription.Certificate.DomainValidationOptions[0].ResourceRecord;
          stopLoop();
          resolve(validationData);
        }
        if (validationCount >= 4) {
          stopLoop();
          reject('Exceeded 4 tries');
        }
        validationCount++;
      }, 8000)

      const stopLoop = () => {
        clearInterval(checkLoop);
      }
    })
    sls.cli.log('Validation data:');
    sls.cli.log(JSON.stringify(validationData, null, 2));
    sls.cli.log('describePromise data:');
    sls.cli.log(JSON.stringify(describePromise, null, 2));

    if (validationCount >= 5 && !validationData) {
      sls.cli.log('Exceeded 5 tries to get validation options from certificate');
      return null
    }

    const route53 = new AWS.Route53();
    const hostedZones = await route53.listHostedZones().promise();

    let hostedZoneId = null;
    const zones = hostedZones.HostedZones;
    sls.cli.log('Hosted Zones:');
    sls.cli.log(JSON.stringify(zones, null, 2));
    for (zone in zones) {
      if (zones[zone].Name === `${rootDomain}.`) {
        hostedZoneId = zones[zone].Id;
      }
    }

    const params53 = {
      ChangeBatch: {
        Changes: [
          {
            Action: "CREATE",
            ResourceRecordSet: {
              Name: describePromise.Name,
              ResourceRecords: [
                 {
                Value: describePromise.Value
               }
              ],
              TTL: 60,
              Type: describePromise.Type
            }
          }
        ],
        Comment: `Verification for certificate on ${domain}`
      },
      HostedZoneId: hostedZoneId
    };

    if (!hostedZoneId) {
      sls.cli.error(`Hosted zone for ${domain} not found`)
    }
    const certVerify = route53.changeResourceRecordSets(params53).promise();
    sls.cli.log(JSON.stringify(certVerify, null, 2));

    return certVerify;
  }

  const addTags = await addTagsToCertificate(sls, domain, cert.CertificateArn)
  sls.cli.log(JSON.stringify(addTags));

  const verify = await verifyCertificate(sls, cert)
  sls.cli.log(JSON.stringify(verify));


  return verify
}

const deleteMediaBucketContents = async (sls) => {
  const profile = sls.service.provider.profile;
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
  const bucketName = sls.service.provider.config.mediaBucket;
  const s3 = new AWS.S3();
  const params = {
    Bucket: bucketName,
    MaxKeys: 1000
  };
  const objects = await s3.listObjects(params).promise();
  if (objects.Contents) {
    const contents = objects.Contents;
    let keylist = {
      Objects: [],
      Quiet: false
    }
    for (i in contents) {
      keylist.Objects.push({ "Key": contents[i].Key })
    }
    const delParams = {
      Bucket: bucketName,
      Delete: keylist
    }
    const deleteAction = await s3.deleteObjects(delParams).promise();
    console.log(deleteAction);
    return deleteAction;
  }

}

const postDeployActions = async (sls) => {
  const createAdminKey = await createAdminAPIKey(sls);
  return await findAndReplaceDependencies(sls.service.functions, sls, createAdminKey.UsagePlanId);
}

class VerifyACMCertificate {
  constructor(serverless) {
    this.serverless = serverless;
    this.commands = {
      createCert: {
        usage: 'Verify ACM Certificate',
        lifecycleEvents: [
          'create_cert'
        ],
        options: {
          message: {}
        },
      },
      noiiceCreateAdminApiKey: {
        usage: 'Create Admin API Key',
        lifecycleEvents: [
          'createAdminKey'
        ],
        options: {
          message: {}
        },
      },
      postDeployActions: {
        usage: 'Create Admin API Key',
        lifecycleEvents: [
          'createAdminKey'
        ],
        options: {
          message: {}
        },
      }
    };
    this.hooks = {
      'before:package:initialize': packageLambdaFunctions.bind(this, serverless),
      'after:deploy:deploy': postDeployActions.bind(this, serverless),
      'before:remove:remove': deleteMediaBucketContents.bind(this, serverless),
      'create_cert:create_cert': createCertificate.bind(this, serverless),
      'postDeployActions:createAdminKey': postDeployActions.bind(this, serverless),
      'noiiceCreateAdminApiKey:createAdminKey': createAdminAPIKey.bind(this, serverless)
    };
  }
}

module.exports = VerifyACMCertificate;

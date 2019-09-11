const AWS = require('aws-sdk');
const packageLambdaFunctions = require('./package');
const createAdminAPIKey = require("./createAdminAPIKey");
const { findAndReplaceDependencies } = require("./lambdaUtils");

const createCertificate = async (sls) => {
  sls.cli.log('Creating certificate')
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
  const acm = new AWS.ACM({ region: sls.service.provider.region});
  const domain = sls.service.provider.config.domain;
  const rootDomain = domain.substring(domain.indexOf('.')+1)
  sls.cli.log(`Domain: ${domain}`);

  // request cert
  const params = {
    DomainName: domain,
    ValidationMethod: "DNS"
  };
  const cert = await acm.requestCertificate(params).promise();

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
    const cert = await acm.describeCertificate(params).promise();
    return cert
  }

  const verifyCertificate = async (sls, arnObj) => {
    let descParams = arnObj
    let validationData = null;
    let validationCount = 0;
    let dnsRecord = {};

    const describePromise = await new Promise((resolve, reject) => {
      const checkLoop = setInterval(async () => {
        const certDescription = await describeCertificate(descParams);
        if (certDescription.Certificate.DomainValidationOptions[0].ResourceRecord) {
          dnsRecord = certDescription.Certificate.DomainValidationOptions[0].ResourceRecord;
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

    if (validationCount >= 5 && !validationData) {
      sls.cli.log('Exceeded 5 tries to get validation options from certificate');
      return null
    }

    const route53 = new AWS.Route53();
    const hostedZones = await route53.listHostedZones().promise();

    let hostedZoneId = null;
    const zones = hostedZones.HostedZones;
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
      sls.cli.log(`Hosted zone for ${domain} not found`);
      sls.cli.log(`Add the following record to the DNS for domain ${domain}`);
      sls.cli.log(JSON.stringify(dnsRecord, null, 2));
      return 'You can find this info in AWS Certificate Manager';
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
          'createCert'
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
      'createCert:createCert': createCertificate.bind(this, serverless),
      'postDeployActions:createAdminKey': postDeployActions.bind(this, serverless),
      'noiiceCreateAdminApiKey:createAdminKey': createAdminAPIKey.bind(this, serverless)
    };
  }
}

module.exports = VerifyACMCertificate;

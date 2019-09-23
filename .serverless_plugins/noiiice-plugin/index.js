const packageLambdaFunctions = require('./package');
const createAdminAPIKey = require("./createAdminAPIKey");
const { findAndReplaceDependencies } = require("./lambdaUtils");
const { addRoute53Record } = require("./route53Util");
const fs = require('fs');
const secrets = require('../../secrets.json');

const createCertificate = async ({ sls, provider }) => {
  sls.cli.log('Creating certificate')
  const stage = sls.service.provider.stage;
  const domain = sls.service.provider.config.domain;
  const rootDomain = domain.substring(domain.indexOf('.')+1)
  sls.cli.log(`Domain: ${domain}`);

  // request cert
  const params = {
    DomainName: domain,
    ValidationMethod: "DNS"
  };
  const cert = await provider.request('ACM', 'requestCertificate', params);

  if (cert.CertificateArn) {
    console.log('Certificate created.');
    secrets[stage].certificateArn = cert.CertificateArn
  }

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
    return provider.request('ACM', 'addTagsToCertificate', params);
  };

  const describeCertificate = async (arnObj) => {

    const params = arnObj;
    const cert = await provider.request('ACM', 'describeCertificate', params);
    return cert;
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

    const route53Record = await addRoute53Record(
      sls,
      provider,
      domain,
      describePromise.Name,
      describePromise.Value,
      describePromise.Type
    );

    if (!route53Record) {
      sls.cli.log(`Hosted zone for ${domain} not found`);
      sls.cli.log(`Add the following record to the DNS for domain ${domain}`);
      sls.cli.log(JSON.stringify(dnsRecord, null, 2));
      secrets[stage].certVerificationData = dnsRecord;
      const newSecrets = JSON.stringify(secrets, null, 2);
      fs.writeFileSync(__dirname + '/../../secrets.json', newSecrets)
      sls.cli.log('Secrets data written to secrets.json');
      return 'You can find this info in AWS Certificate Manager';
    }
    console.log(secrets);
    const newSecrets = JSON.stringify(secrets, null, 2);
    fs.writeFileSync(__dirname + '/../../secrets.json', newSecrets);
    sls.cli.log('Secrets data written to secrets.json');
    const certVerify = provider.request('route53', 'changeResourceRecordSets', params53);
    return certVerify;
  }

  const addTags = await addTagsToCertificate(sls, domain, cert.CertificateArn)
  sls.cli.log(JSON.stringify(addTags));

  const verify = await verifyCertificate(sls, cert)
  sls.cli.log(JSON.stringify(verify));

  return verify
}

const deleteMediaBucketContents = async ({ sls, provider}) => {
  const bucketName = sls.service.provider.config.mediaBucket;
  const params = {
    Bucket: bucketName,
    MaxKeys: 1000
  };
  sls.cli.log('Listing items in Media bucket');
  const objects = await provider.request('s3', 'listObjects', params);
  if (objects.Contents) {
    const contents = objects.Contents;
    let keylist = {
      Objects: [],
      Quiet: false
    }
    if (contents.length) {
      console.log(contents);
      for (i in contents) {
        keylist.Objects.push({ "Key": contents[i].Key })
      }
      const delParams = {
        Bucket: bucketName,
        Delete: keylist
      }
      sls.cli.log('Deleting items in media bucket');
      const deleteAction = await provider.request('s3', 'deleteObjects', delParams);
      return deleteAction;
    }
    return null;
  }

}

const loadCfOutput = async (stackName, region, profile) => {
  const response = await provider.request( 'cf', 'describeStacks', { StackName: stackName });
  const outputs = response.Stacks[0].Outputs;
  let cfOut = {};
  outputs.forEach(o => {
      cfOut[o.OutputKey] = o.OutputValue;
  });
  return cfOut;
};

const addCloudFrontRecord = async (sls, provider) => {
  const { stackName, region, profile } = sls.service.provider;
  const cfOutputs = await loadCfOutput(stackName, region, profile);
  const domain = sls.service.provider.config.domain;
  const stage = sls.service.provider.stage;
  const addRecord = await addRoute53Record(
    sls,
    provider,
    domain,
    domain,
    cfOutputs.CloudFrontDistribution,
    'CNAME'
  );
  console.log()
  if (!addRecord) {
    sls.cli.log('Adding CNAME to secrets.json');
    secrets[stage].cloudFrontCNAME = {
      Name: domain,
      Type: 'CNAME',
      Value: cfOutputs.CloudFrontDistribution
    };
    const newSecrets = JSON.stringify(secrets, null, 2);
    return fs.writeFileSync(__dirname + '/../../secrets.json', newSecrets);
  }
  sls.cli.log('returning added record');
  return addRecord
}

const postDeployActions = async (sls, provider) => {
  const createAdminKey = await createAdminAPIKey(sls, provider);
  const addCloudFrontCNAME = await addCloudFrontRecord(sls, provider);
  return await findAndReplaceDependencies(sls.service.functions, sls, createAdminKey.UsagePlanId, provider);
}

class VerifyACMCertificate {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options
    this.provider = this.serverless.getProvider("aws")
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
      'after:deploy:deploy': postDeployActions.bind(this, serverless, this.provider),
      'before:remove:remove': deleteMediaBucketContents.bind(this, { sls: this.serverless, provider: this.provider }),
      'createCert:createCert': createCertificate.bind(this, { sls: this.serverless, provider: this.provider }),
      'postDeployActions:createAdminKey': postDeployActions.bind(this, serverless, this.provider),
      'noiiceCreateAdminApiKey:createAdminKey': createAdminAPIKey.bind(this, serverless, this.provider)
    };
  }
}

module.exports = VerifyACMCertificate;

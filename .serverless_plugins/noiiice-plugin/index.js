const packageLambdaFunctions = require('./package');
const createAdminAPIKey = require('./createAdminAPIKey');
const { findAndReplaceDependencies } = require('./lambdaUtils');
const { addRoute53Record } = require('./route53Util');
const { verifyDomain, verifyEmail } = require('./sesUtil');
const fs = require('fs');
const secrets = require('../../secrets.json');
const execSync = require('child_process').execSync;

const runAppCmd = (cmd, app) => {
  execSync(cmd, {
      cwd: app,
      stdio: 'inherit'
  })
};

const packageAll = (sls) => {
  console.log();
  sls.cli.log(`Lambda Layer: Installing dependencies from package-lock ... `);
  runAppCmd('npm ci', 'layers/nodejs');
  console.log();
  packageLambdaFunctions(sls);
}

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
  let cert = {};
  try {
    cert = await provider.request('ACM', 'requestCertificate', params);
  } catch (err) {
    sls.cli.log('Error requesting certificate');
    sls.cli.log(err);
  }


  if (cert.CertificateArn) {
    console.log('Certificate created.');
    secrets[stage].certificateArn = cert.CertificateArn
  }

  const addTagsToCertificate = async (sls, domain, arn) => {
    const params = {
      CertificateArn: arn,
      Tags: [
        {
          Key: 'Name',
          Value: domain
        }
      ]
    };
    let addTags;
    try {
      addTags = await provider.request('ACM', 'addTagsToCertificate', params);
    } catch(err) {
      sls.cli.log('Error adding tags to Certificate');
      sls.cli.log(err);
    }
    return addTags;
  };

  const describeCertificate = async (arnObj) => {

    const params = arnObj;
    let cert = {};
    try {
      cert = await provider.request('ACM', 'describeCertificate', params);
    } catch(err) {
      sls.cli.log('Error describing certificate');
      sls.cli.log(err);
    }
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

        if ( certDescription.Certificate && certDescription.Certificate.DomainValidationOptions[0].ResourceRecord) {
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
      rootDomain,
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
    return route53Record;
  }

  const addTags = await addTagsToCertificate(sls, domain, cert.CertificateArn)
  sls.cli.log(JSON.stringify(addTags));

  const verify = await verifyCertificate(sls, cert)
  sls.cli.log(JSON.stringify(verify));
  const emails = await emailVerification(sls, provider);

  return emails
}

const emailVerification = async (sls, provider) => {
  const domain = sls.service.provider.config.domain;
  const rootDomain = domain.substring(domain.indexOf('.')+1);
  sls.cli.log('Verifying Domain');
  console.log(rootDomain, domain);
  const domainVerify =  await verifyDomain(sls, provider, rootDomain);
  if (domainVerify !== 'verified') {
    sls.cli.log('Route53 verification unavailable.')
    const stage = sls.service.provider.stage;
    secrets[stage].sesTxtRecord = {
      Name: `_amazonses.${rootDomain}`,
      Type: 'TXT',
      Value: domainVerify.VerificationToken
    };
    const newSecrets = JSON.stringify(secrets, null, 2);
    fs.writeFileSync(__dirname + '/../../secrets.json', newSecrets)
    sls.cli.log('TXT Record added to secrets.json')
  }
  sls.cli.log('Verifying email address');
  const emailVerify = verifyEmail(sls, provider, sls.service.provider.config.adminUserEmail);
  return Promise.all([
    domainVerify,
    emailVerify
  ])
}

const verifyRootDomain = async (sls, provider) => {
  const domain = sls.service.provider.config.domain;
  const rootDomain = domain.substring(domain.indexOf('.')+1)
  return await verifyDomain(sls, provider, rootDomain);
}

const deleteMediaBucketContents = async (sls, provider) => {
  const bucketName = sls.service.provider.config.mediaBucket;
  const params = {
    Bucket: bucketName,
    MaxKeys: 1000
  };
  sls.cli.log('Listing items in Media bucket');
  let objects;
  try{
    objects = await provider.request('S3', 'listObjects', params);
  } catch(err) {
    sls.cli.log(err);
    return null
  }

  if (objects && objects.Contents) {
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
      const deleteAction = await provider.request('S3', 'deleteObjects', delParams);
      return deleteAction;
    }
    return null;
  }

}

const loadCfOutput = async (stackName, region, profile, provider) => {
  const response = await provider.request( 'CloudFormation', 'describeStacks', { StackName: stackName });
  const outputs = response.Stacks[0].Outputs;
  let cfOut = {};
  outputs.forEach(o => {
      cfOut[o.OutputKey] = o.OutputValue;
  });
  return cfOut;
};

const addCloudFrontRecord = async (sls, provider) => {
  const { stackName, region, profile } = sls.service.provider;
  sls.cli.log('Loading Cloudfront Outputs.');
  const cfOutputs = await loadCfOutput(stackName, region, profile, provider);
  const domain = sls.service.provider.config.domain;
  const stage = sls.service.provider.stage;
  sls.cli.log('Attempting to add CNAME to Route53.');
  const rootDomain = domain.substring(domain.indexOf('.')+1);
  const addRecord = await addRoute53Record(
    sls,
    provider,
    rootDomain,
    domain,
    cfOutputs.DomainEndpoint,
    'CNAME'
  );
  console.log()
  if (!addRecord) {
    sls.cli.log('Adding CNAME to secrets.json');
    secrets[stage].cloudFrontCNAME = {
      Name: domain,
      Type: 'CNAME',
      Value: cfOutputs.DomainEndpoint
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
      },
      noiiiceVerifyEmail: {
        usage: 'Verify admin email and domain in SES',
        lifecycleEvents: [
          'createCert'
        ],
        options: {
          message: {}
        },
      },
    };
    this.hooks = {
      'before:package:initialize': packageAll.bind(this, serverless),
      'after:deploy:deploy': postDeployActions.bind(this, serverless, this.provider),
      'before:remove:remove': deleteMediaBucketContents.bind(this, this.serverless, this.provider),
      'createCert:createCert': createCertificate.bind(this, { sls: this.serverless, provider: this.provider }),
      'postDeployActions:createAdminKey': postDeployActions.bind(this, serverless, this.provider),
      'noiiceCreateAdminApiKey:createAdminKey': createAdminAPIKey.bind(this, serverless, this.provider),
      'noiiiceVerifyEmail:createCert': emailVerification.bind(this, serverless, this.provider)
    };
  }
}

module.exports = VerifyACMCertificate;

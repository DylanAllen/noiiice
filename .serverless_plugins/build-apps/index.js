'use strict';

const fs = require('fs');
const AWS = require('aws-sdk');
const glob = require('glob');
const execSync = require('child_process').execSync;
const substitutionRegex = /%CF:(.+)%/ig;

/*
 Steps:
    1. Glob scan /app
    2. Read in each environment.ts contents
    3. Get CF output
        new aws.CloudFormation({ region }).describeStacks({ stackName })
    4. Save all output key:value pairs
    5. Regex replace func
        a. %CF:outkey% -> outval
    6. Save environment.cf.ts with replacements
    7. execSync: npm install
    8. execSync: npm run build
*/

const apps = [];
const cfOutputs = {};
const environmentConfigs = {};

const loadAppData = () => {
    // find apps
    let appPaths = glob.sync('apps/!(*.md)');

    console.log('Apps Found: ', appPaths);

    // read in configs
    appPaths.forEach(appPath => {
        apps.push(appPath);
        environmentConfigs[appPath] = {
            before: fs.readFileSync(appPath + `/config-src.js`, 'utf-8'),
            after: null
        };
    });
};

const loadCfOutput = async (stackName, region, profile) => {
  let credentials;
  if (profile) {
    credentials = new AWS.SharedIniFileCredentials({profile});
  } else {
    credentials = new AWS.RemoteCredentials({
      httpOptions: { timeout: 5000 }, // 5 second timeout
      maxRetries: 10, // retry 10 times
      retryDelayOptions: { base: 200 }
    })
  }
  AWS.config.credentials = credentials;
  const cf = new AWS.CloudFormation({ region });
  const response = await cf.describeStacks({ StackName: stackName }).promise()
  const outputs = response.Stacks[0].Outputs;
  outputs.forEach(o => {
      cfOutputs[o.OutputKey] = o.OutputValue;
  });
};

const performSubstitutions = () => {
    let replaceFunc = (match => {
        let cfOutputKey = match.replace(/%/g,'').split(':')[1];
        return cfOutputs[cfOutputKey];
    });
    apps.forEach(app => {
        environmentConfigs[app].after = environmentConfigs[app].before.replace(substitutionRegex, replaceFunc);
    });
};

const writeChangesToDisk = () => {
    apps.forEach(app => {
        fs.writeFileSync(app + '/config.js', environmentConfigs[app].after);
        console.log(`Wrote env substitution to disk for app: ${app}.`);
    });
};

const runAppCmd = (cmd, app) => {
    execSync(cmd, {
        cwd: app,
        stdio: 'inherit'
    })
};

const buildApps = (sls) => {
    const installDeps = (app) => {
        console.log();
        sls.cli.log(`${app}: Installing dependencies from package-lock ... `);
        runAppCmd('npm ci', app);
        console.log();
    };
    const installLayerDeps = () => {
      console.log();
      sls.cli.log(`Lambda Layer: Installing dependencies from package-lock ... `);
      runAppCmd('npm ci', 'layers/');
      console.log();
    }
    const nuxtBuild = (app) => {
        console.log();
        sls.cli.log(`Noiice Nuxt: Building ... `);
        runAppCmd(`export stage=${sls.service.provider.stage}`);
        // runAppCmd(`export cdomain=${sls.service.custom.customDomain ? 'true' : 'false'}`);
        runAppCmd('export cdomain=false');
        runAppCmd('npm run build');
        console.log();
    };

    for (const app of apps) {
        installDeps(app);
        installLayerDeps();
        nuxtBuild(app);
    }
};

const setIdpRoleDefault = async (sls) => {
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
  const { IdentityPoolId, UserPoolId, UserPoolClientId, Region, AuthorizedRole } = cfOutputs;
  const identityProviderName = `cognito-idp.${Region}.amazonaws.com/${UserPoolId}:${UserPoolClientId}`;
  const cognitoidentity = new AWS.CognitoIdentity({ region: Region });

  var params = {
    IdentityPoolId: IdentityPoolId,
    Roles: {
      authenticated: AuthorizedRole,
    },
    RoleMappings: {
      [identityProviderName]: {
        Type: "Token",
        AmbiguousRoleResolution: "AuthenticatedRole"
      }
    }
  };

  const update = await cognitoidentity.setIdentityPoolRoles(params).promise();
  sls.cli.log(update);
  return update
}

const cleanupNodeModules = () => {
    for (const app of apps) {
        console.log();
        runAppCmd('rm -rf node_modules', app);
        console.log();
    }
};

const redeployNuxt = (sls) => {
  console.log();
  sls.cli.log('Setting Idp role for admin.');
  setIdpRoleDefault(sls);
  sls.cli.log('Redeploying Nuxt lambda');
  if (sls.service.provider.profile) {
    runAppCmd(`serverless deploy function --function nuxt --stage ${sls.service.provider.stage} --profile ${sls.service.provider.profile}` , './');
  } else {
    runAppCmd(`serverless deploy function --function nuxt --stage ${sls.service.provider.stage}` , './');
  }

  console.log();
}

const doWork = async (sls) => {
    sls.cli.log('Building and deploying Noiiice ...');
    loadAppData();
    await loadCfOutput(sls.service.provider.stackName, sls.service.provider.region, sls.service.provider.profile);
    performSubstitutions();
    writeChangesToDisk();
    buildApps(sls);
    redeployNuxt(sls);
    cleanupNodeModules();
};

const setIdpRoleHook = async (sls) => {
  await loadCfOutput(sls.service.provider.stackName, sls.service.provider.region, sls.service.provider.profile);
  sls.cli.log('Setting Idp role for admin.');
  return setIdpRoleDefault(sls);
}

class TaleBuildApps {
  constructor(serverless) {
    this.serverless = serverless;
    this.commands = {
      buildNuxtApp: {
        usage: 'Build Nuxt App',
        lifecycleEvents: [
          'buildApps',
        ],
        options: {
          message: {},
        },
      },
      deployNuxt: {
        usage: 'Deploy Nuxt App',
        lifecycleEvents: [
          'buildApps',
        ],
        options: {
          message: {}
        }
      },
      setIdp: {
        usage: 'Set Idp for Cognito',
        lifecycleEvents: [
          'buildApps',
        ],
        options: {
          message: {}
        }
      }
    };
    this.hooks = {
      "after:deploy:deploy": doWork.bind(this, serverless),
      "buildNuxtApp:buildApps": doWork.bind(this, serverless),
      "deployNuxt:buildApps": redeployNuxt.bind(this, serverless),
      "setIdp:buildApps": setIdpRoleHook.bind(this, serverless)
    };
  }
}

module.exports = TaleBuildApps;

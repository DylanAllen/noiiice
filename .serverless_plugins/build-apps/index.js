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

const loadCfOutput = async (stackName, region, profile, provider) => {
  const response = await provider.request('CloudFormation', 'describeStacks', { StackName: stackName })
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
    const installLayerDeps = () => {
      console.log();
      sls.cli.log(`Lambda Layer: Installing dependencies from package-lock ... `);
      runAppCmd('npm ci', 'layers/nodejs');
      console.log();
    }
    const nuxtBuild = (app) => {
        console.log();
        sls.cli.log(`Noiice Nuxt: Building ... `);
        if (process.platform !== 'win32') {
          runAppCmd(`export stage=${sls.service.provider.stage}`);
        } else {
          runAppCmd(`set stage=${sls.service.provider.stage}`);
        }
        runAppCmd('npm run build');
        console.log();
    };

    for (const app of apps) {
        installLayerDeps();
        nuxtBuild(app);
    }
};

const setIdpRoleDefault = async (sls, provider) => {
  const { IdentityPoolId, UserPoolId, UserPoolClientId, Region, AuthorizedRole } = cfOutputs;
  const identityProviderName = `cognito-idp.${Region}.amazonaws.com/${UserPoolId}:${UserPoolClientId}`;

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

  const update = await provider.request('CognitoIdentity', 'setIdentityPoolRoles', params);
  sls.cli.log(update);
  return update
}

const cleanupNodeModules = () => {
    for (const app of apps) {
        console.log();
        if (process.platform !== 'win32') {
          runAppCmd('rm -rf node_modules', app);
          console.log();
        }
    }
};

const redeployNuxt = (sls, provider) => {
  console.log();
  sls.cli.log('Setting Idp role for admin.');
  setIdpRoleDefault(sls, provider);
  sls.cli.log('Redeploying Nuxt lambda');
  if (sls.service.provider.profile) {
    runAppCmd(`serverless deploy function --function nuxt --stage ${sls.service.provider.stage} --profile ${sls.service.provider.profile}` , './');
  } else {
    runAppCmd(`serverless deploy function --function nuxt --stage ${sls.service.provider.stage}` , './');
  }

  console.log();
}

const doWork = async (sls, provider) => {
    sls.cli.log('Building and deploying Noiiice ...');
    loadAppData();
    await loadCfOutput(sls.service.provider.stackName, sls.service.provider.region, sls.service.provider.profile, provider);
    performSubstitutions();
    writeChangesToDisk();
    buildApps(sls);
    redeployNuxt(sls, provider);
    cleanupNodeModules();
};

const setIdpRoleHook = async (sls, provider) => {
  await loadCfOutput(sls.service.provider.stackName, sls.service.provider.region, sls.service.provider.profile, provider);
  sls.cli.log('Setting Idp role for admin.');
  return setIdpRoleDefault(sls, provider);
}

class TaleBuildApps {
  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this.serverless.getProvider("aws")
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
      "after:deploy:deploy": doWork.bind(this, serverless, this.provider),
      "buildNuxtApp:buildApps": doWork.bind(this, serverless, this.provider),
      "deployNuxt:buildApps": redeployNuxt.bind(this, serverless, this.provider),
      "setIdp:buildApps": setIdpRoleHook.bind(this, serverless, this.provider)
    };
  }
}

module.exports = TaleBuildApps;

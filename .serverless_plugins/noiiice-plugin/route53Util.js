const AWS = require('aws-sdk');

const addRoute53Record = async (sls, domain, name, value, type) => {
  const profile = sls.service.provider.profile;
  const stage = sls.service.provider.stage;
  const rootDomain = domain.substring(domain.indexOf('.')+1)
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

  const route53 = new AWS.Route53();

  const hostedZones = await route53.listHostedZones().promise();

  let hostedZoneId = null;
  const zones = hostedZones.HostedZones;
  for (zone in zones) {
    if (zones[zone].Name === `${rootDomain}.`) {
      hostedZoneId = zones[zone].Id;
    }
  }

  if (hostedZoneId === null) {
    return null
  }

  const params53 = {
    ChangeBatch: {
      Changes: [
        {
          Action: "CREATE",
          ResourceRecordSet: {
            Name: name,
            ResourceRecords: [
               {
              Value: value
             }
            ],
            TTL: 60,
            Type: type
          }
        }
      ],
      Comment: `Verification for certificate on ${domain}`
    },
    HostedZoneId: hostedZoneId
  };


  return route53.changeResourceRecordSets(params53).promise();
}

module.exports = {
  addRoute53Record
};

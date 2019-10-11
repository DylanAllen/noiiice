const addRoute53Record = async (sls, provider, domain, name, value, type) => {
  const stage = sls.service.provider.stage;
  const rootDomain = domain.substring(domain.indexOf('.')+1)
  sls.cli.log('listing route53 records', domain);
  const hostedZones = await provider.request('Route53', 'listHostedZones');
  let hostedZoneId = null;
  const zones = hostedZones.HostedZones;
  for (zone in zones) {
    if (zones[zone].Name === `${domain}.`) {
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

  sls.cli.log('changing resource record set');
  let record;
  try {
    record = await provider.request('Route53', 'changeResourceRecordSets', params53);
  } catch (err) {
    sls.cli.log('Error adding Route53 Record')
    record = null
  }
  return record
}

module.exports = {
  addRoute53Record
};

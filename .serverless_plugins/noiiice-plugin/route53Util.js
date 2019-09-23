const addRoute53Record = async (sls, provider, domain, name, value, type) => {
  const stage = sls.service.provider.stage;
  const rootDomain = domain.substring(domain.indexOf('.')+1)

  const hostedZones = await provider.request('route53', 'listHostedZones');

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


  return provider.request('route53', 'changeResourceRecordSets', params53);
}

module.exports = {
  addRoute53Record
};

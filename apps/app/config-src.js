module.exports.env = {
  region: '%CF:Region%',
  identityPoolId: '%CF:IdentityPoolId%',
  userPoolId: '%CF:UserPoolId%',
  clientId: '%CF:UserPoolClientId%',
  mediaBucket: '%CF:MediaBucket%',
  stage: '%CF:Stage%',
  domain: '%CF:Domain%',
  domainApiUrl: 'https://%CF:Domain%/api',
  serviceUrl: '%CF:ServiceEndpoint%/api',
  apiUrl: this.domain ? this.domainApiUrl : this.serviceUrl,
  googleAnalyticsID: '%CF:GoogleAnalyticsID%'
}

module.exports.env = {
  region: 'us-east-1',
  identityPoolId: 'us-east-1:8ee75848-d358-4c8c-91a4-852514317135',
  userPoolId: 'us-east-1_fb5Ns0aHJ',
  clientId: '4auabvan4tm60t6kmd20qp0684',
  mediaBucket: 'noiicemediaprod',
  stage: 'prod',
  domain: 'noiiice.com',
  domainApiUrl: 'https://noiiice.com/api',
  serviceUrl: 'https://jkq5evyeyc.execute-api.us-east-1.amazonaws.com/prod/api',
  apiUrl: this.domain ? this.domainApiUrl : this.serviceUrl
}

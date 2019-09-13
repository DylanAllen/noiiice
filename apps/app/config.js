module.exports.env = {
  region: 'us-east-1',
  identityPoolId: 'us-east-1:ea19bdf5-888f-458b-9946-b35066546e10',
  userPoolId: 'us-east-1_CNRPX5FhB',
  clientId: '4uuepi7u8amvmhfnmmimff4fr8',
  mediaBucket: 'thisfammedia',
  stage: 'prod',
  domain: 'www.thisfamily.us',
  domainApiUrl: 'https://www.thisfamily.us/api',
  serviceUrl: 'https://7n7cd88gr6.execute-api.us-east-1.amazonaws.com/prod/api',
  apiUrl: this.domain ? this.domainApiUrl : this.serviceUrl
}

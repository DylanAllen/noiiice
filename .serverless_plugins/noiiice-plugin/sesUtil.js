const { addRoute53Record } = require('./route53Util');

const verifyEmail = async (sls, provider, email) => {
  const params = {
    EmailAddress: email
  };
  let verify, addRecord;
  try {
    verify = await provider.request('SES', 'verifyEmailIdentity', params);
  } catch (err) {
    sls.cli.log('Error verifying admin email.');
    sls.cli.log(err);
    return {};
  }
  return verify;
}

const verifyDomain = async (sls, provider, domain) => {
  const params = {
    Domain: domain
  };
  let verify;
  console.log('Verifying');

  try {
    verify = await provider.request('SES', 'verifyDomainIdentity', params);
  } catch (err) {
    sls.cli.log('Error verifying domain in SES.');
    sls.cli.log(err);
    return {};
  }
  try {
    addRecord = await addRoute53Record(sls, provider, domain, `_amazonses.${domain}`, `"${verify.VerificationToken}"`, 'TXT');
  } catch(err) {
    sls.cli.log('Error adding route53 TXT record for SES');
    sls.cli.log(err);
    return verify
  }
  return (addRecord !== null) ? 'verified' : verify;
}

module.exports = {
  verifyEmail,
  verifyDomain
}

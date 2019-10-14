# Noiiice Blog

> A serverless blog cms.

Noiiice is a fully serverless blog platform with server-less side rendering. All services run on [Amazon Web Services](https://aws.amazon.com/). The webapp is a [Nuxt.js](https://nuxtjs.org) app served from a Lambda function using [serverless-http](https://github.com/dougmoscrop/serverless-http) through API Gateway. Authentication uses AWS Cognito, APIs are Lambda functions, media files served from S3, and blog/comment data stored in DynamoDB.

## What you will need
- An AWS account with admin access (free to create, but requires a credit card)
- Install and configure the [AWS CLI](https://docs.aws.amazon.com/polly/latest/dg/setup-aws-cli.html) on your machine:
- A web domain (doesn't have to be in AWS Route53, you just need access to the DNS)

## Installation and Deployment Steps:

From the command line:

``` bash
#Install serverless
npm install -g serverless
#clone the repo
git clone git@github.com:DylanAllen/noiiice.git
# Navigate to project directory
cd noiiice
# Install dependencies
npm install
```

Rename `example-secrets.json` file to `secrets.json` and update the values.

- **region** - Your AWS region that you want to deploy the app into (us-east-1, us-west-2, etc.). Be aware that Cognito is not supported in all regions. `us-east-1` is recommended as it is currently the only region where API Gateway endpoint type EDGE is supported.
- **blogCommentsDB & blogPostDB** - What you want to name your post and comment tables in DynamoDB.
- **userPool** - A name for your Cognito user pool (can not contain dashes or spaces)
- **adminUser** - A username for your admin user.
- **adminUserEmail** - The email address for your admin user (this is where your initial password will be emailed)
- **mediaBucket** - A name for your s3 media bucket. (Must start with a lowercase letter, no spaces)
- **domain** - The domain for your website. You must have access to the DNS records for this domain.
- **certificateArn** - This will be populated automatically after the certificate is created. If you already have a cert AWS Certificate Manager, you can enter the arn for that cert here and skip the `sls createCert --stage dev` step below. You will also have to verify that cert on your domain.
- **restrictedStrings** - a comma separated list of string (no spaces between commas) of words that you do not want to be allowed in the comments of your blog. If one of these words are present in a comment, the application will not allow the comment to be created.
- **endpointType** - Either `EDGE` or `REGIONAL`. This sets the API Gateway endpoint type. **EDGE will only work in the region us-east-1** while REGIONAL will work in any Region.
- **googleAnalyticsID** - If you want to add Google Analytics to your site, enter the ID here. If you do not, set this value to a blank string `"googleAnalyticsID": ""` and the GA scripts will not run.


``` JSON
{
  "dev": {
    "region": "us-east-1",
    "blogCommentsDB": "NoiiceCommentsDEV",
    "blogPostDB": "NoiiceBlogPostsDEV",
    "userPool": "NoiiceBlogDEV",
    "adminUser": "youradminusername",
    "adminUserEmail": "email@example.com",
    "mediaBucket": "noiicemediaDEV",
    "domain": "dev.yourdomain.com",
    "certificateArn":"",
    "restrictedStrings": "",
    "endpointType": "EDGE",
    "googleAnalyticsID": "UA-XXXXXXXX-X"
  },
  "prod": {
    "region": "us-west-2",
    "blogCommentsDB": "NoiiceComments",
    "blogPostDB": "NoiiceBlogPosts",
    "userPool": "NoiiceBlog",
    "adminUser": "youradminusername",
    "adminUserEmail": "email@example.com",
    "mediaBucket": "noiicemedia",
    "domain": "yourdomain.com",
    "certificateArn":"",
    "restrictedStrings": "",
    "endpointType": "REGIONAL",
    "googleAnalyticsID": "UA-XXXXXXXX-X"
  }
}
```

### Deployment

``` bash
# Create the certificate for your domain
sls createCert --stage dev
```

### If your domain is in Route53

If your domain was registered through Route53 in your AWS account, the DNS verification records will be created automatically.  Wait about 40 minutes for the certificate creation and verification.

### If your domain was registered elsewhere

If your domain is not in Route53, you will receive an output in the console of the record that you need to add to your DNS to verify the certificate. This info will also be written to you `secrets.json` file under certVerificationData for your reference, and can be found in AWS Certificate manager. Go to your domain's DNS records and add that CNAME record. About 40 minutes after you add the CNAME your certificate will verify

## Deploy the serverless stack
```bash
sls deploy --stage dev
```

If your domain is hosted in Route53, your DNS records will have been updated automatically. Wait another 40 minutes for API gateway and domain to propagate.

If your domain is hosted elsewhere, the CNAME record that you need to add to your DNS records will have been added to your `secrets.json` file under `cloudFrontCNAME`. Add that to your domain's DNS records, and in about 40 minutes, your website will be live!

Check your email for your admin user password, login to your app, and reset your password.

## Customize your site

After deployment and you can run your site locally:

```bash
npm run dev
```

This will start your dev server at http://localhost:3000 with hot reloading.

The web app files are in `apps/app/` All of the CSS files are in the *assets* folder.

You can re-depoy the web app without a complete serverless deploy. You can do this by running:

```bash
sls buildNuxtApp --stage dev
```

This will re-build the app and upload the results to it's lambda function. If you make updates to any other lambda functions, you can do a full re-deploy, or deploy the lambdas individually.

For detailed explanation on how Nuxt works, checkout [Nuxt.js docs](https://nuxtjs.org).

For more info about the serverless framework: [serverless.com](https://serverless.com)

## Uninstall

To remove all of your resources from AWS:

```bash
serverless remove --stage dev
```
This will delete all files from tour media s3 bucket, and delete all of the AWS resources created i the stack except for you Certificate.

You can not delete the certificate when it is attached to a distribution, and it takes some time for the CloudFront distribution to be disabled and removed. After that completes (again, about 40 minutes) you can go into the AWS Certificate Manager console and delete the certificate.

Also, your DNS records will not be automatically removed.

## Pull Requests Welcome!

I am actively developing this project on my spare time. I would love some help if you are Vue/Nuxt/serverless savvy.

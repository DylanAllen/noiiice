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

Rename `example-secrets.json` file to `secrets.json` and update the values:


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
    "restrictedStrings": ""
  },
  "prod": {
    "region": "us-east-1",
    "blogCommentsDB": "NoiiceComments",
    "blogPostDB": "NoiiceBlogPosts",
    "userPool": "NoiiceBlog",
    "adminUser": "youradminusername",
    "adminUserEmail": "email@example.com",
    "mediaBucket": "noiicemedia",
    "domain": "yourdomain.com",
    "restrictedStrings": ""
  }
}
```

### Deployment

``` bash
# Create the certificate for your domain
sls createCert --stage dev
```

If your domain is in a hosted zone in your Route53 account, the DNS verification records will be created automatically.  Wait about 40 minutes for the certificate creation and verification.

If your domain is not in a Route53 hosted zone, you will receive an output in the console of the record that you need to add to your DNS to verify the certificate. You can also look up this info in AWS Certificate manager.



 *Create the API Gateway custom domain:*
```bash
sls create_domain --stage dev
# Deploy the serverless stack
sls deploy --stage dev
```

Wait another 40 minutes for API gateway and domain to propagate. Check your email for your admin user confirmation code, login to your app, and confirm your account! In order for this app to function (even locally) you will need the AWS assets deployed.

Once the deployment is finished, you will be able to visit your site at your custom domain and the API Gateway endpoint created by the deployment.

## Customize your development

navigate to your project folder after deployment and you can run your site locally:

`npm run dev`

This will start your dev server at http://localhost:3000 with hot reloading.

The web app files are in `apps/app/` All of the CSS files are in the *assets* folder.

You can redepoy the web app without a complete serverless deploy. You can do this by running:
`sls buildNuxtApp --stage dev`

This will re-build the app and upload the results to it's lambda function. If you make updates to any other lambda functions, you can do a full re-deploy, or deploy the lambdas individually.

For detailed explanation on how Nuxt works, checkout [Nuxt.js docs](https://nuxtjs.org).



## Pull Requests Welcome!

I am actively developing this project on my spare time. I would love some help if you are Vue/Nuxt/serverless savvy.

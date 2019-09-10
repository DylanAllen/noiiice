const serverless = require('serverless-http');
const binaryMimeTypes = require('./binaryMimeTypes');
const nuxt = require('./nuxt');
const handler = serverless(nuxt, {
    binary: binaryMimeTypes
});

module.exports.nuxt = serverless(nuxt, {
  binary: binaryMimeTypes
})

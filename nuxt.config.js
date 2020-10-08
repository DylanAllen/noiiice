const pkg = require('./package');
const env = require('./apps/app/config.js').env;
const axios = require('axios');
const path = require('path');

module.exports = {
  mode: 'universal',
  head: {
    title: 'Noiiice Blog | A Serverless Blog',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Nuxt.js project' }
    ],
    link: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: 'noiiice-icon-trans.png',
      }
    ]
  },
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#fff' },

  /*
  ** Global CSS
  */
  css: [
    { src: '~/assets/style.scss', lang: 'sass' },
    { src: 'highlightjs/styles/atom-one-dark.css', lang: 'css' },
    { src: 'katex/dist/katex.min.css', lang: 'css' }
  ],

  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    { src: '@plugins/cognitoAuth', ssr: false },
    { src: '~plugins/ga.js', ssr: false }
  ],

  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
    '@nuxtjs/pwa'
  ],
  devModules: ['@nuxtjs/eslint-module'],
  /*
  ** Axios module configuration
  */
  axios: {
    // See https://github.com/nuxt-community/axios-module#options
  },

  build: {
    vendor: ['axios'],
    // publicPath: `/${env.stage}/_nuxt/`,
    extend(config, ctx) {
      let pubPath = `/${env.stage}/_nuxt/`;
      if (ctx.isDev || env.apiUrl !== 'https:///api') {
        pubPath = '/_nuxt/';
      }
      config.output.publicPath = pubPath;
      console.log('publicPath', config.output.publicPath);
      config.resolve.alias['~src'] = 'apps/app/';
      config.resolve.alias['~utils'] = path.join('apps/app/', 'utils');
      // Run ESLint on save
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    }
  },
  srcDir: 'apps/app/',
  performance: {
    gzip: false
  },
  dev: false,
  router: {
    middleware: 'navMiddle',
    base: '/'
  },

  env: env,

  generate: {
    routes: function () {
      return axios.get(`${env.apiUrl}/blog/get`)
        .then((response) => {
          const posts = []
          for (let i = 0; i < response.data.Items.length; i++) {
            const slug = `post/${response.data.Items[i].slug}`
            console.log(slug)  // eslint-disable-line
            if (slug.status !== 'Draft') {
              posts.push(slug)
            }
          }
          return posts
        })
    }
  }
}

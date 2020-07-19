<template>
  <div id="homepage" class="fullwidth-container">
    <section>
      <logo class="thelogo" />
      <h1 class="title">
        Noiiice Blog
      </h1>
    </section>
    <section class="inverted">
      <div class="section-container">
        <h2 class="subtitle">
          A serverless blog platform.
        </h2>
        <p>
          Noiiice is an open source blog platform built with the Serverless framework, NuxtJS, AWS Lambda, DynamoDB, API Gateway, S3, and Cognito.
        </p>
        <p>
          Ready to give it a try?
        </p>
        <p class="centered addtopmargin">
          <router-link class="button" to="/post/install">
            get started
          </router-link>
        </p>
      </div>
    </section>
    <section>
      <div class="section-container">
        <p>
          <ul class="featurelist">
            <li>
              server-less side rendering
            </li>
            <li>
              progressive web app
            </li>
            <li>
              automated deployment
            </li>
            <li>
              super cheap to run
            </li>
          </ul>
        </p>
        <p class="centered">
          <router-link class="button" to="/blog">
            blog
          </router-link>
        </p>
      </div>
    </section>
  </div>
</template>

<script>
import Logo from '~/components/Logo.vue'

export default {
  name: 'Home',
  head() {
    return {
      title: 'Noiice Blog | A Serverless Blog by Dylan Allen',
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: 'Noiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance' }
      ]
    }
  },
  components: {
    Logo
  }
}
</script>

<template>
  <div>
    <Authentication />
  </div>
</template>

<script>
import authentication from '../components/authentication.vue'
import auth from '../plugins/cognitoAuth'

export default {
  name: 'Signup',
  head() {
    return {
      title: 'Signup | Noiice Blog',
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: 'Signup so you can post comments. Noiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance' }
      ]
    }
  },
  components: {
    Authentication: authentication
  },
  mixins: [auth],
  data() {
    return {
    }
  },
  methods: {
  }
}
</script>

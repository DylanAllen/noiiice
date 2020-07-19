<template>
  <div>
    <Authentication />
  </div>
</template>

<script>
import authentication from '../components/authentication.vue'

export default {
  name: 'Login',
  components: {
    Authentication: authentication
  },
  head() {
    return {
      title: 'Login | Noiice Blog',
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: 'Noiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance' }
      ]
    }
  },
  data() {
    return {
    }
  },
  methods: {
  }
}
</script>

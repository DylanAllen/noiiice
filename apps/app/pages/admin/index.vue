<template>
  <div id="adminpage" class="container">
    <no-ssr v-if="$store.state.auth.admin">
      <h2>Noiiice Admin</h2>
      <div class="buttonscontainer">
        <router-link class="button" to="/admin/posts">
          Manage Posts
        </router-link>
        <router-link class="button" to="/admin/comments">
          Manage Comments
        </router-link>
        <router-link class="button" to="/edit">
          Create A New Post
        </router-link>
      </div>
    </no-ssr>
  </div>
</template>

<script>
import auth from '../../plugins/cognitoAuth'

export default {
  name: 'Admin',
  mixins: [auth],
  head() {
    return {
      title: 'Noiiice Admin',
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
  computed: {
  },
  fetch({ store, params }) {
  },
  beforeMount() {
    return this.isAuthenticated((resp) => {
      if (!this.$store.state.auth.admin) {
        window.location = '/blog' // eslint-disable-line
      }
    })
  },
  methods: {
  }
}
</script>

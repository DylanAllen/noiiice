<template>
  <footer>
    <div class="links">
      <span v-if="$store.state.auth.admin" class="adminlinks">
        <router-link to="/admin">
          Admin
        </router-link>
        |
        <router-link to="/edit">
          Create Post
        </router-link>
        |
      </span>
      <router-link to="/blog">
        Blog
      </router-link>
      |
      <a
        href="https://nuxtjs.org/"
        target="_blank"
        rel="noopener"
        class="button--green"
      >
        Nuxt Docs
      </a>
      |
      <a
        href="https://github.com/DylanAllen/noiiice"
        target="_blank"
        rel="noopener"
        class="button--grey"
      >
        GitHub
      </a>
    </div>
  </footer>
</template>

<script>

export default {
  name: 'Footer',
  components: {
  },
  computed: {
    fullwidth() {
      return this.$store.state.fullWidth
    }
  }
}
</script>

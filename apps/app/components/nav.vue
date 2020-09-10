
<template>
  <div class="navigation">
    <nav id="nav" :class="{active : $store.state.nav.open}">
      <Opener :inverted="true" />
      <div id="navcontainer">
        <router-link to="/">
          Home
        </router-link>
        <router-link to="/blog">
          Blog
        </router-link>
        <router-link to="/about">
          About
        </router-link>
        <router-link v-if="$store.state.auth.admin" to="/edit">
          New Post
        </router-link>
        <router-link v-if="!$store.state.auth.auth" to="/login">
          Login
        </router-link>
        <a id="signoutButton" v-if="$store.state.auth.auth" @click="onLogout()" href="/">
          Logout
        </a>
        <div class="themeSwitcher">
          <hr>
          <p>
            <label for="themeSelect">Preview an installed theme</label>
          </p>
          <div>
            <select id="themeSelect" v-model="theme" @change="setTheme()">
              <option v-for="(themeName, key) in $store.state.themes" :key="key">
                {{ themeName }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script>
import auth from '../plugins/cognitoAuth'
import navOpener from '../components/navOpener.vue'

export default {
  name: 'Navigation',
  components: {
    Opener: navOpener
  },
  mixins: [auth],
  data() {
    return {
      theme: ''
    }
  },
  mounted() {
    this.theme = this.$store.state.theme
  },
  methods: {
    onLogout() {
      this.logout()
      this.$router.push({ path: '/' })
    },
    setTheme() {
      this.$store.commit('setTheme', this.theme)
    }
  }
}
</script>

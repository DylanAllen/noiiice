<template>
  <header>
    <div :class="'container ' + (fullwidth ? fullwidth : '')">
      <div class="header-logo-container">
        <router-link to="/">
          <img src="~/assets/noiiice-logo-light.png" class="logo" alt="Noiiice Logo">
        </router-link>
      </div>
      <div class="sitetitle">
        <h2>Noiiice</h2>
      </div>
      <Opener />
    </div>
    <Nav />
  </header>
</template>

<script>
import nav from '../components/nav.vue'
import navOpener from '../components/navOpener.vue'

export default {
  name: 'Header',
  components: {
    Nav: nav,
    Opener: navOpener
  },
  computed: {
    fullwidth() {
      return this.$store.state.fullWidth
    }
  }
}
</script>

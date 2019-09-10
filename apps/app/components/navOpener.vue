
<template>
  <div id="menuIcon">
    <div :class="openerClass" @click="toggleNav()">
      <span />
    </div>
  </div>
</template>

<script>
export default {
  name: 'NavOpener',
  props: {
    inverted: Boolean
  },
  computed: {
    openerClass() {
      const active = this.$store.state.nav.open ? 'active menuIconContainer' : 'menuIconContainer'
      const inverted = this.inverted ? ' inverted' : ''
      return active + inverted
    }
  },
  methods: {
    toggleNav() {
      this.$store.commit('nav/toggleNav')
    }
  }
}
</script>
<style lang="scss">
</style>

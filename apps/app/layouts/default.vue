<template>
  <div id="maincontainer" :class="$store.state.theme">
    <main id="maincontent" class="themed">
      <Header />
      <div id="routecontainer">
        <nuxt />
      </div>
      <Footer />
    </main>
    <transition name="swap" mode="out-in">
      <Modal v-if="modalActive" class="themed" />
    </transition>
  </div>
</template>

<script>
import auth from '../plugins/cognitoAuth'
import modal from '../components/modal.vue'
import header from '../components/header.vue'
import footer from '../components/footer.vue'

export default {
  components: {
    Modal: modal,
    Header: header,
    Footer: footer
  },
  mixins: [auth],
  computed: {
    modalActive() {
      return this.$store.state.modalActive
    }
  },
  mounted() {
    this.isAuthenticated(() => {})
  }
}
</script>

<style>
  body {
    margin: 0;
  }
  .swap-enter-active {
    transition: opacity .5s;
  }
  .swap-leave-active {
    transition: opacity .3s;
  }
  .swap-enter {
    opacity: 0;
  }
  .swap-leave-to {
    opacity: 0;
  }
</style>

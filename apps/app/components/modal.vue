<template>
  <div :class="'modalcontainer ' + (loaded ? 'loaded': '')">
    <div class="modalwindow">
      <p class="modalMessage">
        {{ modalData.message }}
      </p>
      <div class="buttonContainer">
        <button v-for="(button, idx) in modalData.buttons" :key="idx" :class="'button ' + button.classes" @click="button.action">
          {{ button.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Modal',
  data() {
    return {
      loaded: false
    }
  },
  computed: {
    modalActive() {
      return this.$store.state.modalActive
    },
    modalData() {
      return this.$store.state.modalData
    }
  },
  mounted() {
    this.loaded = true
  }
}
</script>

<style lang="scss" scoped>
</style>

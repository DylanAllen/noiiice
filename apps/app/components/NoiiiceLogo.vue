<template>
  <div class="noiicelogoanimation">
    <div :class="loaded ? 'loaded logo-container' : 'logo-container'">
      <div class="topN">
        N
      </div>
      <div class="middleN">
        N
      </div>
      <div class="bottomN">
        N
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'NoiiiceLogo',
  data() {
    return {
      loaded: false
    }
  },
  mounted() {
    setTimeout(() => {
      this.loaded = true
    }, 400)
  }
}
</script>
<style lang="scss">
.noiicelogoanimation {
  .logo-container {
    width: 100%;
    height: 130px;
    margin: auto;
    position: relative;
  }
  .topN, .middleN, .bottomN {
    left: calc(50% - 45px);
    position: absolute;
    font-size: 6em;
    font-weight: 900;
    transform: translateX(-70vw);
    transition: transform 1.3s ease;
  }
  .loaded {
    .bottomN {
      transform: translateX(0px);
      transition-delay: 0.5s;
    }
    .middleN {
      transform: translateX(-5px);
      transition-delay: 0.4s;
    }
    .topN {
      transform: translateX(-10px);
      transition-delay: 0.3s;
    }
  }
}
</style>

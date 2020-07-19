<template>
  <div class="paginator">
    <span @click="prevPage()" class="plink pprev">
      Prev
    </span>
    <span v-for="(page, key) in pages" :key="key" :class="(key == currentPage) ? 'active plink' : 'plink'" @click="setPage(key)">
      {{ key + 1 }}
    </span>
    <span @click="nextPage()" class="plink pnext">
      Next
    </span>
  </div>
</template>

<script>
export default {
  name: 'Modal',
  props: {
    allContent: {
      type: Array,
      default: () => { return [] }
    },
    perPage: {
      type: Number,
      default: 5
    }
  },
  data() {
    return {
      currentPage: 0
    }
  },
  computed: {
    pages() {
      const pages = []
      for (let i = 0, j = this.allContent.length; i < j; i += this.perPage) {
        const page = this.allContent.slice(i, i + this.perPage)
        pages.push(page)
      }
      return pages
    },
    currentContent() {
      return this.pages[this.currentPage]
    },
    pageClass() {
      return `onpage${this.currentPage}`
    }
  },
  watch: {
    allContent() {
      if (!this.currentContent.length && this.currentPage > 0) {
        this.setPage(this.currentPage - 1)
        return
      }
      this.$emit('setPage', {
        page: this.currentPage,
        content: this.currentContent
      })
    }
  },
  mounted() {
    this.$emit('setPage', {
      page: this.currentPage,
      content: this.currentContent
    })
  },
  methods: {
    setPage(key) {
      this.currentPage = key
      this.$emit('setPage', {
        page: this.currentPage,
        content: this.currentContent
      })
    },
    nextPage() {
      if (this.currentPage === this.pages.length - 1) {
        return
      }
      this.setPage(this.currentPage + 1)
    },
    prevPage() {
      if (this.currentPage === 0) {
        return
      }
      this.setPage(this.currentPage - 1)
    }
  }
}
</script>

<style lang="scss">
  .plink {
    cursor: pointer;
  }
</style>

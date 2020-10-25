<template>
  <div id="blog">
    <h1>Blog</h1>
    <div class="blogcontainer">
      <div v-for="(post, key) in page" :key="key" class="blogpost">
        <router-link :to="'/post/' + post.slug">
          <div v-if="post.featuredImage" :style="{ backgroundImage: 'url(' + post.featuredImage + ')'}" class="imagecontainer" />
          <div v-if="!post.featuredImage" class="imagecontainer nofeature" />
        </router-link>
        <div class="post-text">
          <router-link :to="'/post/' + post.slug">
            <h2 class="posttitle">
              {{ post.title }}
            </h2>
          </router-link>
          <p class="excerpt">
            {{ post.excerpt }}
          </p>
        </div>
      </div>
    </div>
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
  </div>
</template>

<script>
import { mapMutations } from 'vuex'

export default {
  name: 'Blog',
  head() {
    return {
      title: 'Noiice Blog',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Noiiice Blog. A Serverless blog.'
        }
      ]
    }
  },
  data() {
    return {
      content: []
    }
  },
  async asyncData({ store }) {
    if (!store.state.blog.posts.length) {
      console.log('getting posts') // eslint-disable-line
      await store.dispatch('blog/getPosts')
    }
    const paginatorParams = {
      id: 'blog',
      data: {
        content: store.state.blog.posts,
        perPage: 5,
        class: 'onpage'
      }
    }
    await store.dispatch('paginator/initPaginator', paginatorParams)
    const data = store.state.paginator.data.blog
    return {
      page: data.page,
      pages: data.pages,
      currentPage: data.currentPage
    }
  },
  methods: {
    ...mapMutations({
      getPosts: 'blog/getPosts'
    }),
    setPage(pagenum) {
      if (pagenum === this.currentPage) {
        return null
      }
      this.$store.dispatch('paginator/setPage', { id: 'blog', page: pagenum })
      this.updatePagination()
    },
    async nextPage() {
      const turn = await this.$store.dispatch('paginator/nextPage', 'blog')
      if (turn) {
        this.updatePagination()
      }
    },
    async prevPage() {
      const turn = await this.$store.dispatch('paginator/prevPage', 'blog')
      console.log(turn) //eslint-disable-line
      if (turn) {
        this.updatePagination()
      }
    },
    updatePagination() {
      this.page = this.$store.state.paginator.data.blog.page
      this.currentPage = this.$store.state.paginator.data.blog.currentPage
      window.scrollTo(0, 0)
    }
  }
}
</script>

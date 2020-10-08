<template>
  <div class="postcontainer">
    <transition name="swap" mode="out-in">
      <div id="post">
        <h1>{{ activePost.title }}</h1>
        <div class="postcontent">
          <div v-if="activePost.featuredImage" class="featuredImageContainer">
            <img id="featuredImage" :src="activePost.featuredImage">
          </div>
          <Markdown :content="activePost.content" />
        </div>
        <div class="commentsContainer">
          <div v-for="(comment, key) in comments" :key="key" class="comment">
            <div class="deleteContainer">
              <div v-if="$store.state.auth.admin || $store.state.auth.username === comment.user" @click="deleteComment({ uid: comment.uid, postuid: comment.postuid })" class="deleteComment">
                X
              </div>
            </div>
            <div class="commentuser">
              {{ comment.user }}: <span class="commentDate">{{ displayCommentDate(comment.created) }}</span>
            </div>
            <p>
              {{ comment.comment }}
            </p>
          </div>
        </div>
        <Comments />
        <nuxt-link id="edit-button" v-if="$store.state.auth.admin" :to="'/edit/' + activePost.slug" class="button secondary">
          Edit Post
        </nuxt-link>
      </div>
    </transition>
  </div>
</template>

<script>
import Markdown from '../../components/markdown'
import Comments from '../../components/comments'

export default {
  name: 'Post',
  components: {
    Markdown,
    Comments
  },
  data() {
    return {
      postSlug: '',
      loaded: false,
      postTitle: ''
    }
  },
  head() {
    return {
      title: `${this.activePost.title} | Noiice Blog`,
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: this.activePost.excerpt }
      ]
    }
  },
  computed: {
    activePost() {
      return this.$store.state.blog.activePost
    },
    comments() {
      return this.$store.state.blog.comments
    }
  },
  async fetch({ store, params, route, redirect }) {
    store.commit('setFullWidth', 'postwidth')
    if (!store.state.posts.length) {
      await store.dispatch('blog/getPosts')
    }
    const setActivePost = await store.dispatch('blog/setActivePost', params.post)
    if (setActivePost === null) {
      redirect('/blog')
    }
    const getComments = await store.dispatch('blog/getComments', null)
    return getComments
  },
  mounted() {
    this.loaded = true
    this.$store.dispatch('blog/getComments', null)
  },
  methods: {
    deleteComment(params) {
      const modalParams = {
        message: 'Are you sure you want to delete this comment?',
        buttons: [
          {
            label: 'Delete',
            classes: 'primary',
            action: () => {
              return this.$store.dispatch('closeModal').then(() => {
                this.$store.dispatch('blog/deleteComment', params)
                return true
              })
            }
          },
          {
            label: 'Cancel',
            classes: 'secondary',
            action: () => {
              return this.$store.dispatch('closeModal').then(() => {
                return false
              })
            }
          }
        ]
      }
      this.$store.dispatch('openModal', modalParams)
    },
    displayCommentDate(dtstr) {
      const month = dtstr.substring(5, 7)
      const day = dtstr.substring(8, 10)
      const hour = dtstr.substring(11, 13)
      const minute = dtstr.substring(14, 16)
      return `${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

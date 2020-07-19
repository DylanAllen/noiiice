<template>
  <div id="admin-posts" class="container">
    <no-ssr v-if="$store.state.auth.admin">
      <h2>Manage Posts</h2>
      <div class="wide-posts-container">
        <div class="posts-container">
          <div class="post-container header">
            <div class="postTitle">
              Post Title
            </div>
            <div class="user">
              Author
            </div>
            <div class="excerpt">
              Excerpt
            </div>
            <div class="time">
              Created
            </div>
            <div class="deleteComment">
              Delete
            </div>
          </div>
        </div>
        <div v-for="(post, key) in posts" :key="key" class="post-container">
          <div class="postTitle">
            <router-link :to="'/post/' + post.slug">
              {{ post.title }}
            </router-link>
          </div>
          <div class="user">
            {{ post.author }}
          </div>
          <div class="excerpt">
            {{ post.excerpt }}
          </div>
          <div class="time">
            {{ post.createdDate }}
          </div>
          <div class="deleteComment">
            <div @click="deletePost(post.uid)">
              X
            </div>
          </div>
        </div>
      </div>
      <div class="mobile-posts-container">
        <div v-for="(post, key) in posts" :key="key" class="post-container">
          <div class="mobilepostadmin header">
            <div class="inforow">
              <div class="postTitle">
                Post Title:
              </div>
              <div class="postTitle">
                <router-link :to="'/post/' + post.slug">
                  {{ post.title }}
                </router-link>
              </div>
            </div>
            <div class="inforow">
              <div class="user">
                Author:
              </div>
              <div class="user">
                {{ post.author }}
              </div>
            </div>
            <div class="inforow">
              <div class="excerpt">
                Excerpt:
              </div>
              <div class="excerpt">
                {{ post.excerpt }}
              </div>
            </div>
            <div class="inforow">
              <div class="time">
                Created:
              </div>
              <div class="time">
                {{ post.createdDate }}
              </div>
            </div>
            <div class="actionsrow">
              <div class="viewComment">
                <router-link :to="'/post/' + post.slug" class="button">
                  VIEW
                </router-link>
              </div>
              <div class="editComment">
                <router-link :to="'/edit/' + post.slug" class="button">
                  EDIT
                </router-link>
              </div>
              <div class="deleteComment">
                <button @click="deletePost(post.uid)" class="button">
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </no-ssr>
  </div>
</template>

<script>
import auth from '../../plugins/cognitoAuth'

export default {
  name: 'Posts',
  mixins: [auth],
  head() {
    return {
      title: 'Manage Posts | Noiice Blog Admin',
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: 'Noiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance' }
      ]
    }
  },
  data() {
    return {
    }
  },
  computed: {
    posts() {
      const posts = this.$store.state.blog.allPosts.map((post) => {
        const date = new Date(post.created)
        post.createdDate = `${date.getMonth() + 1}/${date.getDate() + 1}/${date.getFullYear()}`
        return post
      })
      return posts
    }
  },
  fetch({ store, params }) {
    return store.dispatch('blog/getAllPosts', true)
  },
  beforeMount() {
    return this.isAuthenticated((resp) => {
      if (!this.$store.state.auth.admin) {
        window.location = '/blog' // eslint-disable-line
      }
    })
  },
  methods: {
    deletePost(params) {
      const modalParams = {
        message: 'Are you sure you want to delete this post?',
        buttons: [
          {
            label: 'Delete',
            classes: 'primary',
            action: () => {
              return this.$store.dispatch('closeModal').then(() => {
                this.$store.dispatch('blog/deletePost', params)
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
    }
  }
}
</script>

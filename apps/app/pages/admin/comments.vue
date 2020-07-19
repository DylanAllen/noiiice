<template>
  <div id="admin-comments" class="container">
    <no-ssr v-if="$store.state.auth.admin">
      <h2>Comments</h2>
      <div class="filterContainer">
        <span class="filterDesc">
          Filter by post:
        </span>
        <select v-model="titleFilter">
          <option>
            All
          </option>
          <option v-for="(title, key) in postList" :key="key">
            {{ title }}
          </option>
        </select>
      </div>
      <div class="comments-container wide-comments">
        <no-ssr>
          <div v-if="commentsErr" class="container">
            <h3>Error loading comments. (CORS is not allowed for admin API calls)</h3>
          </div>
          <div v-if="!commentsErr" class="commentcontainer header">
            <div class="status">
              Status
            </div>
            <div class="user">
              User
            </div>
            <div class="comment">
              Comment
            </div>
            <div class="postTitle">
              Post Title
            </div>
            <div class="time">
              Created
            </div>
            <div class="deleteComment">
              Delete
            </div>
          </div>
          <div v-for="(comment, key) in currentComments" :key="key" class="commentcontainer">
            <div class="status">
              <select @change="updateComment(comment)" v-model="commentStatuses[comment.uid]" class="commentstatusselect">
                <option value="approved">
                  Approved
                </option>
                <option value="pending">
                  Pending
                </option>
                <option value="rejected">
                  Rejected
                </option>
              </select>
            </div>
            <div class="user">
              {{ comment.user }}
            </div>
            <div class="comment">
              {{ comment.comment }}
            </div>
            <div class="postTitle">
              <router-link :to="'/post/' + comment.slug">
                {{ comment.title }}
              </router-link>
            </div>
            <div class="time">
              {{ comment.created }}
            </div>
            <div class="deleteComment">
              <div @click="deleteComment({ uid: comment.uid, postuid: comment.postuid })">
                X
              </div>
            </div>
          </div>
        </no-ssr>
      </div>
      <div class="mobile-comments-container">
        <no-ssr>
          <div v-if="commentsErr" class="container">
            <h3>Error loading comments. (CORS is not allowed for admin API calls)</h3>
          </div>
          <div v-for="(comment, key) in currentComments" :key="key" class="commentcontainer">
            <div class="commentrow">
              <div class="status">
                Status:
              </div>
              <div class="status">
                <select @change="updateComment(comment)" v-model="commentStatuses[comment.uid]" class="commentstatusselect">
                  <option value="approved">
                    Approved
                  </option>
                  <option value="pending">
                    Pending
                  </option>
                  <option value="rejected">
                    Rejected
                  </option>
                </select>
              </div>
            </div>
            <div class="commentrow">
              <div class="user">
                User:
              </div>
              <div class="user">
                {{ comment.user }}
              </div>
            </div>
            <div class="commentrow">
              <div class="comment">
                Comment:
              </div>
              <div class="comment">
                {{ comment.comment }}
              </div>
            </div>
            <div class="commentrow">
              <div class="postTitle">
                Post Title:
              </div>
              <div class="postTitle">
                <router-link :to="'/post/' + comment.slug">
                  {{ comment.title }}
                </router-link>
              </div>
            </div>
            <div class="commentrow">
              <div class="time">
                Created:
              </div>
              <div class="time">
                {{ comment.created }}
              </div>
            </div>
            <div class="commentrow actionsrow">
              <div class="deleteComment">
                <button @click="deleteComment({ uid: comment.uid, postuid: comment.postuid })" class="button">
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </no-ssr>
      </div>
      <Paginator
        :per-page="25"
        :all-content="comments"
        @setPage="setPage($event)"
      />
    </no-ssr>
  </div>
</template>

<script>
import auth from '../../plugins/cognitoAuth'
import Paginator from '~/components/Paginator.vue'

export default {
  name: 'Comments',
  components: {
    Paginator
  },
  mixins: [auth],
  head() {
    return {
      title: 'Manage Comments | Noiice Blog Admin',
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: 'Noiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance' }
      ]
    }
  },
  data() {
    return {
      commentsErr: false,
      commentStatuses: [],
      titleFilter: 'All',
      currentComments: []
    }
  },
  computed: {
    comments() {
      const allComments = this.$store.state.blog.comments
      for (const index in allComments) {
        const comment = allComments[index]
        this.commentStatuses[comment.uid] = comment.status //eslint-disable-line
      }
      const comments = allComments.filter((comment) => {
        return this.titleFilter === 'All' || comment.title === this.titleFilter
      })
      return comments
    },
    postList() {
      const list = []
      this.$store.state.blog.comments.map((comment) => {
        if (!list.includes(comment.title)) {
          list.push(comment.title)
        }
      })
      return list
    }
  },
  mounted() {
    return this.isAuthenticated(async (resp) => {
      if (!this.$store.state.auth.admin) {
        window.location = '/blog' // eslint-disable-line
      } else {
        let comments
        try {
          comments = await this.$store.dispatch('blog/getComments', true)
        } catch (err) {
          console.log(err) // eslint-disable-line
          this.commentsErr = true
          comments = null
        }
        return comments
      }
    })
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
                this.$store.commit('blog/setActivePost', { slug: null, post: { title: '', content: '' } })
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
    updateComment(comment) {
      console.log(comment) // eslint-disable-line
      const newComment = comment
      newComment.status = this.commentStatuses[comment.uid]
      return this.$store.dispatch('blog/updateComment', newComment).then(() => {
        return this.$store.dispatch('blog/getComments', true)
      })
    },
    setPage(e) {
      this.currentComments = e.content
    }
  }
}
</script>

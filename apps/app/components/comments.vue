
<template>
  <div class="commentsComponent">
    <div v-if="$store.state.auth.auth" class="commentsForm">
      <textarea v-model="newComment" class="comment-textarea" maxlength="500" />
      <button @click="postComment()" class="button">
        Post Comment
      </button>
    </div>
  </div>
</template>

<script>
import auth from '../plugins/cognitoAuth'

export default {
  name: 'Comments',
  mixins: [auth],
  data() {
    return {
      newComment: ''
    }
  },
  fetch({ store, params }) {
    if (store.state.blog.activePost.title) {
      return store.dispatch('blog/getComments', null)
    }
  },
  methods: {
    postComment() {
      this.isAuthenticated((resp) => {
        console.log('fromisauth: ', resp)  // eslint-disable-line
        if (resp === 'not authenticated') {
          const modalParams = {
            message: 'Session expired, please log in again.',
            buttons: [
              {
                label: 'Ok',
                classes: 'primary',
                action: () => {
                  return this.$store.dispatch('closeModal')
                }
              }
            ]
          }
          return this.$store.dispatch('openModal', modalParams)
        }
        return this.$store.dispatch('blog/postComment', this.newComment).then(() => {
          this.newComment = ''
        })
      })
    }
  }
}
</script>

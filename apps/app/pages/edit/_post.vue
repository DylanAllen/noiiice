<template>
  <div id="newblog">
    <div v-if="$store.state.auth.admin">
      <h1>New Post</h1>
      <div class="editor">
        <div id="postform">
          <label>title</label>
          <input id="titleinput" v-model="editPost.title" name="titleinput" placeholder="Enter title here...">
          <label>url slug</label>
          <input
            id="sluginput"
            @change="validateSlug()"
            v-model="editPost.slug"
            :class="validslug ? '' : 'invalid'"
            name="sluginput"
            placeholder="URL slug for post..."
          >
          <label>content</label>
          <textarea id="contentinput" v-model="editPost.content" :class="stickymode ? 'sticky' : ''" name="contentinput" placeholder="Enter body markdown content here..." />
          <h3>excerpt</h3>
          <textarea id="excerptinput" v-model="editPost.excerpt" name="excerpt" placeholder="A short intro that will display in metadata..." />
        </div>

        <div class="righteditor">
          <label>featured image</label>
          <input id="featuredimage" v-model="editPost.featuredImage" name="imageinput" placeholder="Image url...">
          <div class="mediabuttons">
            <button @click="showMedia = !showMedia" class="button">
              Media Browser
            </button>
            <Uploader />
          </div>
          <transition name="fade" mode="out-in">
            <div id="previewcontainer" v-if="editPost.content" :class="prevmode ? 'prevmode' : ''">
              <div class="previewinner">
                <h1>{{ editPost.title }}</h1>
                <div class="featuredimagecontainer">
                  <img :src="editPost.featuredImage ? editPost.featuredImage : ''">
                </div>
                <Markdown :content="editPost.content" />
              </div>
            </div>
          </transition>
        </div>
      </div>
      <div class="buttonscontainer">
        <select v-model="editPost.status" class="statusbutton">
          <option>Draft</option>
          <option>Published</option>
          <option>Hidden</option>
        </select>
        <button id="publishbutton" @click="postBlog(editPost.title, $store.state.auth.username, editPost.content, editPost.status, editPost.excerpt, editPost.slug, editPost.featuredImage, editPost.uid, editPost.created)" class="button">
          Publish Blog
        </button>
      </div>
      <transition name="fade" mode="out-in">
        <div v-if="showMedia" class="mediamodal">
          <div @click="showMedia = false" class="mediaCloser">
            X
          </div>
          <Media :parentmodal="closeModal" />
        </div>
      </transition>
      <div class="floatingbuttons">
        <button v-if="editPost.content" @click="previewMode()" class="button previewbutton">
          {{ previewLabel }}
        </button>
        <button @click="stickyEditor()" class="button previewbutton stickyButton">
          {{ stickyLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import auth from '../../plugins/cognitoAuth'
import Uploader from '../../components/upload'
import Media from '../../components/media.vue'
import Markdown from '../../components/markdown.vue'

export default {
  name: 'NewBlog',
  components: {
    Uploader,
    Media,
    Markdown
  },
  head() {
    return {
      title: 'Create/Edit Post | Noiice Blog | A Serverless Blog by Dylan Allen',
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        { hid: 'description', name: 'description', content: 'Noiice Blog is a serverless blog developed by Dylan Allen. It is built on AWS services, Nuxt, and irrational exuberance' }
      ]
    }
  },
  mixins: [auth],
  data() {
    return {
      title: '',
      content: '',
      author: this.$store.state.username,
      excerpt: '',
      status: 'Draft',
      slug: '',
      featuredImage: '',
      validslug: true,
      showMedia: false,
      prevmode: false,
      stickymode: false,
      previewLabel: 'Preview',
      stickyLabel: 'Sticky Editor',
      editPost: {
        content: '',
        status: '',
        created: '',
        category: '',
        slug: '',
        featuredImage: '',
        modified: '',
        excerpt: '',
        author: '',
        title: '',
        bgStyle: '',
        uid: null
      }
    }
  },
  computed: {
    activePost() {
      return this.$store.state.blog.activePost
    }
  },
  fetch({ store, params }) {
    store.commit('setFullWidth', 'fullwidth')
    if (!store.state.blog.posts.length) {
      return store.dispatch('blog/getAllPosts', true).then(() => {
        return store.dispatch('blog/setActivePost', store.app.context.route.params.post)
      })
    } else if (store.app.context.route.params.post) {
      return store.dispatch('blog/setActivePost', store.app.context.route.params.post)
    } else {
      return store.dispatch('blog/setActivePost', null)
    }
  },
  mounted() {
    this.isAuthenticated((resp) => {
      if (resp === 'not authenticated') {
        if (!this.$store.state.auth.admin) {
          if (this.$root._route.params.post) {
            window.location = '/post/' + this.$root._route.params.post // eslint-disable-line
          } else {
            window.location = '/blog' // eslint-disable-line
          }
        }
        if (this.$store.state.blog.activePost.title) {
          this.editPost = this.$store.state.blog.activePost
        }
      } else {
        this.editPost = this.activePost
      }
    })
  },
  methods: {
    postBlog(title, author, content, status, excerpt, slug, featuredImage, uid, created) {
      if (!title || !author || !content || !status) {
        alert('Please fill in all fields.')
        return null
      }

      if (!this.validateSlug()) {
        alert('Please provide a valid url slug.')
        return null
      }

      const postdata = {
        title: title,
        author: author,
        content: content,
        status: status,
        excerpt: excerpt,
        created: created,
        featuredImage: featuredImage,
        slug: slug,
        uid: uid
      }

      this.$store.dispatch('blog/postBlog', postdata).then((resp) => {
        console.log(resp) // eslint-disable-line
        if (resp.data.err) {
          alert(resp.data.err)
        } else {
          this.$router.push({ path: '/blog' })
        }
      })
    },
    validateSlug() {
      const regex = new RegExp('^[a-z0-9]+(?:-[a-z0-9]+)*$')
      this.validslug = regex.test(this.editPost.slug)
      return regex.test(this.editPost.slug)
    },
    closeModal() {
      this.showMedia = false
    },
    previewMode() {
      this.previewLabel = this.prevmode ? 'Preview' : 'Exit Preview'
      this.prevmode = !this.prevmode
    },
    stickyEditor() {
      this.stickyLabel = this.stickymode ? 'Sticky Editor' : 'Unsticky Editor'
      this.stickymode = !this.stickymode
    }
  }
}
</script>

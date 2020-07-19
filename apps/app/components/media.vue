
<template>
  <div id="mediaComponent">
    <div v-if="loading" class="loading">
      <h3>
        Loading Media.
      </h3>
    </div>
    <div v-if="!loading" class="mediaContainer">
      <div v-for="(file, key) in $store.state.blog.media" :key="key" class="mediadiv">
        <h3>{{ file.filename }}</h3>
        <div
          :style="'background-image:url(https://' + bucket + '.s3.amazonaws.com/' + file.Key + ')'"
          @click="lightBoxImage(key)"
          class="imagecontainer"
        />
        <p class="clickurl">
          <span @click="copyUrl(file.url, false, false)">URL</span> | <span @click="copyUrl(file.url, true, false)">img tag</span>
        </p>
      </div>
    </div>
    <div v-if="modal" class="lightbox">
      <div @click="closeModal()" class="lightboxcloser">
        X
      </div>
      <div class="modalinner">
        <img :src="lightBoxUrl" @click="closeModal()">
        <div class="copycontainer">
          <button @click="copyUrl(lightBoxUrl, false, true)" class="button">
            Copy URL
          </button>
          <button @click="copyUrl(lightBoxUrl, true, true)" class="button">
            Copy img tag
          </button>
          <button @click="deleteImage(lightBoxUrl)" class="button delete">
            Delete File
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AWS from 'aws-sdk'
import auth from '../plugins/cognitoAuth'

export default {
  name: 'Media',
  mixins: [auth],
  props: {
    parentmodal: {
      default: () => {},
      type: Function
    }
  },
  data() {
    return {
      bucket: process.env.mediaBucket,
      media: null,
      loading: true,
      selectedMedia: null,
      modal: false,
      lightBoxUrl: '',
      lightBoxKey: null,
      keyListener: null
    }
  },
  mounted() {
    this.getMedia()
    window.addEventListener('keyup', (ev) => {
      if (ev.code === 'ArrowRight' && this.modal) {
        return this.nextImage()
      } else if (ev.code === 'ArrowLeft' && this.modal) {
        return this.prevImage()
      }
    })
  },
  methods: {
    getMedia() {
      this.isAuthenticated(() => {
        const s3 = new AWS.S3({
          sessionToken: this.$store.state.auth.idtoken,
          region: process.env.region,
          credentials: AWS.config.credentials,
          signatureVersion: 'v2'
        })
        const params = {
          Bucket: process.env.mediaBucket,
          MaxKeys: 10,
          Prefix: 'thumb'
        }
        s3.listObjects(params, (err, data) => {
          if (err) {
            console.log(err, err.stack) // eslint-disable-line
          } else {
            const media = data.Contents
            for (let i = 0; i < media.length; i++) {
              media[i].filename = media[i].Key.slice(6)
              media[i].url = `https://${this.bucket}.s3.amazonaws.com/full/${media[i].filename}`
            }
            this.$store.commit('blog/setMedia', media)
            this.loading = false
            return media
          }
        })
      })
    },
    copyUrl(url, tag, closeall) {
      const el = document.createElement('textarea')
      el.value = tag ? `<img src="${url}">` : url
      el.className = 'hidden'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      if (closeall) {
        this.closeModal()
        this.parentmodal()
      }
    },
    lightBoxImage(key) {
      this.lightBoxKey = key
      this.lightBoxUrl = this.$store.state.blog.media[key].url
      this.modal = true
    },
    nextImage() {
      if (this.$store.state.blog.media[this.lightBoxKey + 1]) {
        this.lightBoxKey++
      } else {
        this.lightBoxKey = 0
      }
      this.lightBoxImage(this.lightBoxKey)
    },
    prevImage() {
      if (this.lightBoxKey !== 0) {
        this.lightBoxKey--
      } else {
        this.lightBoxKey = this.$store.state.blog.media.length - 1
      }
      this.lightBoxImage(this.lightBoxKey)
    },
    closeModal() {
      this.modal = false
      this.keyListener = null
    },
    deleteImage(imageUrl) {
      const modalParams = {
        message: 'Are you sure you want to delete this file?',
        buttons: [
          {
            label: 'DELETE',
            classes: 'primary',
            action: async () => {
              await this.deleteImageAction(imageUrl)
              this.getMedia()
              this.closeModal()
              return this.$store.dispatch('closeModal')
            }
          },
          {
            label: 'CANCEL',
            classes: 'secondary',
            action: () => {
              return this.$store.dispatch('closeModal')
            }
          }
        ]
      }
      return this.$store.dispatch('openModal', modalParams)
    },
    async deleteImageAction() {
      await this.isAuthenticated()
      const s3 = new AWS.S3({
        sessionToken: this.$store.state.auth.idtoken,
        region: process.env.region,
        credentials: AWS.config.credentials,
        signatureVersion: 'v2'
      })
      const params = {
        Bucket: process.env.mediaBucket,
        Key: this.$store.state.blog.media[this.lightBoxKey].Key
      }
      return s3.deleteObject(params).promise()
    }
  }
}
</script>

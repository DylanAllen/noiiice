<template>
  <div class="uploadcomponent">
    <div class="filecontainer">
      <input id="fileinput" @input="uploadIt()" type="file" name="upload">
      <button @click="selectFile()" class="browse-btn">
        Browse
      </button>
      <span class="file-info">Upload a file</span>
    </div>
  </div>
</template>

<script>
import downscale from 'downscale'
import auth from '../plugins/cognitoAuth'

export default {
  name: 'Uploader',
  mixins: [auth],
  data() {
    return {
      uploadButton: null,
      fileInfo: null,
      realInput: null
    }
  },
  mounted() {
    this.uploadButton = document.querySelector('.browse-btn')
    this.fileInfo = document.querySelector('.file-info')
    this.realInput = document.getElementById('fileinput')
  },
  methods: {
    selectFile() {
      this.realInput.click()
    },
    uploadIt() {
      const fileel = document.getElementById('fileinput')
      const files = fileel.files
      if (!files.length) {
        return alert('Please choose a file to upload first.')
      }
      const file = files[0]
      return this.uploadFile(file, 'full').then((data) => {
        return this.thumbnail(file).then((thumb) => {
          return this.uploadFile(thumb, 'thumb').then(() => {
            console.log('File uploaded')  // eslint-disable-line
            console.log(data)  // eslint-disable-line
            const modalParams = {
              message: 'Image uploaded successfully!',
              buttons: [
                {
                  label: 'OK',
                  classes: 'primary',
                  action: () => {
                    return this.$store.dispatch('closeModal')
                  }
                },
                {
                  label: 'Copy URL',
                  classes: 'secondary',
                  action: () => {
                    this.copyUrl(data.Location, false, true)
                    return this.$store.dispatch('closeModal')
                  }
                },
                {
                  label: 'Copy IMG Tag',
                  classes: 'secondary',
                  action: () => {
                    this.copyUrl(data.Location, true, true)
                    return this.$store.dispatch('closeModal')
                  }
                }
              ]
            }
            return this.$store.dispatch('openModal', modalParams)
          })
        })
      }).catch((err) => {
        this.clog(err)
        alert('There was an error uploading your photo: ', err.message)
        return err
      })
    },
    thumbnail(file) {
      const options = {
        returnBlob: true
      }
      return downscale(file, 400, 300, options).then((resp) => {
        resp.lastModifiedDate = file.lastModifiedDate
        resp.name = file.name
        console.log(resp) // eslint-disable-line
        return resp
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
    }
  }
}
</script>

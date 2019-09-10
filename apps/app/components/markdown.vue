<template>
  <div class="markdown-renderer" v-html="contentOut" /> <!-- eslint-disable-line -->
</template>

<script>
import marked from 'marked'
import hljs from 'highlightjs'

export default {
  name: 'Markdown',
  props: {
    content: {
      type: String,
      default: '',
      required: false
    }
  },
  computed: {
    contentOut() {
      try {
        console.log('Generating markdown') // eslint-disable-line
        return marked(this.content)
      } catch (error) {
        console.log(error) // eslint-disable-line
        return error
      }
    }
  },
  created() {
    // this.dompurify = new CreateDOMPurify()
    console.log('setting marked options') // eslint-disable-line
    marked.setOptions({
      breaks: true,
      langPrefix: 'hljs ',
      highlight: (code, lang) => {
        try {
          return hljs.highlight(lang, code).value
        } catch (error) {
          return hljs.highlightAuto(code).value
        }
      }
    })
  }
}
</script>

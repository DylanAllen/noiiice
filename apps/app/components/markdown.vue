<template>
  <div class="markdown-renderer" v-html="contentOut" /> <!-- eslint-disable-line -->
</template>

<script>
import hljs from 'highlightjs'

const MarkdownIt = require('markdown-it')()
const MarkdownItKatex = require('@iktakahiro/markdown-it-katex')

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
        return MarkdownIt.render(this.content)
      } catch (error) {
        console.log(error) // eslint-disable-line
        return error
      }
    }
  },
  created() {
    // this.dompurify = new CreateDOMPurify()
    console.log('setting markdown-it options') // eslint-disable-line
    MarkdownIt.set({
      html: true,
      xhtmlOut: false,
      breaks: true,
      linkify: true,
      typographer: false,
      quotes: '“”‘’',
      langPrefix: 'hljs ',
      highlight: (code, lang) => {
        try {
          return hljs.highlight(lang, code).value
        } catch (error) {
          return hljs.highlightAuto(code).value
        }
      }
    })
    MarkdownIt.use(MarkdownItKatex, {
      throwOnError: true,
      errorColor: '#cc0000',
      displayMode: true,
      macros: {
        '\\RR': '\\mathbb{R}'
      }
    })
  }
}
</script>

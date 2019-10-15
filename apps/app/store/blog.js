import axios from 'axios'
export const strict = false
const { serviceUrl, domain, domainApiUrl } = require('../config.js').env
const apiUrl = domain ? domainApiUrl : serviceUrl

export const state = () => ({
  posts: [],
  allPosts: [],
  activePost: {
    title: '',
    content: ''
  },
  comments: [],
  activePostSlug: null,
  media: null,
  paginator: {}
})

export const mutations = {
  setPosts(state, posts) {
    state.posts = posts
  },
  setAllPosts(state, posts) {
    state.allPosts = posts
  },
  setComments(state, comments) {
    state.comments = comments
  },
  setActivePost(state, { slug, post }) {
    state.activePostSlug = slug
    state.activePost = post
  },
  setMedia(state, media) {
    state.media = media
  }
}

export const actions = {
  getPosts({ commit }) {
    return axios.get(`${apiUrl}/blog/get`)
      .then((response) => {
        const posts = []
        for (let i = 0; i < response.data.length; i++) {
          const post = response.data[i]
          post.created = new Date(post.created).valueOf()
          post.modified = new Date(post.modified).valueOf()
          if (post.status !== 'Draft') {
            if (post.featuredImage) {
              post.bgStyle = `background-image: ${post.featuredImage}`
            }
            const content = Buffer.from(post.content, 'base64').toString('ascii')
            post.content = content
            posts.push(post)
          }
        }
        const sortedPosts = posts.sort((a, b) => {
          if (a.created < b.created) return 1
          if (a.created > b.created) return -1
          return 0
        })
        commit('setPosts', sortedPosts)
        return sortedPosts
      })
  },
  getAllPosts({ commit }) {
    return axios.get(`${apiUrl}/blog/get`)
      .then((response) => {
        const posts = []
        for (let i = 0; i < response.data.length; i++) {
          const post = response.data[i]
          post.created = new Date(post.created).valueOf()
          post.modified = new Date(post.modified).valueOf()
          if (post.featuredImage) {
            post.bgStyle = `background-image: ${post.featuredImage}`
          }
          const content = Buffer.from(post.content, 'base64').toString('ascii')
          post.content = content
          posts.push(post)
        }
        const sortedPosts = posts.sort((a, b) => {
          if (a.created < b.created) return 1
          if (a.created > b.created) return -1
          return 0
        })
        commit('setAllPosts', sortedPosts)
        return sortedPosts
      })
  },
  async setActivePost({ commit, dispatch, state }, slug) {
    if (!slug) {
      const post = {
        content: '',
        status: 'Draft',
        created: '',
        category: '',
        slug: '',
        featuredImage: '',
        modified: '',
        excerpt: '',
        author: '',
        title: '',
        bgStyle: ''
      }
      return commit('setActivePost', { slug, post })
    } else {
      let slugFound = false
      for (let i = 0; i < state.posts.length; i++) {
        const post = state.posts[i]
        if (post.slug === slug) {
          slugFound = true
          commit('setActivePost', { slug, post })
          await dispatch('getComments', null)
          return post
        }
      }
      if (!slugFound) {
        for (let i = 0; i < state.allPosts.length; i++) {
          const post = state.allPosts[i]
          if (post.slug === slug) {
            slugFound = true
            commit('setActivePost', { slug, post })
            await dispatch('getComments', null)
            return post
          }
        }
      }
      return null
    }
  },
  postBlog({ state, rootState }, postdata) {
    const { title, author, status, slug, created, excerpt, featuredImage, uid } = postdata
    let content = null
    try {
      content = Buffer.from(postdata.content).toString('base64')
    } catch (error) {
      console.log(error.message)  // eslint-disable-line
      alert('Error encoding content. Remove special characters.')
      return null
    }

    if (!title || !author || !content || !status || !slug) {
      alert('Please fill in all fields.')
      return null
    }

    const today = Date.now()

    const blogData = {
      title: title,
      author: author,
      content: content,
      status: status,
      appclientid: rootState.auth.appclientid,
      created: created !== '' ? created : today,
      modified: today,
      excerpt: excerpt,
      featuredImage: featuredImage,
      slug: slug,
      uid: uid
    }

    const params = {
      method: 'POST',
      url: `${apiUrl}/blog/post`,
      data: JSON.stringify(blogData),
      headers: {
        Authorization: rootState.auth.idtoken,
        'X-Api-Key': rootState.auth.APIKey
      }
    }

    console.log('BlogData', params) // eslint-disable-line
    return axios(params).then((resp) => {
      console.log('PostResp:', params)  // eslint-disable-line
      return resp
    })
  },
  async updateComment({ state, rootState, dispatch }, comment) {
    const params = {
      method: 'PUT',
      url: `${apiUrl}/comment/update`,
      data: JSON.stringify(comment),
      headers: {
        Authorization: rootState.auth.idtoken,
        'X-Api-Key': rootState.auth.APIKey
      }
    }

    try {
      const response = await axios(params)
      return response
    } catch (error) {
      console.log(error)  // eslint-disable-line
      return error
    }
  },
  async postComment({ state, rootState, dispatch }, comment) {
    const nowdate = new Date()
    const monthNum = nowdate.toLocaleString('en-us', { month: '2-digit', timeZone: 'America/Chicago' })
    const year = nowdate.toLocaleString('en-us', { year: 'numeric', timeZone: 'America/Chicago' })
    const day = nowdate.toLocaleString('en-us', { day: '2-digit', timeZone: 'America/Chicago' })
    const hour = nowdate.toLocaleString('en-us', { hour: '2-digit', hour12: false, timeZone: 'America/Chicago' })
    const minute = nowdate.toLocaleString('en-us', { minute: '2-digit', timeZone: 'America/Chicago' })
    const second = nowdate.toLocaleString('en-us', { second: '2-digit', timeZone: 'America/Chicago' })
    const created = `${year}-${monthNum}-${day}:${hour}:${minute}:${second}`

    const commentData = {
      title: state.activePost.title,
      user: rootState.auth.username,
      comment: comment,
      appclientid: rootState.auth.appclientid,
      created: created,
      slug: state.activePost.slug,
      uid: state.activePost.uid
    }

    const params = {
      method: 'POST',
      url: `${apiUrl}/comment/post`,
      data: JSON.stringify(commentData),
      headers: {
        Authorization: rootState.auth.idtoken,
        'X-Api-Key': rootState.auth.APIKey
      }
    }

    console.log('CommentData', params) // eslint-disable-line
    try {
      const response = await axios(params)
      console.log('PostResp:', response)  // eslint-disable-line
      dispatch('getComments', null)
      return response
    } catch (error) {
      console.log(error)  // eslint-disable-line
      const modalParams = {
        message: 'Error posting comment.',
        buttons: [
          {
            label: 'Ok',
            classes: 'primary',
            action: () => {
              return dispatch('closeModal', null, { root: true }).then(() => {
                return true
              })
            }
          }
        ]
      }
      dispatch('openModal', modalParams, { root: true })
    }
  },
  getComments({ commit, state, rootState }, all) {
    const sortCreated = (a, b) => {
      if (a.created > b.created) {
        return -1
      }
      if (a.created < b.created) {
        return 1
      }
      return 0
    }

    const params = {
      methos: 'GET',
      url: `${apiUrl}/comment/get/${state.activePost.uid}`
    }
    if (all === true) {
      params.url = `${apiUrl}/comment/getall`
      params.headers = {
        Authorization: rootState.auth.idtoken
      }
    }
    return axios(params)
      .then((response) => {
        const comments = []
        for (let i = 0; i < response.data.Items.length; i++) {
          const comment = response.data.Items[i]
          comments.push(comment)
        }
        const sortedComments = comments.sort(sortCreated)
        commit('setComments', sortedComments)
        return comments
      })
  },
  deletePost({ state, rootState, dispatch }, uid) {
    const params = {
      method: 'POST',
      url: `${apiUrl}/blog/delete/${uid}`,
      data: '',
      headers: {
        Authorization: rootState.auth.idtoken,
        'X-Api-Key': rootState.auth.APIKey
      }
    }
    return axios(params)
      .then((response) => {
        return dispatch('getAllPosts')
      })
  },
  deleteComment({ commit, state, rootState, dispatch }, { uid, postuid }) {
    const params = {
      method: 'POST',
      url: `${apiUrl}/comment/delete/${postuid}/${uid}`,
      data: '',
      headers: {
        Authorization: rootState.auth.idtoken,
        'X-Api-Key': rootState.auth.APIKey
      }
    }
    return axios(params)
      .then((response) => {
        const activePost = !state.activePostSlug ? true : null
        return dispatch('getComments', activePost)
      })
  }
}

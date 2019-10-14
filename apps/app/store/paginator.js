export const strict = false

export const state = () => ({
  data: {
    id: {
      content: [],
      perPage: 5,
      currentPage: 0,
      pages: [],
      page: [],
      class: 'onpage',
      pclass: 'onpage'
    }
  }
})

export const mutations = {
  setPaginator(state, { id, data }) {
    state.data[id] = data
  }
}

export const actions = {
  initPaginator({ commit }, { id, data }) {
    const paginator = data
    const pages = []
    for (let i = 0, j = paginator.content.length; i < j; i += paginator.perPage) {
      const page = paginator.content.slice(i, i + paginator.perPage)
      pages.push(page)
    }
    paginator.pages = pages
    paginator.page = pages[0]
    paginator.currentPage = 0
    paginator.pclass = `${data.class}${data.currentPage}`
    commit('setPaginator', { id, data })
  },
  nextPage({ dispatch, state }, id) {
    if (state.data[id].currentPage === state.data[id].pages.length - 1) {
      return null
    }
    dispatch('setPage', { id, page: state.data[id].currentPage + 1 })
    return true
  },
  prevPage({ dispatch, state }, id) {
    if (state.data[id].currentPage === 0) {
      return null
    }
    dispatch('setPage', { id, page: state.data[id].currentPage - 1 })
    return true
  },
  setPage({ commit, state }, { id, page }) {
    const data = state.data[id]
    data.currentPage = page
    data.page = data.pages[data.currentPage]
    data.pclass = `${data.class}${data.currentPage}`
    return commit('setPaginator', { id, data })
  }
}

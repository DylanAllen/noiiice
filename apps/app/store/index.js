export const strict = false

export const state = () => ({
  posts: [],
  modalActive: false,
  modalData: null,
  fullWidth: false,
  theme: 'default',
  themes: ['default', 'clean', 'cleandark', 'rounded', 'cards']
})

export const mutations = {
  openModal(state, data) {
    state.modalActive = true
    state.modalData = data
  },
  closeModal(state) {
    state.modalActive = false
    state.modalData = null
  },
  setFullWidth(state, width) {
    state.fullWidth = width
  },
  setTheme(state, theme) {
    state.theme = theme
  }
}

export const actions = {
  openModal({ commit }, data) {
    commit('openModal', data)
  },
  closeModal({ commit, dispatch }, closeFunction) {
    if (closeFunction) {
      closeFunction()
    }
    commit('closeModal')
  }
}

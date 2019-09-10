export const state = () => ({
  open: false
})

export const mutations = {
  toggleNav(state) {
    state.open = !state.open
  },
  closeNav(state) {
    state.open = false
  },
  openNav(state) {
    state.open = true
  }
}

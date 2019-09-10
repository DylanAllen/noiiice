export default function ({ store }) {
  store.commit('nav/closeNav')
  if (store.state.fullWidth) {
    store.commit('setFullWidth', false)
  }
}

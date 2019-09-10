export const state = () => ({
  auth: false,
  username: '',
  idtoken: '',
  token: '',
  appclientid: '',
  admin: '',
  prefRole: '',
  APIKey: ''
})

export const mutations = {
  signIn(state) {
    state.auth = true
  },
  signOut(state) {
    state.auth = false
    state.admin = false
  },
  setUserName(state, params) {
    const { user, session, apiKey } = params
    if (user === '') {
      state.username = ''
      state.idtoken = ''
      state.token = ''
      state.appclientid = ''
      state.APIKey = ''
      return null
    }
    state.username = user.username
    state.idtoken = session.getIdToken().getJwtToken()
    state.token = session.getAccessToken().getJwtToken()
    state.APIKey = apiKey
    const pool = session.getIdToken().payload['cognito:groups']
    const preferredRole = session.getIdToken().payload['cognito:preferred_role']
    if (pool) {
      state.appclientid = session.accessToken.payload.client_id
      if (pool.includes('admin')) {
        state.admin = true
        state.prefRole = preferredRole
      }
    }
  }
}

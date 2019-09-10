import { CognitoUserPool, AuthenticationDetails, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js'
import { STS, config, CognitoIdentityCredentials, S3, CognitoIdentityServiceProvider } from 'aws-sdk'
import { env } from '../config.js'

let userPool = ''
const poolData = {
  UserPoolId: process.env.userPoolId,
  ClientId: process.env.clientId
}

const auth = {
  name: 'authplugin',
  data() {
    return {
      userPool: '',
      poolData: {
        UserPoolId: process.env.userPoolId,
        ClientId: process.env.clientId
      },
      clog: console.log, // eslint-disable-line
      APIKey: null
    }
  },
  mounted() {
  },
  methods: {
    isAuthenticated(callback) {
      config.region = process.env.region
      userPool = new CognitoUserPool(poolData)
      const user = userPool.getCurrentUser()
      if (user) {
        user.getSession(async (err, session) => {
          if (err) {
            callback('not authenticated') // eslint-disable-line
            return
          }
          if (session) {
            if (session && session.isValid()) {
              this.setCredentials(session.getIdToken().getJwtToken())
              const apiKey = await this.getUserApiKey(session.getAccessToken().getJwtToken())
              this.$store.commit('auth/setUserName', { user: user, session: session, apiKey: apiKey })
              callback(user)
            } else {
              const refreshToken = session.getRefreshToken()
              if (refreshToken) {
                this.refreshSession(refreshToken, session.getIdToken().getJwtToken(), callback)
              }
            }
          }
        })
      } else {
        callback('not authenticated') // eslint-disable-line
      }
    },
    setCredentials(token) {
      config.credentials = new CognitoIdentityCredentials({
        IdentityPoolId: process.env.identityPoolId,
        Logins: {
          [`cognito-idp.${process.env.region}.amazonaws.com/${process.env.userPoolId}`]: token
        }
      })
      this.$store.commit('auth/signIn')
      this.refreshCredentials()
    },
    refreshSession(refreshToken, idToken, callback) {
      const user = userPool.getCurrentUser()
      if (user && refreshToken && idToken) {
        user.refreshSession(refreshToken, async (err, session) => {
          if (err) {
            callback(err, null)
          }
          if (session && session.isValid()) {
            this.setCredentials(session.getIdToken().getJwtToken())
            const apiKey = await this.getUserApiKey(session.getAccessToken().getJwtToken())
            console.log('The Api Key', apiKey) // eslint-disable-line
            this.$store.commit('auth/setUserName', { user: user, session: session, apiKey: apiKey })
            callback(user)
          }
        })
      }
    },
    refreshCredentials() {
      const promise = new Promise((resolve, reject) => {
        if (config.credentials) {
          config.credentials.refresh((error) => {
            if (error) {
              this.clog(error)
              reject(error)
            } else {
              resolve(userPool.getCurrentUser())
            }
          })
        }
      })
      return promise
    },
    resendConfirmCode(username, callback) {
      const cognitoUser = this.getCognitoUser(username)
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          callback(err, null)
        }
        callback(null, result)
      })
    },
    getCognitoUser(username) {
      const poolData = {
        UserPoolId: process.env.userPoolId,
        ClientId: process.env.clientId
      }
      const userPool = new CognitoUserPool(poolData)
      const userData = {
        Username: username,
        Pool: userPool
      }
      const cognitoUser = new CognitoUser(userData)
      return cognitoUser
    },
    confirmAccount(username, code, callback) {
      const cognitoUser = this.getCognitoUser(username)
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          this.clog(err)
          callback(err, null)
        }
        this.clog('call result: ' + result)
        callback(null, result)
      })
    },
    setNewPassAndLogin(username, currentPass, newPass, callback) {
      this.login(username, currentPass, callback, newPass)
    },
    createAccount(username, email, password, callback) {
      const poolData = {
        UserPoolId: process.env.userPoolId,
        ClientId: process.env.clientId
      }
      const userPool = new CognitoUserPool(poolData)
      const attributeList = []
      const dataEmail = {
        Name: 'email',
        Value: email
      }
      const attributeEmail = new CognitoUserAttribute(dataEmail)
      attributeList.push(attributeEmail)
      userPool.signUp(username, password, attributeList, null, function (err, result) {
        if (err) {
          callback(err, null)
          return
        }
        callback(null, result.user)
      })
    },
    login(username, password, callback, newPass) {
      const authenticationData = {
        Username: username,
        Password: password
      }
      const userData = {
        Username: username,
        Pool: userPool
      }
      const authDetails = new AuthenticationDetails(authenticationData)
      const user = new CognitoUser(userData)
      const challengeCallbacks = {
        onSuccess: (result) => {
          callback(null, 'SUCCESS')
        },
        onFailure: (err) => {
          callback(err, 'FAILURE')
        }
      }
      user.authenticateUser(authDetails, {
        newPasswordRequired: () => {
          if (newPass) {
            user.completeNewPasswordChallenge(newPass, null, challengeCallbacks)
          } else {
            callback(null, 'NEW_PASS')
          }
        },
        onSuccess: (result) => {
          this.setCredentials(result.getIdToken().getJwtToken())
          new STS().getCallerIdentity((err) => {
            if (err) {
              this.clog('STS Error: ', err)
            }
          })
          const theUser = userPool.getCurrentUser()
          theUser.getSession(async (err, session) => {
            if (err) {
              this.clog(err)
            } else {
              this.$store.commit('auth/signIn')
              const apiKey = await this.getUserApiKey(session.getAccessToken().getJwtToken())
              console.log('The Api Key', apiKey) // eslint-disable-line
              this.$store.commit('auth/setUserName', { user: user, session: session, apiKey: apiKey })
            }
          })
          callback(null, 'SUCCESS')
        },
        onFailure: (err) => {
          this.clog('AuthFailure: ', err)
          if (err.code === 'UserNotConfirmedException') {
            callback(err, 'CODE')
          } else {
            callback(err, 'FAILURE')
          }
        }
      })
    },
    logout() {
      const user = userPool.getCurrentUser()
      if (user) {
        user.signOut()
        this.$store.commit('auth/signOut')
        this.$store.commit('auth/setUserName', { user: '', session: null })
      }
    },
    async getUserFromToken(idToken) {
      const cognitoidentityserviceprovider = new CognitoIdentityServiceProvider()
      const params = {
        AccessToken: idToken
      }
      const getUser = await cognitoidentityserviceprovider.getUser(params).promise()
      return getUser
    },
    async getUserApiKey(idToken) {
      const user = await this.getUserFromToken(idToken)
      const attributes = user.UserAttributes
      const apiKey = await new Promise((resolve, reject) => {
        attributes.map((att) => {
          if (att.Name === 'custom:APIKey') {
            resolve(att.Value)
          }
        })
        resolve(null)
      })
      return apiKey
    },
    async uploadFile(file, path) {
      console.log('Uploading file') // eslint-disable-line
      await this.refreshCredentials()
      const s3 = new S3({
        apiVersion: '2006-03-01',
        params: { Bucket: env.mediaBucket }
      })
      console.log('credentials refreshed, uploading file')  // eslint-disable-line
      console.log(file)  // eslint-disable-line
      const fileName = file.name
      const filekey = `${path}/${fileName}`
      const upload = await s3.upload({
        Key: filekey,
        Body: file,
        ACL: 'public-read'
      }).promise()
      return upload
    }
  }
}

export default auth

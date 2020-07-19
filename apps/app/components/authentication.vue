<template>
  <div id="authenticator">
    <div id="authcontainer" v-if="!loggedIn && !loading">
      <h2 v-if="!this.$store.state.blog.auth">
        {{ formHeader }}
      </h2>
      <div class="unamecontainer">
        <label>Username</label>
        <input v-model="username" type="text" placeholder="Username">
      </div>
      <div v-if="signup" class="emailcontainer">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="email@domain.com">
      </div>
      <div v-if="confirmed" class="pwcontainer">
        <label>Password</label>
        <input @keyup.enter="onLogin()" v-model="currentPassword" type="password" placeholder="Password">
      </div>
      <div v-if="changePass" class="npwcontainer">
        <label>New Password</label>
        <input v-model="changedPassword" type="password" placeholder="New Password">
      </div>
      <div v-if="!confirmed" class="npwcontainer">
        <label>Confirmation Code</label>
        <input v-model="confirmCode" type="text" placeholder="Enter Code Here">
      </div>
      <div class="buttoncontainer">
        <button v-if="!loggedIn && !changePass && !signup && confirmed" @click="onLogin()">
          Login
        </button>
        <button v-if="changePass" @click="onNewPassword()">
          Set New Password
        </button>
        <button v-if="signup" @click="onSignUp()">
          Create Account
        </button>
        <button v-if="!confirmed" @click="onConfirmAccount()">
          Confirm Account
        </button>
      </div>
    </div>
    <div v-if="!loading && loggedIn" class="logoutcontainer">
      <h2>You are logged in.</h2>
      <div class="buttons-container">
        <router-link class="button" to="/blog">
          Blog
        </router-link>
      </div>
    </div>
    <div class="linkscontainer">
      <router-link v-if="signup" to="/login">
        Login
      </router-link>
      <router-link v-if="!signup && !loggedIn" to="/signup">
        Signup
      </router-link>
    </div>
    <div v-if="errorMessage" class="errorcontainer">
      <p>{{ errorMessage }}</p>
    </div>
    <div v-if="!confirmed" class="resendContainer">
      <p @click="onSendConfirmation()" class="resendlink">
        Resend confirmation code
      </p>
    </div>
  </div>
</template>

<script>
import auth from '../plugins/cognitoAuth'

export default {
  name: 'Authentication',
  mixins: [auth],
  data() {
    return {
      loggedIn: false,
      loading: true,
      username: '',
      email: '',
      changePass: false,
      confirmed: true,
      confirmCode: '',
      signup: false,
      currentPassword: '',
      changedPassword: '',
      errorMessage: '',
      formHeader: ''
    }
  },
  watch: {
    $route() {
      this.errorMessage = ''
      if (this.$route.name === 'login') {
        this.setHeader('LOGIN')
        this.signup = false
      } else {
        this.setHeader('SIGN UP')
        this.signup = true
      }
    }
  },
  mounted() {
    this.loading = false
    console.log(this.$store.state.auth.auth) // eslint-disable-line
    if (this.$store.state.auth.auth) {
      this.loggedIn = true
    } else {
      this.loggedIn = false
      if (this.$route.name === 'login') {
        this.setHeader('LOGIN')
      } else {
        this.setHeader('SIGN UP')
        this.signup = true
      }
    }
    if (this.$route.query.redirect) {
      this.redirect = this.$route.query.redirect
      this.redirectTitle = this.redirect.substring(1)
    }
  },
  methods: {
    formIsValid() {
      if (this.username === null || this.currentPassword === null || (this.changePass && this.changedPassword === null)) {
        this.errorMessage = 'All fields are required'
        return false
      } else {
        return true
      }
    },
    setHeader(type) {
      switch (type) {
        case 'LOGIN':
          this.formHeader = 'Login'
          break
        case 'NEW_PASS':
          this.formHeader = 'Password Rest Required'
          break
        case 'SIGN UP':
          this.formHeader = 'Create an Account'
          break
        case 'CODE':
          this.formHeader = 'Confirm Account'
      }
    },
    onLogin() {
      this.errorMessage = null
      this.login(this.username, this.currentPassword, (err, res) => this.handleAuthResult(err, res))
    },
    handleAuthResult(err, result) {
      switch (result) {
        case 'NEW_PASS':
          this.changePass = true
          this.setHeader('NEW_PASS')
          break
        case 'CODE':
          this.confirmed = false
          this.setHeader('CODE')
          this.errorMessage = 'Enter the confirmation code sent to your email address.'
          break
        case 'SUCCESS':
          this.loggedIn = true
          this.errorMessage = ''
          break
        case 'FAILURE':
          if (err) {
            if (err.message === 'User is not confirmed.') {
              this.errorMessage = 'Please verify your email.'
            }
            this.errorMessage = err.message
          }
          break
      }
    },
    onLogout() {
      this.loggedIn = false
      this.username = null
      this.currentPassword = null
      this.setHeader('LOGIN')
      this.logout()
    },
    onNewPassword() {
      if (this.formIsValid()) {
        this.setNewPassAndLogin(this.username, this.currentPassword, this.changedPassword, (err, res) => {
          this.handleAuthResult(err, res)
        })
      }
    },
    onSendConfirmation() {
      this.resendConfirmCode(this.username, (err, res) => {
        if (err) {
          console.log(err) // eslint-disable-line
        } else {
          alert('Confirmation code sent')
        }
      })
    },
    onConfirmAccount() {
      this.confirmAccount(this.username, this.confirmCode, (err, resp) => {
        if (err) {
        } else {
          this.setHeader('LOGIN')
          this.confirmed = true
          this.errorMessage = ''
        }
      })
    },
    onSignUp() {
      this.createAccount(this.username, this.email, this.currentPassword, (err, user) => {
        if (err) {
          console.log('Signup Error', err) // eslint-disable-line
        } else {
          console.log('Signup success', user) // eslint-disable-line
          this.$router.push({ path: '/login' })
        }
      })
    }
  }
}
</script>

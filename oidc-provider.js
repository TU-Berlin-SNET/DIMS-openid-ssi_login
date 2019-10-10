/**
 * OpenID-Connect Provider
 */
'use strict'

const Provider = require('oidc-provider')
const config = require('./config')
const Account = require('./account')

const { Prompt, Check, base } = Provider.interactionPolicy

const didexchangePrompt = new Prompt(
  {
    name: 'did-exchange',
    requestable: true
  },
  new Check(
    'did_not_found',
    'did-exchange prompt was not resolved',
    'did_exchange_required',
    ctx => {
      console.log('did_not_found check')
      const { oidc } = ctx
      console.log(oidc.entities.Account)
      if (!oidc.entities.Account.data.theirDid) {
        return true
      }
      return false
    }
  )
)

const didauthPrompt = new Prompt(
  {
    name: 'did-auth',
    requestable: true
  },
  new Check(
    'did_auth_required',
    'proof of did ownership required',
    'interaction_required',
    ctx => {
      console.log('did-auth prompt')
      // TODO check if did-auth is required
      return false
    }
  )
)

const proofexchangePrompt = new Prompt(
  {
    name: 'proof-exchange',
    requestable: true
  },
  new Check(
    'proof_exchange_required',
    'proof of attributes/claims required',
    'interaction_required',
    ctx => {
      console.log('proof-exchange prompt')
      // TODO check if proof-exchange is required
      return false
    }
  )
)

const policy = base()
policy.add(didexchangePrompt, 1)
policy.add(didauthPrompt, 2)
policy.add(proofexchangePrompt, 3)

const oidc = new Provider(config.OIDC_URL, {
  // TODO provide production storage adapter, e.g.
  // adapter: RedisAdapter,

  clients: config.OIDC_CLIENTS,

  // TODO provide jwks
  // jwks,

  // oidc-provider only looks up the accounts by their ID when it has to read the claims,
  // passing it our Account model method is sufficient, it should return a Promise that resolves
  // with an object with accountId property and a claims method.
  findAccount: Account.findById,

  // let's tell oidc-provider we also support the email scope, which will contain email and
  // email_verified claims
  // TODO: think about how to configure arbitrary scopes, or dynamically change and adapt them
  claims: {
    openid: ['sub'],
    email: ['email', 'email_verified']
  },

  interactions: {
    // set custom policy with additional prompts for did-exchange/-auth and proof-exchange
    policy,

    // let's tell oidc-provider where our own interactions will be
    // setting a nested route is just good practice so that users
    // don't run into weird issues with multiple interactions open
    // at a time.
    url (ctx, interaction) {
      return `/interaction/${ctx.oidc.uid}`
    }
  },

  formats: {
    AccessToken: 'jwt'
  },

  features: {
    // disable the packaged interactions
    devInteractions: { enabled: false },

    encryption: { enabled: true },
    introspection: { enabled: true },
    revocation: { enabled: true }
  }
})

oidc.proxy = true
oidc.keys = config.SECURE_KEY.split(',')

module.exports = oidc

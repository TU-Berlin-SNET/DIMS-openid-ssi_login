/**
 * OpenID-Connect Provider
 */
'use strict'

const Provider = require('oidc-provider')
const config = require('./config')
const scopeMapper = require('./scope-mapper')
const Account = require('./account')

// registered prompts, add in order that they should be called
const prompts = [
  require('./prompts/select-continue-prompt'),
  require('./prompts/did-exchange-prompt'),
  require('./prompts/did-auth-prompt'),
  require('./prompts/proof-exchange-prompt'),
  require('./prompts/consent-prompt')
]

const { base } = Provider.interactionPolicy

const policy = base()
policy.clear()
prompts.forEach(prompt => policy.add(prompt.prompt))

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
  // TODO: think about how to configure arbitrary scopes or dynamically change and adapt them
  //       and how to map attributes from/to scopes and proofrequests
  //       also: how to ignore some scopes, e.g. offline_access in proof-requests
  claims: scopeMapper.supportedScopes,

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

    // TODO
    encryption: { enabled: true },
    introspection: { enabled: true },
    revocation: { enabled: true }
  }
})

oidc.proxy = true
oidc.keys = config.SECURE_KEY.split(',')

module.exports = { prompts, provider: oidc }

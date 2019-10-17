/**
 * Proof-Exchange Prompt
 */
'use strict'

const { Prompt, Check } = require('oidc-provider').interactionPolicy
const scopeMapper = require('../scope-mapper')
const APIUtils = require('../dims-api-utils')

const name = 'proof_exchange'

const prompt = new Prompt(
  {
    name,
    requestable: true
  },
  new Check(
    'proof_exchange_required',
    'proof of attributes required',
    'proof_exchange_required',
    ctx => {
      console.log('proof_exchange prompt check')
      const { oidc } = ctx
      const claims = oidc.account && oidc.account.claims()
      const scopes = oidc.params.scope.split(' ')

      // conditions for proof-exchange:
      // a) successful login (did-auth)
      // b) requested scopes can not be fulfilled with currently available claims
      console.log(oidc.session && oidc.account && !scopes.every(scope => (scopeMapper[scope] || []).every(attr => !!claims[attr] || typeof claims[attr] === 'boolean')))
      return oidc.session && oidc.account &&
        !scopes.every(scope =>
          (scopeMapper[scope] || []).every(attr => !!claims[attr] || typeof claims[attr] === 'boolean'))
    }
  )
)

const render = async (req, res, provider, details, client) => {
  console.log('proof_exchange render')
  const { uid, prompt, params, session } = details
  const account = await provider.Account.findAccount(undefined, session.accountId)
  const scopeAttrs = params.scope.split(' ').flatMap(scope => (scopeMapper[scope] || []))
  const claims = account.claims()
  const missingAttributes = scopeAttrs.filter(attr => !claims[attr] && attr !== 'email_verified')
  console.log(scopeAttrs, claims, missingAttributes)

  // eslint-disable-next-line camelcase
  const requested_attributes = {}
  for (let i = 0; i < missingAttributes.length; i++) {
    requested_attributes[missingAttributes[i]] = {
      name: missingAttributes[i]
      // restrictions: [{ cred_def_id: config.CRED_DEF_ID }]
    }
  }
  console.log(requested_attributes)

  const proofrequest = await APIUtils.createProofrequest(uid, account.accountId, 'oidc-provider-proof-request', {
    name: 'OIDC-Proof-Request',
    version: '0.1',
    requested_attributes,
    requested_predicates: {},
    non_revoked: { to: Math.floor(Date.now() / 1000) }
  })
  console.log(proofrequest)

  return res.render(name, {
    client,
    uid,
    details: prompt.details,
    params,
    title: name,
    flash: 'Please provide proof for attributes',
    action: name,
    proofrequestId: proofrequest.messageId
  })
}

const callback = async (req, res, next, provider) => {
  try {
    console.log('proof_exchange callback')
    const result = {
      [name]: {}
    }
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true })
  } catch (err) {
    console.log(err)
    next(err)
  }
}

module.exports = { prompt, render, callback }

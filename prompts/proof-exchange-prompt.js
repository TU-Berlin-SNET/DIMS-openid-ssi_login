/**
 * Proof-Exchange Prompt
 */
'use strict'

const { Prompt, Check } = require('oidc-provider').interactionPolicy
const config = require('../config')
const scopeMapper = require('../scope-mapper')
const APIUtils = require('../dims-api-utils')

const clientProofRestrictions = config.CLIENT_ATTRIBUTE_RESTRICTIONS || {}

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
      console.log('requested scopes', JSON.stringify(scopes))

      // conditions for proof-exchange:
      // a) successful login (did-auth)
      // b) requested scopes can not be fulfilled with currently available claims
      return oidc.session && oidc.account &&
        !scopeMapper.fulfillsScopes(claims, scopes)
    }
  )
)

const render = async (req, res, provider, details, client) => {
  console.log('proof_exchange render')
  const { uid, prompt, params, session } = details
  const account = await provider.Account.findAccount(undefined, session.accountId)
  const scopes = params.scope.split(' ')
  const claims = account.claims()
  const missingAttributes = scopeMapper.getMissingAttributes(claims, scopes)
  console.log(scopes, claims, missingAttributes)

  const proofrequest = await createProofrequest(uid, account.accountId, missingAttributes, clientProofRestrictions[client.clientId])

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

const createProofrequest = async (uid, accountId, missingAttributes, restrictions = {}) => {
  // eslint-disable-next-line camelcase
  const requested_attributes = {}
  for (let i = 0; i < missingAttributes.length; i++) {
    const attributeName = missingAttributes[i]
    const requestedAttribute = { name: attributeName }
    if (restrictions[attributeName]) {
      requestedAttribute.restrictions = restrictions[attributeName]
    }
    requested_attributes[attributeName] = requestedAttribute
  }
  console.log(JSON.stringify(requested_attributes, null, 4))

  const proofrequest = await APIUtils.createProofrequest(uid, accountId, 'oidc-provider-proof-request', {
    name: 'OIDC-Proof-Request',
    version: '0.1',
    requested_attributes,
    requested_predicates: {},
    non_revoked: { to: Math.floor(Date.now() / 1000) }
  })
  console.log(JSON.stringify(proofrequest, null, 4))

  return proofrequest
}

module.exports = { prompt, render, callback }

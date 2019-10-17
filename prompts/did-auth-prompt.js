/**
 * Login with DID-Auth
 */
'use strict'

const { base } = require('oidc-provider').interactionPolicy
// const APIUtils = require('../dims-api-utils')

const name = 'login'

const prompt = base().get('login')
prompt.name = name

const render = async (req, res, provider, details, client) => {
  console.log('render login')
  const { uid, prompt, params } = details

  // TODO APIUtils create did-auth request

  return res.render(name, {
    client,
    uid,
    details: prompt.details,
    params,
    title: 'Sign-in with DID-Auth',
    flash: 'Please sign in',
    action: name,
    data: {} // TODO did-auth
  })
}

const callback = async (req, res, next, provider) => {
  console.log('login callback')
  try {
    const { uid, prompt, params } = await provider.interactionDetails(req)
    const client = await provider.Client.find(params.client_id)

    // TODO verify did-auth
    const account = await provider.Account.findAccount(undefined, req.body.accountId)

    if (!account) {
      return res.render('login', {
        client,
        uid,
        details: prompt.details,
        params,
        title: 'Sign-in with DID-Auth',
        flash: 'Please sign in'
      })
    }

    const result = {
      [name]: {
        account: account.accountId
      }
    }

    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true })
  } catch (err) {
    console.log(err)
    next(err)
  }
}

module.exports = { prompt, render, callback }

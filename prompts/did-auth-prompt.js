/**
 * Login with DID-Auth
 */
'use strict'

const { base } = require('oidc-provider').interactionPolicy
const APIUtils = require('../dims-api-utils')

const name = 'login'

const prompt = base().get('login')
prompt.name = name

const render = async (req, res, provider, details, client) => {
  console.log('render login')
  const { uid, prompt, params } = details

  const authrequest = await APIUtils.createDidAuthRequest(uid)
  console.log(authrequest)

  return res.render(name, {
    client,
    uid,
    details: prompt.details,
    params,
    title: 'Sign-in with DID-Auth',
    flash: 'Please sign in',
    action: name,
    data: JSON.stringify(authrequest.message)
  })
}

const callback = async (req, res, next, provider) => {
  console.log('login callback')
  try {
    const { uid, prompt, params } = await provider.interactionDetails(req)
    console.log(params)
    const client = await provider.Client.find(params.client_id)

    const authResponse = APIUtils.didAuths[uid]
    console.log(JSON.stringify(authResponse, null, 4))
    const account = authResponse && authResponse.meta.isValid
      ? await provider.Account.findAccount(undefined, authResponse.meta.content.did)
      : undefined
    delete APIUtils.didAuths[uid]
    console.log(account)

    // const account = await provider.Account.findAccount(undefined, req.body.accountId)

    if (!account) {
      const authrequest = await APIUtils.createDidAuthRequest(uid)
      return res.render(name, {
        client,
        uid,
        details: prompt.details,
        params,
        title: 'Sign-in with DID-Auth',
        flash: 'Please sign in',
        action: name,
        data: JSON.stringify(authrequest.message)
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

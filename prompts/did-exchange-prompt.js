/**
 * DID-Exchange Prompt
 */
'use strict'

const { Prompt, Check } = require('oidc-provider').interactionPolicy
const APIUtils = require('../dims-api-utils')

const name = 'did_exchange'

const prompt = new Prompt(
  {
    name,
    requestable: true
  },
  new Check(
    'did_exchange_required',
    'no pairwise connection established',
    'did_exchange_required',
    ctx => {
      console.log('did_exchange prompt check')
      const { oidc } = ctx
      return oidc.result &&
        oidc.result.select_continue.selection === name &&
        !oidc.result[name]
    }
  )
)

const render = async (req, res, provider, details, client) => {
  console.log('did_exchange render')
  const { uid, prompt, params } = details

  const connectionOffer = await APIUtils.createConnectionOffer(uid)

  console.log('rendering prompt did-exchange')
  return res.render(name, {
    client,
    uid,
    details: prompt.details,
    params,
    title: 'DID-Exchange',
    flash: 'Please connect with us',
    action: name,
    data: JSON.stringify(connectionOffer.message)
  })
}

const callback = async (req, res, next, provider) => {
  console.log('did_exchange callback')
  try {
    // const details = await provider.interactionDetails(req)
    // const account = await provider.Account.findAccount(undefined, details.session.accountId)

    // add login in result to skip that step after did-exchange
    // TODO really skip that step? currently the form submit does not
    // provide that level of confidence
    // const result = {
    //   login: {
    //     account: account.accountId
    //   }
    // }
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

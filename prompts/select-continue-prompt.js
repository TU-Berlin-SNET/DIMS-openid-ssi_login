/**
 * Select how to continue,
 * Account (if session exists), DID-Auth, or DID-Exchange
 */
'use strict'

const assert = require('assert')
const { Prompt, Check } = require('oidc-provider').interactionPolicy

const name = 'select_continue'

const prompt = new Prompt(
  {
    name: name,
    requestable: true
  },
  new Check(
    'select_continue_required',
    'selection on how to proceed required',
    'select_continue_required',
    ctx => {
      console.log('select_continue prompt check')
      const { oidc } = ctx
      return !(oidc.result && oidc.result[name])
    }
  )
)

const render = async (req, res, provider, details, client) => {
  console.log('render select_continue')
  const { uid, prompt, params, session } = details
  console.log(session)
  return res.render(name, {
    client,
    uid,
    details: prompt.details,
    params,
    title: `Login to ${client.clientId}`,
    flash: 'Select how to proceed',
    session: session
  })
}

const callback = async (req, res, next, provider) => {
  console.log('callback select_continue')
  try {
    const details = await provider.interactionDetails(req, res)
    const { prompt } = details
    assert.strictEqual(prompt.name, name)

    let selection
    if (req.body.switch) {
      selection = 'login'
    }
    if (req.body.did_exchange) {
      selection = 'did_exchange'
    }
    if (selection) {
      if (details.params.prompt) {
        const prompts = new Set(details.params.prompt.split(' '))
        prompts.add(selection)
        details.params.prompt = [...prompts].join(' ')
      } else {
        details.params.prompt = 'logout'
      }
      await details.save()
    }
    console.log(req.body)
    console.log(selection)

    const result = { [name]: { selection } }
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false })
  } catch (err) {
    next(err)
  }
}

module.exports = { prompt, render, callback }

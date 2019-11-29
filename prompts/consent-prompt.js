/**
 * OIDC Consent Prompt
 */
'use strict'

const { base } = require('oidc-provider').interactionPolicy

const name = 'consent'

const prompt = base().get('consent')
prompt.name = name

const render = async (req, res, provider, details, client) => {
  console.log('render consent')
  const { uid, prompt, params } = details
  return res.render(name, {
    client,
    uid,
    details: prompt.details,
    params,
    title: 'Authorize'
  })
}

const callback = async (req, res, next, provider) => {
  console.log('callback consent')
  try {
    const result = {
      consent: {
        // rejectedScopes: [], // < uncomment and add rejections here
        // rejectedClaims: [], // < uncomment and add rejections here
      }
    }
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true })
  } catch (err) {
    next(err)
  }
}

module.exports = { prompt, render, callback }

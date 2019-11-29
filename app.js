/**
 * OpenID-Connect SSI-Login
 * Main
 */
'use strict'

const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')

const config = require('./config')
const WebSocketServer = require('./websocket')
const APIUtils = require('./dims-api-utils')

const { prompts, provider } = require('./oidc-provider')

// let's work with express here, below is just the interaction definition
const app = express()
const server = http.createServer(app)

app.set('trust proxy', true)

// defaults to ./views directory for templates
app.set('view engine', 'ejs')

// for public assets, e.g. js and css
// TODO replace with bundler like webpack or browserify
app.use(express.static('public'))

const parse = bodyParser.urlencoded({ extended: false })

function setNoCache (req, res, next) {
  res.set('Pragma', 'no-cache')
  res.set('Cache-Control', 'no-cache, no-store')
  next()
}

prompts.forEach(prompt => app.post(
  `/interaction/:uid/${prompt.prompt.name}`,
  setNoCache,
  parse,
  (req, res, next) => prompt.callback(req, res, next, provider))
)

app.get('/interaction/:uid', setNoCache, async (req, res, next) => {
  console.log('interaction/:uid')
  try {
    const details = await provider.interactionDetails(req)
    const { uid, prompt, params } = details
    const client = await provider.Client.find(params.client_id)

    // iterate through registered prompts..
    for (let i = 0; i < prompts.length; i++) {
      // ..render matching prompt
      if (prompt.name === prompts[i].prompt.name) {
        return await prompts[i].render(req, res, provider, details, client)
      }
    }

    // if none match
    // TODO this should not be the catch-all
    return res.render('consent', {
      client,
      uid,
      details: prompt.details,
      params,
      title: 'Authorize'
    })
  } catch (err) {
    return next(err)
  }
})

app.get('/interaction/:uid/abort', setNoCache, async (req, res, next) => {
  console.log('interaction/:uid/abort')
  try {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction'
    }
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false })
  } catch (err) {
    next(err)
  }
})

// leave the rest of the requests to be handled by oidc-provider, there's a catch all 404 there
app.use(provider.callback)

// register websockets
WebSocketServer(server)

// set up APIUtils and start server
APIUtils.setup()
  .then(server.listen(config.PORT))
  .then(console.log('up at %s:%s', server.address().address, server.address().port))
  .catch(err => {
    console.log(err)
    process.exit(1)
  })

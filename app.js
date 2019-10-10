/**
 * OpenID-Connect SSI-Login
 * Main
 */
'use strict'

const http = require('http')
const express = require('express')
const bodyParser = require('body-parser')

const config = require('./config')
const Account = require('./account')
const WebSocketServer = require('./websocket')
// const TicketService = require('./ticket-service')
const APIUtils = require('./dims-api-utils')

const oidc = require('./oidc-provider')

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
// const jsonParse = bodyParser.json()

function setNoCache (req, res, next) {
  res.set('Pragma', 'no-cache')
  res.set('Cache-Control', 'no-cache, no-store')
  next()
}

app.get('/interaction/:uid', setNoCache, async (req, res, next) => {
  console.log('interaction/:uid')
  try {
    const details = await oidc.interactionDetails(req)
    // console.log('see what else is available to you for interaction views', details)
    const { uid, prompt, params } = details

    const client = await oidc.Client.find(params.client_id)

    if (prompt.name === 'login') {
      // TODO signed envelope
      // const request = {
      //   id: uid,
      //   name: 'Identity',
      //   version: '0.1',
      //   requested_attributes: {
      //     attr1_referent: {
      //       name: 'firstName'
      //     },
      //     attr2_referent: {
      //       name: 'lastName'
      //     },
      //     attr3_referent: {
      //       name: 'email'
      //     }
      //   },
      //   requested_predicates: {}
      // }

      // const proofrequest = JSON.stringify({
      //   '@id': uid,
      //   '@type': 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/present-proof/1.0/request-presentation',
      //   comment: 'test-proof-request',
      //   '~service': {
      //     recipientKeys: ['somekeys'],
      //     routingKeys: ['somekeys'],
      //     serviceEndpoint: 'http://172.16.0.100:8000/indy'
      //   },
      //   'request_presentations~attach': {
      //     '@id': uid,
      //     'mime-type': 'application/json',
      //     data: { base64: Buffer.from(JSON.stringify(request), 'utf-8').toString('base64') }
      //   }
      // })

      return res.render('login', {
        client,
        uid,
        details: prompt.details,
        params,
        title: 'Sign-in',
        flash: 'Please sign in'
      })
    }

    if (prompt.name === 'did-exchange') {
      console.log('rendering prompt did-exchange')

      // TODO create connection offer
      // const connectionOffer = {}
      const connectionOffer = await APIUtils.createConnectionOffer(uid)

      const account = await Account.findById(undefined, details.session.accountId)
      account.data.myDid = connectionOffer.meta.myDid
      console.log(connectionOffer.meta)
      console.log(account.data)

      return res.render('qr-exchange', {
        client,
        uid,
        details: prompt.details,
        params,
        title: 'Did-Exchange',
        flash: 'Please connect with us',
        action: 'didexchange',
        data: JSON.stringify(connectionOffer.message)
      })
    }

    if (prompt.name === 'did-auth') {
      console.log('prompt name is did-auth')
      // TODO
    }

    if (prompt.name === 'proof-exchange') {
      console.log('prompt name is proof-exchange')
      // TODO
    }

    return res.render('interaction', {
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

app.post('/interaction/:uid/login', setNoCache, parse, async (req, res, next) => {
  console.log('interaction/:uid/login')
  try {
    const { uid, prompt, params } = await oidc.interactionDetails(req)
    const client = await oidc.Client.find(params.client_id)

    const account = await Account.authenticate(req.body.email, req.body.password)

    if (!account) {
      res.render('login', {
        client,
        uid,
        details: prompt.details,
        params: {
          ...params,
          login_hint: req.body.email
        },
        title: 'Sign-in',
        flash: 'Invalid email or password.'
      })
      return
    }

    const result = {
      login: {
        account: account.accountId
      }
    }

    console.log(result)

    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false })
  } catch (err) {
    console.log(err)
    next(err)
  }
})

app.post('/interaction/:uid/didexchange', setNoCache, parse, async (req, res, next) => {
  console.log('interaction/:uid/didexchange')
  try {
    const details = await oidc.interactionDetails(req)
    const account = await Account.findById(undefined, details.session.accountId)
    await oidc.interactionFinished(req, res, { login: { account: account.accountId } }, { mergeWithLastSubmission: true })
  } catch (err) {
    console.log(err)
    next(err)
  }
})

app.post('/interaction/:uid/confirm', setNoCache, parse, async (req, res, next) => {
  console.log('interaction/:uid/confirm')
  try {
    const result = {
      consent: {
        // rejectedScopes: [], // < uncomment and add rejections here
        // rejectedClaims: [], // < uncomment and add rejections here
      }
    }
    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: true })
  } catch (err) {
    next(err)
  }
})

app.get('/interaction/:uid/abort', setNoCache, async (req, res, next) => {
  console.log('interaction/:uid/abort')
  try {
    const result = {
      error: 'access_denied',
      error_description: 'End-User aborted interaction'
    }
    await oidc.interactionFinished(req, res, result, { mergeWithLastSubmission: false })
  } catch (err) {
    next(err)
  }
})

// app.post('/indy', jsonParse, (req, res, next) => {
//   console.log('/indy')
//   TicketService.receiveProof(req.body)
//   res.status(202).end()
// })

// leave the rest of the requests to be handled by oidc-provider, there's a catch all 404 there
app.use(oidc.callback)

// register websockets
WebSocketServer(server)

// set up APIUtils and start server
APIUtils.setup()
  .then(server.listen(config.PORT))
  .then(console.log('up at %s:%s', server.address().address, server.address().port))

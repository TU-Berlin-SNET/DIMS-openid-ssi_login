/**
 * Test OIDC Client
 */
'use strict'

const config = {
  protocol: 'http',
  host: 'localhost',
  port: '3000',
  sessionConfig: {
    key: 'dev-secret'
  },
  issuerDiscoveryUrl: 'http://localhost:3001',
  oidcClient: {
    client_id: 'dev-client',
    client_secret: 'dev-secret',
    redirect_uris: ['http://localhost:3000/cb'],
    response_types: ['code']
  }
}

const Koa = require('koa')
const session = require('koa-session')
const logger = require('koa-logger')
const Router = require('@koa/router')
const Passport = require('koa-passport')
const { Issuer, Strategy } = require('openid-client')

const app = new Koa()
const router = new Router()

async function init () {
  const vcOidcProvider = await Issuer.discover(config.issuerDiscoveryUrl)
  const client = new vcOidcProvider.Client(config.oidcClient)
  const params = { scope: 'openid profile email' }
  const oidcStrategy = new Strategy({ client, params }, (tokenset, userinfo, done) => {
    console.log(tokenset)
    console.log(userinfo)
    done(null, Object.assign({}, tokenset.claims(), userinfo))
  })

  const serializeFn = (user, done) => done(null, user)
  Passport.use('oidc', oidcStrategy)
  Passport.serializeUser(serializeFn)
  Passport.deserializeUser(serializeFn)

  app.use(logger())
  app.use(session(config.sessionConfig, app))
  app.use(Passport.initialize())
  app.use(Passport.session())

  router.get('/',
    async ctx => {
      if (ctx.isAuthenticated()) {
        ctx.body = indexHtml + `
<body>
  <div class="flex-container">
    <div class="login-box">
      <pre>${JSON.stringify(ctx.state.user, null, 4)}</pre>
    </div>
  </div>
</body> `
      } else {
        ctx.body = indexHtml + loginHtml
      }
    })

  router.get('/login', Passport.authenticate('oidc'))

  router.get('/cb', Passport.authenticate('oidc', { callback: true, successReturnToOrRedirect: '/' }))

  app.keys = [config.sessionConfig.key]
  app.use(router.routes())
  app.use(router.allowedMethods())

  app.listen(config.port, config.host, () => {
    console.log(`demo-client listening at ${config.host}:${config.port}`)
  })
}

init()
  .then(() => console.log('init complete'))
  .catch(err => console.error(err))

const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Medya Market OpenID-Connect Demo</title>
  <style>
    h2 {
      color: red;
      font-weight: bold;
      padding: 1rem;
      margin: 1rem;
    }

    pre {
      text-align: left;
      font-family: mono;
    }

    .flex-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 5rem;
    }

    .login-box {
      background: #f7f7f7;
      min-width: 33%;
      min-height: 33%;
      max-width: 66%;
      max-height: 66%;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 3px;
      flex-direction: column;
      text-align: center;
      box-shadow: 0px 2px 2px #0000004d;
      font-family: sans;
    }

    .login-btn {
      background: #1156fb;
      padding: 1rem;
      color: white;
      text-decoration: none;
      margin: auto;
      border-radius: 3px;
      transition: all 0.01s linear;
    }

    .login-btn:hover {
      filter: brightness(1.3);
    }

    .login-btn:active {
      transform: scale(0.95);
    }
  </style>
</head>
`

const loginHtml = `<body>
  <div class="flex-container">
    <div class="login-box">
      <h2>Medya Market OpenID Connect Demo</h2>
      <a href="/login" class="login-btn">Login with OIDC</a>
    </div>
  </div>
</body> `

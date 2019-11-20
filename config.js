/**
 * Configuration
 */
'use strict'

// require('dotenv').config()

module.exports = exports = {}

exports.PORT = 3001

exports.OIDC_URL = 'http://localhost:3001'

exports.OIDC_CLIENTS = [
  {
    client_id: 'MedyaMarket',
    client_secret: 'dev-secret',
    redirect_uris: ['http://localhost:3000/cb']
  },
  {
    client_id: 'Pluto',
    client_secret: 'dev-secret2',
    redirect_uris: ['http://localhost:3002/cb']
  }
]

// Not so secure...
// TODO: generate your own keys
// example https://securekey.heroku.com/
exports.SECURE_KEY = '4pndhwz8dk57la2fqz0rdakseofsnzqbuz8a0vcwirjkpypcb7,59b26bion3ow0o46hkw8laij99sm4gxe766q5iztumy7pz6o2m'

// TODO: do not use such a method for storing passwords, this is only for development purposes
// API user with trust anchor privileges is needed
exports.DIMS_API_USER = 'OpenIDSSILogin'
exports.DIMS_API_PASS = 'test123test'
exports.DIMS_API_WALLET = {
  name: 'openid-ssi-login-wallet',
  credentials: { key: 'openid-ssi-login-wallet-key' },
  seed: '00000000000000000000000000000Kvk'
}
exports.DIMS_API_URL = 'http://172.16.0.100:8000/api/'
exports.DIMS_API_WS = 'ws://172.16.0.100:8000'
exports.DIMS_API_POLL_INTERVAL = 1000

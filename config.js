/**
 * Configuration
 */
'use strict'

require('dotenv').config()

const CONFIG_PATH = process.env.DIMS_OIDC_PROVIDER_CONFIG_PATH || './example-config.json'

const config = require(CONFIG_PATH)

config.PORT = config.PORT || process.env.DIMS_OIDC_PROVIDER_PORT || 3001

config.OIDC_URL = config.OIDC_URL || process.env.DIMS_OIDC_PROVIDER_URL || 'http://localhost:3001'

config.SECURE_KEY = config.SECURE_KEY || process.env.DIMS_OIDC_PROVIDER_SECURE_KEY || 'changeMeSecureKey'

if (!config.DIMS_API_URL || !config.DIMS_API_WS) {
  const APP_DOMAIN_PROTOCOL = process.env.IDC_API_DOMAIN_PROTOCOL || 'http'
  const APP_DOMAIN_HOST = process.env.IDC_API_DOMAIN_HOST || '"REPLACE"'
  const APP_DOMAIN_PORT = process.env.IDC_API_DOMAIN_PORT || 8000
  const APP_DOMAIN_ENDPOINT = `${APP_DOMAIN_PROTOCOL}://${APP_DOMAIN_HOST}:${APP_DOMAIN_PORT}`
  config.DIMS_API_URL = config.DIMS_API_URL || APP_DOMAIN_ENDPOINT + '/api/'
  config.DIMS_API_WS = config.DIMS_API_WS || `ws://${APP_DOMAIN_HOST}:${APP_DOMAIN_PORT}`
}

config.DIMS_API_POLL_INTERVAL = config.DIMS_API_POLL_INTERVAL || process.env.DIMS_OIDC_PROVIDER_API_POLL_INTERVAL || 1000

config.DIMS_API_USER = config.DIMS_API_USER || process.env.DIMS_OIDC_PROVIDER_API_USER || 'OpenIDSSILogin'
config.DIMS_API_PASS = config.DIMS_API_PASS || process.env.DIMS_OIDC_PROVIDER_API_PASS || '23092489fh347dqpqoi'
if (!config.DIMS_API_WALLET) {
  config.DIMS_API_WALLET = {
    name: process.env.DIMS_OIDC_PROVIDER_API_WALLET_NAME || 'openid-ssi-login-wallet',
    credentials: { key: process.env.DIMS_OIDC_PROVIDER_API_WALLET_KEY || 'openid-ssi-login-wallet-key' },
    seed: process.env.DIMS_OIDC_PROVIDER_API_WALLET_SEED || '00000000000000000000000000000Kvk'
  }
}

module.exports = exports = config

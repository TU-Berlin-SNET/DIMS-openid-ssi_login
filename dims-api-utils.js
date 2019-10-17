/**
 * DIMS IEA API Utils
 */
'use strict'

const axios = require('axios')
// const WebSocket = require('ws')
const eventbus = require('./eventbus')
const Account = require('./account')

const {
  DIMS_API_USER,
  DIMS_API_PASS,
  DIMS_API_WALLET,
  DIMS_API_URL,
  // DIMS_API_WS,
  DIMS_API_POLL_INTERVAL
} = require('./config')

module.exports = exports = {}

const client = axios.create({ baseURL: DIMS_API_URL })
let token = ''
// let socket

const pendingRequests = []

/**
 * Wrap requests to login and try again if they fail the first time
 * @param {String} method
 * @param {String} url
 * @param {Object} data
 * @return {Promise<Object>} axios request response, may throw error
 */
async function apiRequest (method, url, data) {
  try {
    const res = await client.request({ method, url, data })
    return res
  } catch (err) {
    if (!err.isAxiosError || err.response.status !== 401) {
      throw err
    }
    await exports.login()
  }
  // this time, throw if it fails
  return client.request({ method, url, data })
}

/**
 * DIMS IEA API GET request with login wrap
 * @param {String} url
 * @return {Promise<Object>} axios request response, may throw error
 */
async function apiGet (url) {
  return apiRequest('get', url)
}

/**
 * DIMS IEA API POST request with login wrap
 * @param {String} url
 * @param {Object} [data]
 * @return {Promise<Object>} axios request response, may throw error
 */
async function apiPost (url, data = {}) {
  return apiRequest('post', url, data)
}

async function pollPendingRequests () {
  for (let i = pendingRequests.length - 1; i >= 0; i--) {
    const request = pendingRequests[i]
    const data = await pollPendingRequest(request)

    if (!data) {
      continue
    }

    console.log('dims-api-utils: request.data: ', data)

    if (request.type === 'connection' && data.my_did && data.their_did) {
      console.log('request.type === connection')

      // create account
      const account = await Account.register(data.their_did)
      console.log('created account', account)

      account.data.myDid = data.my_did
      account.data.theirDid = data.their_did
      console.log('updated account', account)

      // emit event
      eventbus.emit('connection.established', { uid: request.uid, data })

      // remove from pending requests
      pendingRequests.splice(i, 1)
    }

    if (request.type === 'proof' && data.status === 'received') {
      console.log('request.type === proof')
      if (data.isValid) {
        // find corresponding account with did
        const account = await Account.findById(undefined, data.did)
        console.log(account)
        if (!account) {
          throw new Error('account not found')
        }

        const attrs = Object.assign({}, data.proof.requested_proof.revealed_attrs, data.proof.requested_proof.self_attested_attrs)
        console.log(attrs)

        // update account with attributes from proof
        Object.entries(attrs).forEach(entry => {
          const [key, value] = entry
          account.data[key] = value
        })
      }
      // emit event
      eventbus.emit('proof.received', { uid: request.uid, data })

      // remove from pending requests
      pendingRequests.splice(i, 1)
    }
  }
}

async function pollPendingRequest (request) {
  try {
    return (await apiGet(`/${request.type}/${request.id}`)).data
  } catch (err) {
    console.log(err.message)
  }
}

exports.setup = async () => {
  try {
    // try to create the user, ignore if it fails (maybe the user already exists)
    await client.post('/user', { username: DIMS_API_USER, password: DIMS_API_PASS, wallet: DIMS_API_WALLET })
  } catch (err) {
    console.log('create user failed:', err.message)
  }

  try {
    await exports.login()
  } catch (err) {
    console.log('login failed: ', err.message)
    throw err
  }

  setInterval(pollPendingRequests, DIMS_API_POLL_INTERVAL)

  // TODO replace poll with websocket solution
  // socket = new WebSocket(DIMS_API_WS, { Authorization: token })
  // socket.on('message', message => {
  //   console.log('dims api websocket', message)
  //   const event = JSON.parse(message)
  //   eventbus.emit(event.name, event)
  // })
}

exports.login = async () => {
  const res = await client.post('/login', { username: DIMS_API_USER, password: DIMS_API_PASS })
  token = res.data.token
  client.defaults.headers.common.Authorization = token
}

exports.createConnectionOffer = async (uid, label, meta, data, role) => {
  const offer = (await apiPost('/connectionoffer', { label, meta, data, role })).data
  pendingRequests.push({ uid, id: offer.meta.myDid, type: 'connection' })
  return offer
}

exports.getConnection = async myDid => {
  try {
    return apiGet('/connection/' + myDid)
  } catch (err) {
    if (err.status === 404) {
      return false
    } else {
      throw err
    }
  }
}

exports.createProofrequest = async (uid, recipientDid, comment, proofRequest) => {
  const data = (await apiPost('/proofrequest', { recipientDid, comment, proofRequest })).data
  pendingRequests.push({ uid, id: data.meta.proofId, type: 'proof' })
  return data
}

exports.getProof = async (proofId) => {
  return (await apiGet('/proof/' + proofId)).data
}

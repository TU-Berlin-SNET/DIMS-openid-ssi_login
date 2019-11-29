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
let walletInfo
// let socket
let checkIsRunning = false

// const pendingRequests = []
const pendingConnections = []
const pendingDidAuths = []
const pendingProofs = []
const didAuths = {}

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

async function pollPending () {
  if (checkIsRunning) {
    return
  }
  checkIsRunning = true

  try {
    const runningOps = []
    if (pendingConnections.length > 0) {
      runningOps.push(checkPendingConnections())
    }
    if (pendingDidAuths.length > 0) {
      runningOps.push(checkPendingDidAuths())
    }
    if (pendingProofs.length > 0) {
      runningOps.push(checkPendingProofs())
    }
    await Promise.all(runningOps)
  } catch (err) {
    console.log(err)
    throw err
  } finally {
    checkIsRunning = false
  }
}

async function checkPendingConnections () {
  const conns = (await apiGet('/wallet/default/connection')).data
    .filter(conn => conn.metadata.oidcUid && pendingConnections.includes(conn.metadata.oidcUid))
  await Promise.all(conns.map(async conn => {
    const uid = conn.metadata.oidcUid
    const account = await Account.register(conn.their_did)
    console.log('created account', account)

    account.data.myDid = conn.my_did
    account.data.theirDid = conn.their_did
    console.log('updated account', account)

    // emit event
    eventbus.emit('connection.established', { uid, data: conn })

    // remove from pending connections
    pendingConnections.splice(pendingConnections.indexOf(uid), 1)
  }))
}

async function checkPendingDidAuths () {
  const didauthres = (await apiGet('/didauthresponse')).data
    .filter(res => res.recipientDid === walletInfo.ownDid && res.meta.oidcUid && pendingDidAuths.includes(res.meta.oidcUid))
  await Promise.all(didauthres.map(async res => {
    const uid = res.meta.oidcUid

    // store for reference
    didAuths[uid] = res

    // emit event
    eventbus.emit('didauth.completed', { uid, data: res })

    // remove from pending
    pendingDidAuths.splice(pendingDidAuths.indexOf(uid), 1)
  }))
}

async function checkPendingProofs () {
  for (let i = pendingProofs.length - 1; i >= 0; i--) {
    const request = pendingProofs[i]
    const data = await pollPendingRequest(request)

    if (!data || data.status !== 'received') {
      continue
    }

    console.log('dims-api-utils: request.data: ', data)

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
    pendingProofs.splice(i, 1)
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

  walletInfo = (await apiGet('/wallet/default')).data

  setInterval(pollPending, DIMS_API_POLL_INTERVAL)

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

exports.createConnectionOffer = async (uid, label, meta = {}, data, role) => {
  meta.oidcUid = uid
  const offer = (await apiPost('/connectionoffer', { label, meta, data, role, myDid: walletInfo.ownDid })).data
  pendingConnections.push(uid)
  // pendingConnections[uid] = true
  // pendingRequests.push({ uid, id: offer.meta.myDid, type: 'connection' })
  return offer
}

exports.createDidAuthRequest = async (uid) => {
  const didauthRequest = (await apiPost('/didauthrequest', { meta: { oidcUid: uid } })).data
  pendingDidAuths.push(uid)
  return didauthRequest
}

// exports.getConnection = async myDid => {
//   try {
//     return apiGet('/connection/' + myDid)
//   } catch (err) {
//     if (err.status === 404) {
//       return false
//     } else {
//       throw err
//     }
//   }
// }

exports.createProofrequest = async (uid, recipientDid, comment, proofRequest) => {
  const data = (await apiPost('/proofrequest', { recipientDid, comment, proofRequest })).data
  pendingProofs.push({ uid, id: data.meta.proofId, type: 'proof' })
  // pendingRequests.push({ uid, id: data.meta.proofId, type: 'proof' })
  return data
}

exports.didAuths = didAuths

// exports.getProof = async (proofId) => {
//   return (await apiGet('/proof/' + proofId)).data
// }

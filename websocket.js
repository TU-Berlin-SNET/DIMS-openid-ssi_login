/**
 * Websocket Support
 */
'use strict'

const WebsocketServer = require('ws').Server
const eventbus = require('./eventbus')

const WS_PING_INTERVAL = 30000 // config.APP_WS_PING_INTERVAL;

/**
 * Callback on Pong message from socket
 * Sets its isAlive property to true
 */
function setAlive () {
  // eslint-disable-next-line no-invalid-this
  this.isAlive = true
}

/**
 * Noop callback
 */
function noop () {}

/**
 * Ping or terminate connections, called periodically
 */
function livenessCheck () {
  const connEntries = Object.entries(connections)
  let terminateCounter = 0
  let pingCounter = 0
  for (let a = connEntries.length - 1; a >= 0; a--) {
    const [uid, conns] = connEntries[a]
    for (let b = conns.length - 1; b >= 0; b--) {
      const conn = conns[b]

      if (conn.isAlive === false) {
        conns.splice(b, 1)
        conn.terminate()
        terminateCounter++
      } else {
        conn.isAlive = false
        conn.ping(noop)
        pingCounter++
      }
    }

    if (connections[uid].length === 0) {
      console.log(`ws: no more connections from uid ${uid}, deleting property`)
      delete connections[uid]
    }
  }

  if (terminateCounter + pingCounter > 0) {
    console.log('socket liveness check pinged %d and terminated %d connections', pingCounter, terminateCounter)
  }
}

async function broadcast (event) {
  console.log('websocket:eventbus: event received')
  console.log(event)
  const message = JSON.stringify(event)
  const conns = connections[event.uid] || []
  console.log('conns', conns.length)
  conns.forEach(conn => {
    try {
      console.log('broadcasting event to uid', event.uid)
      conn.send(message)
    } catch (err) {
      console.log('failed to send event', event, err)
    }
  })
}

// key-value map userIds to connections/sockets[]
const connections = {}

module.exports = httpServer => {
  const server = new WebsocketServer({ noServer: true, perMessageDeflate: false })

  setInterval(livenessCheck, WS_PING_INTERVAL)

  eventbus.on('connection.established', broadcast)
  eventbus.on('proof.received', broadcast)

  httpServer.on('upgrade', async (req, socket, head) => {
    console.log('http server received upgrade request')
    try {
      // TODO check origin
      // req.origin

      const uidCookie = req.headers.cookie.split('; ').find(cookie => cookie.toLowerCase().startsWith('x-uid'))
      if (!uidCookie) {
        throw new Error('missing x-uid cookie header')
      }

      const [, uid] = uidCookie.split('=')
      if (!uid) {
        throw new Error('invalid or missing uid')
      }

      req.uid = uid
      server.handleUpgrade(req, socket, head, function done (ws) {
        server.emit('connection', ws, req)
      })
    } catch (err) {
      console.log('error on http upgrade', err)
      socket.destroy()
    }
  })

  server.on('connection', async (conn, req) => {
    conn.isAlive = true
    conn.on('pong', setAlive.bind(conn))

    if (!connections[req.uid]) {
      connections[req.uid] = []
    }
    connections[req.uid].push(conn)

    console.log(`ws: registered connection for uid ${req.uid}`)
  })
}

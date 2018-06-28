const ioServer = require('socket.io')
const ioClient = require('socket.io-client')

const { IS_PROD, HOST } = require('./config')
const Shared = require('./model/shared')
const initialPeerList = require('./peer-list')
const { whatsMyIp, isExternalIp } = require('./service/ip')

const peerList = IS_PROD ? initialPeerList : ['localhost:3000', 'localhost:4000']

async function selectPeer (peers) {
  const randomPeer = peers[Math.floor(Math.random() * peers.length)]
  const tryNextPeer = () => {
    if (peers.length > 1) {
      return whatsMyIp(peers.filter(host => host !== randomPeer))
    }
  }
  try {
    const ip = await whatsMyIp(randomPeer)
    return ip && (!IS_PROD || isExternalIp(ip)) ? randomPeer : tryNextPeer()
  } catch (error) {
    return tryNextPeer()
  }
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let io
function listenToPeers (server) {
  io = ioServer(server, { serveClient: false, cookie: false })
  io.of('/sender-stream').on('connection', socket => {
    socket.on('get shared history', respond => {
      // TODO: send history from given date
      respond('here is the history from ' + HOST)
    })
  })
  io.of('/receiver-stream').on('connection', socket => {
    socket.on('share content', data => receiveSharedContent(data, socket.to('sender-stream')))
  })
}

const upstream = { socket: false } // listen to created shared content
const downstream = { socket: false } // force one node to listen to my shared content

async function connectToUpAndDownStreams () {
  if (!IS_PROD) await sleep(500)
  if (!upstream.socket) {
    const randomPeer = await selectPeer(
      peerList.filter(host => ![HOST, downstream.host].includes(host))
    )
    if (randomPeer) {
      upstream.host = randomPeer
      upstream.socket = ioClient(`http://${randomPeer}/sender-stream`)
      upstream.socket.on('disconnect', () => (upstream.socket = false))
      upstream.socket.on('share content', data => {
        receiveSharedContent(data, io.of('sender-stream'))
      })
      // TODO: get history from last received shared content
      upstream.socket.emit('get shared history', console.log) // XXX
    }
  }
  if (!downstream.socket) {
    const randomPeer =
      (await selectPeer(peerList.filter(host => ![HOST, upstream.host].includes(host)))) ||
      upstream.host
    if (randomPeer) {
      downstream.host = randomPeer
      downstream.socket = ioClient(`http://${randomPeer}/receiver-stream`)
      downstream.socket.on('disconnect', () => (downstream.socket = false))
    }
  }
}

function emitSharedContent (data) {
  if (downstream.socket) {
    downstream.socket.emit('share content', data)
  }
  io.of('sender-stream').emit('share content', data)
}

async function receiveSharedContent (data, socket) {
  const formErrors = Shared.isValid(data)
  if (data._id && formErrors.length === 0) {
    try {
      await Shared.create(data)
      socket.emit('share content', data)
    } catch (error) {
      // Already in database: catch silently
    }
  }
}

function connectPeers (server) {
  listenToPeers(server)
  connectToUpAndDownStreams()
}

module.exports = {
  connectPeers,
  emitSharedContent
}

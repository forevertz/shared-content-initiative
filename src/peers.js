const ioServer = require('socket.io')
const ioClient = require('socket.io-client')

const { IS_PROD, HOSTNAME, PORT, MAX_CONTENT_LENGTH } = require('./config')
const Shared = require('./model/shared')
const initialPeerList = require('./peer-list')
const { whatsMyIp, isExternalIp } = require('./service/ip')

const HOST = `${HOSTNAME}:${PORT}`
const HOUR = 60 * 60
const MAX_HISTORY_HOUR = 24 * HOUR
const MAX_HISTORY_NUMBER = 10000

const peerList = IS_PROD ? initialPeerList : ['localhost:5423', 'localhost:3000']

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
    socket.on('get shared history', async ({ from }, respond) => {
      try {
        const history = (await Shared.find({
          query: {
            bool: {
              filter: { range: { created: { gte: Math.max(from || 0, MAX_HISTORY_HOUR) } } }
            }
          },
          size: MAX_HISTORY_NUMBER,
          sort: [{ created: 'desc' }]
        })).hits
        respond(history.map(({ _id, _source }) => ({ _id, ..._source })))
      } catch (error) {
        respond([])
      }
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
      const latestShared = await Shared.findLatest()
      const from = latestShared ? latestShared.created : null
      upstream.socket.emit('get shared history', { from }, async data => {
        for (const sharedContent of data) {
          await receiveSharedContent(sharedContent, false, { createdTooOld: MAX_HISTORY_HOUR })
        }
      })
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

async function receiveSharedContent (data, socket, validateOptions = {}) {
  const { _id, created, publicKey, ...rest } = data
  if (_id && created && publicKey && JSON.stringify(rest).length <= MAX_CONTENT_LENGTH) {
    const formErrors = Shared.isValid(data, validateOptions)
    if (formErrors.length === 0) {
      try {
        await Shared.create(data)
        if (socket) socket.emit('share content', data)
      } catch (error) {
        // Already in database: catch silently
      }
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

const ECDSA = require('ecdsa-secp256r1')
const micro = require('micro')

const packageInfo = require('../package.json')
const { PORT, MAX_CONTENT_LENGTH } = require('./config')
const { connectPeers } = require('./peers')

const { send, text } = micro

const endpoints = {
  MAX_CONTENT_LENGTH,
  GET: {
    '/doc': {
      description: 'List all API endpoints',
      call: () => {
        const { name, version, description, repository, license } = packageInfo
        return { name, version, description, repository, license, endpoints }
      }
    },
    '/is-up': {
      description: 'Is the server up and running',
      call: require('./endpoint/get-is-up')
    },
    '/whatsmyip': {
      description: 'Get my IP',
      call: require('./endpoint/get-whatsmyip')
    },
    '/share': {
      description: 'Find shared content',
      call: require('./endpoint/get-share')
    }
  },
  POST: {
    '/share': {
      description: 'Share a content',
      call: require('./endpoint/post-share')
    }
  }
}

async function checkRequest (request, response) {
  // Endpoint existance
  if (!endpoints[request.method] || !endpoints[request.method][request.pathname]) {
    return send(response, 404, { success: false, error: 'Not found' })
  }
  if (request.method === 'POST') {
    // Max content length
    const contentLength = parseInt(request.headers['content-length'])
    const rawBody = await text(request, { encoding: 'utf8' })
    if (!contentLength || contentLength > MAX_CONTENT_LENGTH || rawBody.length > contentLength) {
      return send(response, 413, {
        success: false,
        error: `Content length should be less than ${MAX_CONTENT_LENGTH} (but is ${contentLength})`
      })
    }
    // JSON content type
    const acceptedContentTypes = ['application/json', 'application/json; charset=utf-8']
    if (!acceptedContentTypes.includes(request.headers['content-type'])) {
      return send(response, 400, {
        success: false,
        error: `Header "Content-Type" should be one of "${acceptedContentTypes.join('", "')}"`
      })
    }
    // ECDSA Signature
    const publicKey = request.headers['x-public-key']
    const signature = request.headers['x-signature']
    if (!publicKey || !signature) {
      return send(response, 401, {
        success: false,
        error: 'Header should contain "X-Public-Key" and "X-Signature"'
      })
    }
    try {
      const key = ECDSA.fromCompressedPublicKey(publicKey)
      if (!(await key.hashAndVerify(rawBody, signature))) {
        return send(response, 401, {
          success: false,
          error: 'Header "X-Signature" does not verify (public key, BASE64(SIGN(SHA256(content))))'
        })
      }
    } catch (error) {
      return send(response, 401, {
        success: false,
        error:
          'Header "X-Public-Key" should be the compressed public key (264 bites) base64 encoded'
      })
    }
  }
  return true
}

const server = micro(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader(
    'Access-Control-Allow-Headers',
    ['Content-Type', 'X-Public-Key', 'X-Signature'].join(', ')
  )
  if (request.method === 'OPTIONS') {
    return ''
  } else {
    request.pathname = request.url.split('?')[0]
    if (await checkRequest(request, response)) {
      return endpoints[request.method][request.pathname].call(request, response)
    }
  }
})

connectPeers(server)

server.listen(PORT)

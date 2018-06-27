const ECDSA = require('ecdsa-secp256r1')
const { send, text } = require('micro')

const packageInfo = require('../package.json')

const endpoints = {
  MAX_CONTENT_LENGTH: 500,
  GET: {
    '/doc': {
      description: 'List all API endpoints',
      call: () => {
        const { name, version, description, repository, license } = packageInfo
        return { name, version, description, repository, license, endpoints }
      }
    }
  },
  POST: {
    '/share': {
      description: 'blablabla',
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
    if (
      !contentLength ||
      contentLength > endpoints.MAX_CONTENT_LENGTH ||
      rawBody.length > contentLength
    ) {
      return send(response, 413, {
        success: false,
        error: `Content length should be less than ${endpoints.MAX_CONTENT_LENGTH}`
      })
    }
    // JSON content type
    const acceptedContentTypes = ['application/json', 'application/json; charset=utf-8']
    if (!acceptedContentTypes.includes(request.headers['content-type'])) {
      return send(response, 400, {
        success: false,
        error: `Content type should be one of "${acceptedContentTypes.join('", "')}"`
      })
    }
    // ECDSA Signature
    const publicKey = request.headers['x-public-key']
    const signature = request.headers['x-signature']
    if (!publicKey || !signature) {
      return send(response, 401, {
        success: false,
        error: 'Header should contain X-Public-Key and X-Signature'
      })
    }
    try {
      const key = ECDSA.fromCompressedPublicKey(publicKey)
      if (!key.verify(rawBody, signature)) {
        return send(response, 401, {
          success: false,
          error: 'X-Signature does not match (public key, content)'
        })
      }
    } catch (error) {
      return send(response, 401, {
        success: false,
        error: 'X-Public-Key should be the compressed public key (264 bites) base64 encoded'
      })
    }
  }
  return true
}

module.exports = async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  request.pathname = request.url.split('?')[0]
  if (await checkRequest(request, response)) {
    return endpoints[request.method][request.pathname].call(request, response)
  }
}

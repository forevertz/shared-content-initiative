const { send, json } = require('micro')

const Shared = require('../model/shared')

async function checkRequest (data, request, response) {
  const { url, format } = data
  // URL format
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return send(response, 400, {
      success: false,
      error: 'Param "url" should start with "http://" or "https://"'
    })
  }
  // Format format
  const formats = ['text', 'html', 'image', 'audio', 'video']
  if (typeof format !== 'string' || !formats.includes(format)) {
    return send(response, 400, {
      success: false,
      error: `Param "format" should be one of ${formats.join(', ')}`
    })
  }
  return true
}

module.exports = async (request, response) => {
  const data = await json(request, { encoding: 'utf8' })
  if (await checkRequest(data, request, response)) {
    const { url } = data
    try {
      const result = await Shared.create({
        url,
        publicKey: request.headers['x-public-key'],
        created: new Date()
      })
      return { success: true, result }
    } catch (error) {
      return send(response, 500, { success: false, error: 'Unknown error' })
    }
  }
}

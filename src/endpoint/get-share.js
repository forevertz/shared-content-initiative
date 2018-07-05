const { send } = require('micro')

const Shared = require('../model/shared')

function parseQueryString (queryString) {
  return queryString.split('&').reduce(
    (params, paramString) => ({
      ...params,
      [paramString.split('=')[0]]: paramString
        .split('=')
        .slice(1)
        .join('')
    }),
    {}
  )
}

module.exports = async (request, response) => {
  try {
    const params = parseQueryString(request.url.split('?')[1] || '')
    const query = params.q
      ? params.q.startsWith('{')
        ? JSON.parse(decodeURIComponent(params.q))
        : { query_string: { query: decodeURIComponent(params.q) } }
      : { match_all: {} }
    const sharedContent = await Shared.find({ query, sort: [{ created: 'desc' }], size: 100 })
    return sharedContent
  } catch (error) {
    send(response, 500, { success: false, error: error.message })
  }
}

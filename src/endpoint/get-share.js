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

function validateQuery (q) {
  if (typeof q !== 'string' || !q.startsWith('{')) {
    throw new Error('Parameter "q" should be a stringyfied JSON')
  }
  if (q.includes(')*') || q.includes(')+')) {
    throw new Error('Parameter "q" should not contain wildcard regexp grouping')
  }
  if (q.includes('match_phrase_prefix')) {
    throw new Error('Parameter "q" should not contain prefix matching')
  }
  if (q.includes('query_string')) {
    throw new Error('Parameter "q" should not contain Lucene queries')
  }
}

module.exports = async (request, response) => {
  try {
    const { q } = parseQueryString(request.url.split('?')[1] || '')
    if (q) validateQuery(q)
    const query = q ? JSON.parse(decodeURIComponent(q)) : { match_all: {} }
    const sharedContent = await Shared.find({ query, sort: [{ created: 'desc' }], size: 100 })
    return sharedContent
  } catch (error) {
    send(response, 500, { success: false, error: error.message })
  }
}

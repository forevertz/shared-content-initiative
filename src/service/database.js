const elasticsearch = require('elasticsearch')

const { DATABASE_HOST } = require('../config')

const client = new elasticsearch.Client({
  host: DATABASE_HOST
})

async function isDatabaseConnected () {
  try {
    await client.ping()
    return true
  } catch (e) {
    return false
  }
}

function Model (index, properties) {
  const type = '_doc'
  client.indices.exists({ index }).then(async indexExists => {
    if (!indexExists) {
      await client.indices.create({ index })
    }
    client.indices.putMapping({ index, type, body: { properties } })
  })

  return {
    create: ({ _id, ...data }) => {
      return _id
        ? client.create({ index, type, id: _id, body: data })
        : client.index({ index, type, body: data }) // Auto-generates the id
    },
    find: async (query = {}) => {
      return (await client.search({ index, body: query })).hits
    }
  }
}

module.exports = {
  Model,
  isDatabaseConnected
}

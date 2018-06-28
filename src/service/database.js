const elasticsearch = require('elasticsearch')

const { DATABASE_HOST } = require('../config')

const client = new elasticsearch.Client({
  host: DATABASE_HOST
})

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
    }
  }
}

module.exports = Model

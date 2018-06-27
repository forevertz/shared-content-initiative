const elasticsearch = require('elasticsearch')

const client = new elasticsearch.Client({ host: 'localhost:9200', log: 'trace' })

function Model (index, properties) {
  const type = '_doc'
  client.indices.exists({ index }).then(async indexExists => {
    if (!indexExists) {
      await client.indices.create({ index })
    }
    client.indices.putMapping({ index, type, body: { properties } })
  })

  return {
    create: data => {
      return client.index({ index, type, body: data })
    }
  }
}

module.exports = Model

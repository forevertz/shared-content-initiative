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
  let indexExists

  async function createIndex () {
    try {
      indexExists = await client.indices.exists({ index })
      if (!indexExists) {
        indexExists = true
        await client.indices.create({ index })
      }
      client.indices.putMapping({ index, type, body: { properties } })
    } catch (error) {
      // Database is not connected yet
    }
  }
  function verifyIndex () {
    if (!indexExists) createIndex()
  }
  isDatabaseConnected()
    .then(createIndex)
    .catch(() => {})

  return {
    create: async ({ _id, ...data }) => {
      await verifyIndex()
      return _id
        ? client.create({ index, type, id: _id, body: data })
        : client.index({ index, type, body: data }) // Auto-generates the id
    },
    find: async (query = {}) => {
      await verifyIndex()
      return (await client.search({ index, body: query })).hits
    }
  }
}

module.exports = {
  Model,
  isDatabaseConnected
}

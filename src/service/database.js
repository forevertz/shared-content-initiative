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

function Model (index, properties, { maxDays = false } = {}) {
  const type = '_doc'
  let indexTemplateExists

  function getIndex (suffix) {
    return `${index}_${suffix}`
  }

  async function createIndexTemplate () {
    try {
      if (await client.indices.existsTemplate({ name: index })) {
        await client.indices.deleteTemplate({ name: index })
      }
      await client.indices.putTemplate({
        name: index,
        body: {
          index_patterns: [getIndex('*')],
          settings: {
            number_of_shards: 2,
            number_of_replicas: 1,
            refresh_interval: '1s'
          },
          mappings: {
            [type]: { properties }
          }
        }
      })
      indexTemplateExists = true
      if (maxDays) runCleanIndex()
    } catch (error) {
      // Database is not connected yet
    }
  }

  async function runCleanIndex () {
    const DAY = 1000 * 60 * 60 * 24
    const indexesToKeep = [...Array(maxDays + 1).keys()].map(day =>
      getIndex(new Date(Date.now() - day * DAY).toISOString().substr(0, 10))
    )
    const indexesToRemove = (await client.cat.indices({
      format: 'json',
      index: getIndex('*')
    }))
      .map(({ index }) => index)
      .filter(index => !indexesToKeep.includes(index))
    for (const indexToRemove of indexesToRemove) {
      await client.indices.delete({ index: indexToRemove })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    setTimeout(runCleanIndex, Math.floor(startOfDay.getTime() + 1 * DAY - Date.now()))
  }

  function verifyIndexTemplate () {
    if (!indexTemplateExists) createIndexTemplate()
  }

  isDatabaseConnected()
    .then(createIndexTemplate)
    .catch(() => {})

  return {
    create: async ({ _id, ...data }) => {
      await verifyIndexTemplate()
      const date = new Date(data.created * 1000).toISOString().substr(0, 10)
      return _id
        ? client.create({ index: getIndex(date), type, id: _id, body: data })
        : client.index({ index: getIndex(date), type, body: data }) // Auto-generates the id
    },
    find: async (query = {}) => {
      await verifyIndexTemplate()
      return (await client.search({ index: getIndex('*'), body: query })).hits
    }
  }
}

module.exports = {
  Model,
  isDatabaseConnected
}

const { send, json } = require('micro')

const Shared = require('../model/shared')
const { emitSharedContent } = require('../peers')
const { dedupe } = require('../service/util')

module.exports = async (request, response) => {
  const data = await json(request, { encoding: 'utf8' })
  const formErrors = Shared.isValid(data)
  if (formErrors.length === 0) {
    try {
      const sharedData = {
        ...data,
        publicKey: request.headers['x-public-key'],
        created: Math.floor(Date.now() / 1000)
      }
      if (sharedData.meta && sharedData.meta.tags) {
        sharedData.meta.tags = dedupe(sharedData.meta.tags)
      }
      const { _id } = await Shared.create(sharedData)
      emitSharedContent({ _id, ...sharedData })
      return { success: true, result: { _id } }
    } catch (error) {
      return send(response, 500, { success: false, error: error.message })
    }
  } else {
    send(response, 400, { success: false, error: 'Invalid data', errors: formErrors })
  }
}

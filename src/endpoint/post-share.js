const { send, json } = require('micro')

const Shared = require('../model/shared')
const { emitSharedContent } = require('../peers')

module.exports = async (request, response) => {
  const data = await json(request, { encoding: 'utf8' })
  const formErrors = Shared.isValid(data)
  if (formErrors.length === 0) {
    try {
      const sharedData = {
        ...data,
        publicKey: request.headers['x-public-key'],
        created: Math.floor(new Date().getTime() / 1000)
      }
      const { _id } = await Shared.create(sharedData)
      emitSharedContent({ _id, ...sharedData })
      return { success: true, result: { _id } }
    } catch (error) {
      return send(response, 500, { success: false, error: 'Unknown error' })
    }
  } else {
    send(response, 400, { success: false, error: 'Invalid data', errors: formErrors })
  }
}

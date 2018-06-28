const Model = require('../service/database')

// TODO: complete model
const Shared = new Model('shared', {
  url: { type: 'text' },
  format: { type: 'keyword' }, // text | html | image | audio | video
  publicKey: { type: 'text' },
  created: { type: 'date', format: 'epoch_second' }
})

Shared.isValid = (data, validateOptions = {}) => {
  const errors = []
  const { _id, url, format, created } = data
  // Authorized keys
  const authorizedKeys = ['_id', 'url', 'format', 'publicKey', 'created']
  const unauthorizedKeys = Object.keys(data).filter(key => !authorizedKeys.includes(key))
  if (unauthorizedKeys.length > 0) {
    errors.push(`Unauthorized keys: ${unauthorizedKeys.join(', ')}`)
  }
  // _id format
  if (_id && typeof _id !== 'string') {
    errors.push('Param "_id" should be a string')
  }
  // URL format
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    errors.push('Param "url" should start with "http://" or "https://"')
  }
  // Format format
  const formats = ['text', 'html', 'image', 'audio', 'video']
  if (!format || typeof format !== 'string' || !formats.includes(format)) {
    errors.push(`Param "format" should be one of ${formats.join(', ')}`)
  }
  // Created date format
  if (created) {
    if (typeof created !== 'number') {
      errors.push('Param "created" should be a number (timestamp in seconds)')
    } else {
      const MINUTE = 60
      const { createdTooOld = 2 * MINUTE } = validateOptions
      const diffInSeconds = Date.now() / 1000 - created
      if (!diffInSeconds) errors.push('Invalid "created" date')
      if (diffInSeconds > createdTooOld) errors.push('"created" date is too old')
      if (diffInSeconds < -MINUTE) errors.push('"created" date is in the future')
    }
  }
  return errors
}

Shared.findLatest = async () => {
  const [latest] = (await Shared.find({ size: 1, sort: { created: 'desc' } })).hits
  return latest ? latest._source : null
}

module.exports = Shared

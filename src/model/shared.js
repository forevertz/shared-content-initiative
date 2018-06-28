const Model = require('../service/database')

// TODO: complete model
const Shared = new Model('shared', {
  url: { type: 'text' },
  format: { type: 'keyword' }, // text | html | image | audio | video
  publicKey: { type: 'text' },
  created: { type: 'date' }
})

Shared.isValid = data => {
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
    const diffInSeconds = (Date.now() - new Date(created)) / 1000
    const MINUTE = 60
    if (!diffInSeconds) errors.push('Invalid "created" date')
    if (diffInSeconds > 2 * MINUTE) errors.push('"created" date is too old')
    if (diffInSeconds < -MINUTE) errors.push('"created" date is in the future')
  }
  return errors
}

module.exports = Shared

const Model = require('../service/database')

const Shared = new Model('shared', {
  url: { type: 'text' },
  format: { type: 'keyword' }, // text | html | image | audio | video
  publicKey: { type: 'text' },
  created: { type: 'date' }
})

module.exports = Shared

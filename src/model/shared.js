const mimeTypes = require('mime-db')

const { TTL_DAYS } = require('../config')
const { Model } = require('../service/database')
const iso = require('../service/iso')

/* ========================================================================== *
 * MODEL                                                                      *
 * ========================================================================== */

const SharedModel = {
  publicKey: { type: 'keyword' }, // compressed ECDSA public key
  created: { type: 'date', format: 'epoch_second' }, // timestamp in seconds
  externalRef: { type: 'keyword' },
  content: {
    properties: {
      url: { type: 'text' },
      mimeType: { type: 'keyword' }, // (https://www.iana.org/assignments/media-types/media-types.xhtml)
      width: { type: 'integer' }, // in pixels
      widthRange: { type: 'integer_range' }, // in pixels
      ratio: { type: 'float' }, // width/height
      ratioRange: { type: 'float_range' }
    }
  },
  meta: {
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
      image: {
        properties: {
          url: { type: 'text' },
          width: { type: 'integer' }, // in pixels
          height: { type: 'integer' } // in pixels
        }
      },
      type: { type: 'keyword' },
      category: { type: 'keyword' },
      locale: { type: 'keyword' }, // ISO 639-3 (https://iso639-3.sil.org/code_tables/639/data)
      tags: { type: 'keyword' },
      location: { type: 'geo_shape' } // GeoJSON or Well-Known Text (WKT) format
    }
  },
  conditions: {
    properties: {
      license: { type: 'keyword' },
      copyright: { type: 'text' },
      price: {
        properties: {
          forConsumer: { type: 'float' }, // can be negative to pay consumers
          forAgent: { type: 'float' }, // can be negative to pay agents
          currency: { type: 'keyword' }, // ISO 4217 (https://en.wikipedia.org/wiki/ISO_4217)
          details: {
            properties: {
              /*
                (free model) used for details of the arrangement:
                  - platform: how to conclude the deal?
                  - type: CPM, CPC, CPA...
               */
            }
          }
        }
      },
      validFrom: { type: 'date' }, // timestamp in seconds
      validUntil: { type: 'date' } // timestamp in seconds
    }
  }
}

const Shared = new Model('shared', SharedModel, { maxDays: TTL_DAYS })

Shared.findLatest = async () => {
  const [latest] = (await Shared.find({ size: 1, sort: { created: 'desc' } })).hits
  return latest ? latest._source : null
}

/* ========================================================================== *
 * VALIDATION                                                                 *
 * ========================================================================== */

function validateKeys (object, authorizedKeys, prefix = '') {
  const errors = []
  if (object && typeof object === 'object') {
    const unauthorizedKeys = Object.keys(object)
      .filter(key => !authorizedKeys.includes(key))
      .map(key => `${prefix}${key}`)
    if (unauthorizedKeys.length > 0) {
      errors.push(`Unauthorized keys: ${unauthorizedKeys.join(', ')}`)
    }
  }
  return errors
}

function validateGlobal (data, validateOptions) {
  const errors = []
  // Authorized keys
  errors.push(...validateKeys(data, ['_id', ...Object.keys(SharedModel)]))
  const { _id, publicKey, externalRef, created } = data
  // _id format
  if (_id !== undefined && typeof _id !== 'string') {
    errors.push('Parameter "_id" should be a string')
  }
  // publicKey format
  if (publicKey !== undefined && typeof publicKey !== 'string') {
    errors.push('Parameter "publicKey" should be a string')
  }
  // externalRef format
  if (externalRef !== undefined && typeof externalRef !== 'string') {
    errors.push('Parameter "externalRef" should be a string')
  }
  // Created date format
  if (created !== undefined) {
    if (!Number.isInteger(created)) {
      errors.push('Parameter "created" should be an integer (timestamp in seconds)')
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

function isRangeNumber (range) {
  const authorizedKeys = ['lt', 'lte', 'gt', 'gte']
  const unauthorizedKeys = Object.keys(range).filter(key => !authorizedKeys.includes(key))
  return (
    typeof range === 'object' &&
    Object.keys(range).length > 0 &&
    unauthorizedKeys.length === 0 &&
    Object.values(range).filter(v => typeof ratio === 'number').length === 0 &&
    (range.lt === undefined || range.lte === undefined) &&
    (range.gt === undefined || range.gte === undefined)
  )
}

function validateContent (content) {
  if (content === undefined) {
    return ['Parameter "content" is required']
  } else if (typeof content !== 'object') {
    return ['Parameter "content" should be an object']
  }
  const errors = []
  // Authorized keys
  errors.push(...validateKeys(content, Object.keys(SharedModel.content.properties), 'content.'))
  const { url, mimeType, width, widthRange, ratio, ratioRange } = content
  // URL format (required)
  if (url === undefined || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    errors.push('Parameter "content.url" is required and should start with "http://" or "https://"')
  }
  // mimeType format (required)
  if (
    mimeType === undefined ||
    typeof mimeType !== 'string' ||
    !Object.keys(mimeTypes).includes(mimeType)
  ) {
    const mimeTypeDoc = 'https://www.iana.org/assignments/media-types/media-types.xhtml'
    errors.push(
      `Parameter "content.mimeType" is required and should be a mime type (cf. ${mimeTypeDoc})`
    )
  }
  // width format
  if (width !== undefined && !Number.isInteger(width)) {
    errors.push('Parameter "content.width" should be an integer')
  }
  // widthRange format
  if (widthRange !== undefined && !isRangeNumber(widthRange)) {
    errors.push('Parameter "content.widthRange" should be an integer range')
  }
  // width + widthRange
  if (width !== undefined && widthRange !== undefined) {
    errors.push('Parameter "content.width" and "content.widthRange" are incompatible')
  }
  // ratio format
  if (ratio !== undefined && typeof ratio !== 'number') {
    errors.push('Parameter "content.ratio" should be a number')
  }
  // ratioRange format
  if (ratioRange !== undefined && !isRangeNumber(ratioRange)) {
    errors.push('Parameter "content.ratioRange" should be an float range')
  }
  // ratio + ratioRange
  if (ratio !== undefined && ratioRange !== undefined) {
    errors.push('Parameter "content.ratio" and "content.ratioRange" are incompatible')
  }
  return errors
}

function validateMetaImage (image) {
  if (image === undefined) {
    return []
  } else if (typeof image !== 'object') {
    return ['Parameter "meta.image" should be an object']
  }
  const errors = []
  // Authorized keys
  const imageKeys = Object.keys(SharedModel.meta.properties.image.properties)
  errors.push(...validateKeys(image, imageKeys, 'meta.image.'))
  const { url, width, height } = image
  // URL format
  if (url !== undefined && (typeof url !== 'string' || !/^https?:\/\//.test(url))) {
    errors.push('Parameter "meta.image.url" should start with "http://" or "https://"')
  }
  // width format
  if (width !== undefined && !Number.isInteger(width)) {
    errors.push('Parameter "meta.image.width" should be an integer')
  }
  // height format
  if (height !== undefined && !Number.isInteger(height)) {
    errors.push('Parameter "meta.image.height" should be an integer')
  }
  return errors
}

function isElasticsearchSupportedGeometry (object) {
  if (typeof object === 'string') {
    return iso.isWKTType(object.split(' ')[0])
  } else if (typeof object === 'object') {
    const { type, coordinates, geometries } = object
    if (type !== undefined && (coordinates !== undefined || geometries !== undefined)) {
      return iso.isGeoJSONType(type) || ['envelope', 'circle'].includes(type)
    }
  }
  return false
}

function validateMeta (meta) {
  if (meta === undefined) {
    return []
  } else if (typeof meta !== 'object') {
    return ['Parameter "meta" should be an object']
  }
  const errors = []
  // Authorized keys
  errors.push(...validateKeys(meta, Object.keys(SharedModel.meta.properties), 'meta.'))
  const { title, description, image, type, category, locale, tags, location } = meta
  // title format
  if (title !== undefined && typeof title !== 'string') {
    errors.push('Parameter "meta.title" should be a string')
  }
  // description format
  if (description !== undefined && typeof description !== 'string') {
    errors.push('Parameter "meta.description" should be a string')
  }
  // image format
  errors.push(...validateMetaImage(image))
  // type format
  if (type !== undefined && typeof type !== 'string') {
    errors.push('Parameter "meta.type" should be a string')
  }
  // category format
  if (category !== undefined && typeof category !== 'string') {
    errors.push('Parameter "meta.category" should be a string')
  }
  // locale format
  if (locale !== undefined && (typeof locale !== 'string' || !iso.isISO6393Locale(locale))) {
    const localeList = 'https://iso639-3.sil.org/code_tables/639/data'
    errors.push(`Parameter "meta.locale" should be a valid ISO 639-3 locale (cf. ${localeList})`)
  }
  // tags format
  if (
    tags !== undefined &&
    (!Array.isArray(tags) ||
      tags.reduce((onlyStrings, value) => onlyStrings || typeof value !== 'string', false))
  ) {
    errors.push('Parameter "meta.tags" should be an array of strings')
  }
  // location format
  if (location !== undefined && !isElasticsearchSupportedGeometry(location)) {
    errors.push('Parameter "meta.location" should be a GeoJSON or Well-Known Text (WKT)')
  }
  return errors
}

function validateConditionsPrice (price) {
  if (price === undefined) {
    return []
  } else if (typeof price !== 'object') {
    return ['Parameter "conditions.price" should be an object']
  }
  const errors = []
  // Authorized keys
  const priceKeys = Object.keys(SharedModel.conditions.properties.price.properties)
  errors.push(...validateKeys(price, priceKeys, 'conditions.price.'))
  const { forConsumer, forAgent, currency, details } = price
  // forConsumer format
  if (forConsumer !== undefined && typeof forConsumer !== 'number') {
    errors.push('Parameter "conditions.price.forConsumer" should be a number')
  }
  // forAgent format
  if (forAgent !== undefined && typeof forAgent !== 'number') {
    errors.push('Parameter "conditions.price.forAgent" should be a number')
  }
  // currency format
  if (
    currency !== undefined &&
    (typeof currency !== 'string' || !iso.isISO4217Currency(currency))
  ) {
    const currencyList = 'https://en.wikipedia.org/wiki/ISO_4217'
    errors.push(
      `Parameter "conditions.price.currency" should be a valid ISO 4217 currency (cf. ${currencyList})`
    )
  }
  // details format
  if (details !== undefined && typeof details !== 'object') {
    errors.push('Parameter "conditions.price.details" should be an object')
  }
  return errors
}

function validateConditions (conditions) {
  if (conditions === undefined) {
    return []
  } else if (typeof conditions !== 'object') {
    return ['Parameter "conditions" should be an object']
  }
  const errors = []
  // Authorized keys
  errors.push(
    ...validateKeys(conditions, Object.keys(SharedModel.conditions.properties), 'conditions.')
  )
  const { license, copyright, price, validFrom, validUntil } = conditions
  // license format
  if (license !== undefined && typeof license !== 'string') {
    errors.push('Parameter "conditions.license" should be a string')
  }
  // copyright format
  if (copyright !== undefined && typeof copyright !== 'string') {
    errors.push('Parameter "conditions.copyright" should be a string')
  }
  // price format
  errors.push(...validateConditionsPrice(price))
  // validFrom format
  if (validFrom !== undefined && !Number.isInteger(validFrom)) {
    errors.push('Parameter "conditions.validFrom" should be an integer (timestamp in seconds)')
  }
  // validUntil format
  if (validUntil !== undefined && !Number.isInteger(validUntil)) {
    errors.push('Parameter "conditions.validUntil" should be an integer (timestamp in seconds)')
  }
  return errors
}

Shared.isValid = (data, validateOptions = {}) => {
  if (typeof data !== 'object') {
    return ['Data should be an object']
  }
  const errors = []
  const { content, meta, conditions, ...rest } = data
  errors.push(...validateGlobal({ ...rest }, validateOptions))
  errors.push(...validateContent(content))
  errors.push(...validateMeta(meta))
  errors.push(...validateConditions(conditions))
  return errors
}

/* ========================================================================== *
 * EXPORTS                                                                    *
 * ========================================================================== */

module.exports = Shared

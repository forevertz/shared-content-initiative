/* global jest, test, expect */

jest.mock('elasticsearch')
jest.mock('../service/database')

const Shared = require('./shared')
const HOUR = 60 * 60

// Minimal shared content
const shared = {
  content: { url: 'http://...', mimeType: 'text/html' }
}

/* ========================================================================== *
 * GLOBAL                                                                     *
 * ========================================================================== */

test('Minimal share data should be valid', () => {
  expect(Shared.isValid(shared)).toEqual([])
})

test('Complete share data should be valid', () => {
  expect(
    Shared.isValid({
      externalRef: 'my-id',
      content: {
        url: 'http://...',
        mimeType: 'text/html',
        // width: 300,
        widthRange: { gte: 300, lte: 600 },
        // ratio: 3 / 4,
        ratioRange: { gte: 1 / 2, lte: 3 / 4 }
      },
      meta: {
        title: 'my title',
        description: 'my description',
        image: { url: 'http://...', width: 600, height: 400 },
        locale: 'eng',
        tags: ['here', 'you', 'go'],
        location: {
          type: 'Polygon',
          coordinates: [
            [
              [-88.76953125, 49.03786794532644],
              [-126.12304687500001, 49.15296965617042],
              [-125.41992187499999, 35.53222622770337],
              [-105.380859375, 30.751277776257812],
              [-93.33984375, 23.241346102386135],
              [-67.8515625, 26.902476886279832],
              [-66.005859375, 44.96479793033101],
              [-67.939453125, 48.10743118848039],
              [-79.716796875, 43.70759350405294],
              [-88.76953125, 49.03786794532644]
            ]
          ]
        }
      },
      conditions: {
        license: 'WTFPL',
        copyright: '© 2024 - Me',
        price: {
          forConsumer: 0.05,
          forConnector: -3,
          currency: 'USD',
          details: { type: 'CPM', platform: 'adcompany' }
        },
        validFrom: Math.floor(Date.now() / 1000) + 2 * HOUR,
        validUntil: Math.floor(Date.now() / 1000) + 72 * HOUR
      }
    })
  ).toEqual([])
})

test('Data should be an object', () => {
  const error = 'Data should be an object'
  expect(Shared.isValid()).toEqual([error])
  expect(Shared.isValid('')).toEqual([error])
})

test('Data should not contain unauthorized keys', () => {
  expect(
    Shared.isValid({
      key1: 1,
      content: { key2: 2, ...shared.content },
      meta: { key3: 3 },
      conditions: { key4: 4 }
    })
  ).toEqual([
    'Unauthorized keys: key1',
    'Unauthorized keys: content.key2',
    'Unauthorized keys: meta.key3',
    'Unauthorized keys: conditions.key4'
  ])
})

test('_id should be a string', () => {
  const error = 'Parameter "_id" should be a string'
  expect(Shared.isValid({ ...shared, _id: {} })).toEqual([error])
  expect(Shared.isValid({ ...shared, _id: 24 })).toEqual([error])
  const validId = 'SS9ETGQBrPoqVwi2TrIi'
  expect(Shared.isValid({ ...shared, _id: validId })).toEqual([])
})

test('publicKey should be a string', () => {
  const error = 'Parameter "publicKey" should be a string'
  expect(Shared.isValid({ ...shared, publicKey: {} })).toEqual([error])
  expect(Shared.isValid({ ...shared, publicKey: 24 })).toEqual([error])
  const validKey = 'A+GHVCISA53FbubUnII8bYYlzjv3pddRVm+eoEd6p4VU'
  expect(Shared.isValid({ ...shared, publicKey: validKey })).toEqual([])
})

test('externalRef should be a string', () => {
  const error = 'Parameter "externalRef" should be a string'
  expect(Shared.isValid({ ...shared, externalRef: {} })).toEqual([error])
  expect(Shared.isValid({ ...shared, externalRef: 24 })).toEqual([error])
  const validKey = 'my-id'
  expect(Shared.isValid({ ...shared, externalRef: validKey })).toEqual([])
})

test('created should be an integer', () => {
  const error = 'Parameter "created" should be an integer (timestamp in seconds)'
  expect(Shared.isValid({ ...shared, created: {} })).toEqual([error])
  expect(Shared.isValid({ ...shared, created: '24' })).toEqual([error])
  const validCreated = Math.floor(Date.now() / 1000)
  expect(Shared.isValid({ ...shared, created: validCreated })).toEqual([])
})

test('created should be a valid timestamp close to current date', () => {
  const now = Math.floor(Date.now() / 1000)
  const MINUTE = 60
  expect(Shared.isValid({ ...shared, created: now })).toEqual([])
  expect(Shared.isValid({ ...shared, created: now - 3 * MINUTE })).toEqual([
    '"created" date is too old'
  ])
  expect(Shared.isValid({ ...shared, created: now + 3 * MINUTE })).toEqual([
    '"created" date is in the future'
  ])
})

/* ========================================================================== *
 * CONTENT                                                                    *
 * ========================================================================== */

test('content should be required', () => {
  const error = 'Parameter "content" is required'
  expect(Shared.isValid({})).toEqual([error])
})

test('content should be an object', () => {
  const error = 'Parameter "content" should be an object'
  expect(Shared.isValid({ content: false })).toEqual([error])
  expect(Shared.isValid({ content: 0 })).toEqual([error])
  expect(Shared.isValid({ content: '' })).toEqual([error])
  expect(Shared.isValid({ content: 'content' })).toEqual([error])
})

test('content.url should be required and should start with "http://" or "https://"', () => {
  const error = 'Parameter "content.url" is required and should start with "http://" or "https://"'
  expect(Shared.isValid({ content: { ...shared.content, url: undefined } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, url: 24 } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, url: '24' } })).toEqual([error])
  const validUrl = 'http://...'
  expect(Shared.isValid({ content: { ...shared.content, url: validUrl } })).toEqual([])
})

test('content.mimeType should be required and should be a mime type', () => {
  const mimeTypeDoc = 'https://www.iana.org/assignments/media-types/media-types.xhtml'
  const error = `Parameter "content.mimeType" is required and should be a mime type (cf. ${mimeTypeDoc})`
  expect(Shared.isValid({ content: { ...shared.content, mimeType: undefined } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, mimeType: 24 } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, mimeType: '24' } })).toEqual([error])
  const validMimetype = 'image/png'
  expect(Shared.isValid({ content: { ...shared.content, mimeType: validMimetype } })).toEqual([])
})

test('content.width should be an integer', () => {
  const error = 'Parameter "content.width" should be an integer'
  expect(Shared.isValid({ content: { ...shared.content, width: {} } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, width: '24' } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, width: 24.3 } })).toEqual([error])
  const validWidth = 300
  expect(Shared.isValid({ content: { ...shared.content, width: validWidth } })).toEqual([])
})

test('content.widthRange should be an integer range', () => {
  const error = 'Parameter "content.widthRange" should be an integer range'
  expect(Shared.isValid({ content: { ...shared.content, widthRange: {} } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, widthRange: 24 } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, widthRange: { lt: 2, lte: 2 } } })).toEqual(
    [error]
  )
  const validWidthRange = { gt: 1, lte: 2 }
  expect(Shared.isValid({ content: { ...shared.content, widthRange: validWidthRange } })).toEqual(
    []
  )
})

test('content.width and content.widthRange are incompatible', () => {
  const error = 'Parameter "content.width" and "content.widthRange" are incompatible'
  expect(
    Shared.isValid({ content: { ...shared.content, width: 300, widthRange: { lt: 2 } } })
  ).toEqual([error])
})

test('content.ratio should be a number', () => {
  const error = 'Parameter "content.ratio" should be a number'
  expect(Shared.isValid({ content: { ...shared.content, ratio: {} } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, ratio: '24' } })).toEqual([error])
  const validRatio = 3 / 4
  expect(Shared.isValid({ content: { ...shared.content, ratio: validRatio } })).toEqual([])
})

test('content.ratioRange should be an float range', () => {
  const error = 'Parameter "content.ratioRange" should be an float range'
  expect(Shared.isValid({ content: { ...shared.content, ratioRange: {} } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, ratioRange: 24.2 } })).toEqual([error])
  expect(Shared.isValid({ content: { ...shared.content, ratioRange: { lt: 2, lte: 2 } } })).toEqual(
    [error]
  )
  const validRatioRange = { gt: 1.0, lte: 2.4 }
  expect(Shared.isValid({ content: { ...shared.content, ratioRange: validRatioRange } })).toEqual(
    []
  )
})

test('content.ratio and content.ratioRange are incompatible', () => {
  const error = 'Parameter "content.ratio" and "content.ratioRange" are incompatible'
  expect(
    Shared.isValid({ content: { ...shared.content, ratio: 300, ratioRange: { gte: 2 } } })
  ).toEqual([error])
})

/* ========================================================================== *
 * META                                                                       *
 * ========================================================================== */

test('meta should be an object', () => {
  const error = 'Parameter "meta" should be an object'
  expect(Shared.isValid({ ...shared, meta: false })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: 0 })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: '' })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: 'meta' })).toEqual([error])
})

test('meta.title should be a string', () => {
  const error = 'Parameter "meta.title" should be a string'
  expect(Shared.isValid({ ...shared, meta: { title: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { title: 24 } })).toEqual([error])
  const validTitle = 'my title'
  expect(Shared.isValid({ ...shared, meta: { title: validTitle } })).toEqual([])
})

test('meta.description should be a string', () => {
  const error = 'Parameter "meta.description" should be a string'
  expect(Shared.isValid({ ...shared, meta: { description: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { description: 24 } })).toEqual([error])
  const validDescription = 'my description'
  expect(Shared.isValid({ ...shared, meta: { description: validDescription } })).toEqual([])
})

test('meta.image should be an object', () => {
  const error = 'Parameter "meta.image" should be an object'
  expect(Shared.isValid({ ...shared, meta: { image: '' } })).toEqual([error])
})

test('meta.image.url should be required and should start with "http://" or "https://"', () => {
  const error = 'Parameter "meta.image.url" should start with "http://" or "https://"'
  expect(Shared.isValid({ ...shared, meta: { image: { url: false } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { image: { url: 24 } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { image: { url: '24' } } })).toEqual([error])
  const validUrl = 'http://...'
  expect(Shared.isValid({ ...shared, meta: { image: { url: validUrl } } })).toEqual([])
})

test('meta.image.width should be an integer', () => {
  const error = 'Parameter "meta.image.width" should be an integer'
  expect(Shared.isValid({ ...shared, meta: { image: { width: {} } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { image: { width: '24' } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { image: { width: 24.3 } } })).toEqual([error])
  const validWidth = 300
  expect(Shared.isValid({ ...shared, meta: { image: { width: validWidth } } })).toEqual([])
})

test('meta.image.height should be an integer', () => {
  const error = 'Parameter "meta.image.height" should be an integer'
  expect(Shared.isValid({ ...shared, meta: { image: { height: {} } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { image: { height: '24' } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { image: { height: 24.3 } } })).toEqual([error])
  const validWidth = 300
  expect(Shared.isValid({ ...shared, meta: { image: { height: validWidth } } })).toEqual([])
})

test('meta.locale should be a valid ISO 639-3 locale', () => {
  const localeList = 'https://iso639-3.sil.org/code_tables/639/data'
  const error = `Parameter "meta.locale" should be a valid ISO 639-3 locale (cf. ${localeList})`
  expect(Shared.isValid({ ...shared, meta: { locale: false } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { locale: 'en' } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { locale: 'en-en' } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { locale: 'en_en' } })).toEqual([error])
  const validLocale = 'eng'
  expect(Shared.isValid({ ...shared, meta: { locale: validLocale } })).toEqual([])
})

test('meta.tags should be an array of strings', () => {
  const error = 'Parameter "meta.tags" should be an array of strings'
  expect(Shared.isValid({ ...shared, meta: { tags: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { tags: 24 } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { tags: [24] } })).toEqual([error])
  const validTags = ['my', 'tags']
  expect(Shared.isValid({ ...shared, meta: { tags: validTags } })).toEqual([])
})

test('meta.location should be a GeoJSON or Well-Known Text (WKT)', () => {
  const error = 'Parameter "meta.location" should be a GeoJSON or Well-Known Text (WKT)'
  const point = [-77.03653, 38.897676]
  expect(Shared.isValid({ ...shared, meta: { location: false } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { location: 24 } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { location: point.join(' ') } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { location: point } })).toEqual([error])
  expect(Shared.isValid({ ...shared, meta: { location: { geometry: point } } })).toEqual([error])
  const validWkt = 'POINT (-77.03653 38.897676)'
  expect(Shared.isValid({ ...shared, meta: { location: validWkt } })).toEqual([])
  const validGeoJson = { type: 'Point', coordinates: point }
  expect(Shared.isValid({ ...shared, meta: { location: validGeoJson } })).toEqual([])
})

/* ========================================================================== *
 * CONDITIONS                                                                 *
 * ========================================================================== */

test('conditions should be an object', () => {
  const error = 'Parameter "conditions" should be an object'
  expect(Shared.isValid({ ...shared, conditions: false })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: 0 })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: '' })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: 'conditions' })).toEqual([error])
})

test('conditions.license should be a string', () => {
  const error = 'Parameter "conditions.license" should be a string'
  expect(Shared.isValid({ ...shared, conditions: { license: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { license: 24 } })).toEqual([error])
  const validLicense = 'WTFPL'
  expect(Shared.isValid({ ...shared, conditions: { license: validLicense } })).toEqual([])
})

test('conditions.copyright should be a string', () => {
  const error = 'Parameter "conditions.copyright" should be a string'
  expect(Shared.isValid({ ...shared, conditions: { copyright: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { copyright: 24 } })).toEqual([error])
  const validCopyright = '© 2024 - Me'
  expect(Shared.isValid({ ...shared, conditions: { copyright: validCopyright } })).toEqual([])
})

test('conditions.price should be an object', () => {
  const error = 'Parameter "conditions.price" should be an object'
  expect(Shared.isValid({ ...shared, conditions: { price: '' } })).toEqual([error])
})

test('conditions.price.forConsumer should be a number', () => {
  const error = 'Parameter "conditions.price.forConsumer" should be a number'
  expect(Shared.isValid({ ...shared, conditions: { price: { forConsumer: '' } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { price: { forConsumer: '24' } } })).toEqual([
    error
  ])
  const validPrice = -0.05
  expect(Shared.isValid({ ...shared, conditions: { price: { forConsumer: validPrice } } })).toEqual(
    []
  )
})

test('conditions.price.forConnector should be a number', () => {
  const error = 'Parameter "conditions.price.forConnector" should be a number'
  expect(Shared.isValid({ ...shared, conditions: { price: { forConnector: '' } } })).toEqual([
    error
  ])
  expect(Shared.isValid({ ...shared, conditions: { price: { forConnector: '24' } } })).toEqual([
    error
  ])
  const validPrice = 3
  expect(
    Shared.isValid({ ...shared, conditions: { price: { forConnector: validPrice } } })
  ).toEqual([])
})

test('conditions.price.currency should be a valid ISO 4217 currency', () => {
  const currencyList = 'https://en.wikipedia.org/wiki/ISO_4217'
  const error = `Parameter "conditions.price.currency" should be a valid ISO 4217 currency (cf. ${currencyList})`
  expect(Shared.isValid({ ...shared, conditions: { price: { currency: false } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { price: { currency: 'en' } } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { price: { currency: '$' } } })).toEqual([error])
  const validCurrency = 'BTC'
  expect(Shared.isValid({ ...shared, conditions: { price: { currency: validCurrency } } })).toEqual(
    []
  )
})

test('conditions.price.details should be an object', () => {
  const error = 'Parameter "conditions.price.details" should be an object'
  expect(Shared.isValid({ ...shared, conditions: { price: { details: '' } } })).toEqual([error])
})

test('conditions.validFrom should be an integer', () => {
  const error = 'Parameter "conditions.validFrom" should be an integer (timestamp in seconds)'
  expect(Shared.isValid({ ...shared, conditions: { validFrom: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { validFrom: '24' } })).toEqual([error])
  const validValidFrom = Math.floor(Date.now() / 1000) + 2 * HOUR
  expect(Shared.isValid({ ...shared, conditions: { validFrom: validValidFrom } })).toEqual([])
})

test('conditions.validUntil should be an integer', () => {
  const error = 'Parameter "conditions.validUntil" should be an integer (timestamp in seconds)'
  expect(Shared.isValid({ ...shared, conditions: { validUntil: {} } })).toEqual([error])
  expect(Shared.isValid({ ...shared, conditions: { validUntil: '24' } })).toEqual([error])
  const validValidUntil = Math.floor(Date.now() / 1000) + 72 * HOUR
  expect(Shared.isValid({ ...shared, conditions: { validUntil: validValidUntil } })).toEqual([])
})

const currencies = require('currency-format')
const locales = require('iso-639-3')

function isISO4217Currency (code) {
  return currencies[code] !== undefined
}

function isISO6393Locale (code) {
  return locales.find(({ iso6393 }) => iso6393 === code) !== undefined
}

function isGeoJSONType (type) {
  return [
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
    'GeometryCollection'
  ].includes(type)
}

function isWKTType (type) {
  return [
    'POINT',
    'LINESTRING',
    'POLYGON',
    'MULTIPOINT',
    'MULTILINESTRING',
    'MULTIPOLYGON',
    'GEOMETRYCOLLECTION',
    'BBOX'
  ].includes(type)
}

module.exports = {
  isISO4217Currency,
  isISO6393Locale,
  isGeoJSONType,
  isWKTType
}

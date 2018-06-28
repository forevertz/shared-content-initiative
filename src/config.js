const IS_PROD = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT) || 5423
const HOST = process.env.HOST || `localhost:${PORT}`
const DATABASE_HOST = process.env.DATABASE_HOST || 'localhost:9200'

if (IS_PROD && !process.env.HOST) {
  throw new Error('HOST environment variable is required.')
}

module.exports = {
  IS_PROD,
  PORT,
  HOST,
  DATABASE_HOST
}

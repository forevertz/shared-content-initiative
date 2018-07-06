const IS_PROD = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT) || 5423
const HOSTNAME = process.env.HOSTNAME || 'localhost'
const DATABASE_HOST = process.env.DATABASE_HOST || 'localhost:9200'
const MAX_CONTENT_LENGTH = 1000

if (IS_PROD && !process.env.HOSTNAME) {
  throw new Error('HOSTNAME environment variable is required.')
}

const config = {
  IS_PROD,
  PORT,
  HOSTNAME,
  DATABASE_HOST,
  MAX_CONTENT_LENGTH
}

console.log('config', config)

module.exports = config

const { isDatabaseConnected } = require('../service/database')

module.exports = async () => ({ success: true, isDatabaseConnected: await isDatabaseConnected() })

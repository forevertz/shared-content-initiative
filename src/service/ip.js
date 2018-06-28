const IP = require('ip')
const fetch = require('node-fetch')

async function whatsMyIp (peer) {
  try {
    const response = await fetch(`http://${peer}/whatsmyip`)
    const { result } = await response.json()
    return result
  } catch (error) {
    return null
  }
}

function isExternalIp (ip) {
  return !IP.isPrivate(ip) && !IP.isLoopback(ip) && (IP.isV4Format(ip) || IP.isV6Format(ip))
}

module.exports = {
  whatsMyIp,
  isExternalIp
}

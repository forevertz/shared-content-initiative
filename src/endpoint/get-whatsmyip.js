module.exports = req => ({
  success: true,
  result: req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress
})

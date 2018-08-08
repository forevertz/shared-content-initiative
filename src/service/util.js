function dedupe (array) {
  return Array.from(new Set(array))
}

module.exports = {
  dedupe
}

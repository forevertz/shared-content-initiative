const ECDSA = require('ecdsa-secp256r1')
const fetch = require('node-fetch')

const host = 'http://localhost:3000'
const privateKey = ECDSA.generateKey()
const publicKey = privateKey.toCompressedPublicKey()

const message = { url: 'http://...', format: 'html' }
const signature = privateKey.sign(JSON.stringify(message))

const headers = {
  'Content-Type': 'application/json',
  'X-Public-Key': publicKey,
  'X-Signature': signature
}
fetch(`${host}/share`, { method: 'POST', body: JSON.stringify(message), headers })
  .then(res => res.json())
  .then(console.log)
  .catch(console.error)

console.log({ publicKey, message, signature })

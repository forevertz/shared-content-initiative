const ECDSA = require('ecdsa-secp256r1')
const fetch = require('node-fetch')

const HOUR = 60 * 60
const host = process.env.HOST || 'localhost:5423'
const privateKey = ECDSA.generateKey()
const publicKey = privateKey.toCompressedPublicKey()

const message = {
  externalRef: 'my-id',
  content: {
    url: 'http://...',
    mimeType: 'text/html',
    width: 300,
    ratio: 3 / 4
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
      forAgent: -3,
      currency: 'USD',
      details: { type: 'CPM', platform: 'adcompany' }
    },
    validFrom: Math.floor(Date.now() / 1000) + 2 * HOUR,
    validUntil: Math.floor(Date.now() / 1000) + 72 * HOUR
  }
}
;(async function sendRequest () {
  const signature = await privateKey.hashAndSign(message)

  const headers = {
    'Content-Type': 'application/json',
    'X-Public-Key': publicKey,
    'X-Signature': signature
  }
  fetch(`http://${host}/share`, { method: 'POST', body: JSON.stringify(message), headers })
    .then(res => res.json())
    .then(console.log)
    .catch(console.error)

  console.log({ publicKey, message, signature })
})()

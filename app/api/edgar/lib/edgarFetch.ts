import https from 'https'
import http from 'http'

const agent = new https.Agent({ rejectUnauthorized: process.env.NODE_ENV === 'production' })

export async function edgarFetch(url: string): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return fetch(url, {
      headers: { 'User-Agent': 'OMARO hello@omaro-pbc.org' },
    })
  }

  // In development, use Node http/https directly to bypass SSL verification
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      {
        agent,
        headers: { 'User-Agent': 'OMARO hello@omaro-pbc.org' },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString()
          resolve(
            new Response(body, {
              status: res.statusCode ?? 200,
              headers: { 'content-type': res.headers['content-type'] ?? 'application/json' },
            }),
          )
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

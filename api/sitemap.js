// sitemap.xml generated from the live spots table so Google finds every spot page
import { neon } from '@neondatabase/serverless'

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default async function handler(req, res) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    res.status(503).send('')
    return
  }
  try {
    const sql = neon(url)
    const spots = await sql`SELECT id, name FROM spots ORDER BY created_at`
    const urls = [
      '<url><loc>https://www.burgerboner.com/</loc><changefreq>hourly</changefreq></url>',
      ...spots.map(
        (s) =>
          `<url><loc>https://www.burgerboner.com/spot/${s.id}/${slugify(s.name)}</loc><changefreq>daily</changefreq></url>`,
      ),
    ]
    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 's-maxage=3600')
    res
      .status(200)
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
      )
  } catch {
    res.status(500).send('')
  }
}

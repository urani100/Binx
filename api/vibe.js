const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export default async function handler(req, res) {
  const token = (req.query.token || '').trim()

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (!token) {
    return res.redirect(302, '/')
  }

  let pinData = null
  try {
    const upstream = await fetch(
      `${SUPABASE_URL}/functions/v1/get-shared-pin?token=${encodeURIComponent(token)}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    if (upstream.ok) pinData = await upstream.json()
  } catch {}

  const ogTags = pinData
    ? `
  <meta property="og:title" content="${escapeHtml(pinData.pin.title)} — BiNx" />
  <meta property="og:description" content="${escapeHtml(pinData.share.senderFirstName)} sent you a Vibe" />
  <meta property="og:url" content="https://binx.social/vibe/${token}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="BiNx" />${pinData.pin.photo ? `
  <meta property="og:image" content="${escapeHtml(pinData.pin.photo)}" />
  <meta name="twitter:image" content="${escapeHtml(pinData.pin.photo)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pinData.pin.title)} — BiNx" />
  <meta name="twitter:description" content="${escapeHtml(pinData.share.senderFirstName)} sent you a Vibe" />`
    : `
  <meta property="og:title" content="BiNx — Share a Vibe" />
  <meta property="og:site_name" content="BiNx" />`

  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />${ogTags}
  <script>window.location.replace('/view/' + ${JSON.stringify(token)})</script>
</head>
<body></body>
</html>`)
}

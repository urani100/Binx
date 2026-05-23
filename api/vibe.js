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

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtShortDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
}

function truncate(text, max = 150) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Cambria, Georgia, serif;
    background: #f2eff9;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
  }
  .card {
    background: #fff;
    border-radius: 1.25rem;
    padding: 1.5rem;
    max-width: 440px;
    width: 100%;
    box-shadow: 0 4px 32px rgba(126,109,168,0.10);
  }
  .stamp { text-align: center; margin-bottom: 1.75rem; }
  .stamp-name { font-size: 1.5rem; font-weight: 700; color: #7e6da8; letter-spacing: 0.18em; }
  .stamp-sub { font-size: 0.65rem; color: #9ca3af; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 2px; }
  .section { margin-bottom: 1.5rem; }
  .pin-title { font-size: 1.2rem; font-weight: 500; color: #111827; margin-bottom: 0.4rem; line-height: 1.3; }
  .pin-location { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.2rem; }
  .pin-date { font-size: 0.75rem; color: #9ca3af; }
  .vibe-tag {
    display: inline-block;
    padding: 0.6rem 1.4rem;
    background: #f2eff9;
    color: #7e6da8;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.95rem;
  }
  .photo { width: 100%; height: 18rem; object-fit: cover; border-radius: 0.75rem; display: block; }
  .note {
    border: 1px solid #f3f4f6;
    border-radius: 0.75rem;
    padding: 1rem;
    font-size: 0.875rem;
    color: #111827;
    line-height: 1.65;
  }
  .audio-wrap {
    border: 1px solid #f3f4f6;
    border-radius: 0.75rem;
    padding: 1rem;
  }
  audio { width: 100%; }
  .sig {
    border-top: 1px solid #f3f4f6;
    padding-top: 1.25rem;
    text-align: center;
  }
  .sig-line { font-size: 0.875rem; color: #4b5563; margin-bottom: 0.3rem; }
  .sig-expiry { font-size: 0.75rem; color: #9ca3af; margin-bottom: 1.25rem; }
  .open-btn {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: #d9d2e9;
    color: #7e6da8;
    border-radius: 0.75rem;
    font-weight: 500;
    font-size: 0.875rem;
    text-decoration: none;
  }
`

function errorPage(type) {
  const expired = type === 'expired'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${expired ? 'Vibe Expired' : 'Vibe Not Found'} — BiNx</title>
  <meta property="og:title" content="BiNx — Share a Vibe" />
  <meta property="og:site_name" content="BiNx" />
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="card" style="text-align:center;padding:2.5rem;">
    <div style="font-size:2.5rem;margin-bottom:1rem;">${expired ? '⏰' : '🔍'}</div>
    <h1 style="font-size:1.2rem;font-weight:500;color:#111827;margin-bottom:0.5rem;">
      ${expired ? 'This vibe has expired' : 'Vibe not found'}
    </h1>
    <p style="font-size:0.875rem;color:#6b7280;margin-bottom:1.75rem;">
      ${expired ? 'This moment was only meant to last a little while.' : 'This link may be invalid or has been revoked.'}
    </p>
    <a href="https://binx.social" class="open-btn">Open BiNx</a>
  </div>
</body>
</html>`
}

function vibePage(pinData, token) {
  const { pin, share } = pinData

  const pinDate  = fmtDate(pin.timestamp)
  const pinTime  = fmtTime(pin.timestamp)
  const sentDate = fmtDate(share.createdAt)
  const sentTime = fmtTime(share.createdAt)
  const expDate  = fmtShortDate(share.expiresAt)
  const expTime  = fmtTime(share.expiresAt)

  const mood    = pin.mood ? pin.mood.charAt(0).toUpperCase() + pin.mood.slice(1) : ''
  const pageTitle = `${pin.title} — BiNx`
  const description = truncate(pin.note)
  const url = `https://binx.social/vibe/${token}`

  const ogImage = pin.photo ? `
  <meta property="og:image" content="${escapeHtml(pin.photo)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:image" content="${escapeHtml(pin.photo)}" />` : ''

  const photoHtml = pin.photo
    ? `<div class="section"><img src="${escapeHtml(pin.photo)}" alt="Pin photo" class="photo" /></div>`
    : ''

  const audioHtml = pin.audioUrl && pin.audioUrl !== 'demo-audio'
    ? `<div class="section audio-wrap"><audio controls src="${escapeHtml(pin.audioUrl)}"></audio></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>

  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="BiNx" />${ogImage}

  <meta name="twitter:card" content="${pin.photo ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />

  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="card">

    <div class="stamp">
      <div class="stamp-name">BiNx</div>
      <div class="stamp-sub">A Vibe, Shared</div>
    </div>

    <div class="section">
      <p class="pin-title">${escapeHtml(pin.title || '')}</p>
      <p class="pin-location">${escapeHtml(pin.location?.name || '')}</p>
      <p class="pin-date">${pinDate} at ${pinTime}</p>
    </div>

    <div class="section">
      <span class="vibe-tag">${escapeHtml(mood)}</span>
    </div>

    ${photoHtml}

    <div class="section note">
      ${escapeHtml(pin.note || '')}
    </div>

    ${audioHtml}

    <div class="sig">
      <p class="sig-line">
        <strong>${escapeHtml(share.senderFirstName)}</strong> sent you a Vibe · ${sentDate} at ${sentTime}
      </p>
      <p class="sig-expiry">expires on ${expDate} at ${expTime}</p>
      <a href="https://binx.social" class="open-btn">Open BiNx</a>
    </div>

  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  const token = (req.query.token || '').trim()

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (!token) {
    return res.status(200).send(errorPage('notfound'))
  }

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

    if (upstream.status === 410) return res.status(200).send(errorPage('expired'))
    if (!upstream.ok)             return res.status(200).send(errorPage('notfound'))

    const data = await upstream.json()
    return res.status(200).send(vibePage(data, token))

  } catch {
    return res.status(200).send(errorPage('notfound'))
  }
}

import { supabase } from './supabase'
import { API_ENDPOINTS } from '../utils/constants'

export async function createShare(pinId, recipientNote = null) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(API_ENDPOINTS.CREATE_SHARE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pin_id: pinId, recipient_note: recipientNote })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create share')
  }

  return response.json() // { token, shareUrl, expiresAt }
}

export async function getMyShares() {
  const { data, error } = await supabase
    .from('pin_shares')
    .select('id, token, recipient_note, created_at, expires_at, view_count, last_viewed_at, pins(title, location)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function revokeShare(shareId) {
  const { error } = await supabase
    .from('pin_shares')
    .delete()
    .eq('id', shareId)

  if (error) throw error
}

export async function shareVibe(pin, recipientNote = null) {
  const { shareUrl, expiresAt } = await createShare(pin.id, recipientNote)

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${pin.title} — BiNx`,
        text: `${pin.title} at ${pin.location?.name || 'a spot I love'}`,
        url: shareUrl
      })
      return { shareUrl, expiresAt, method: 'share' }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the share sheet — link was still created
        return { shareUrl, expiresAt, method: 'cancelled' }
      }
      // Share failed for another reason; fall through to clipboard
    }
  }

  await navigator.clipboard.writeText(shareUrl)
  return { shareUrl, expiresAt, method: 'copied' }
}

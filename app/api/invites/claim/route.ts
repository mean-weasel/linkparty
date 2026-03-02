import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateOrigin } from '@/lib/csrf'
import { createRateLimiter } from '@/lib/serverRateLimit'
import { CLAIM_RATE_LIMIT, CLAIM_RATE_WINDOW_MS } from '@/lib/partyLimits'

export const dynamic = 'force-dynamic'

// 10 requests per minute per user ID
const rateLimiter = createRateLimiter({ maxRequests: CLAIM_RATE_LIMIT, windowMs: CLAIM_RATE_WINDOW_MS })

/**
 * POST /api/invites/claim
 * After a user joins a party via an invite link, claim matching invite tokens
 * and auto-create mutual friendships with inviters.
 *
 * Body: { partyCode?: string }
 * Auth: Bearer token required
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify auth
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit by user ID
    const { limited, retryAfterMs } = rateLimiter.check(user.id)
    if (limited) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfterSec.toString() } },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { partyCode } = body as { partyCode?: string }

    // Find unclaimed invite tokens matching this user's email
    let query = supabase
      .from('invite_tokens')
      .select('id, inviter_id, party_code')
      .eq('invitee_email', user.email!)
      .eq('claimed', false)
      .gt('expires_at', new Date().toISOString())

    if (partyCode) {
      query = query.eq('party_code', partyCode.toUpperCase())
    }

    const { data: tokens, error: tokenError } = await query.limit(10)
    if (tokenError || !tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, claimed: 0, friendshipsCreated: 0 })
    }

    // Filter out self-invites and collect unique inviter IDs
    const validTokens = tokens.filter((t) => t.inviter_id !== user.id)
    const claimedTokenIds = tokens.map((t) => t.id)
    const inviterIds = [...new Set(validTokens.map((t) => t.inviter_id))]

    let friendshipsCreated = 0

    if (inviterIds.length > 0) {
      // Batch-fetch existing friendships in both directions (2 queries total instead of 2×N)
      const [{ data: forwardFriendships }, { data: reverseFriendships }] = await Promise.all([
        supabase.from('friendships').select('user_id, friend_id').eq('user_id', user.id).in('friend_id', inviterIds),
        supabase.from('friendships').select('user_id, friend_id').in('user_id', inviterIds).eq('friend_id', user.id),
      ])

      const forwardSet = new Set((forwardFriendships ?? []).map((f) => f.friend_id))
      const reverseSet = new Set((reverseFriendships ?? []).map((f) => f.user_id))

      // Build batch upsert rows and notification rows
      const friendshipRows: { user_id: string; friend_id: string; status: string }[] = []
      const notificationRows: {
        user_id: string
        type: string
        title: string
        body: string
        data: Record<string, string>
      }[] = []

      for (const inviterId of inviterIds) {
        const needsForward = !forwardSet.has(inviterId)
        const needsReverse = !reverseSet.has(inviterId)

        if (needsForward || needsReverse) {
          if (needsForward) friendshipRows.push({ user_id: user.id, friend_id: inviterId, status: 'accepted' })
          if (needsReverse) friendshipRows.push({ user_id: inviterId, friend_id: user.id, status: 'accepted' })
          friendshipsCreated++

          notificationRows.push({
            user_id: inviterId,
            type: 'friend_accepted',
            title: 'New friend!',
            body: `${user.user_metadata?.display_name || user.email} joined via your invite and is now your friend`,
            data: { friendId: user.id, friendName: user.user_metadata?.display_name || user.email || '' },
          })
        }
      }

      // Single batch upsert for all friendships
      if (friendshipRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('friendships')
          .upsert(friendshipRows, { onConflict: 'user_id,friend_id', ignoreDuplicates: true })
        if (upsertError) {
          console.error('Failed to upsert friendships:', upsertError.message)
          friendshipsCreated = 0
        }
      }

      // Single batch insert for all notifications (best-effort)
      if (notificationRows.length > 0) {
        await supabase.from('notifications').insert(notificationRows)
      }
    }

    // Mark tokens as claimed (single query)
    if (claimedTokenIds.length > 0) {
      const { error: updateError } = await supabase
        .from('invite_tokens')
        .update({ claimed: true, claimed_by: user.id })
        .in('id', claimedTokenIds)
      if (updateError) {
        console.error('Failed to mark invite tokens as claimed:', updateError.message)
      }
    }

    return NextResponse.json({
      success: true,
      claimed: claimedTokenIds.length,
      friendshipsCreated,
    })
  } catch (err) {
    console.error('Invite claim error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

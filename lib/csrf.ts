import { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://linkparty.app',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : []),
]

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  // Reject requests with no origin AND no referer — prevents CSRF via non-browser tools
  if (!origin && !referer) return false
  if (origin && ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed))) return true
  if (referer && ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed))) return true
  return false
}

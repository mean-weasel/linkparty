'use client'

import { useState, useEffect } from 'react'
import { getConsentStatus, setConsentStatus } from '@/lib/cookieConsent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getConsentStatus() === null) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const handleChoice = (status: 'accepted' | 'declined') => {
    setConsentStatus(status)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-lg mx-auto card p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 pointer-events-auto border border-surface-border shadow-lg">
        <p className="text-sm text-text-secondary flex-1 text-center sm:text-left">
          We use cookies to understand how people find and use Link Party.
        </p>
        <div className="flex gap-3 shrink-0">
          <button onClick={() => handleChoice('declined')} className="btn btn-secondary text-xs px-4 py-1.5">
            Decline
          </button>
          <button onClick={() => handleChoice('accepted')} className="btn btn-primary text-xs px-4 py-1.5">
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

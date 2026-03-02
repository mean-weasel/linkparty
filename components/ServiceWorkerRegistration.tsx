'use client'

import { useEffect, useState, useCallback } from 'react'

export function ServiceWorkerRegistration() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdate(false)
    window.location.reload()
  }, [waitingWorker])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowUpdate(true)
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker)
              setShowUpdate(true)
            }
          })
        })
      })
      .catch((error) => {
        console.log('SW registration failed:', error)
      })
  }, [])

  if (!showUpdate) return null

  return (
    <div
      role="alert"
      className="fixed left-4 right-4 z-[9999] flex items-center justify-between gap-3 px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-text-primary text-sm shadow-lg"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
    >
      <span>A new version is available.</span>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => setShowUpdate(false)} className="btn btn-secondary text-xs px-3 py-1.5">
          Later
        </button>
        <button onClick={handleUpdate} className="btn btn-primary text-xs px-3 py-1.5 font-semibold">
          Update
        </button>
      </div>
    </div>
  )
}

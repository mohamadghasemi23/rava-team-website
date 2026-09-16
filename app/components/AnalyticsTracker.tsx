'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const BLOCKED_PREFIXES = ['/admin', '/login', '/api', '/_next']

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void fetch('/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
        signal: controller.signal,
      }).catch(() => undefined)
    }, 900)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [pathname])

  return null
}

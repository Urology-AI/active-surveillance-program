import React from 'react'
import { Smartphone } from 'lucide-react'

const e = React.createElement

// Optional App Store / TestFlight link. When unset, the banner shows text only.
const IOS_APP_URL = (import.meta.env.VITE_IOS_APP_URL || '').trim()

/**
 * Points patients to the AS Companion iPhone app, which now holds their
 * schedule, reminders, PSA results, and support content. This web page keeps
 * general education Q&A only.
 */
export default function IosAppBanner() {
  const linkStyle = { color: '#221f72', fontWeight: 700, textDecoration: 'underline' }
  return e('div', {
    role: 'note',
    className: 'no-print',
    style: { background: '#e8e7f5', borderBottom: '1px solid #d5d3ec' },
  },
    e('div', {
      style: {
        maxWidth: 640, margin: '0 auto', padding: '10px 14px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        fontSize: 14, lineHeight: 1.45, color: '#17134f',
      },
    },
      e(Smartphone, { 'aria-hidden': true, style: { width: 20, height: 20, flexShrink: 0, marginTop: 2 } }),
      e('div', null,
        e('strong', null, 'Track your schedule in the AS Companion app. '),
        'Your next tests, reminders, PSA results, and support tips are in the Mount Sinai AS Companion app for iPhone. This page answers general questions only. ',
        IOS_APP_URL
          ? e('a', { href: IOS_APP_URL, target: '_blank', rel: 'noopener noreferrer', style: linkStyle }, 'Get the app')
          : 'Ask your care team how to get the app.'
      )
    )
  )
}

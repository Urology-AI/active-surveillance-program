import React from 'react'
import { VERSION_STAMP } from '../modelVersion.js'

/** Single shared clinical disclaimer (pathway + calculator + clinician shell). */
export default function ProgramDisclaimerFooter() {
  return React.createElement('footer', {
    className: 'no-print text-center',
    style: { background: '#f4f4f8', borderTop: '1px solid #e2e2ea', color: '#5c5c70', fontSize: 12, lineHeight: 1.6, padding: '20px 16px 28px' },
  },
    React.createElement('p', { style: { margin: '0 auto', maxWidth: 640 } },
      'Clinical decision support only; does not replace clinical judgment.'
    ),
    React.createElement('p', { style: { margin: '0 auto', maxWidth: 640 } },
      'Refer to institutional protocol or ',
      React.createElement('a', {
        href: 'https://www.auanet.org/guidelines/guidelines/prostate-cancer-clinically-localized-guideline',
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'hover:underline',
        style: { color: '#0288d1', fontWeight: 500 },
      }, 'AUA'),
      ' / ',
      React.createElement('a', {
        href: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1459',
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'hover:underline',
        style: { color: '#0288d1', fontWeight: 500 },
      }, 'NCCN'),
      ' guidelines.'
    ),
    // ── Model provenance stamp (compact, always visible) ──
    React.createElement('p', {
      style: {
        margin: '6px 0 0', fontSize: 11, letterSpacing: '0.02em',
        color: '#8a8a9c', fontVariantNumeric: 'tabular-nums',
      },
    }, VERSION_STAMP),
    React.createElement('p', { style: { margin: '6px 0 0' } }, '© Icahn School of Medicine at Mount Sinai · Department of Urology')
  )
}

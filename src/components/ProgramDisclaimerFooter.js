import React from 'react'

/** Single shared clinical disclaimer (pathway + calculator + clinician shell). */
export default function ProgramDisclaimerFooter() {
  return React.createElement('footer', {
    className: 'no-print mt-10 pt-8 border-t border-slate-200/90 text-center text-xs text-slate-600 max-w-2xl mx-auto px-4 pb-8',
  },
    React.createElement('p', { className: 'mb-2 leading-relaxed' },
      'Clinical decision support only; does not replace clinical judgment.'
    ),
    React.createElement('p', { className: 'leading-relaxed' },
      'Refer to institutional protocol or ',
      React.createElement('a', {
        href: 'https://www.auanet.org/guidelines/guidelines/prostate-cancer-clinically-localized-guideline',
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-sinai-cerulean hover:underline',
      }, 'AUA'),
      ' / ',
      React.createElement('a', {
        href: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1459',
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-sinai-cerulean hover:underline',
      }, 'NCCN'),
      ' guidelines.'
    )
  )
}

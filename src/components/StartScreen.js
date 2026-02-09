import React from 'react'
import { Stethoscope } from 'lucide-react'

export default function StartScreen({ onStart }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai-lg border border-slate-100 p-8 md:p-12 text-center' },
    React.createElement('div', { className: 'flex justify-center mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-4 rounded-full ring-4 ring-sinai-cerulean/5' },
        React.createElement(Stethoscope, { className: 'w-12 h-12 text-sinai-cerulean' })
      )
    ),
    React.createElement('p', { className: 'text-sm font-semibold uppercase tracking-wider text-sinai-navy mb-2' },
      'Mount Sinai'
    ),
    React.createElement('h1', { className: 'text-2xl md:text-3xl font-bold text-sinai-cetacean mb-4' },
      'Prostate Cancer Clinical Pathway'
    ),
    React.createElement('p', { className: 'text-base text-slate-600 mb-8 max-w-xl mx-auto' },
      'Clinical decision support for next steps after a positive prostate biopsy'
    ),
    React.createElement('button', {
      onClick: onStart,
      className: 'btn-primary px-8 py-3.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark shadow-sinai hover:shadow-sinai-lg'
    },
      'Start Assessment'
    ),
    React.createElement('p', { className: 'text-xs text-slate-500 mt-4 font-medium' },
      'Trigger: 1st Positive Biopsy'
    )
  )
}

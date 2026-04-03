import React, { useState } from 'react'
import { Activity, RotateCcw, Copy, FileText, ArrowLeft } from 'lucide-react'

export default function EndStateHighIntensityAS({ onReset, pathSummary, onBack, canGoBack }) {
  const [copied, setCopied] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleCopy = () => {
    if (pathSummary && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pathSummary).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center justify-center mb-6' },
      React.createElement('div', { className: 'bg-sinai-navy/10 p-4 rounded-full ring-4 ring-sinai-navy/10' },
        React.createElement(Activity, { className: 'w-12 h-12 text-sinai-navy' })
      )
    ),

    React.createElement('h2', { className: 'text-2xl font-bold text-sinai-cetacean text-center mb-6' },
      'High Intensity Active Surveillance Protocol'
    ),

    React.createElement('div', { className: 'bg-sinai-navy/5 border-2 border-sinai-navy/20 rounded-lg p-6 mb-4' },
      React.createElement('p', { className: 'text-base font-semibold text-sinai-navy mb-3' },
        'Concerning features present — Enroll in High Intensity AS Protocol'
      ),
      React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
          React.createElement('span', null,
            React.createElement('span', { className: 'font-semibold' }, 'Discuss and educate '),
            'patient on the High Intensity Active Surveillance Protocol'
          )
        ),
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
          React.createElement('span', null,
            'Biopsy every ',
            React.createElement('span', { className: 'font-semibold' }, '1–2 years')
          )
        )
      )
    ),

    React.createElement('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6' },
      React.createElement('p', { className: 'text-sm font-semibold text-purple-800 mb-2' }, 'Clinical Trial Consideration'),
      React.createElement('p', { className: 'text-sm text-slate-700' },
        'Consider enrolling patient in ',
        React.createElement('span', { className: 'font-semibold' }, 'Poly-ICLC trial'),
        '. Discuss eligibility and obtain informed consent if appropriate.'
      )
    ),

    React.createElement('div', { className: 'flex flex-wrap justify-center gap-3' },
      canGoBack && onBack && React.createElement('button', {
        onClick: onBack,
        className: 'flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 transition-colors'
      },
        React.createElement(ArrowLeft, { className: 'w-4 h-4' }), 'Back'
      ),
      pathSummary && React.createElement('button', {
        onClick: handleCopy,
        className: 'flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 transition-colors'
      },
        copied ? 'Copied!' : [React.createElement(Copy, { key: 'i', className: 'w-4 h-4' }), 'Copy summary']
      ),
      React.createElement('button', {
        onClick: () => window.print(),
        className: 'flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 transition-colors'
      },
        React.createElement(FileText, { className: 'w-4 h-4' }), 'Export as PDF'
      ),
      React.createElement('button', {
        onClick: () => setShowResetConfirm(true),
        className: 'btn-primary flex items-center gap-2 px-6 py-3.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark shadow-sinai'
      },
        React.createElement(RotateCcw, { className: 'w-5 h-5' }), 'Reset'
      )
    ),

    showResetConfirm && React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40',
      onClick: () => setShowResetConfirm(false)
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-slate-200',
        onClick: e => e.stopPropagation()
      },
        React.createElement('p', { className: 'text-sinai-cetacean font-semibold mb-4' }, 'Clear pathway and start over?'),
        React.createElement('div', { className: 'flex gap-3 justify-end' },
          React.createElement('button', { onClick: () => setShowResetConfirm(false), className: 'px-4 py-2.5 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50' }, 'Cancel'),
          React.createElement('button', { onClick: () => { setShowResetConfirm(false); onReset() }, className: 'px-4 py-2.5 bg-sinai-cerulean text-white rounded-xl font-semibold hover:bg-sinai-cerulean-dark' }, 'Reset')
        )
      )
    )
  )
}

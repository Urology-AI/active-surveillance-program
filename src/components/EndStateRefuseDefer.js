import React, { useState } from 'react'
import { Info, RotateCcw, Copy, Printer } from 'lucide-react'

export default function EndStateRefuseDefer({ onReset, pathSummary }) {
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
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-4 rounded-full ring-4 ring-sinai-cerulean/10' },
        React.createElement(Info, { className: 'w-12 h-12 text-sinai-cerulean' })
      )
    ),
    React.createElement('h2', { className: 'text-2xl font-bold text-sinai-cetacean text-center mb-6' },
      'Patient Refuses/Defers Further Testing'
    ),
    React.createElement('div', { className: 'bg-sinai-cerulean/5 border-2 border-sinai-cerulean/20 rounded-lg p-6 mb-6' },
      React.createElement('p', { className: 'text-base text-slate-800 text-center font-semibold' },
        'Educate, document, return to clinic in 3-6 months.'
      )
    ),
    React.createElement('div', { className: 'flex flex-wrap justify-center gap-3' },
      pathSummary && React.createElement('button', {
        onClick: handleCopy,
        className: 'flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 transition-colors'
      },
        copied ? 'Copied!' : [React.createElement(Copy, { key: 'icon', className: 'w-4 h-4' }), 'Copy summary']
      ),
      React.createElement('button', {
        onClick: () => window.print(),
        className: 'flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 transition-colors'
      },
        React.createElement(Printer, { className: 'w-4 h-4' }),
        'Print'
      ),
      React.createElement('button', {
        onClick: () => setShowResetConfirm(true),
        className: 'btn-primary flex items-center gap-2 px-6 py-3.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark shadow-sinai hover:shadow-sinai-lg'
      },
        React.createElement(RotateCcw, { className: 'w-5 h-5' }),
        'Reset'
      )
    ),
    showResetConfirm && React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40',
      onClick: () => setShowResetConfirm(false)
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-slate-200',
        onClick: (e) => e.stopPropagation()
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

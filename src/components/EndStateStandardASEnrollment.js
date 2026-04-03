import React, { useState } from 'react'
import { ShieldCheck, RotateCcw, Copy, FileText, ArrowLeft } from 'lucide-react'

export default function EndStateStandardASEnrollment({ onReset, pathSummary, onBack, canGoBack }) {
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
      React.createElement('div', { className: 'bg-emerald-100 p-4 rounded-full ring-4 ring-emerald-200/50' },
        React.createElement(ShieldCheck, { className: 'w-12 h-12 text-emerald-600' })
      )
    ),

    React.createElement('h2', { className: 'text-2xl font-bold text-sinai-cetacean text-center mb-6' },
      'Enrolled in Active Surveillance'
    ),

    React.createElement('div', { className: 'bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6 mb-6' },
      React.createElement('p', { className: 'text-base font-semibold text-emerald-800 mb-4' },
        'No concerning features — Standard AS Protocol'
      ),
      React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-emerald-600 font-bold mt-0.5' }, '✓'),
          React.createElement('span', null,
            React.createElement('span', { className: 'font-semibold' }, 'Educate patient '),
            'on the active surveillance protocol'
          )
        ),
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-emerald-600 font-bold mt-0.5' }, '✓'),
          React.createElement('span', null,
            React.createElement('span', { className: 'font-semibold' }, 'Officially enroll '),
            'patient in Active Surveillance'
          )
        ),
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-emerald-600 font-bold mt-0.5' }, '✓'),
          React.createElement('span', null,
            React.createElement('span', { className: 'font-semibold' }, 'Send patient educational materials '),
            'on Active Surveillance'
          )
        ),
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-magenta font-bold mt-0.5' }, '✓'),
          React.createElement('span', { className: 'font-semibold text-sinai-magenta' }, 'Document')
        )
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
        className: 'btn-primary flex items-center gap-2 px-6 py-3.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark shadow-sinai hover:shadow-sinai-lg'
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

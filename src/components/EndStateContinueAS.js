import React, { useState } from 'react'
import { RefreshCw, RotateCcw, Copy, FileText, ArrowLeft } from 'lucide-react'

export default function EndStateContinueAS({ onReset, pathSummary, onBack, canGoBack }) {
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

  return React.createElement('div', { className: 'bg-white rounded-xl border border-slate-100 overflow-hidden', style: { boxShadow: '0 8px 40px -8px rgba(6,171,235,0.15)' } },

    // Header band
    React.createElement('div', {
      className: 'px-4 sm:px-8 py-6 sm:py-7 text-center',
      style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 60%, #06ABEB 140%)' }
    },
      React.createElement('div', { className: 'flex justify-center mb-4' },
        React.createElement('div', { className: 'w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center' },
          React.createElement(RefreshCw, { className: 'w-8 h-8 text-sinai-cerulean' })
        )
      ),
      React.createElement('h2', { className: 'text-xl sm:text-2xl font-bold text-white mb-1' }, 'Continue on Active Surveillance'),
      React.createElement('p', { style: { color: '#06ABEB', fontSize: '14px', fontWeight: 600 } },
        'Patient remains on the AS monitoring protocol'
      )
    ),

    React.createElement('div', { className: 'p-6 md:p-8' },

      // Monitoring schedule
      React.createElement('div', {
        className: 'rounded-xl p-5 mb-5',
        style: { background: 'rgb(6 171 235 / 0.05)', border: '1px solid rgb(6 171 235 / 0.2)' }
      },
        React.createElement('p', { className: 'text-sm font-bold text-sinai-navy mb-3' }, 'Ongoing Monitoring Schedule'),
        React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('span', { className: 'w-6 h-6 rounded-full bg-sinai-cerulean text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'Q'),
            'Quarterly PSA + office visit with AS team'
          ),
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('span', { className: 'w-6 h-6 rounded-full bg-sinai-navy text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'A'),
            'Annual MRI, MUS (ExactVu), DRE'
          ),
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('span', { className: 'w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'B'),
            'Biopsy every 1–3 years + genomics'
          )
        )
      ),

      // 6-month RTO warning
      React.createElement('div', {
        className: 'flex items-start gap-3 p-4 rounded-xl mb-6',
        style: { background: '#fff1f2', border: '1px solid #fecdd3' }
      },
        React.createElement('span', { style: { fontSize: '16px', lineHeight: 1, marginTop: '2px' } }, '⚠'),
        React.createElement('p', { className: 'text-sm font-semibold', style: { color: '#be123c' } },
          'If patient not seen in ≥ 6 months — immediate return-to-office (RTO) required'
        )
      ),

      // Secondary actions
      React.createElement('div', { className: 'flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100' },
        canGoBack && onBack && React.createElement('button', {
          onClick: onBack,
          className: 'flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors'
        }, React.createElement(ArrowLeft, { className: 'w-4 h-4' }), 'Back'),

        pathSummary && React.createElement('button', {
          onClick: handleCopy,
          className: 'flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors'
        }, React.createElement(Copy, { className: 'w-4 h-4' }), copied ? 'Copied!' : 'Copy summary'),

        React.createElement('button', {
          onClick: () => window.print(),
          className: 'flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors'
        }, React.createElement(FileText, { className: 'w-4 h-4' }), 'Export PDF'),

        React.createElement('div', { className: 'flex-1' }),

        React.createElement('button', {
          onClick: () => setShowResetConfirm(true),
          className: 'flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-400 hover:text-rose-600 transition-colors rounded-lg'
        }, React.createElement(RotateCcw, { className: 'w-3.5 h-3.5' }), 'New Patient')
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
        React.createElement('p', { className: 'text-sinai-cetacean font-semibold mb-1' }, 'Start a new patient?'),
        React.createElement('p', { className: 'text-sm text-slate-500 mb-4' }, 'This will clear all progress and return to the start screen.'),
        React.createElement('div', { className: 'flex gap-3 justify-end' },
          React.createElement('button', { onClick: () => setShowResetConfirm(false), className: 'px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50' }, 'Cancel'),
          React.createElement('button', { onClick: () => { setShowResetConfirm(false); onReset() }, className: 'px-4 py-2 bg-sinai-cerulean text-white rounded-lg text-sm font-semibold hover:bg-sinai-cerulean-dark' }, 'Start Over')
        )
      )
    )
  )
}

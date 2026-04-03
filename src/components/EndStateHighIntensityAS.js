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

  return React.createElement('div', { className: 'bg-white rounded-xl border border-slate-100 overflow-hidden', style: { boxShadow: '0 8px 40px -8px rgba(33,32,112,0.2)' } },

    // Header band
    React.createElement('div', {
      className: 'px-8 py-7 text-center',
      style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 60%, #4338ca 100%)' }
    },
      React.createElement('div', { className: 'flex justify-center mb-4' },
        React.createElement('div', { className: 'w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center' },
          React.createElement(Activity, { className: 'w-8 h-8 text-indigo-300' })
        )
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-white mb-1' }, 'High Intensity AS Protocol'),
      React.createElement('p', { style: { color: '#a5b4fc', fontSize: '14px', fontWeight: 500 } },
        'Concerning features present — Intensive monitoring required'
      )
    ),

    React.createElement('div', { className: 'p-6 md:p-8' },

      // Protocol
      React.createElement('div', {
        className: 'rounded-xl p-5 mb-5',
        style: { background: 'rgb(33 32 112 / 0.04)', border: '1px solid rgb(33 32 112 / 0.15)' }
      },
        React.createElement('p', { className: 'text-sm font-bold text-sinai-navy mb-3' }, 'High Intensity AS Protocol:'),
        React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
          React.createElement('div', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-navy font-bold mt-0.5' }, '•'),
            React.createElement('span', null,
              React.createElement('span', { className: 'font-semibold' }, 'Discuss and educate '),
              'patient on the High Intensity AS Protocol'
            )
          ),
          React.createElement('div', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-navy font-bold mt-0.5' }, '•'),
            React.createElement('span', null, 'Biopsy every ', React.createElement('span', { className: 'font-semibold' }, '1–2 years'))
          ),
          React.createElement('div', { className: 'flex items-start gap-2 mt-1 pt-2 border-t border-sinai-navy/10' },
            React.createElement('span', { className: 'font-bold mt-0.5 text-sinai-magenta' }, '✓'),
            React.createElement('span', { className: 'font-semibold text-sinai-magenta' }, 'Document')
          )
        )
      ),

      // Poly-ICLC
      React.createElement('div', {
        className: 'rounded-xl p-4 mb-6',
        style: { background: '#faf5ff', border: '1px solid #e9d5ff' }
      },
        React.createElement('p', { className: 'text-sm font-bold text-purple-800 mb-1' }, 'Clinical Trial Consideration'),
        React.createElement('p', { className: 'text-sm text-slate-700' },
          'Consider enrolling patient in ',
          React.createElement('span', { className: 'font-semibold text-purple-700' }, 'Poly-ICLC trial'),
          '. Discuss eligibility and obtain informed consent if appropriate.'
        )
      ),

      // Secondary actions
      React.createElement('div', { className: 'flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100' },
        canGoBack && onBack && React.createElement('button', {
          onClick: onBack,
          className: 'flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors'
        }, React.createElement(ArrowLeft, { className: 'w-4 h-4' }), 'Back'),

        pathSummary && React.createElement('button', {
          onClick: handleCopy,
          className: 'flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors'
        }, React.createElement(Copy, { className: 'w-4 h-4' }), copied ? 'Copied!' : 'Copy summary'),

        React.createElement('button', {
          onClick: () => window.print(),
          className: 'flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors'
        }, React.createElement(FileText, { className: 'w-4 h-4' }), 'Export PDF'),

        React.createElement('div', { className: 'flex-1' }),

        React.createElement('button', {
          onClick: () => setShowResetConfirm(true),
          className: 'flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-rose-600 transition-colors rounded-lg'
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

import React, { useState } from 'react'
import { XCircle, RotateCcw, Copy, FileText, ArrowLeft } from 'lucide-react'

export default function EndStateDefinitiveTreatment({ onReset, pathSummary, onBack, canGoBack }) {
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

  return React.createElement('div', { className: 'bg-white rounded-xl border border-slate-100 overflow-hidden', style: { boxShadow: '0 8px 40px -8px rgba(220,41,141,0.15)' } },

    // Header band
    React.createElement('div', {
      className: 'px-8 py-7 text-center',
      style: { background: 'linear-gradient(135deg, #4a0025 0%, #831843 60%, #be185d 100%)' }
    },
      React.createElement('div', { className: 'flex justify-center mb-4' },
        React.createElement('div', { className: 'w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center' },
          React.createElement(XCircle, { className: 'w-8 h-8 text-pink-300' })
        )
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-white mb-1' }, 'Recommend Definitive Treatment'),
      React.createElement('p', { style: { color: '#f9a8d4', fontSize: '14px', fontWeight: 500 } },
        'Patient does not meet criteria for Active Surveillance'
      )
    ),

    React.createElement('div', { className: 'p-6 md:p-8' },

      React.createElement('div', {
        className: 'rounded-xl p-5 mb-6',
        style: { background: '#fff1f5', border: '1px solid #fecdd3' }
      },
        React.createElement('p', { className: 'text-sm font-bold mb-3', style: { color: '#9f1239' } }, 'Discuss treatment options with patient:'),
        React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
          React.createElement('div', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'font-bold mt-0.5', style: { color: '#be185d' } }, '•'),
            React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Surgery '), '— RARP (Robotic Radical Prostatectomy)')
          ),
          React.createElement('div', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'font-bold mt-0.5', style: { color: '#be185d' } }, '•'),
            React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Radiation Therapy '), '— RT ± ADT')
          ),
          React.createElement('div', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'font-bold mt-0.5', style: { color: '#be185d' } }, '•'),
            React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Focal Therapy '), '— Galvanize / HIFU')
          ),
          React.createElement('div', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'font-bold mt-0.5', style: { color: '#be185d' } }, '•'),
            React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'ADT '), '— if metastatic, +/- RT')
          ),
          React.createElement('div', { className: 'flex items-start gap-2 mt-1 pt-2 border-t border-pink-100' },
            React.createElement('span', { className: 'font-bold mt-0.5 text-sinai-magenta' }, '✓'),
            React.createElement('span', { className: 'font-semibold text-sinai-magenta' }, 'Document clinical rationale and patient discussion')
          )
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
          React.createElement('button', { onClick: () => { setShowResetConfirm(false); onReset() }, className: 'px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-semibold hover:bg-rose-600' }, 'Start Over')
        )
      )
    )
  )
}

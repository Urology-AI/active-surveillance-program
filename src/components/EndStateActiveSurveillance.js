import React, { useState } from 'react'
import { CheckCircle2, RotateCcw, Copy, FileText, ArrowLeft, ArrowRight } from 'lucide-react'

export default function EndStateActiveSurveillance({ onReset, pathSummary, onBack, canGoBack, onPrintChart, onContinuePart2 }) {
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

  return React.createElement('div', { className: 'bg-white rounded-xl border border-slate-100 overflow-hidden', style: { boxShadow: '0 8px 40px -8px rgba(16,185,129,0.18)' } },

    // Header band
    React.createElement('div', {
      className: 'px-8 py-7 text-center',
      style: { background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #059669 100%)' }
    },
      React.createElement('div', { className: 'flex justify-center mb-4' },
        React.createElement('div', { className: 'w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center' },
          React.createElement(CheckCircle2, { className: 'w-8 h-8 text-emerald-300' })
        )
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-white mb-1' }, 'Active Surveillance Initiated'),
      React.createElement('p', { className: 'text-emerald-300 text-sm font-medium' }, 'Part 1 complete — Patient has agreed to AS following SDM')
    ),

    React.createElement('div', { className: 'p-6 md:p-8' },

      // Summary box
      React.createElement('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6' },
        React.createElement('p', { className: 'text-sm font-semibold text-emerald-800 mb-1' }, 'Next steps per Tewari program guidelines:'),
        React.createElement('ul', { className: 'space-y-1 text-sm text-slate-700 mt-2' },
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-emerald-600 font-bold mt-0.5' }, '✓'),
            'Proceed to Active Surveillance Initiation protocol'
          ),
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-emerald-600 font-bold mt-0.5' }, '✓'),
            React.createElement('span', null, React.createElement('span', { className: 'font-semibold text-sinai-magenta' }, 'Document '), 'SDM discussion and patient agreement')
          )
        )
      ),

      // Part 2 CTA
      onContinuePart2 && React.createElement('div', {
        className: 'mb-6 p-5 rounded-xl border-2',
        style: { background: 'rgb(33 32 112 / 0.03)', borderColor: 'rgb(33 32 112 / 0.15)' }
      },
        React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wider text-sinai-navy mb-1' }, 'Continue Pathway'),
        React.createElement('p', { className: 'text-sm font-semibold text-sinai-cetacean mb-1' }, 'Part 2 — Pre-Enrollment Verification'),
        React.createElement('p', { className: 'text-xs text-slate-500 mb-4' },
          'Assess life expectancy, schedule confirmatory biopsy, and order genomic tests.'
        ),
        React.createElement('button', {
          onClick: onContinuePart2,
          className: 'btn-primary w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white',
          style: { background: 'linear-gradient(135deg, #212070 0%, #1a1a5e 100%)', boxShadow: '0 4px 16px rgba(33,32,112,0.25)' }
        },
          'Continue to Pre-Enrollment Verification',
          React.createElement(ArrowRight, { className: 'w-5 h-5' })
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
        }, React.createElement(RotateCcw, { className: 'w-3.5 h-3.5' }), 'Reset')
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
        React.createElement('p', { className: 'text-sinai-cetacean font-semibold mb-1' }, 'Reset the pathway?'),
        React.createElement('p', { className: 'text-sm text-slate-500 mb-4' }, 'This will clear all progress and return to the start screen.'),
        React.createElement('div', { className: 'flex gap-3 justify-end' },
          React.createElement('button', { onClick: () => setShowResetConfirm(false), className: 'px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50' }, 'Cancel'),
          React.createElement('button', { onClick: () => { setShowResetConfirm(false); onReset() }, className: 'px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-semibold hover:bg-rose-600' }, 'Reset')
        )
      )
    )
  )
}

import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function ProgressBar({ progress, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'mb-6' },
    React.createElement('div', { className: 'flex items-center gap-3 md:gap-4 mb-4' },
      React.createElement('button', {
        onClick: onBack,
        disabled: !canGoBack,
        className: `flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
          canGoBack
            ? 'text-sinai-navy bg-white border-slate-200 hover:bg-sinai-cerulean/5 hover:border-sinai-cerulean/30'
            : 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed'
        }`
      },
        React.createElement(ArrowLeft, { className: 'w-4 h-4' }),
        'Back'
      ),
      React.createElement('button', {
        onClick: onForward,
        disabled: !canGoForward,
        className: `flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
          canGoForward
            ? 'text-sinai-navy bg-white border-slate-200 hover:bg-sinai-cerulean/5 hover:border-sinai-cerulean/30'
            : 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed'
        }`
      },
        'Forward',
        React.createElement(ArrowRight, { className: 'w-4 h-4' })
      ),
      React.createElement('div', { className: 'flex-1 min-w-0' },
        React.createElement('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
          React.createElement('div', {
            className: 'bg-sinai-cerulean h-3 rounded-full transition-all duration-300 ease-out',
            style: { width: `${progress}%` }
          })
        )
      ),
      React.createElement('span', { className: 'text-sm font-semibold text-sinai-navy min-w-[3rem] text-right shrink-0' },
        `${Math.round(progress)}%`
      )
    )
  )
}

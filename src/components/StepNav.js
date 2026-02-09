import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function StepNav({ onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'flex gap-2 mt-6 pt-4 border-t border-slate-100' },
    React.createElement('button', {
      type: 'button',
      onClick: onBack,
      disabled: !canGoBack,
      className: `flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${!canGoBack ? 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed' : 'text-sinai-navy border-slate-200 hover:bg-sinai-cerulean/5'}`
    },
      React.createElement(ArrowLeft, { className: 'w-4 h-4' }),
      'Back'
    ),
    React.createElement('button', {
      type: 'button',
      onClick: onForward,
      disabled: !canGoForward,
      className: `flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${!canGoForward ? 'text-slate-400 border-slate-100 bg-slate-50 cursor-not-allowed' : 'text-sinai-navy border-slate-200 hover:bg-sinai-cerulean/5'}`
    },
      'Forward',
      React.createElement(ArrowRight, { className: 'w-4 h-4' })
    )
  )
}

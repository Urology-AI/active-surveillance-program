import React from 'react'
import { ArrowLeft } from 'lucide-react'

// Subtle in-card back link — only shows "← Back" when user has history.
// Forward navigation is handled by the top ProgressBar.
export default function StepNav({ onBack, canGoBack }) {
  if (!canGoBack) return null
  return React.createElement('div', { className: 'flex mt-5 pt-4 border-t border-slate-100' },
    React.createElement('button', {
      type: 'button',
      onClick: onBack,
      className: 'flex items-center gap-1.5 text-sm text-slate-400 hover:text-sinai-navy transition-colors'
    },
      React.createElement(ArrowLeft, { className: 'w-3.5 h-3.5' }),
      'Back'
    )
  )
}

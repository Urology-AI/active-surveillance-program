import React from 'react'
import { ArrowLeft } from 'lucide-react'

export default function ProgressBar({ progress, onBack }) {
  return React.createElement('div', { className: 'mb-6' },
    React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
      React.createElement('button', {
        onClick: onBack,
        className: 'flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-sinai-navy bg-white border border-slate-200 rounded-xl hover:bg-sinai-cerulean/5 hover:border-sinai-cerulean/30 transition-colors'
      },
        React.createElement(ArrowLeft, { className: 'w-4 h-4' }),
        'Back'
      ),
      React.createElement('div', { className: 'flex-1' },
        React.createElement('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
          React.createElement('div', {
            className: 'bg-sinai-cerulean h-3 rounded-full transition-all duration-300 ease-out',
            style: { width: `${progress}%` }
          })
        )
      ),
      React.createElement('span', { className: 'text-sm font-semibold text-sinai-navy min-w-[3rem] text-right' },
        `${Math.round(progress)}%`
      )
    )
  )
}

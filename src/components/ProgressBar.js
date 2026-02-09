import React from 'react'
import { ArrowLeft } from 'lucide-react'

export default function ProgressBar({ progress, onBack }) {
  return React.createElement('div', { className: 'mb-6' },
    React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
      React.createElement('button', {
        onClick: onBack,
        className: 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
      },
        React.createElement(ArrowLeft, { className: 'w-4 h-4' }),
        'Back'
      ),
      React.createElement('div', { className: 'flex-1' },
        React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2.5' },
          React.createElement('div', {
            className: 'bg-primary-blue h-2.5 rounded-full transition-all duration-300',
            style: { width: `${progress}%` }
          })
        )
      ),
      React.createElement('span', { className: 'text-sm font-medium text-gray-600 min-w-[3rem] text-right' },
        `${Math.round(progress)}%`
      )
    )
  )
}

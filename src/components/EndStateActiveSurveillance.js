import React from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'

export default function EndStateActiveSurveillance({ onReset }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center justify-center mb-6' },
      React.createElement('div', { className: 'bg-green-100 p-4 rounded-full' },
        React.createElement(CheckCircle2, { className: 'w-12 h-12 text-green-600' })
      )
    ),
    React.createElement('h2', { className: 'text-3xl font-bold text-gray-900 text-center mb-4' },
      'Candidate for Active Surveillance Initiation'
    ),
    React.createElement('div', { className: 'bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6' },
      React.createElement('p', { className: 'text-lg text-gray-800 text-center font-semibold' },
        'Proceed to SDM on risks and benefits.'
      )
    ),
    React.createElement('div', { className: 'flex justify-center' },
      React.createElement('button', {
        onClick: onReset,
        className: 'flex items-center gap-2 px-6 py-3 bg-primary-blue text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg'
      },
        React.createElement(RotateCcw, { className: 'w-5 h-5' }),
        'Reset'
      )
    )
  )
}

import React from 'react'
import { Stethoscope } from 'lucide-react'

export default function StartScreen({ onStart }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-8 md:p-12 text-center' },
    React.createElement('div', { className: 'flex justify-center mb-6' },
      React.createElement('div', { className: 'bg-primary-blue/10 p-4 rounded-full' },
        React.createElement(Stethoscope, { className: 'w-12 h-12 text-primary-blue' })
      )
    ),
    React.createElement('h1', { className: 'text-3xl md:text-4xl font-bold text-gray-900 mb-4' },
      'Prostate Cancer Clinical Pathway'
    ),
    React.createElement('p', { className: 'text-lg text-gray-600 mb-8' },
      'Clinical decision support tool for determining next steps after a positive prostate biopsy'
    ),
    React.createElement('button', {
      onClick: onStart,
      className: 'px-8 py-3 bg-primary-blue text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg'
    },
      'Start Assessment'
    ),
    React.createElement('p', { className: 'text-sm text-gray-500 mt-4' },
      'Trigger: 1st Positive Biopsy'
    )
  )
}

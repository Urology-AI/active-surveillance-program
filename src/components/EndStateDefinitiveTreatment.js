import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function EndStateDefinitiveTreatment({ onReset }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center justify-center mb-6' },
      React.createElement('div', { className: 'bg-orange-100 p-4 rounded-full' },
        React.createElement(AlertTriangle, { className: 'w-12 h-12 text-orange-600' })
      )
    ),
    React.createElement('h2', { className: 'text-3xl font-bold text-gray-900 text-center mb-6' },
      'Recommend Definitive Treatment'
    ),
    React.createElement('div', { className: 'bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-6' },
      React.createElement('p', { className: 'text-lg font-semibold text-gray-800 mb-4' }, 'Treatment Options:'),
      React.createElement('ul', { className: 'space-y-3 text-gray-700' },
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-primary-blue font-bold' }, '•'),
          React.createElement('span', null, 'Surgery (RARP)')
        ),
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-primary-blue font-bold' }, '•'),
          React.createElement('span', null, 'Radiation Therapy (RT)')
        ),
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-primary-blue font-bold' }, '•'),
          React.createElement('span', null, 'Androgen Deprivation Therapy (ADT) if metastatic +/- RT')
        ),
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-primary-blue font-bold' }, '•'),
          React.createElement('span', null, 'Focal Therapy (Galvanize)')
        )
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

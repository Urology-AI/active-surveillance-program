import React from 'react'
import { ClipboardCheck } from 'lucide-react'

export default function Step4MedicalHistory({ onHighRisk, onLowRisk }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-primary-blue/10 p-2 rounded-lg' },
        React.createElement(ClipboardCheck, { className: 'w-6 h-6 text-primary-blue' })
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Step 4: Medical History Check')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg' },
      React.createElement('p', { className: 'text-sm text-gray-700 italic' },
        'This step is for patients currently eligible for Active Surveillance, to check for disqualifying history.'
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-lg text-gray-700 mb-4' },
        'Does the patient have High Risk Medical History?'
      ),
      React.createElement('div', { className: 'bg-gray-50 p-4 rounded-lg' },
        React.createElement('p', { className: 'text-sm font-semibold text-gray-800 mb-2' }, 'High Risk Medical History includes:'),
        React.createElement('ul', { className: 'list-disc list-inside text-sm text-gray-700 space-y-1' },
          React.createElement('li', null, 'Transplant history'),
          React.createElement('li', null, 'Immunocompromised status'),
          React.createElement('li', null, "Chronic pelvic inflammation (Crohn's, UC, diverticulitis)")
        )
      )
    ),
    React.createElement('div', { className: 'space-y-4' },
      React.createElement('button', {
        onClick: onHighRisk,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option A: Yes (High Risk History)')
      ),
      React.createElement('button', {
        onClick: onLowRisk,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option B: No')
      )
    )
  )
}

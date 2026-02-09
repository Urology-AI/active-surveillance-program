import React from 'react'
import { FileQuestion } from 'lucide-react'

export default function Step1PatientIntent({ onRefuseDefer, onProceed }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-primary-blue/10 p-2 rounded-lg' },
        React.createElement(FileQuestion, { className: 'w-6 h-6 text-primary-blue' })
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Step 1: Patient Intent')
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-lg text-gray-700 mb-6' },
        'Has the patient agreed to further testing after the 4-week clinic follow-up?'
      )
    ),
    React.createElement('div', { className: 'space-y-4' },
      React.createElement('button', {
        onClick: onRefuseDefer,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option A: Patient Refuses/Defers')
      ),
      React.createElement('button', {
        onClick: onProceed,
        className: 'w-full p-4 text-left bg-white border-2 border-primary-blue rounded-lg hover:bg-primary-blue/10 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option B: Proceed with Shared Decision Making')
      )
    )
  )
}

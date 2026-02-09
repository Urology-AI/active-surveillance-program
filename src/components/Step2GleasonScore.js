import React from 'react'
import { ClipboardList } from 'lucide-react'

export default function Step2GleasonScore({ onGleason6, onGleason7_3_4, onGleason7_4_3_Plus }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-primary-blue/10 p-2 rounded-lg' },
        React.createElement(ClipboardList, { className: 'w-6 h-6 text-primary-blue' })
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Step 2: Gleason Score')
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-lg text-gray-700 mb-6' },
        'Select the Gleason Score from the biopsy:'
      )
    ),
    React.createElement('div', { className: 'space-y-4' },
      React.createElement('button', {
        onClick: onGleason6,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option A: Gleason 6 (3+3)')
      ),
      React.createElement('button', {
        onClick: onGleason7_3_4,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option B: Gleason 7 (3+4)')
      ),
      React.createElement('button', {
        onClick: onGleason7_4_3_Plus,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900' }, 'Option C: Gleason 7 (4+3) or higher')
      )
    )
  )
}

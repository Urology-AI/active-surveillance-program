import React from 'react'
import { AlertCircle } from 'lucide-react'

export default function Step3RiskStratification({ onFavorable, onUnfavorable }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-primary-blue/10 p-2 rounded-lg' },
        React.createElement(AlertCircle, { className: 'w-6 h-6 text-primary-blue' })
      ),
      React.createElement('h2', { className: 'text-2xl font-bold text-gray-900' }, 'Step 3: Intermediate Risk Stratification')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-soft-pink/30 border border-purple-200 rounded-lg' },
      React.createElement('p', { className: 'text-sm font-semibold text-gray-800 mb-2' },
        'Intermediate Risk Factors (IRF) are:'
      ),
      React.createElement('ul', { className: 'list-disc list-inside text-sm text-gray-700 space-y-1' },
        React.createElement('li', null, 'T2b-T2c'),
        React.createElement('li', null, 'Grade Group 2 or 3'),
        React.createElement('li', null, 'PSA 10-20 ng/mL')
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-lg text-gray-700 mb-6' },
        'Select the Risk Profile:'
      )
    ),
    React.createElement('div', { className: 'space-y-4' },
      React.createElement('button', {
        onClick: onFavorable,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900 mb-1' },
          'Option A: Favorable Intermediate'
        ),
        React.createElement('div', { className: 'text-sm text-gray-600' },
          '(1 IRF AND <50% biopsy cores positive)'
        )
      ),
      React.createElement('button', {
        onClick: onUnfavorable,
        className: 'w-full p-4 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-primary-blue hover:bg-primary-blue/5 transition-all'
      },
        React.createElement('div', { className: 'font-semibold text-gray-900 mb-1' },
          'Option B: Unfavorable Intermediate'
        ),
        React.createElement('div', { className: 'text-sm text-gray-600' },
          '(2-3 IRFs OR >=50% biopsy cores positive)'
        )
      )
    )
  )
}

import React from 'react'
import { AlertCircle, ChevronRight } from 'lucide-react'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function Step3RiskStratification({ onFavorable, onUnfavorable }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(AlertCircle, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 3: Intermediate Risk Stratification')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-2' },
        'Intermediate Risk Factors (IRF) are:'
      ),
      React.createElement('ul', { className: 'list-disc list-inside text-sm text-slate-700 space-y-1' },
        React.createElement('li', null, 'T2b-T2c'),
        React.createElement('li', null, 'Grade Group 2 or 3'),
        React.createElement('li', null, 'PSA 10-20 ng/mL')
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        'Select the Risk Profile:'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onFavorable, className: optionClass },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Option A: Favorable Intermediate'),
          React.createElement('div', { className: 'text-sm text-slate-600 mt-0.5' }, '(1 IRF AND <50% biopsy cores positive)')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onUnfavorable, className: optionClass },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Option B: Unfavorable Intermediate'),
          React.createElement('div', { className: 'text-sm text-slate-600 mt-0.5' }, '(2-3 IRFs OR >=50% biopsy cores positive)')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    )
  )
}

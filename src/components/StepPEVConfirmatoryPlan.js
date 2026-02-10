import React from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function StepPEVConfirmatoryPlan({ onProceed, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(Calendar, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Phase 2: Genomic Testing & Confirmatory Biopsy Plan')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-3' }, 'Actions Required:'),
      React.createElement('ul', { className: 'space-y-2 text-sm text-slate-700' },
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
          React.createElement('span', null, 'Schedule confirmatory biopsy in 3-6 months')
        ),
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
          React.createElement('span', null, 'Order genomic testing (select one or more):')
        )
      ),
      React.createElement('div', { className: 'mt-3 ml-4 text-xs text-slate-600 space-y-1' },
        React.createElement('p', null, '— Decipher'),
        React.createElement('p', null, '— ExoDx'),
        React.createElement('p', null, '— OncoDx'),
        React.createElement('p', null, '— Selec MDx'),
        React.createElement('p', { className: 'mt-2 font-medium' }, 'Note: Consider BRCA testing if indicated')
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        'Document actions and proceed to confirmatory biopsy result.'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onProceed, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Proceed to Biopsy Result'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    ),
    (onBack != null || onForward != null) && React.createElement(StepNav, { onBack: onBack || (() => {}), onForward: onForward || (() => {}), canGoBack: !!canGoBack, canGoForward: !!canGoForward })
  )
}

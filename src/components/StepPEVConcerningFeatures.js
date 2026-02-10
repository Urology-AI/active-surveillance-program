import React from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function StepPEVConcerningFeatures({ onYes, onNo, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(AlertTriangle, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Phase 2: Check for Concerning Features')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-2' }, 'Concerning Features Include:'),
      React.createElement('ul', { className: 'list-disc list-inside text-sm text-slate-700 space-y-1' },
        React.createElement('li', null, 'Elevated PSA >10 ng/dL on 2 separate readings'),
        React.createElement('li', null, 'PSA density >0.15'),
        React.createElement('li', null,
          'High risk biopsy features:',
          React.createElement('ul', { className: 'list-disc list-inside ml-4 mt-1 space-y-1' },
            React.createElement('li', null, 'Positive cores ≥ 50%'),
            React.createElement('li', null, 'PNI on bx'),
            React.createElement('li', null, 'Presence of variant histology/intraductal carcinoma')
          )
        ),
        React.createElement('li', null,
          'High risk imaging features:',
          React.createElement('ul', { className: 'list-disc list-inside ml-4 mt-1 space-y-1' },
            React.createElement('li', null, 'LN enlargement')
          )
        ),
        React.createElement('li', null,
          'Positive ancillary biomarkers',
          React.createElement('ul', { className: 'list-disc list-inside ml-4 mt-1 space-y-1' },
            React.createElement('li', null, 'High-risk Decipher')
          )
        )
      ),
      React.createElement('p', { className: 'text-xs text-slate-600 mt-3 font-medium italic' },
        'Note: If patient not seen in ≥6 months, immediate RTO (Return to Office) required.'
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        'Does the patient have any concerning features?'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onYes, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Yes (Has concerning features)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onNo, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'No (No concerning features)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    ),
    (onBack != null || onForward != null) && React.createElement(StepNav, { onBack: onBack || (() => {}), onForward: onForward || (() => {}), canGoBack: !!canGoBack, canGoForward: !!canGoForward })
  )
}

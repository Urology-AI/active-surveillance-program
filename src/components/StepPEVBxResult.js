import React from 'react'
import { ClipboardList, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function StepPEVBxResult({ onNegativeOrGleason6, onGleason7_3_4, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(ClipboardList, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Phase 2: Confirmatory Biopsy Result')
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        'What is the result of the confirmatory biopsy/TR?'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onNegativeOrGleason6, className: optionClass },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Negative or Gleason 6 (3+3)'),
          React.createElement('div', { className: 'text-sm text-slate-600 mt-0.5' }, 'Proceed to concerning features check')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onGleason7_3_4, className: optionClass },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Gleason 7 (3+4)'),
          React.createElement('div', { className: 'text-sm text-slate-600 mt-0.5' }, 'Proceed to definitive treatment')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    ),
    (onBack != null || onForward != null) && React.createElement(StepNav, { onBack: onBack || (() => {}), onForward: onForward || (() => {}), canGoBack: !!canGoBack, canGoForward: !!canGoForward })
  )
}

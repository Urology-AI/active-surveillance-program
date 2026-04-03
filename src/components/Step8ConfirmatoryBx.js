import React from 'react'
import { Microscope, ChevronRight, AlertTriangle } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function Step8ConfirmatoryBx({ onNegative, onGleason6, onGleason7Plus, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 2 · Pre-Enrollment Verification'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(Microscope, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 8: TR Confirmatory Biopsy Results')
    ),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('p', { className: 'text-base text-slate-700' },
        'Select the result from the transrectal confirmatory biopsy:'
      )
    ),

    // 6-month alert
    React.createElement('div', { className: 'mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2' },
      React.createElement(AlertTriangle, { className: 'w-4 h-4 text-red-500 shrink-0 mt-0.5' }),
      React.createElement('p', { className: 'text-xs text-red-700 font-medium' },
        'If patient not seen in ≥ 6 months, immediate return-to-office (RTO) required before proceeding.'
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onNegative, className: optionClass },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Negative — No cancer found'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Continue to concerning features check')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onGleason6, className: optionClass },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Gleason 6 (3+3)'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Continue to concerning features check')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', {
        onClick: onGleason7Plus,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Gleason 7 (3+4) or higher'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Reclassified — Proceed to Definitive Treatment')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

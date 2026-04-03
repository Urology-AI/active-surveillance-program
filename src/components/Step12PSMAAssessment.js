import React from 'react'
import { ScanLine, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

const PSMA_PARAMETERS = [
  'Size',
  'Location of lesions',
  'SVI (Seminal Vesicle Invasion)',
  'SUV Max ≥ 8 in prostate',
  'SUV Max ≥ 8 outside prostate (Abdominal LN, Skeletal, Respiratory)',
  'Uptake in ribs',
]

export default function Step12PSMAAssessment({ onContinue, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 3 · Standard Protocol — No MRI Path'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(ScanLine, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 12: PSMA Assessment')
    ),

    React.createElement('div', { className: 'mb-5 p-4 bg-sinai-cerulean/5 border border-sinai-cerulean/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-1' }, 'MRI not possible'),
      React.createElement('p', { className: 'text-sm text-slate-600' },
        'Try PSMA PET imaging as an alternative to MRI for this patient.'
      )
    ),

    React.createElement('div', { className: 'mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-purple-800 mb-3' }, 'PSMA Assessment Parameters'),
      React.createElement('ul', { className: 'space-y-2 text-sm text-slate-700' },
        PSMA_PARAMETERS.map((param, i) =>
          React.createElement('li', { key: i, className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5' }),
            param
          )
        )
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onContinue,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', null,
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'PSMA assessment complete'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' },
            React.createElement('span', { className: 'font-semibold text-sinai-magenta' }, 'Continue on Active Surveillance')
          )
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

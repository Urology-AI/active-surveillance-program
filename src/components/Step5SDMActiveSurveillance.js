import React from 'react'
import { MessageSquare, ChevronRight, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import StepNav from './StepNav.js'

export default function Step5SDMActiveSurveillance({ onConfirm, onDeclineToDT, onBack, onForward, canGoBack, canGoForward }) {
  const [showDetails, setShowDetails] = React.useState(false)

  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-cerulean border border-sinai-cerulean/20 rounded-full px-3 py-1 mb-4', style: { background: 'rgb(6 171 235 / 0.08)' } },
      'Part 1 · Initial Risk Stratification'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(MessageSquare, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 5: SDM — Active Surveillance')
    ),

    React.createElement('div', { className: 'mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-emerald-800 mb-1' },
        'This patient is a candidate for Active Surveillance.'
      ),
      React.createElement('p', { className: 'text-sm text-slate-600' },
        'Conduct Shared Decision Making (SDM) on the risks and benefits of Active Surveillance before initiating.'
      )
    ),

    React.createElement('div', { className: 'mb-6' },
      React.createElement('button', {
        type: 'button',
        onClick: () => setShowDetails(!showDetails),
        className: 'flex items-center gap-1.5 text-sm text-sinai-cerulean hover:underline font-medium mb-3'
      },
        React.createElement(HelpCircle, { className: 'w-4 h-4' }),
        'Key SDM discussion points',
        showDetails
          ? React.createElement(ChevronUp, { className: 'w-4 h-4' })
          : React.createElement(ChevronDown, { className: 'w-4 h-4' })
      ),
      showDetails && React.createElement('div', { className: 'p-4 bg-slate-50 border border-slate-200 rounded-xl' },
        React.createElement('ul', { className: 'space-y-2 text-sm text-slate-700' },
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
            'Risks of deferred treatment vs. watchful monitoring'
          ),
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
            'Surveillance protocol: PSA, DRE, and repeat biopsy schedule'
          ),
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
            'Benefits of avoiding or delaying treatment-related side effects'
          ),
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
            'Patient values, lifestyle considerations, and treatment preferences'
          ),
          React.createElement('li', { className: 'flex items-start gap-2' },
            React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '•'),
            'Potential for reclassification to higher risk category on follow-up'
          )
        )
      )
    ),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('p', { className: 'text-base text-slate-700' },
        'What is the outcome of the SDM discussion?'
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onConfirm,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Patient agrees — Initiate Active Surveillance'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Proceed to Active Surveillance Initiation')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', {
        onClick: onDeclineToDT,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Patient declines AS — Pursue Definitive Treatment'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Patient prefers active treatment after SDM')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

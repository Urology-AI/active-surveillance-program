import React from 'react'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

export default function Step4MedicalHistory({ onHighRisk, onLowRisk, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-cerulean border border-sinai-cerulean/20 rounded-full px-3 py-1 mb-4', style: { background: 'rgb(6 171 235 / 0.08)' } },
      'Part 1 · Initial Risk Stratification'
    ),
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(ClipboardCheck, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 4: Medical History Check')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-sinai-cerulean/5 border border-sinai-cerulean/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm text-slate-700 italic' },
        'This step is for patients currently eligible for Active Surveillance, to check for disqualifying history.'
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-4' },
        'Does the patient have High Risk Medical History?'
      ),
      React.createElement('div', { className: 'bg-slate-50 p-4 rounded-xl border border-slate-200' },
        React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-2' }, 'High Risk Medical History includes:'),
        React.createElement('ul', { className: 'list-disc list-inside text-sm text-slate-700 space-y-1' },
          React.createElement('li', null, 'Transplant history'),
          React.createElement('li', null, 'Immunocompromised status'),
          React.createElement('li', null, "Chronic pelvic inflammation (Crohn's, UC, diverticulitis)")
        )
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onHighRisk,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-red-400 hover:bg-red-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option A: Yes (High Risk History)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-red-500 shrink-0' })
      ),
      React.createElement('button', {
        onClick: onLowRisk,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'
      },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option B: No'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    ),
    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

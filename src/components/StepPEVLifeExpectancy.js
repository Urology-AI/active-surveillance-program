import React from 'react'
import { Clock, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function StepPEVLifeExpectancy({ onNo, onYes, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(Clock, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Phase 2: Pre-Enrollment Verification — Life Expectancy')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-sinai-cerulean/5 border border-sinai-cerulean/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-2' },
        'Reference: Lee-Schonberg life expectancy calculator'
      ),
      React.createElement('p', { className: 'text-sm text-slate-700 mb-2' },
        'For provider assessment, use this validated prognostic tool to estimate whether life expectancy exceeds 10 years for eligibility decisions.'
      ),
      React.createElement('a', {
        href: 'https://eprognosis.ucsf.edu/leeschonberg.php',
        target: '_blank',
        rel: 'noreferrer',
        className: 'text-sm font-medium text-sinai-cerulean underline break-all'
      },
        'https://eprognosis.ucsf.edu/leeschonberg.php'
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        'Is the patient\'s life expectancy >10 years?'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onNo, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'No (≤10 years)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onYes, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Yes (>10 years)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    ),
    (onBack != null || onForward != null) && React.createElement(StepNav, { onBack: onBack || (() => {}), onForward: onForward || (() => {}), canGoBack: !!canGoBack, canGoForward: !!canGoForward })
  )
}

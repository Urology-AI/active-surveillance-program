import React from 'react'
import { Clock, ChevronRight, ExternalLink } from 'lucide-react'
import StepNav from './StepNav.js'

export default function Step6LifeExpectancy({ onYes, onNo, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    // Part 2 badge
    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 2 · Pre-Enrollment Verification'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(Clock, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 6: Life Expectancy Assessment')
    ),

    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-4' },
        'Does the patient have a life expectancy greater than 10 years?'
      ),
      // Lee-Schonberg tool callout
      React.createElement('div', { className: 'p-4 bg-purple-50 border border-purple-200 rounded-xl' },
        React.createElement('p', { className: 'text-sm font-semibold text-purple-800 mb-1' }, 'Assessment Tool'),
        React.createElement('p', { className: 'text-sm font-semibold text-slate-700 mb-1' }, 'Lee-Schonberg Index Tool'),
        React.createElement('a', {
          href: 'https://eprognosis.ucsf.edu/leeschonberg.php',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'inline-flex items-center gap-1.5 text-sm text-sinai-cerulean hover:underline font-medium'
        },
          'eprognosis.ucsf.edu/leeschonberg.php',
          React.createElement(ExternalLink, { className: 'w-3.5 h-3.5' })
        )
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onYes,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Yes — Life expectancy > 10 years'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Proceed with Active Surveillance workup')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', {
        onClick: onNo,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'No — Life expectancy ≤ 10 years'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Discuss/Offer Watchful Waiting')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

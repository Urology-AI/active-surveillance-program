import React from 'react'
import { ClipboardList, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

export default function Step7ProviderActions({ onConfirm, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 2 · Pre-Enrollment Verification'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(ClipboardList, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 7: Provider Actions')
    ),

    React.createElement('div', { className: 'mb-6 p-4 bg-sinai-cerulean/5 border border-sinai-cerulean/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-3' }, 'The following must be completed by the provider:'),
      React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '1.'),
          React.createElement('div', null,
            React.createElement('span', { className: 'font-semibold' }, 'Schedule confirmatory biopsy '),
            'within ',
            React.createElement('span', { className: 'font-bold text-sinai-magenta' }, '3–6 months')
          )
        ),
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'text-sinai-cerulean font-bold mt-0.5' }, '2.'),
          React.createElement('div', null,
            React.createElement('span', { className: 'font-semibold' }, 'Order genomic tests')
          )
        )
      )
    ),

    // Genomic tests reference box
    React.createElement('div', { className: 'mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-purple-800 mb-2' }, 'Genomic Tests'),
      React.createElement('ul', { className: 'space-y-1 text-sm text-slate-700' },
        React.createElement('li', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0' }),
          'Decipher'
        ),
        React.createElement('li', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0' }),
          'ExoDx'
        ),
        React.createElement('li', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0' }),
          'OncoDx'
        ),
        React.createElement('li', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0' }),
          'Selec MDx'
        ),
        React.createElement('li', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5' }),
          React.createElement('span', null,
            'If +FHx of ovarian, breast, or pancreatic cancer → ',
            React.createElement('span', { className: 'font-semibold' }, 'BRCA')
          )
        )
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onConfirm,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Confirmed — Actions completed'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Proceed to TR Confirmatory Biopsy')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      )
    ),

    (onBack != null || onForward != null) && React.createElement(StepNav, {
      onBack: onBack || (() => {}),
      onForward: onForward || (() => {}),
      canGoBack: !!canGoBack,
      canGoForward: !!canGoForward
    })
  )
}

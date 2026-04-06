import React, { useState } from 'react'
import { Droplets, ChevronRight, AlertTriangle } from 'lucide-react'
import StepNav from './StepNav.js'

const INDICATIONS = [
  'LUTS / BPH',
  'IPSS > 18',
  'Hematuria',
  'Prior UTI',
  'Bladder stone',
  'Intravesical filling defect',
  'Median lobe',
  'Prior focal / radiation therapy',
  'Diverticulum',
  'Neurogenic bladder',
]

export default function Step10UroflowCheck({ onProceed, onBack, onForward, canGoBack, canGoForward }) {
  // Sub-state: null = asking indications, 'uroflow' = asking uroflow result, 'cystoscopy' = showing cystoscopy notice
  const [subState, setSubState] = useState(null)

  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 3 · Standard Protocol'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(Droplets, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 10: Uroflow + PVR Assessment')
    ),

    // ── ASK: Indications present? ──
    subState === null && React.createElement('div', null,
      React.createElement('div', { className: 'mb-5 p-4 bg-purple-50 border border-purple-200 rounded-xl' },
        React.createElement('p', { className: 'text-sm font-semibold text-purple-800 mb-2' }, 'Indications for Uroflow + PVR'),
        React.createElement('ul', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-700' },
          INDICATIONS.map((ind, i) =>
            React.createElement('li', { key: i, className: 'flex items-start gap-1.5' },
              React.createElement('span', { className: 'text-purple-400 mt-0.5 shrink-0' }, '•'),
              ind
            )
          )
        )
      ),
      React.createElement('p', { className: 'text-base text-slate-700 mb-4' },
        'Do any of these indications apply to this patient?'
      ),
      React.createElement('div', { className: 'space-y-3' },
        React.createElement('button', {
          onClick: () => setSubState('uroflow'),
          className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Yes — Indication(s) present'),
            React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Order Uroflow + PVR')
          ),
          React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
        ),
        React.createElement('button', {
          onClick: onProceed,
          className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'font-semibold text-slate-800' }, 'No — No indications'),
            React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Proceed directly to AS Protocol')
          ),
          React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
        )
      )
    ),

    // ── ASK: Uroflow < 8? ──
    subState === 'uroflow' && React.createElement('div', null,
      React.createElement('div', { className: 'mb-5 p-4 bg-sinai-cerulean/5 border border-sinai-cerulean/20 rounded-xl' },
        React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-1' }, 'Action Required'),
        React.createElement('p', { className: 'text-sm text-slate-700' }, 'Order Uroflow + Post-Void Residual (PVR). Once results are available, assess the Uroflow reading.')
      ),
      React.createElement('p', { className: 'text-base text-slate-700 mb-4' }, 'What is the Uroflow result?'),
      React.createElement('div', { className: 'space-y-3' },
        React.createElement('button', {
          onClick: () => setSubState('cystoscopy'),
          className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Uroflow < 8'),
            React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Cystoscopy required')
          ),
          React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
        ),
        React.createElement('button', {
          onClick: onProceed,
          className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Uroflow ≥ 8'),
            React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Proceed to AS Protocol')
          ),
          React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
        )
      )
    ),

    // ── CYSTOSCOPY NOTICE ──
    subState === 'cystoscopy' && React.createElement('div', null,
      React.createElement('div', { className: 'mb-5 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-3' },
        React.createElement(AlertTriangle, { className: 'w-5 h-5 text-amber-600 shrink-0 mt-0.5' }),
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-amber-800 mb-1' }, 'Cystoscopy Required'),
          React.createElement('p', { className: 'text-sm text-slate-700' }, 'Uroflow < 8 — Perform Cystoscopy before proceeding to AS Standard Protocol.')
        )
      ),
      React.createElement('div', { className: 'space-y-3' },
        React.createElement('button', {
          onClick: onProceed,
          className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Cystoscopy completed — Proceed'),
            React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Continue to AS Standard Protocol')
          ),
          React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
        ),
        React.createElement('button', {
          onClick: () => setSubState('uroflow'),
          className: 'text-sm text-slate-500 hover:text-sinai-cerulean underline'
        }, '← Back to Uroflow result')
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

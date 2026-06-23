import React from 'react'
import { ClipboardList, ChevronRight, AlertTriangle } from 'lucide-react'
import StepNav from './StepNav.js'

export default function Step11ASProtocol({ onMRIPossible, onNoMRI, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 3 · Standard Protocol'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(ClipboardList, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 11: Initiate AS Standard Protocol')
    ),

    // 6-month RTO warning
    React.createElement('div', { className: 'mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2' },
      React.createElement(AlertTriangle, { className: 'w-4 h-4 text-red-500 shrink-0 mt-0.5' }),
      React.createElement('p', { className: 'text-xs text-red-700 font-medium' },
        'If patient not seen in ≥ 6 months — immediate return-to-office (RTO) required.'
      )
    ),

    // Protocol details
    React.createElement('div', { className: 'mb-5 p-4 bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-3' }, 'Active Surveillance Standard Protocol'),
      React.createElement('div', { className: 'space-y-2 text-sm text-slate-700' },
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-5 h-5 rounded-full bg-sinai-cerulean text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'Q'),
          React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'PSA every 3–6 months'))
        ),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-5 h-5 rounded-full bg-sinai-cerulean text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'Q'),
          React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Quarterly office visit'), ' with AS team')
        ),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-5 h-5 rounded-full bg-sinai-navy text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'A'),
          React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Annual mpMRI'), ' — guides repeat biopsy decisions')
        ),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-5 h-5 rounded-full bg-sinai-navy text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'A'),
          React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Annual MUS (ExactVu)'))
        ),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'w-5 h-5 rounded-full bg-sinai-navy text-white text-xs flex items-center justify-center font-bold shrink-0' }, 'A'),
          React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Annual DRE'))
        ),
        React.createElement('div', { className: 'flex items-start gap-2' },
          React.createElement('span', { className: 'w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5' }, 'B'),
          React.createElement('div', null,
            React.createElement('span', null, React.createElement('span', { className: 'font-semibold' }, 'Repeat biopsy every 1–5 years'), ' — obtain mpMRI first if no prior MRI'),
            React.createElement('div', { className: 'text-xs text-slate-400 mt-0.5' }, 'AUA 2026 Stmt 30 (Strong Rec): mpMRI prior to repeat biopsy. Stmt 32: targeted + systematic if MRI suspicious.')
          )
        )
      )
    ),

    // Guideline callout
    React.createElement('div', { className: 'mb-5 p-3 bg-sky-50 border border-sky-200 rounded-xl' },
      React.createElement('p', { className: 'text-xs font-semibold text-sky-800 mb-1' }, 'AUA/SUO 2026 Guideline — Repeat Biopsy Key Points'),
      React.createElement('ul', { className: 'space-y-1 text-xs text-sky-700' },
        React.createElement('li', null, '• Stmt 20: Do not discontinue screening based solely on negative biopsy'),
        React.createElement('li', null, '• Stmt 21: Do not use PSA threshold alone to decide whether to repeat biopsy'),
        React.createElement('li', null, '• Stmt 23: Use a risk assessment tool incorporating the protective effect of prior negative biopsy'),
        React.createElement('li', null, '• Stmt 30: Obtain mpMRI before repeat biopsy if no prior MRI (Strong Rec)'),
        React.createElement('li', null, '• Stmt 35: Transrectal or transperineal biopsy route — both acceptable')
      )
    ),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('p', { className: 'text-base text-slate-700' },
        'Can this patient have an mpMRI?'
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onMRIPossible,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', null,
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Yes — mpMRI is possible'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Proceed with standard monitoring including mpMRI-guided repeat biopsy')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', {
        onClick: onNoMRI,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', null,
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'No mpMRI — Contraindication present'),
          React.createElement('div', { className: 'text-xs text-slate-400 mt-0.5' },
            'Pacemaker · other metal implant · severe claustrophobia · body habitus'
          )
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

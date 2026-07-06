import React, { useState } from 'react'
import { TrendingUp, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import StepNav from './StepNav.js'
import { MonitoringContextPanel } from './ASMonitoringContext.js'
import PSAHistorySparkline from './PSAHistorySparkline.js'

export default function Step13NewFindings({ onYes, onNo, onBack, onForward, canGoBack, canGoForward, patientId }) {
  const [showFindings, setShowFindings] = useState(true)

  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 3 · Standard Protocol'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(TrendingUp, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 13: New Positive Findings?')
    ),

    // ── Visit context: computed PSA metrics + biopsy schedule ──
    React.createElement('div', { className: 'mb-5' },
      React.createElement(MonitoringContextPanel)
    ),

    patientId && React.createElement('div', { className: 'mb-5' },
      React.createElement(PSAHistorySparkline, { patientId })
    ),

    React.createElement('div', { className: 'mb-6' },
      React.createElement('button', {
        type: 'button',
        onClick: () => setShowFindings(!showFindings),
        className: 'flex items-center gap-1.5 text-sm font-semibold text-purple-700 mb-3 hover:underline'
      },
        React.createElement('span', { className: 'w-2 h-2 rounded-full bg-purple-400' }),
        'Positive Findings Thresholds',
        showFindings ? React.createElement(ChevronUp, { className: 'w-4 h-4' }) : React.createElement(ChevronDown, { className: 'w-4 h-4' })
      ),

      showFindings && React.createElement('div', { className: 'p-4 bg-purple-50 border border-purple-200 rounded-xl text-sm text-slate-700 space-y-3' },
        // PSA
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'PSA'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• PSA velocity > 0.75'),
            React.createElement('li', null, '• PSA density > 0.15')
          )
        ),
        // MRI / MUS
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'Positive MRI or MUS Findings'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• New lesion'),
            React.createElement('li', null, '• Upgrade of PIRADS'),
            React.createElement('li', null, '• +LN, +abutment, +ECE')
          )
        ),
        // DRE
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'Digital Rectal Exam (+DRE)'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• New nodule'),
            React.createElement('li', null, '• Firmness')
          )
        )
      )
    ),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('p', { className: 'text-base text-slate-700' },
        'Are any new positive findings present during monitoring?'
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onYes,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', null,
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Yes — New positive findings present'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Trigger biopsy earlier than planned 3-year cycle')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
      ),
      React.createElement('button', {
        onClick: onNo,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', null,
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'No — No new findings'),
          React.createElement('div', { className: 'text-sm text-sinai-magenta mt-0.5 font-semibold' }, 'Continue on Active Surveillance')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      )
    ),

    React.createElement(StepNav, { onBack, canGoBack: !!canGoBack })
  )
}

import React, { useState } from 'react'
import { Search, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import StepNav from './StepNav.js'

export default function Step9ConcerningFeatures({ onYes, onNo, onBack, onForward, canGoBack, canGoForward }) {
  const [showFeatures, setShowFeatures] = useState(true)

  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },

    React.createElement('div', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sinai-magenta bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-full px-3 py-1 mb-4' },
      'Part 2 · Pre-Enrollment Verification'
    ),

    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(Search, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 9: Check for Concerning Features')
    ),

    React.createElement('div', { className: 'mb-6' },
      React.createElement('button', {
        type: 'button',
        onClick: () => setShowFeatures(!showFeatures),
        className: 'flex items-center gap-1.5 text-sm font-semibold text-purple-700 mb-3 hover:underline'
      },
        React.createElement('span', { className: 'w-2 h-2 rounded-full bg-purple-400' }),
        'Concerning Features Reference',
        showFeatures ? React.createElement(ChevronUp, { className: 'w-4 h-4' }) : React.createElement(ChevronDown, { className: 'w-4 h-4' })
      ),

      showFeatures && React.createElement('div', { className: 'p-4 bg-purple-50 border border-purple-200 rounded-xl text-sm text-slate-700 space-y-3' },
        // PSA
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'PSA'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• Elevated PSA >10 ng/dL on 2 separate readings'),
            React.createElement('li', null, '• PSA density >0.15')
          )
        ),
        // Biopsy
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'High Risk Biopsy Features'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• Positive cores ≥ 50%'),
            React.createElement('li', null, '• PNI on biopsy'),
            React.createElement('li', null, '• Presence of variant histology / intraductal carcinoma')
          )
        ),
        // Imaging
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'High Risk Imaging Features'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• LN enlargement')
          )
        ),
        // Biomarkers
        React.createElement('div', null,
          React.createElement('p', { className: 'font-semibold text-purple-800 mb-1' }, 'Positive Ancillary Biomarkers'),
          React.createElement('ul', { className: 'space-y-0.5 pl-3' },
            React.createElement('li', null, '• High-risk Decipher score')
          )
        )
      )
    ),

    React.createElement('div', { className: 'mb-4' },
      React.createElement('p', { className: 'text-base text-slate-700' },
        'Are any concerning features present?'
      )
    ),

    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onYes,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50/80 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'Yes — Concerning features present'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Discuss High Intensity AS Protocol')
        ),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-amber-500 shrink-0' })
      ),
      React.createElement('button', {
        onClick: onNo,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('div', { className: 'text-left' },
          React.createElement('div', { className: 'font-semibold text-slate-800' }, 'No — No concerning features'),
          React.createElement('div', { className: 'text-sm text-slate-500 mt-0.5' }, 'Educate and enroll in standard AS protocol')
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

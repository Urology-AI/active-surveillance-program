import React, { useState } from 'react'
import { ClipboardList, ChevronRight, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function Step2GleasonScore({ onGleason6, onGleason7_3_4, onGleason7_4_3_Plus, onBack, onForward, canGoBack, canGoForward }) {
  const [showGleasonHelp, setShowGleasonHelp] = useState(false)
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(ClipboardList, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 2: Gleason Score')
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-2' },
        'Select the Gleason Score from the biopsy:'
      ),
      React.createElement('button', {
        type: 'button',
        onClick: () => setShowGleasonHelp(!showGleasonHelp),
        className: 'flex items-center gap-1.5 text-sm text-sinai-cerulean hover:underline font-medium'
      },
        React.createElement(HelpCircle, { className: 'w-4 h-4' }),
        'What is Gleason score?',
        showGleasonHelp ? React.createElement(ChevronUp, { className: 'w-4 h-4' }) : React.createElement(ChevronDown, { className: 'w-4 h-4' })
      ),
      showGleasonHelp && React.createElement('div', { className: 'mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700' },
        React.createElement('p', { className: 'mb-2' }, 'The Gleason score grades prostate cancer from biopsy tissue. Two numbers (e.g. 3+4) describe the most common and second most common patterns; the sum (e.g. 7) indicates aggressiveness.'),
        React.createElement('p', null, 'Lower scores (e.g. 6) suggest lower risk; higher scores or 4+3 indicate higher risk and may change treatment options.')
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', { onClick: onGleason6, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option A: Gleason 6 (3+3)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onGleason7_3_4, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option B: Gleason 7 (3+4)'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', { onClick: onGleason7_4_3_Plus, className: optionClass },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option C: Gleason 7 (4+3) or higher'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      )
    ),
    (onBack != null || onForward != null) && React.createElement(StepNav, { onBack: onBack || (() => {}), onForward: onForward || (() => {}), canGoBack: !!canGoBack, canGoForward: !!canGoForward })
  )
}

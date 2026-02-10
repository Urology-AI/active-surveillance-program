import React from 'react'
import { MessageSquare, ChevronRight } from 'lucide-react'
import StepNav from './StepNav.js'

const optionClass = 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'

export default function StepPEVIntensifiedAS({
  onProceed,
  onPolyICLCYes,
  onPolyICLCNo,
  isPolyICLCDecision = false,
  onBack,
  onForward,
  canGoBack,
  canGoForward
}) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(MessageSquare, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, isPolyICLCDecision ? 'Phase 2: Enroll in Poly-ICLC?' : 'Phase 2: High-Intensity AS Discussion')
    ),
    React.createElement('div', { className: 'mb-6 p-4 bg-sinai-magenta-light/50 border border-sinai-magenta/20 rounded-xl' },
      React.createElement('p', { className: 'text-sm font-semibold text-sinai-navy mb-2' }, 'High-Intensity AS Protocol:'),
      React.createElement('ul', { className: 'list-disc list-inside text-sm text-slate-700 space-y-1' },
        React.createElement('li', null, 'Biopsy every 1-2 years'),
        React.createElement('li', null, 'More frequent PSA monitoring'),
        React.createElement('li', null, 'Optional enrollment in Poly-ICLC clinical trial')
      )
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        isPolyICLCDecision
          ? 'After high-intensity AS counseling, explicitly document whether the patient elects Poly-ICLC enrollment.'
          : 'Discuss and educate patient on high-intensity Active Surveillance protocol (bx q1-2 years) and then capture Poly-ICLC enrollment choice.'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      isPolyICLCDecision
        ? [
            React.createElement('button', { key: 'yes', onClick: onPolyICLCYes, className: optionClass },
              React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Yes — Enroll in Poly-ICLC and document'),
              React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
            ),
            React.createElement('button', { key: 'no', onClick: onPolyICLCNo, className: optionClass },
              React.createElement('span', { className: 'font-semibold text-slate-800' }, 'No — Continue high-intensity AS and document'),
              React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
            )
          ]
        : React.createElement('button', { onClick: onProceed, className: optionClass },
            React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Continue to Poly-ICLC Decision'),
            React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
          )
    ),
    (onBack != null || onForward != null) && React.createElement(StepNav, { onBack: onBack || (() => {}), onForward: onForward || (() => {}), canGoBack: !!canGoBack, canGoForward: !!canGoForward })
  )
}

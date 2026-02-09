import React from 'react'
import { FileQuestion, ChevronRight } from 'lucide-react'

export default function Step1PatientIntent({ onRefuseDefer, onProceed }) {
  return React.createElement('div', { className: 'bg-white rounded-xl shadow-sinai border border-slate-100 p-6 md:p-8' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-6' },
      React.createElement('div', { className: 'bg-sinai-cerulean/10 p-2 rounded-lg' },
        React.createElement(FileQuestion, { className: 'w-6 h-6 text-sinai-cerulean' })
      ),
      React.createElement('h2', { className: 'text-xl font-bold text-sinai-cetacean' }, 'Step 1: Patient Intent')
    ),
    React.createElement('div', { className: 'mb-6' },
      React.createElement('p', { className: 'text-base text-slate-700 mb-6' },
        'Has the patient agreed to further testing after the 4-week clinic follow-up?'
      )
    ),
    React.createElement('div', { className: 'space-y-3' },
      React.createElement('button', {
        onClick: onRefuseDefer,
        className: 'option-card w-full p-4 pl-5 text-left bg-slate-50/80 border-2 border-slate-200 rounded-xl hover:border-sinai-cerulean hover:bg-sinai-cerulean/5 flex items-center justify-between gap-3 group'
      },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option A: Patient Refuses/Defers'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-slate-400 group-hover:text-sinai-cerulean shrink-0' })
      ),
      React.createElement('button', {
        onClick: onProceed,
        className: 'option-card option-card-selected w-full p-4 pl-5 text-left bg-sinai-cerulean/5 border-2 border-sinai-cerulean rounded-xl hover:bg-sinai-cerulean/10 flex items-center justify-between gap-3 group'
      },
        React.createElement('span', { className: 'font-semibold text-slate-800' }, 'Option B: Proceed with Shared Decision Making'),
        React.createElement(ChevronRight, { className: 'w-5 h-5 text-sinai-cerulean shrink-0' })
      )
    )
  )
}

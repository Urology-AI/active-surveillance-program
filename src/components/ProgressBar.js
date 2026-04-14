import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function ProgressBar({ progress, stepLabel, onBack, onForward, canGoBack, canGoForward }) {
  return React.createElement('div', { className: 'mb-2' },
    React.createElement('div', { className: 'flex items-center gap-3 mb-2' },

      // Back button
      React.createElement('button', {
        onClick: onBack,
        disabled: !canGoBack,
        className: `flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${
          canGoBack
            ? 'text-sinai-navy bg-white border-slate-200 hover:bg-sinai-cerulean/5 hover:border-sinai-cerulean/40 shadow-sm'
            : 'text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed'
        }`
      },
        React.createElement(ArrowLeft, { className: 'w-3.5 h-3.5' }),
        'Back'
      ),

      // Progress bar — takes all space
      React.createElement('div', { className: 'flex-1 min-w-0' },
        React.createElement('div', {
          className: 'w-full rounded-full bg-slate-200/90 shadow-inner',
          style: { height: '7px' },
        },
          React.createElement('div', {
            className: 'h-full rounded-full transition-all duration-500 ease-out shadow-sm',
            style: {
              width: `${progress}%`,
              minWidth: progress > 0 ? '4px' : 0,
              background: 'linear-gradient(90deg, #06ABEB 0%, #1e6ba8 55%, #212070 100%)',
            },
          })
        )
      ),

      // Percentage
      React.createElement('span', {
        className: 'text-xs font-bold min-w-[2.75rem] text-right shrink-0',
        style: { color: '#212070' }
      }, `${Math.round(progress)}%`),

      // Forward button
      React.createElement('button', {
        onClick: onForward,
        disabled: !canGoForward,
        className: `flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${
          canGoForward
            ? 'text-sinai-navy bg-white border-slate-200 hover:bg-sinai-cerulean/5 hover:border-sinai-cerulean/40 shadow-sm'
            : 'text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed'
        }`
      },
        React.createElement('span', { className: 'hidden sm:inline' }, 'Forward'),
        React.createElement('span', { className: 'sm:hidden' }, 'Fwd'),
        React.createElement(ArrowRight, { className: 'w-3.5 h-3.5' })
      )
    ),

    // Step label under bar
    stepLabel && React.createElement('div', { className: 'text-center px-1' },
      React.createElement('span', {
        className: 'text-xs font-medium text-slate-600 tracking-tight'
      }, stepLabel)
    )
  )
}

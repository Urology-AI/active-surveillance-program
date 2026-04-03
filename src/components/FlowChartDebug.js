import React, { useState, useEffect } from 'react'
import { MapPin, X, ChevronDown, ChevronUp } from 'lucide-react'
import InteractiveFlowChart from './InteractiveFlowChart.js'

export default function FlowChartDebug({ currentStep, stepHistory, onStepClick }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      setIsMinimized(true)
    }
  }, [])

  const getStepLabel = (step) => {
    const labels = {
      'start': 'Start',
      'step1': 'Step 1: Patient Intent',
      'step2': 'Step 2: Gleason Score',
      'step3': 'Step 3: Risk Stratification',
      'step4': 'Step 4: Medical History',
      'step5': 'Step 5: SDM on Active Surveillance',
      // Part 2
      'step6': 'Step 6: Life Expectancy',
      'step7': 'Step 7: Provider Actions',
      'step8': 'Step 8: TR Confirmatory Biopsy',
      'step9': 'Step 9: Concerning Features',
      // Part 3
      'step10': 'Step 10: Uroflow Check',
      'step11': 'Step 11: AS Standard Protocol',
      'step12': 'Step 12: PSMA Assessment',
      'step13': 'Step 13: New Positive Findings',
      'step14': 'Step 14: Early Biopsy Results',
      // End states
      'end_active_surveillance': 'AS Initiated → Part 2',
      'end_definitive_treatment': 'End: Definitive Treatment',
      'end_refuse_defer': 'End: Refuse/Defer',
      'end_watchful_waiting': 'End: Watchful Waiting',
      'end_high_intensity_as': 'End: High Intensity AS',
      'end_standard_as_enrollment': 'End: Enrolled in AS → Part 3',
      'end_continue_as': 'End: Continue on AS'
    }
    return labels[step] || step
  }

  const getStepColor = (step) => {
    if (step === currentStep) return 'bg-sinai-cerulean text-white'
    if (stepHistory.includes(step)) return 'bg-emerald-100 text-emerald-800'
    return 'bg-slate-100 text-slate-600'
  }

  if (isMinimized) {
    return React.createElement('div', {
      className: 'fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-sinai border-2 border-sinai-cerulean p-2 cursor-pointer print:hidden',
      onClick: () => setIsMinimized(false)
    },
      React.createElement(MapPin, { className: 'w-5 h-5 text-sinai-cerulean' })
    )
  }

  return React.createElement('div', {
    className: 'fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-sinai-lg border-2 border-sinai-cerulean w-[500px] max-h-[85vh] flex flex-col print:hidden'
  },
    React.createElement('div', {
      className: 'flex items-center justify-between p-3 bg-sinai-navy text-white rounded-t-lg'
    },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement(MapPin, { className: 'w-5 h-5' }),
        React.createElement('h3', { className: 'font-semibold' }, 'Interactive Flow Map')
      ),
      React.createElement('div', { className: 'flex items-center gap-1' },
        React.createElement('button', {
          onClick: () => setIsExpanded(!isExpanded),
          className: 'p-1 hover:bg-sinai-navy-dark rounded'
        },
          isExpanded ? React.createElement(ChevronDown, { className: 'w-4 h-4' }) : React.createElement(ChevronUp, { className: 'w-4 h-4' })
        ),
        React.createElement('button', {
          onClick: () => setIsMinimized(true),
          className: 'p-1 hover:bg-sinai-navy-dark rounded'
        },
          React.createElement(X, { className: 'w-4 h-4' })
        )
      )
    ),
    isExpanded && React.createElement('div', { className: 'overflow-auto p-4' },
      React.createElement('div', { className: 'mb-4' },
        React.createElement(InteractiveFlowChart, {
          currentStep: currentStep,
          stepHistory: stepHistory,
          onStepClick: onStepClick
        })
      ),
      React.createElement('div', { className: 'space-y-2 border-t border-slate-200 pt-4' },
        React.createElement('div', { className: 'text-sm font-semibold text-sinai-navy mb-2' }, 'Current Position:'),
        React.createElement('div', {
          className: `p-2 rounded ${getStepColor(currentStep)} font-medium`
        },
          getStepLabel(currentStep)
        ),
        stepHistory.length > 0 && React.createElement('div', { className: 'mt-4' },
          React.createElement('div', { className: 'text-sm font-semibold text-sinai-navy mb-2' }, 'Path Taken:'),
          React.createElement('div', { className: 'space-y-1' },
            stepHistory.map((step, idx) => React.createElement('div', {
              key: idx,
              className: `p-2 rounded text-sm ${getStepColor(step)}`
            },
              `${idx + 1}. ${getStepLabel(step)}`
            ))
          )
        )
      )
    )
  )
}

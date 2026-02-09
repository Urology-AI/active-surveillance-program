import React, { useState } from 'react'
import { MapPin, X, ChevronDown, ChevronUp } from 'lucide-react'
import InteractiveFlowChart from './InteractiveFlowChart.js'

export default function FlowChartDebug({ currentStep, stepHistory, onStepClick }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)

  const getStepLabel = (step) => {
    const labels = {
      'start': 'Start',
      'step1': 'Step 1: Patient Intent',
      'step2': 'Step 2: Gleason Score',
      'step3': 'Step 3: Risk Stratification',
      'step4': 'Step 4: Medical History',
      'end_active_surveillance': 'End: Active Surveillance',
      'end_definitive_treatment': 'End: Definitive Treatment',
      'end_refuse_defer': 'End: Refuse/Defer'
    }
    return labels[step] || step
  }

  const getStepColor = (step) => {
    if (step === currentStep) return 'bg-primary-blue text-white'
    if (stepHistory.includes(step)) return 'bg-green-100 text-green-800'
    return 'bg-gray-100 text-gray-600'
  }

  if (isMinimized) {
    return React.createElement('div', {
      className: 'fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border-2 border-primary-blue p-2 cursor-pointer',
      onClick: () => setIsMinimized(false)
    },
      React.createElement(MapPin, { className: 'w-5 h-5 text-primary-blue' })
    )
  }

  return React.createElement('div', {
    className: 'fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border-2 border-primary-blue w-[500px] max-h-[85vh] flex flex-col'
  },
    React.createElement('div', {
      className: 'flex items-center justify-between p-3 bg-primary-blue text-white rounded-t-lg'
    },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement(MapPin, { className: 'w-5 h-5' }),
        React.createElement('h3', { className: 'font-semibold' }, 'Interactive Flow Map')
      ),
      React.createElement('div', { className: 'flex items-center gap-1' },
        React.createElement('button', {
          onClick: () => setIsExpanded(!isExpanded),
          className: 'p-1 hover:bg-blue-600 rounded'
        },
          isExpanded ? React.createElement(ChevronDown, { className: 'w-4 h-4' }) : React.createElement(ChevronUp, { className: 'w-4 h-4' })
        ),
        React.createElement('button', {
          onClick: () => setIsMinimized(true),
          className: 'p-1 hover:bg-blue-600 rounded'
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
      React.createElement('div', { className: 'space-y-2 border-t pt-4' },
        React.createElement('div', { className: 'text-sm font-semibold text-gray-700 mb-2' }, 'Current Position:'),
        React.createElement('div', {
          className: `p-2 rounded ${getStepColor(currentStep)} font-medium`
        },
          getStepLabel(currentStep)
        ),
        stepHistory.length > 0 && React.createElement('div', { className: 'mt-4' },
          React.createElement('div', { className: 'text-sm font-semibold text-gray-700 mb-2' }, 'Path Taken:'),
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

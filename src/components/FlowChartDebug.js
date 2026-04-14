import React, { useState, useEffect } from 'react'
import { MapPin, X, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import InteractiveFlowChart from './InteractiveFlowChart.js'

const SCALE_STEP = 0.2
const SCALE_MIN = 0.4
const SCALE_MAX = 2.0

export default function FlowChartDebug({ currentStep, stepHistory, onStepClick }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [scale, setScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const apply = () => {
      const mobile = mq.matches
      setIsMobile(mobile)
      setScale(mobile ? 0.72 : 1)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const zoomIn  = (e) => { e.stopPropagation(); setScale(s => Math.min(SCALE_MAX, parseFloat((s + SCALE_STEP).toFixed(1)))) }
  const zoomOut = (e) => { e.stopPropagation(); setScale(s => Math.max(SCALE_MIN, parseFloat((s - SCALE_STEP).toFixed(1)))) }
  const resetZoom = (e) => { e.stopPropagation(); setScale(1) }

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
      className: 'fixed-bottom-panel fixed right-3 sm:right-4 bottom-3 sm:bottom-4 z-50 bg-white rounded-xl shadow-sinai border-2 border-sinai-cerulean p-2.5 cursor-pointer print:hidden',
      onClick: () => { setIsMinimized(false); setIsExpanded(true) },
      title: 'Open flow map',
      role: 'button',
      tabIndex: 0,
      onKeyDown: (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          setIsMinimized(false)
          setIsExpanded(true)
        }
      },
    },
      React.createElement(MapPin, { className: 'w-5 h-5 text-sinai-cerulean' })
    )
  }

  return React.createElement('div', {
    className: 'fixed-bottom-panel fixed z-50 bg-white shadow-sinai-lg border-2 border-sinai-cerulean flex flex-col print:hidden',
    style: isMobile
      ? { left: '0.5rem', right: '0.5rem', bottom: '0.5rem', width: 'auto', maxHeight: '74vh', borderRadius: '14px' }
      : { right: '1rem', bottom: '1rem', width: 'min(500px, calc(100vw - 1rem))', maxHeight: '80vh', borderRadius: '10px' }
  },
    // Header
    React.createElement('div', {
      className: 'flex items-center justify-between px-3 py-2 bg-sinai-navy text-white shrink-0',
      style: { borderTopLeftRadius: isMobile ? '12px' : '8px', borderTopRightRadius: isMobile ? '12px' : '8px' }
    },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement(MapPin, { className: 'w-4 h-4 sm:w-4 sm:h-4' }),
        React.createElement('h3', { className: 'font-semibold text-sm sm:text-sm' }, 'Flow Map')
      ),
      React.createElement('div', { className: 'flex items-center gap-0.5' },
        // Zoom controls (only when expanded)
        isExpanded && React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: zoomOut,
            disabled: scale <= SCALE_MIN,
            className: 'p-2 sm:p-1.5 hover:bg-sinai-navy-dark rounded disabled:opacity-40',
            title: 'Zoom out'
          }, React.createElement(ZoomOut, { className: 'w-4 h-4 sm:w-3.5 sm:h-3.5' })),
          React.createElement('span', {
            className: 'text-[11px] font-mono min-w-[2.7rem] text-center text-white/75'
          }, `${Math.round(scale * 100)}%`),
          React.createElement('button', {
            onClick: zoomIn,
            disabled: scale >= SCALE_MAX,
            className: 'p-2 sm:p-1.5 hover:bg-sinai-navy-dark rounded disabled:opacity-40',
            title: 'Zoom in'
          }, React.createElement(ZoomIn, { className: 'w-4 h-4 sm:w-3.5 sm:h-3.5' })),
          scale !== 1 && React.createElement('button', {
            onClick: resetZoom,
            className: 'p-2 sm:p-1.5 hover:bg-sinai-navy-dark rounded',
            title: 'Reset zoom'
          }, React.createElement(Maximize2, { className: 'w-4 h-4 sm:w-3.5 sm:h-3.5' })),
          React.createElement('div', { style: { width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' } })
        ),
        React.createElement('button', {
          onClick: () => setIsExpanded(!isExpanded),
          className: 'p-2 sm:p-1.5 hover:bg-sinai-navy-dark rounded'
        },
          isExpanded ? React.createElement(ChevronDown, { className: 'w-4 h-4' }) : React.createElement(ChevronUp, { className: 'w-4 h-4' })
        ),
        React.createElement('button', {
          onClick: () => setIsMinimized(true),
          className: 'p-2 sm:p-1.5 hover:bg-sinai-navy-dark rounded'
        },
          React.createElement(X, { className: 'w-4 h-4' })
        )
      )
    ),
    isExpanded && React.createElement('div', { className: 'overflow-auto p-2.5 sm:p-3' },
      React.createElement('div', { className: 'mb-4' },
        React.createElement(InteractiveFlowChart, {
          currentStep: currentStep,
          stepHistory: stepHistory,
          onStepClick: onStepClick,
          scale: scale,
          isMobile,
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

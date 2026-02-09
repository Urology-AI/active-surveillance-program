import React, { useEffect, useRef } from 'react'
import InteractiveFlowChart from './InteractiveFlowChart.js'

export default function ChartPrintView({ currentStep, stepHistory, onClose }) {
  const once = useRef(false)
  useEffect(() => {
    if (once.current) return
    once.current = true
    if (typeof document !== 'undefined') document.body.classList.add('chart-print-mode')
    const t = setTimeout(() => {
      window.print()
    }, 300)
    const onAfterPrint = () => {
      document.body.classList.remove('chart-print-mode')
      onClose()
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', onAfterPrint)
      document.body.classList.remove('chart-print-mode')
    }
  }, [onClose])

  return React.createElement('div', {
    id: 'chart-print-view',
    className: 'fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6'
  },
    React.createElement('h1', {
      className: 'text-sinai-cetacean font-bold text-xl mb-4 print:block'
    }, 'Mount Sinai · Prostate Cancer Clinical Pathway — Flow Map'),
    React.createElement('div', { className: 'flex justify-center' },
      React.createElement('div', { className: 'bg-slate-100 p-4 rounded-lg' },
        React.createElement(InteractiveFlowChart, {
          currentStep: currentStep,
          stepHistory: stepHistory,
          onStepClick: null
        })
      )
    ),
    React.createElement('button', {
      type: 'button',
      onClick: () => {
        document.body.classList.remove('chart-print-mode')
        onClose()
      },
      className: 'no-print mt-6 px-6 py-2.5 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50'
    }, 'Close')
  )
}

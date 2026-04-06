import React, { useState } from 'react'
import PatientForm from './PatientForm.js'
import PatientResults from './PatientResults.js'
import { runAssessment } from './asEngine.js'

const e = React.createElement

export default function PatientApp({ onBack }) {
  const [view, setView]       = useState('form')   // 'form' | 'results'
  const [inputs, setInputs]   = useState(null)
  const [results, setResults] = useState(null)

  function handleFormSubmit(formInputs) {
    const assessment = runAssessment(formInputs)
    setInputs(formInputs)
    setResults(assessment)
    setView('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBackToForm() {
    setView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return e('div', { className: 'min-h-screen', style: { background: '#f8fafc' } },

    // Header
    e('div', { className: 'no-print', style: { background: '#00002D' } },
      e('div', { className: 'max-w-2xl mx-auto px-4 py-3 flex items-center justify-between' },
        e('button', {
          onClick: onBack,
          className: 'flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors',
        },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Change role'
        ),
        e('div', { className: 'text-center' },
          e('div', { className: 'text-white text-xs font-semibold tracking-wide' }, 'MOUNT SINAI'),
          e('div', { className: 'text-white/50 text-xs' }, 'Patient Assessment')
        ),
        e('div', { className: 'w-20' }) // spacer
      )
    ),

    // Progress indicator
    view === 'results' && e('div', { className: 'no-print', style: { background: '#06ABEB' } },
      e('div', { className: 'max-w-2xl mx-auto px-4 py-2 flex items-center gap-2 text-white text-xs' },
        e('div', { className: 'w-4 h-4 rounded-full bg-white/30 flex items-center justify-center' },
          e('svg', { className: 'w-2.5 h-2.5', fill: 'currentColor', viewBox: '0 0 20 20' },
            e('path', { fillRule: 'evenodd', d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', clipRule: 'evenodd' })
          )
        ),
        'Assessment complete'
      )
    ),

    // Main content
    e('div', { className: 'max-w-2xl mx-auto px-4 py-6' },
      view === 'form'
        ? e('div', {},
            e('div', { className: 'mb-5' },
              e('h1', { className: 'text-xl font-bold text-gray-900 mb-1' }, 'Active Surveillance Assessment'),
              e('p', { className: 'text-sm text-gray-500' }, 'Enter your biopsy and diagnostic data below. Sections marked optional provide additional precision when available.')
            ),
            e(PatientForm, { onSubmit: handleFormSubmit })
          )
        : e(PatientResults, { results, inputs, onBack: handleBackToForm })
    )
  )
}

import React, { useState } from 'react'
import { Save } from 'lucide-react'
import { saveVisitSummary } from '../patientSession.js'

const e = React.createElement

// Shared "Save Visit Summary" action for end-state screens. Persists a JSON
// record to localStorage (patient-session-keyed if a Patient ID is set).
export default function SaveVisitSummaryButton({ patientId, endState, recommendation, patientData }) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const record = {
      patientId: (patientId || '').trim() || null,
      visitDate: new Date().toISOString().slice(0, 10),
      startingGGG: patientData && patientData.ggg != null ? patientData.ggg : null,
      endState,
      psaValue: patientData && patientData.psa != null && patientData.psa !== '' ? Number(patientData.psa) : null,
      psad: patientData && patientData.psa && patientData.prostateVolume
        ? Number(patientData.psa) / Number(patientData.prostateVolume)
        : null,
      piRads: patientData && patientData.pirads != null ? patientData.pirads : null,
      genomicScores: patientData ? {
        decipher: patientData.decipher ?? null,
        gps: patientData.gps ?? null,
        prolaris: patientData.prolaris ?? null,
      } : null,
      recommendation,
      clinicianNotes: notes,
    }
    saveVisitSummary(record)
    setSaved(true)
    setShowNotes(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return e(React.Fragment, null,
    e('button', {
      type: 'button',
      onClick: () => setShowNotes(v => !v),
      className: 'flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:border-sinai-cerulean hover:text-sinai-navy transition-colors',
    }, e(Save, { className: 'w-4 h-4' }), saved ? 'Saved!' : 'Save Visit Summary'),

    showNotes && e('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40',
      onClick: () => setShowNotes(false),
    },
      e('div', {
        className: 'bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-slate-200',
        onClick: ev => ev.stopPropagation(),
      },
        e('p', { className: 'text-sinai-cetacean font-semibold mb-1' }, 'Save Visit Summary'),
        e('p', { className: 'text-sm text-slate-500 mb-3' }, 'Optional clinician notes for this visit record.'),
        e('textarea', {
          value: notes,
          onChange: ev => setNotes(ev.target.value),
          rows: 4,
          placeholder: 'Notes (optional)…',
          className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sinai-cerulean/40',
        }),
        e('div', { className: 'flex gap-3 justify-end' },
          e('button', { onClick: () => setShowNotes(false), className: 'px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50' }, 'Cancel'),
          e('button', { onClick: handleSave, className: 'px-4 py-2 bg-sinai-cerulean text-white rounded-lg text-sm font-semibold hover:bg-sinai-cerulean-dark' }, 'Save')
        )
      )
    )
  )
}

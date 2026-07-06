import React, { useState, useEffect } from 'react'
import { hasSession, loadSession } from '../patientSession.js'

const e = React.createElement

export default function PatientSessionPanel({ patientId, onPatientIdChange, onLoadSession }) {
  const [loaded, setLoaded] = useState(false)

  const trimmed = (patientId || '').trim()
  const sessionExists = trimmed.length > 0 && hasSession(trimmed)

  useEffect(() => { setLoaded(false) }, [patientId])

  function handleLoad() {
    const session = loadSession(trimmed)
    if (session && onLoadSession) onLoadSession(session)
    setLoaded(true)
  }

  return e('div', {
    style: {
      padding: '14px 16px', borderRadius: 12, marginBottom: 16,
      background: '#f8fafc', border: '1px solid #e2e8f0',
    },
  },
    e('div', { style: { fontSize: 11, fontWeight: 700, color: '#212070', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } },
      'Patient Session'
    ),
    e('label', { style: { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 } },
      'Patient ID (optional — for longitudinal tracking)'
    ),
    e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      e('input', {
        type: 'text',
        value: patientId || '',
        placeholder: 'e.g. AS-1042',
        onChange: ev => onPatientIdChange && onPatientIdChange(ev.target.value),
        style: {
          flex: '1 1 160px', padding: '8px 10px', border: '1px solid #cbd5e1',
          borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff',
        },
      }),
      sessionExists && e('button', {
        type: 'button',
        onClick: handleLoad,
        style: {
          padding: '8px 14px', borderRadius: 8, border: '1px solid #06ABEB',
          background: loaded ? '#06ABEB' : '#fff', color: loaded ? '#fff' : '#06ABEB',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        },
      }, loaded ? 'Session loaded' : 'Load previous session')
    ),
    e('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 6 } },
      'Use a clinic-assigned code — not a patient name or MRN. Data stays on this device.'
    )
  )
}

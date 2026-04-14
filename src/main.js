import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import RoleSelector from './RoleSelector.js'
import PatientApp from './PatientApp.js'
import CareTeamModal from './components/CareTeamModal.js'
import ClinicalCalculator from './components/ClinicalCalculator.js'
import './index.css'
import { Info } from 'lucide-react'

const e = React.createElement

function Root() {
  const [role,              setRole]             = useState(null) // null | 'patient' | 'clinician'
  const [clinicianTab,      setClinicianTab]     = useState('pathway') // 'pathway' | 'calculator'
  const [clinicianCareOpen, setClinicianCareOpen] = useState(false)

  if (role === 'patient') {
    return e(PatientApp, { onBack: () => setRole(null) })
  }

  if (role === 'clinician') {
    return e('div', {},
      e(CareTeamModal, { open: clinicianCareOpen, onClose: () => setClinicianCareOpen(false) }),

      // ── Fixed top bar: back + care team ───────────────────────────────────
      e('div', {
        className: 'no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2',
        style: { background: 'rgba(0,0,45,0.95)', backdropFilter: 'blur(8px)', height: '40px' },
      },
        e('button', {
          onClick: () => setRole(null),
          className: 'flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors',
        },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Change role'
        ),
        e('button', {
          type: 'button',
          onClick: () => setClinicianCareOpen(true),
          className: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-white/90 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          title: 'Meet the Care Team',
          'aria-label': 'Meet the Care Team',
        },
          e(Info, { className: 'h-4 w-4' }),
          e('span', { className: 'text-xs font-semibold' }, 'Meet the Care Team')
        )
      ),

      // ── Fixed tab bar: Pathway | Calculator ───────────────────────────────
      e('div', {
        className: 'no-print fixed left-0 right-0 z-40 flex items-stretch',
        style: { top: '40px', height: '40px', background: '#00002D', borderBottom: '1px solid rgba(255,255,255,0.08)' },
      },
        [
          { key: 'pathway',    label: 'Clinical Pathway', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
          { key: 'calculator', label: 'AS Calculator',    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z' },
        ].map(tab =>
          e('button', {
            key: tab.key, type: 'button',
            onClick: () => setClinicianTab(tab.key),
            className: 'flex items-center gap-2 px-5 text-xs font-semibold transition-colors focus:outline-none',
            style: clinicianTab === tab.key
              ? { color: '#06ABEB', borderBottom: '2px solid #06ABEB', marginBottom: '-1px', background: 'rgba(6,171,235,0.06)' }
              : { color: 'rgba(255,255,255,0.45)', borderBottom: '2px solid transparent', background: 'transparent' },
          },
            e('svg', { className: 'w-3.5 h-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
              e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: tab.icon })
            ),
            tab.label
          )
        )
      ),

      // ── Content — 80 px top padding for both fixed bars ───────────────────
      e('div', { style: { paddingTop: '80px' } },
        clinicianTab === 'pathway'
          ? e(App)
          : e(ClinicalCalculator)
      )
    )
  }

  return e(RoleSelector, { onSelectRole: setRole })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(Root)
  )
)

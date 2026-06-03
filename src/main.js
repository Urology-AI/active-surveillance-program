import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import RoleSelector from './RoleSelector.js'
import PatientApp from './PatientApp.js'
import ProgramHeaderBar from './components/ProgramHeaderBar.js'
import ProgramDisclaimerFooter from './components/ProgramDisclaimerFooter.js'
import ClinicalCalculator from './components/ClinicalCalculator.js'
import './index.css'

const e = React.createElement
const CLINICIAN_CONSENT_KEY = 'as_clinician_consent_accepted'

function ClinicianShell({ onChangeRole, epsaPrefill }) {
  const [toolMode, setToolMode] = useState('calculator')
  const [calculatorInputs, setCalculatorInputs] = useState(null)
  const [clinicianConsentAccepted, setClinicianConsentAccepted] = useState(false)
  const [pathwayMeta, setPathwayMeta] = useState({
    currentPart: null,
    stepLabel: null,
    showReset: false,
  })
  const pathwayResetRef = useRef(() => {})

  useEffect(() => {
    try {
      setClinicianConsentAccepted(localStorage.getItem(CLINICIAN_CONSENT_KEY) === 'true')
    } catch (_) {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CLINICIAN_CONSENT_KEY, clinicianConsentAccepted ? 'true' : 'false')
    } catch (_) {}
  }, [clinicianConsentAccepted])

  return e(React.Fragment, null,
    e(ProgramHeaderBar, {
      currentPart: toolMode === 'pathway' ? pathwayMeta.currentPart : null,
      stepLabel: toolMode === 'pathway' ? pathwayMeta.stepLabel : 'AI Surveillance Tool',
      onReset: () => pathwayResetRef.current?.(),
      showReset: clinicianConsentAccepted && toolMode === 'pathway' && pathwayMeta.showReset,
      changeRoleOnClick: onChangeRole,
      clinicianToolMode: toolMode,
      onClinicianToolModeChange: setToolMode,
    }),
    !clinicianConsentAccepted
      ? e('div', { className: 'min-h-[calc(100vh-1px)] bg-sinai-page px-4 py-8' },
          e('div', { className: 'max-w-2xl mx-auto rounded-2xl border p-5 sm:p-6 shadow-sm', style: { background: '#fff7ed', borderColor: '#fed7aa' } },
            e('h2', { className: 'text-base sm:text-lg font-bold text-amber-900 mb-2' }, 'Clinician Acknowledgment'),
            e('p', { className: 'text-sm text-amber-900/90 leading-relaxed' },
              'This clinical pathway and AI Surveillance Tool (AS Tool) are decision-support tools for trained clinicians. They are educational aids and do not replace independent medical judgment, institutional protocol, or formal specialist consultation.'
            ),
            e('p', { className: 'text-sm text-amber-900/90 leading-relaxed mt-2' },
              'By continuing, you acknowledge responsibility for final clinical decisions and patient-specific management.'
            ),
            e('label', { className: 'mt-4 flex items-start gap-2.5 cursor-pointer select-none' },
              e('input', {
                type: 'checkbox',
                checked: clinicianConsentAccepted,
                onChange: (ev) => setClinicianConsentAccepted(ev.target.checked),
                className: 'mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500',
              }),
              e('span', { className: 'text-sm text-amber-900' },
                'I acknowledge and want to continue to the clinician tool.'
              )
            )
          )
        )
      : e(React.Fragment, null,
          // Keep both mounted so state is preserved when switching tabs
          e('div', { style: { display: toolMode === 'pathway' ? 'block' : 'none' } },
            e(App, {
              externalHeader: true,
              onPathwayMetaChange: setPathwayMeta,
              pathwayResetRef,
              patientData: calculatorInputs,
            })
          ),
          e('div', { style: { display: toolMode === 'calculator' ? 'block' : 'none' }, className: 'min-h-[calc(100vh-1px)] bg-sinai-page' },
            e(ClinicalCalculator, { onBack: onChangeRole, epsaPrefill, onAssessmentRun: setCalculatorInputs })
          )
        ),
    e(ProgramDisclaimerFooter)
  )
}

function Root() {
  const [role,        setRole]        = useState(null)
  const [epsaPrefill, setEpsaPrefill] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('epsa')
    if (!raw) return
    try {
      const decoded = JSON.parse(decodeURIComponent(raw))
      setEpsaPrefill(decoded)
      setRole('clinician')
      // Clean the URL so a page refresh doesn't re-trigger
      const clean = new URL(window.location.href)
      clean.searchParams.delete('epsa')
      window.history.replaceState({}, '', clean.toString())
    } catch (_) {}
  }, [])

  if (role === 'patient') {
    return e(PatientApp, { onBack: () => setRole(null) })
  }

  if (role === 'clinician') {
    return e(ClinicianShell, { onChangeRole: () => { setRole(null); setEpsaPrefill(null) }, epsaPrefill })
  }

  return e(RoleSelector, { onSelectRole: setRole })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(Root)
  )
)

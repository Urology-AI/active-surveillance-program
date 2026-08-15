import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import RoleSelector from './RoleSelector.js'
import PatientApp from './PatientApp.js'
import ProgramHeaderBar from './components/ProgramHeaderBar.js'
import ProgramDisclaimerFooter from './components/ProgramDisclaimerFooter.js'
import ClinicalCalculator from './components/ClinicalCalculator.js'
import BatchCalculator from './components/BatchCalculator.js'
import CohortBenchmark from './components/CohortBenchmark.js'
import EquityAudit from './components/EquityAudit.js'
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
          ),
          e('div', { style: { display: toolMode === 'batch' ? 'block' : 'none' }, className: 'min-h-[calc(100vh-1px)] bg-sinai-page' },
            e(BatchCalculator, null)
          ),
          // Practice-level views. Deliberately not in the per-patient result path —
          // these audit a practice's own patterns, not an individual's risk.
          e('div', { style: { display: toolMode === 'benchmarks' ? 'block' : 'none' }, className: 'min-h-[calc(100vh-1px)] bg-sinai-page' },
            e('div', { className: 'max-w-3xl mx-auto px-4 py-6 space-y-6' },
              e(CohortBenchmark, null),
              e(EquityAudit, null)
            )
          )
        ),
    e(ProgramDisclaimerFooter)
  )
}

/**
 * Role from the URL path.
 *
 * `/clinician/` is a real document (see clinician/index.html + the multi-entry
 * build), which is what allows a Cloudflare Access path rule to gate it. The
 * root document stays public for patients.
 *
 * SECURITY NOTE: this is routing, not authorization. Access enforces the gate
 * at the edge on the document request; nothing here does. The JS bundle is
 * shared between both entry points and is public either way, so treat this as
 * "which view loads", never as "who is allowed in".
 */
function roleFromPath() {
  try {
    const path = window.location.pathname.replace(/\/+$/, '')
    if (path.endsWith('/clinician')) return 'clinician'
    if (path.endsWith('/patient'))   return 'patient'
    return null
  } catch (_) {
    return null
  }
}


const CLINICIAN_PATH = '/clinician/'
const PATIENT_PATH   = '/patient/'

function Root() {
  const [role,        setRole]        = useState(roleFromPath)
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

  // The clinician view is only ever reached by loading the /clinician/
  // document, so the Access gate on that path is what admits the user. The
  // welcome screen's clinician option NAVIGATES there (a real request) rather
  // than flipping local state — an in-page switch would hand out the clinician
  // UI from the public root document without the gated path ever being
  // requested, making the gate decorative.
  if (role === 'clinician') {
    return e(ClinicianShell, {
      onChangeRole: () => { window.location.assign('/') },
      epsaPrefill,
    })
  }

  if (role === 'patient') {
    return e(PatientApp, { onBack: () => window.location.assign('/') })
  }

  // Root is the welcome screen. Both roles are real paths, so each selection is
  // a navigation, not a state flip — /clinician/ can then be gated by Access
  // while /patient/ and / stay public.
  return e(RoleSelector, {
    onSelectRole: (key) => {
      window.location.assign(key === 'clinician' ? CLINICIAN_PATH : PATIENT_PATH)
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(Root)
  )
)

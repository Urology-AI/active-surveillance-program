import React, { useState, useEffect, useCallback } from 'react'
import StartScreen from './components/StartScreen.js'
import Step1PatientIntent from './components/Step1PatientIntent.js'
import Step2GleasonScore from './components/Step2GleasonScore.js'
import Step3RiskStratification from './components/Step3RiskStratification.js'
import Step4MedicalHistory from './components/Step4MedicalHistory.js'
import Step5SDMActiveSurveillance from './components/Step5SDMActiveSurveillance.js'
// Part 2
import Step6LifeExpectancy from './components/Step6LifeExpectancy.js'
import Step7ProviderActions from './components/Step7ProviderActions.js'
import Step8ConfirmatoryBx from './components/Step8ConfirmatoryBx.js'
import Step9ConcerningFeatures from './components/Step9ConcerningFeatures.js'
// Part 3
import Step10UroflowCheck from './components/Step10UroflowCheck.js'
import Step11ASProtocol from './components/Step11ASProtocol.js'
import Step12PSMAAssessment from './components/Step12PSMAAssessment.js'
import Step13NewFindings from './components/Step13NewFindings.js'
import Step14EarlyBxResults from './components/Step14EarlyBxResults.js'
// End states
import EndStateActiveSurveillance from './components/EndStateActiveSurveillance.js'
import EndStateDefinitiveTreatment from './components/EndStateDefinitiveTreatment.js'
import EndStateRefuseDefer from './components/EndStateRefuseDefer.js'
import EndStateWatchfulWaiting from './components/EndStateWatchfulWaiting.js'
import EndStateHighIntensityAS from './components/EndStateHighIntensityAS.js'
import EndStateStandardASEnrollment from './components/EndStateStandardASEnrollment.js'
import EndStateContinueAS from './components/EndStateContinueAS.js'
// UI
import FlowChartDebug from './components/FlowChartDebug.js'
import ChartPrintView from './components/ChartPrintView.js'
import AppHeader from './components/AppHeader.js'
import ProgramDisclaimerFooter from './components/ProgramDisclaimerFooter.js'
import ClinicianProgression from './components/ClinicianProgression.js'

const STORAGE_KEY = 'sinai-pathway-progress'

const STEPS = {
  START: 'start',
  STEP1: 'step1', STEP2: 'step2', STEP3: 'step3', STEP4: 'step4', STEP5: 'step5',
  STEP6: 'step6', STEP7: 'step7', STEP8: 'step8', STEP9: 'step9',
  STEP10: 'step10', STEP11: 'step11', STEP12: 'step12', STEP13: 'step13', STEP14: 'step14',
  END_ACTIVE_SURVEILLANCE: 'end_active_surveillance',
  END_DEFINITIVE_TREATMENT: 'end_definitive_treatment',
  END_REFUSE_DEFER: 'end_refuse_defer',
  END_WATCHFUL_WAITING: 'end_watchful_waiting',
  END_HIGH_INTENSITY_AS: 'end_high_intensity_as',
  END_STANDARD_AS_ENROLLMENT: 'end_standard_as_enrollment',
  END_CONTINUE_AS: 'end_continue_as',
}

const STEP_LABELS = {
  [STEPS.START]: 'Start',
  [STEPS.STEP1]: 'Step 1: Patient Intent',
  [STEPS.STEP2]: 'Step 2: Gleason Score',
  [STEPS.STEP3]: 'Step 3: Risk Stratification',
  [STEPS.STEP4]: 'Step 4: Medical History',
  [STEPS.STEP5]: 'Step 5: SDM on Active Surveillance',
  [STEPS.STEP6]: 'Step 6: Life Expectancy',
  [STEPS.STEP7]: 'Step 7: Provider Actions',
  [STEPS.STEP8]: 'Step 8: TR Confirmatory Biopsy',
  [STEPS.STEP9]: 'Step 9: Concerning Features',
  [STEPS.STEP10]: 'Step 10: Uroflow Check',
  [STEPS.STEP11]: 'Step 11: AS Standard Protocol',
  [STEPS.STEP12]: 'Step 12: PSMA Assessment',
  [STEPS.STEP13]: 'Step 13: New Positive Findings',
  [STEPS.STEP14]: 'Step 14: Early Biopsy Results',
  [STEPS.END_ACTIVE_SURVEILLANCE]: 'Active Surveillance Initiated',
  [STEPS.END_DEFINITIVE_TREATMENT]: 'Definitive Treatment',
  [STEPS.END_REFUSE_DEFER]: 'Refuse/Defer',
  [STEPS.END_WATCHFUL_WAITING]: 'Watchful Waiting',
  [STEPS.END_HIGH_INTENSITY_AS]: 'High Intensity AS Protocol',
  [STEPS.END_STANDARD_AS_ENROLLMENT]: 'Enrolled in Active Surveillance',
  [STEPS.END_CONTINUE_AS]: 'Continue on Active Surveillance',
}

const PAGE_TITLES = {
  [STEPS.START]: 'Tewari Active Surveillance Program',
  [STEPS.STEP1]: 'Step 1: Patient Intent',
  [STEPS.STEP2]: 'Step 2: Gleason Score',
  [STEPS.STEP3]: 'Step 3: Risk Stratification',
  [STEPS.STEP4]: 'Step 4: Medical History',
  [STEPS.STEP5]: 'Step 5: SDM — Active Surveillance',
  [STEPS.STEP6]: 'Step 6: Life Expectancy',
  [STEPS.STEP7]: 'Step 7: Provider Actions',
  [STEPS.STEP8]: 'Step 8: TR Confirmatory Biopsy',
  [STEPS.STEP9]: 'Step 9: Concerning Features',
  [STEPS.STEP10]: 'Step 10: Uroflow Check',
  [STEPS.STEP11]: 'Step 11: AS Standard Protocol',
  [STEPS.STEP12]: 'Step 12: PSMA Assessment',
  [STEPS.STEP13]: 'Step 13: New Positive Findings',
  [STEPS.STEP14]: 'Step 14: Early Biopsy Results',
  [STEPS.END_ACTIVE_SURVEILLANCE]: 'Active Surveillance Initiated',
  [STEPS.END_DEFINITIVE_TREATMENT]: 'Result: Definitive Treatment',
  [STEPS.END_REFUSE_DEFER]: 'Result: Refuse/Defer',
  [STEPS.END_WATCHFUL_WAITING]: 'Result: Watchful Waiting',
  [STEPS.END_HIGH_INTENSITY_AS]: 'Result: High Intensity AS Protocol',
  [STEPS.END_STANDARD_AS_ENROLLMENT]: 'Result: Enrolled in AS',
  [STEPS.END_CONTINUE_AS]: 'Result: Continue on AS',
}

// ── Pathway minimap data ─────────────────────────────────────────────────────

const STEPS_14 = [
  { n: 1,  part: 1, short: 'Patient Intent' },
  { n: 2,  part: 1, short: 'Gleason Score' },
  { n: 3,  part: 1, short: 'Risk Strat.' },
  { n: 4,  part: 1, short: 'Medical Hx' },
  { n: 5,  part: 1, short: 'SDM on AS' },
  { n: 6,  part: 2, short: 'Life Exp.' },
  { n: 7,  part: 2, short: 'Provider Acts' },
  { n: 8,  part: 2, short: 'TR Bx' },
  { n: 9,  part: 2, short: 'Concerning' },
  { n: 10, part: 3, short: 'Uroflow' },
  { n: 11, part: 3, short: 'AS Protocol' },
  { n: 12, part: 3, short: 'PSMA' },
  { n: 13, part: 3, short: 'New Findings' },
  { n: 14, part: 3, short: 'Early Bx' },
]

const PART_META = {
  1: { label: 'Part 1', range: 'Steps 1–5',   color: '#06ABEB' },
  2: { label: 'Part 2', range: 'Steps 6–9',   color: '#DC298D' },
  3: { label: 'Part 3', range: 'Steps 10–14', color: '#10b981' },
}

function stepKeyToNum(key) {
  const m = key && key.match(/^step(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

// ── PathwayMinimap ────────────────────────────────────────────────────────────

function PathwayMinimap({ currentStepKey, stepHistory }) {
  const visitedNums = new Set(stepHistory.map(stepKeyToNum).filter(Boolean))
  const currentNum  = stepKeyToNum(currentStepKey)

  return React.createElement('div', { style: { padding: 12 } },
    React.createElement('div', {
      style: {
        fontSize: 10, fontWeight: 700, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
      },
    }, 'Pathway'),

    [1, 2, 3].map(p => {
      const meta      = PART_META[p]
      const partSteps = STEPS_14.filter(s => s.part === p)

      return React.createElement('div', { key: p, style: { marginBottom: 10 } },
        // Part header row
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
        },
          React.createElement('span', {
            style: {
              width: 6, height: 6, borderRadius: '50%',
              background: meta.color, flexShrink: 0, display: 'inline-block',
            },
          }),
          React.createElement('span', {
            style: {
              fontSize: 10.5, fontWeight: 700, color: '#00002D',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            },
          }, meta.label),
          React.createElement('span', { style: { fontSize: 10, color: '#94a3b8' } }, '· ' + meta.range)
        ),

        // Step rows
        React.createElement('div', {
          style: {
            display: 'flex', flexDirection: 'column', gap: 2,
            paddingLeft: 12, borderLeft: `2px solid ${meta.color}33`,
          },
        },
          partSteps.map(s => {
            const done    = visitedNums.has(s.n) && s.n !== currentNum
            const current = s.n === currentNum
            return React.createElement('div', {
              key: s.n,
              style: {
                padding: '3px 7px', borderRadius: 6, fontSize: 11,
                color: current ? '#00002D' : (done ? '#64748b' : '#94a3b8'),
                background: current ? `${meta.color}14` : 'transparent',
                fontWeight: current ? 700 : 500,
                display: 'flex', alignItems: 'center', gap: 6,
              },
            },
              React.createElement('span', {
                style: {
                  width: 14, height: 14, borderRadius: '50%',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  background: current ? meta.color : (done ? `${meta.color}40` : '#e2e8f0'),
                  color: (current || done) ? '#fff' : '#94a3b8',
                },
              }, done ? '✓' : String(s.n)),
              s.short
            )
          })
        )
      )
    })
  )
}

// ── FlowchartPanel ────────────────────────────────────────────────────────────

const CHART_NODES = [
  { key: 'start',  x: 90,  y: 10,  w: 60, h: 22, label: 'Start',         num: null },
  { key: 'step1',  x: 80,  y: 50,  w: 80, h: 22, label: '1 · Intent',    num: 1  },
  { key: 'step2',  x: 80,  y: 85,  w: 80, h: 22, label: '2 · Gleason',   num: 2  },
  { key: 'step3',  x: 20,  y: 120, w: 80, h: 22, label: '3 · Risk',      num: 3  },
  { key: 'step4',  x: 140, y: 120, w: 80, h: 22, label: '4 · Med Hx',    num: 4  },
  { key: 'step5',  x: 80,  y: 160, w: 80, h: 22, label: '5 · SDM',       num: 5  },
  { key: 'step6',  x: 80,  y: 200, w: 80, h: 22, label: '6 · Life Exp',  num: 6  },
  { key: 'step7',  x: 80,  y: 234, w: 80, h: 22, label: '7 · Provider',  num: 7  },
  { key: 'step8',  x: 80,  y: 268, w: 80, h: 22, label: '8 · TR Bx',     num: 8  },
  { key: 'step9',  x: 80,  y: 302, w: 80, h: 22, label: '9 · Concern',   num: 9  },
  { key: 'step10', x: 80,  y: 340, w: 80, h: 22, label: '10 · Uroflow',  num: 10 },
  { key: 'step11', x: 80,  y: 374, w: 80, h: 22, label: '11 · Protocol', num: 11 },
  { key: 'step12', x: 20,  y: 408, w: 80, h: 22, label: '12 · PSMA',     num: 12 },
  { key: 'step13', x: 140, y: 408, w: 80, h: 22, label: '13 · Findings', num: 13 },
  { key: 'step14', x: 140, y: 442, w: 80, h: 22, label: '14 · Early Bx', num: 14 },
  { key: '_end',   x: 80,  y: 480, w: 80, h: 22, label: 'Continue AS',   num: null },
]

const CHART_LINES = [
  [120, 32,  120, 50],  [120, 72,  120, 85],
  [100, 107, 60,  120], [140, 107, 180, 120],
  [60,  142, 100, 160], [180, 142, 140, 160],
  [120, 182, 120, 200],
  [120, 222, 120, 234], [120, 256, 120, 268],
  [120, 290, 120, 302], [120, 324, 120, 340],
  [120, 362, 120, 374], [100, 396, 60,  408], [140, 396, 180, 408],
  [180, 430, 180, 442], [180, 464, 120, 480],
]

function FlowchartPanel({ currentStepKey, stepHistory, onExpand }) {
  const visitedNums = new Set(stepHistory.map(stepKeyToNum).filter(Boolean))
  const visitedKeys = new Set(stepHistory)
  const currentNum  = stepKeyToNum(currentStepKey)

  const C = { cerulean: '#06ABEB', emerald: '#10b981', navy: '#212070', magenta: '#DC298D' }

  return React.createElement('div', {
    style: { padding: 14, display: 'flex', flexDirection: 'column', height: '100%' },
  },
    // Header
    React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      },
    },
      React.createElement('span', {
        style: {
          fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        },
      }, 'Flowchart'),
      React.createElement('button', {
        type: 'button', onClick: onExpand,
        style: {
          fontSize: 10, color: C.navy, background: 'transparent',
          border: 'none', fontWeight: 600, cursor: 'pointer', padding: 0,
        },
      }, 'Expand ↗')
    ),

    // SVG minimap
    React.createElement('svg', {
      viewBox: '0 0 240 520',
      style: {
        width: '100%', background: '#fafbff',
        borderRadius: 10, border: '1px solid #f1f5f9',
      },
    },
      React.createElement('defs', {},
        React.createElement('marker', {
          id: 'ca', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto',
        },
          React.createElement('polygon', { points: '0 0, 6 3, 0 6', fill: C.cerulean })
        )
      ),
      // Connection lines
      CHART_LINES.map(([x1, y1, x2, y2], i) =>
        React.createElement('line', {
          key: 'l' + i, x1, y1, x2, y2,
          stroke: C.cerulean, strokeWidth: 1.5, markerEnd: 'url(#ca)',
        })
      ),
      // Nodes
      CHART_NODES.map(n => {
        const isCurrent = n.key === currentStepKey
        const isVisited = (n.num ? visitedNums.has(n.num) : visitedKeys.has(n.key)) && !isCurrent
        const fill        = isCurrent ? C.cerulean : (isVisited ? C.emerald : '#f8fafc')
        const stroke      = isCurrent ? C.navy : (isVisited ? '#047857' : '#e2e8f0')
        const textFill    = (isCurrent || isVisited) ? '#fff' : '#94a3b8'
        const sw          = isCurrent ? 2 : 1
        return React.createElement('g', { key: n.key },
          React.createElement('rect', {
            x: n.x, y: n.y, width: n.w, height: n.h,
            rx: 6, fill, stroke, strokeWidth: sw,
          }),
          React.createElement('text', {
            x: n.x + n.w / 2, y: n.y + n.h / 2 + 3,
            fontSize: 9, fontWeight: 600, fill: textFill,
            textAnchor: 'middle',
          }, n.label),
          isCurrent && React.createElement('circle', {
            cx: n.x + n.w - 5, cy: n.y + 5, r: 3, fill: C.magenta,
          },
            React.createElement('animate', {
              attributeName: 'opacity', values: '0.4;1;0.4',
              dur: '1.5s', repeatCount: 'indefinite',
            })
          )
        )
      }),
      // Part labels
      React.createElement('text', { x: 5, y: 46, fontSize: 8, fontWeight: 700, fill: C.cerulean }, 'P1'),
      React.createElement('text', { x: 5, y: 196, fontSize: 8, fontWeight: 700, fill: '#DC298D' }, 'P2'),
      React.createElement('text', { x: 5, y: 336, fontSize: 8, fontWeight: 700, fill: C.emerald }, 'P3'),
    ),

    // Legend
    React.createElement('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 } },
      [
        { c: C.emerald,  l: 'Completed' },
        { c: C.cerulean, l: 'Current'   },
        { c: '#cbd5e1',  l: 'Upcoming'  },
      ].map((x, i) =>
        React.createElement('div', {
          key: i,
          style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#64748b' },
        },
          React.createElement('div', {
            style: { width: 10, height: 10, borderRadius: 2, background: x.c, flexShrink: 0 },
          }),
          x.l
        )
      )
    )
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

// ── Auto-advance logic ────────────────────────────────────────────────────────

function deriveAutoPath(patientData) {
  if (!patientData || patientData.ggg == null) return null
  const { ggg, positiveCores, totalCores, psa } = patientData
  const intermediateSteps = [STEPS.STEP2]
  const summary = []

  if (ggg === 1) {
    summary.push({ label: 'Step 2 · Gleason Score', value: 'Gleason 6 (3+3) — Grade Group 1' })
    return { intermediateSteps, targetStep: STEPS.STEP4, summary }
  }

  if (ggg === 2) {
    summary.push({ label: 'Step 2 · Gleason Score', value: 'Gleason 7 (3+4) — Grade Group 2' })
    const pc    = positiveCores !== '' && positiveCores != null ? Number(positiveCores) : null
    const tc    = totalCores    !== '' && totalCores    != null ? Number(totalCores)    : null
    const psaNum = psa          !== '' && psa           != null ? Number(psa)           : null

    if (pc != null && tc != null && psaNum != null && tc > 0) {
      intermediateSteps.push(STEPS.STEP3)
      const coreRatio = pc / tc
      const irfCount  = 1 + (psaNum >= 10 && psaNum <= 20 ? 1 : 0) // GGG 2 = 1 IRF; PSA 10–20 = another
      if (irfCount === 1 && coreRatio < 0.5) {
        summary.push({ label: 'Step 3 · Risk Stratification', value: 'Favorable Intermediate (1 IRF, <50% positive cores)' })
        return { intermediateSteps, targetStep: STEPS.STEP4, summary }
      } else {
        summary.push({ label: 'Step 3 · Risk Stratification', value: 'Unfavorable Intermediate → Definitive Treatment' })
        return { intermediateSteps, targetStep: STEPS.END_DEFINITIVE_TREATMENT, summary }
      }
    }
    return { intermediateSteps, targetStep: STEPS.STEP3, summary }
  }

  if (ggg >= 3) {
    summary.push({ label: 'Step 2 · Gleason Score', value: `Gleason 7 (4+3) or higher — Grade Group ${ggg}` })
    return { intermediateSteps, targetStep: STEPS.END_DEFINITIVE_TREATMENT, summary }
  }

  return null
}

function App({ externalHeader, onPathwayMetaChange, pathwayResetRef, patientData } = {}) {
  const [currentStep,        setCurrentStep]        = useState(STEPS.START)
  const [stepHistory,        setStepHistory]        = useState([])
  const [forwardStack,       setForwardStack]       = useState([])
  const [showResumePrompt,   setShowResumePrompt]   = useState(false)
  const [showChartForPrint,  setShowChartForPrint]  = useState(false)
  const [showProgression,    setShowProgression]    = useState(false)
  const [autoAdvanceSummary, setAutoAdvanceSummary] = useState(null)
  const [patientId,          setPatientId]          = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const { currentStep: s, stepHistory: h } = JSON.parse(raw)
      if ((s && s !== STEPS.START) || (h && h.length > 0)) setShowResumePrompt(true)
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (currentStep === STEPS.START) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, stepHistory }))
  }, [currentStep, stepHistory])

  useEffect(() => {
    const t = PAGE_TITLES[currentStep]
    document.title = t ? `${t} · Mount Sinai` : 'Mount Sinai · Tewari Active Surveillance Program'
  }, [currentStep])

  const goToStep = (step) => {
    setStepHistory(prev => [...prev, currentStep])
    setCurrentStep(step)
    setForwardStack([])
  }

  const goBack = () => {
    if (stepHistory.length > 0) {
      setForwardStack(prev => [currentStep, ...prev])
      const prev = stepHistory[stepHistory.length - 1]
      setStepHistory(h => h.slice(0, -1))
      setCurrentStep(prev)
      setAutoAdvanceSummary(null)
    }
  }

  const goForward = () => {
    if (forwardStack.length > 0) {
      const next = forwardStack[0]
      setStepHistory(h => [...h, currentStep])
      setForwardStack(f => f.slice(1))
      setCurrentStep(next)
    }
  }

  // Jump to a target step, inserting intermediateSteps into history as if visited
  const jumpToStep = (targetStep, intermediateSteps = [], summary = null) => {
    setStepHistory(prev => [...prev, currentStep, ...intermediateSteps])
    setCurrentStep(targetStep)
    setForwardStack([])
    setAutoAdvanceSummary(summary)
  }

  const reset = useCallback(() => {
    setCurrentStep(STEPS.START)
    setStepHistory([])
    setForwardStack([])
    setAutoAdvanceSummary(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch (_) {}
  }, [])

  const resumeProgress = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const { currentStep: s, stepHistory: h } = JSON.parse(raw)
        if (s) setCurrentStep(s)
        if (Array.isArray(h)) setStepHistory(h)
      }
    } catch (_) {}
    setShowResumePrompt(false)
  }

  const startOver = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch (_) {}
    setShowResumePrompt(false)
  }

  const getCurrentPart = () => {
    const p1 = ['step1','step2','step3','step4','step5','end_active_surveillance','end_definitive_treatment','end_refuse_defer']
    const p2 = ['step6','step7','step8','step9','end_watchful_waiting','end_high_intensity_as','end_standard_as_enrollment']
    const p3 = ['step10','step11','step12','step13','step14','end_continue_as']
    if (p1.includes(currentStep)) return 1
    if (p2.includes(currentStep)) return 2
    if (p3.includes(currentStep)) return 3
    return null
  }
  const currentPart      = currentStep !== STEPS.START ? getCurrentPart() : null
  const currentStepLabel = currentStep !== STEPS.START ? (STEP_LABELS[currentStep] || null) : null

  useEffect(() => {
    if (pathwayResetRef) pathwayResetRef.current = reset
  }, [pathwayResetRef, reset])

  useEffect(() => {
    if (!externalHeader || !onPathwayMetaChange) return
    const stepLabel    = currentStep === STEPS.START ? 'Clinical Pathway' : currentStepLabel
    const partForHeader = currentStep === STEPS.START ? null : currentPart
    onPathwayMetaChange({
      currentPart: partForHeader,
      stepLabel,
      showReset: currentStep !== STEPS.START,
    })
  }, [externalHeader, onPathwayMetaChange, currentPart, currentStepLabel, currentStep])

  const pathTaken      = [...stepHistory, currentStep]
  const pathSummary    = pathTaken.map(s => STEP_LABELS[s] || s).join(' → ')
  const pathSummaryFull = `Mount Sinai · Tewari Active Surveillance Program\nPath: ${pathSummary}\n${new Date().toLocaleString()}`

  const canGoBack    = stepHistory.length > 0
  const canGoForward = forwardStack.length > 0

  const navProps = { onBack: goBack, onForward: goForward, canGoBack, canGoForward }

  const endStateProps = {
    onReset: reset,
    pathSummary: pathSummaryFull,
    onBack: goBack,
    canGoBack,
    onPrintChart: () => setShowChartForPrint(true),
    patientId,
    patientData,
    endState: STEP_LABELS[currentStep] || currentStep,
  }

  // Resume prompt modal
  const resumePromptEl = showResumePrompt && React.createElement('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]',
  },
    React.createElement('div', {
      className: 'bg-white rounded-2xl shadow-sinai-lg p-6 max-w-sm w-full border border-slate-200/80',
    },
      React.createElement('p', { className: 'text-sinai-cetacean font-semibold text-base mb-1' }, 'Resume where you left off?'),
      React.createElement('p', { className: 'text-xs text-slate-500 mb-4' }, 'Continue your pathway or start fresh.'),
      React.createElement('div', { className: 'flex flex-col gap-2' },
        React.createElement('button', {
          onClick: resumeProgress,
          className: 'w-full py-2.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark transition-colors',
        }, 'Resume'),
        React.createElement('button', {
          onClick: startOver,
          className: 'w-full py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors',
        }, 'Start over')
      )
    )
  )

  // Floating panels (always rendered outside the grid)
  const floatingPanels = React.createElement(React.Fragment, null,
    React.createElement(FlowChartDebug, {
      currentStep,
      stepHistory,
      onStepClick: (step) => {
        if (step === STEPS.START || step.startsWith('end_')) goToStep(step)
      },
    }),
    showChartForPrint && React.createElement(ChartPrintView, {
      currentStep,
      stepHistory,
      onClose: () => setShowChartForPrint(false),
    })
  )

  // Step content (same logic as before, extracted for reuse in both layouts)
  const stepNum = stepKeyToNum(currentStep)

  // Auto-advance summary banner shown after auto-population
  const autoAdvanceBanner = autoAdvanceSummary && autoAdvanceSummary.length > 0 &&
    React.createElement('div', {
      style: {
        marginBottom: 14, padding: '10px 14px',
        background: 'rgb(6 171 235 / 0.07)',
        border: '1px solid rgb(6 171 235 / 0.25)',
        borderRadius: 12,
      },
    },
      React.createElement('div', {
        style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
      },
        React.createElement('svg', {
          width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
          stroke: '#06ABEB', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round',
          style: { flexShrink: 0 },
        },
          React.createElement('polyline', { points: '20 6 9 17 4 12' })
        ),
        React.createElement('span', {
          style: { fontSize: 11.5, fontWeight: 700, color: '#06ABEB', textTransform: 'uppercase', letterSpacing: '0.05em' },
        }, 'Auto-populated from AS Tool')
      ),
      autoAdvanceSummary.map((item, i) =>
        React.createElement('div', {
          key: i,
          style: { display: 'flex', gap: 6, fontSize: 12, color: '#334155', marginBottom: i < autoAdvanceSummary.length - 1 ? 3 : 0 },
        },
          React.createElement('span', { style: { color: '#64748b', fontWeight: 600, minWidth: 160 } }, item.label + ':'),
          React.createElement('span', null, item.value)
        )
      )
    )

  const stepContent = React.createElement('div', { className: 'step-card', key: currentStep },

    // ── PART 1 ──
    currentStep === STEPS.STEP1 &&
      React.createElement(Step1PatientIntent, {
        onRefuseDefer: () => goToStep(STEPS.END_REFUSE_DEFER),
        onProceed: () => {
          const autoPath = deriveAutoPath(patientData)
          if (autoPath) {
            jumpToStep(autoPath.targetStep, autoPath.intermediateSteps, autoPath.summary)
          } else {
            goToStep(STEPS.STEP2)
          }
        },
        ...navProps,
      }),

    currentStep === STEPS.STEP2 &&
      React.createElement(Step2GleasonScore, {
        onGleason6: () => goToStep(STEPS.STEP4),
        onGleason7_3_4: () => goToStep(STEPS.STEP3),
        onGleason7_4_3_Plus: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
        ...navProps,
      }),

    currentStep === STEPS.STEP3 &&
      React.createElement(Step3RiskStratification, {
        onFavorable: () => goToStep(STEPS.STEP4),
        onUnfavorable: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
        ...navProps,
      }),

    currentStep === STEPS.STEP4 &&
      React.createElement(Step4MedicalHistory, {
        onHighRisk: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
        onLowRisk: () => goToStep(STEPS.STEP5),
        ...navProps,
      }),

    currentStep === STEPS.STEP5 &&
      React.createElement(Step5SDMActiveSurveillance, {
        onConfirm: () => goToStep(STEPS.END_ACTIVE_SURVEILLANCE),
        onDeclineToDT: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
        ...navProps,
      }),

    // ── PART 2 ──
    currentStep === STEPS.STEP6 &&
      React.createElement(Step6LifeExpectancy, {
        onYes: () => goToStep(STEPS.STEP7),
        onNo: () => goToStep(STEPS.END_WATCHFUL_WAITING),
        ...navProps,
      }),

    currentStep === STEPS.STEP7 &&
      React.createElement(Step7ProviderActions, {
        onConfirm: () => goToStep(STEPS.STEP8),
        ...navProps,
      }),

    currentStep === STEPS.STEP8 &&
      React.createElement(Step8ConfirmatoryBx, {
        onNegative: () => goToStep(STEPS.STEP9),
        onGleason6: () => goToStep(STEPS.STEP9),
        onGleason7Plus: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
        ...navProps,
      }),

    currentStep === STEPS.STEP9 &&
      React.createElement(Step9ConcerningFeatures, {
        onYes: () => goToStep(STEPS.END_HIGH_INTENSITY_AS),
        onNo: () => goToStep(STEPS.END_STANDARD_AS_ENROLLMENT),
        ...navProps,
      }),

    // ── PART 3 ──
    currentStep === STEPS.STEP10 &&
      React.createElement(Step10UroflowCheck, {
        onProceed: () => goToStep(STEPS.STEP11),
        ...navProps,
      }),

    currentStep === STEPS.STEP11 &&
      React.createElement(Step11ASProtocol, {
        onMRIPossible: () => goToStep(STEPS.STEP13),
        onNoMRI: () => goToStep(STEPS.STEP12),
        patientId,
        ...navProps,
      }),

    currentStep === STEPS.STEP12 &&
      React.createElement(Step12PSMAAssessment, {
        onContinue: () => goToStep(STEPS.END_CONTINUE_AS),
        ...navProps,
      }),

    currentStep === STEPS.STEP13 &&
      React.createElement(Step13NewFindings, {
        onYes: () => goToStep(STEPS.STEP14),
        onNo: () => goToStep(STEPS.END_CONTINUE_AS),
        patientId,
        ...navProps,
      }),

    currentStep === STEPS.STEP14 &&
      React.createElement(Step14EarlyBxResults, {
        onGleason6: () => goToStep(STEPS.END_CONTINUE_AS),
        onGleason7Plus: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
        ...navProps,
      }),

    // ── END STATES ──
    currentStep === STEPS.END_ACTIVE_SURVEILLANCE &&
      React.createElement(EndStateActiveSurveillance, {
        ...endStateProps,
        onContinuePart2: () => goToStep(STEPS.STEP6),
      }),

    currentStep === STEPS.END_DEFINITIVE_TREATMENT &&
      React.createElement(EndStateDefinitiveTreatment, endStateProps),

    currentStep === STEPS.END_REFUSE_DEFER &&
      React.createElement(EndStateRefuseDefer, endStateProps),

    currentStep === STEPS.END_WATCHFUL_WAITING &&
      React.createElement(EndStateWatchfulWaiting, endStateProps),

    currentStep === STEPS.END_HIGH_INTENSITY_AS &&
      React.createElement(EndStateHighIntensityAS, endStateProps),

    currentStep === STEPS.END_STANDARD_AS_ENROLLMENT &&
      React.createElement(EndStateStandardASEnrollment, {
        ...endStateProps,
        onContinuePart3: () => goToStep(STEPS.STEP10),
      }),

    currentStep === STEPS.END_CONTINUE_AS &&
      React.createElement(EndStateContinueAS, endStateProps),
  )

  // ── START: centered single-column layout ────────────────────────────────────
  // ── PROGRESSION TRACKER mode ────────────────────────────────────────────────
  if (showProgression) {
    return React.createElement('div', { style: { height: '100vh', display: 'flex', flexDirection: 'column' } },
      React.createElement(ClinicianProgression, {
        onBack: () => setShowProgression(false),
        onGoToFlow: () => { setShowProgression(false); goToStep(STEPS.STEP1) },
        patientData,
      })
    )
  }

  if (currentStep === STEPS.START) {
    return React.createElement('div', { className: 'min-h-screen bg-sinai-page' },
      resumePromptEl,
      !externalHeader && React.createElement(AppHeader, {
        currentPart: null, stepLabel: null, onReset: reset, showReset: false,
      }),
      React.createElement('div', { className: 'max-w-xl mx-auto px-4 pt-6 pb-12' },
        React.createElement(StartScreen, {
          onStart: () => goToStep(STEPS.STEP1),
          onProgression: () => setShowProgression(true),
          patientData,
          patientId,
          onPatientIdChange: setPatientId,
          onLoadSession: () => {},
        })
      ),
      !externalHeader && React.createElement(ProgramDisclaimerFooter),
      floatingPanels
    )
  }

  // ── STEPS + END STATES: three-column layout ─────────────────────────────────

  // Back / Forward nav row for the center column
  const navRow = React.createElement('div', {
    style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  },
    React.createElement('button', {
      type: 'button', onClick: goBack, disabled: !canGoBack,
      style: {
        padding: '6px 10px', borderRadius: 8,
        border: '1px solid #e2e8f0',
        background: canGoBack ? '#fff' : '#f1f5f9',
        fontSize: 12, fontWeight: 600,
        color: canGoBack ? '#00002D' : '#94a3b8',
        display: 'flex', alignItems: 'center', gap: 4,
        cursor: canGoBack ? 'pointer' : 'not-allowed',
      },
    },
      React.createElement('svg', {
        width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2,
        strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        React.createElement('polyline', { points: '15 18 9 12 15 6' })
      ),
      'Back'
    ),
    React.createElement('button', {
      type: 'button', onClick: goForward, disabled: !canGoForward,
      style: {
        padding: '6px 10px', borderRadius: 8,
        border: '1px solid #e2e8f0',
        background: canGoForward ? '#fff' : '#f1f5f9',
        fontSize: 12, fontWeight: 600,
        color: canGoForward ? '#00002D' : '#94a3b8',
        display: 'flex', alignItems: 'center', gap: 4,
        cursor: canGoForward ? 'pointer' : 'not-allowed',
      },
    },
      'Forward',
      React.createElement('svg', {
        width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 2,
        strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        React.createElement('polyline', { points: '9 18 15 12 9 6' })
      )
    ),
    stepNum && React.createElement('div', {
      style: { marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#64748b' },
    }, `${stepNum} of 14`)
  )

  return React.createElement('div', { className: 'min-h-screen bg-sinai-page' },
    resumePromptEl,
    !externalHeader && React.createElement(AppHeader, {
      currentPart,
      stepLabel: currentStepLabel,
      onReset: reset,
      showReset: true,
    }),

    React.createElement('div', { className: 'pathway-grid' },
      // Left minimap
      React.createElement('div', { className: 'pathway-grid-minimap' },
        React.createElement(PathwayMinimap, { currentStepKey: currentStep, stepHistory })
      ),

      // Center step content
      React.createElement('main', { className: 'pathway-grid-center' },
        navRow,
        autoAdvanceBanner,
        stepContent,
        !externalHeader && React.createElement(ProgramDisclaimerFooter)
      ),

      // Right flowchart
      React.createElement('div', { className: 'pathway-grid-flowchart' },
        React.createElement(FlowchartPanel, {
          currentStepKey: currentStep,
          stepHistory,
          onExpand: () => setShowChartForPrint(true),
        })
      ),
    ),

    floatingPanels
  )
}

export default App

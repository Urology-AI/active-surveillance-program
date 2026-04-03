import React, { useState, useEffect } from 'react'
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
import ProgressBar from './components/ProgressBar.js'
import FlowChartDebug from './components/FlowChartDebug.js'
import PasswordProtection from './components/PasswordProtection.js'
import ChartPrintView from './components/ChartPrintView.js'
import AppHeader from './components/AppHeader.js'

const STORAGE_KEY = 'sinai-pathway-progress'

const STEPS = {
  // Part 1
  START: 'start',
  STEP1: 'step1',
  STEP2: 'step2',
  STEP3: 'step3',
  STEP4: 'step4',
  STEP5: 'step5',
  // Part 2
  STEP6: 'step6',
  STEP7: 'step7',
  STEP8: 'step8',
  STEP9: 'step9',
  // Part 3
  STEP10: 'step10',
  STEP11: 'step11',
  STEP12: 'step12',
  STEP13: 'step13',
  STEP14: 'step14',
  // End states
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

// Longest possible path for progress bar
const STEP_ORDER = [
  STEPS.START,
  STEPS.STEP1,
  STEPS.STEP2,
  STEPS.STEP3,
  STEPS.STEP4,
  STEPS.STEP5,
  STEPS.STEP6,
  STEPS.STEP7,
  STEPS.STEP8,
  STEPS.STEP9,
  STEPS.STEP10,
  STEPS.STEP11,
  STEPS.STEP13,
  STEPS.STEP14,
]

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentStep, setCurrentStep] = useState(STEPS.START)
  const [stepHistory, setStepHistory] = useState([])
  const [forwardStack, setForwardStack] = useState([])
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [showChartForPrint, setShowChartForPrint] = useState(false)

  useEffect(() => {
    const authStatus = sessionStorage.getItem('authenticated')
    if (authStatus === 'true') setIsAuthenticated(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const { currentStep: s, stepHistory: h } = JSON.parse(raw)
      if ((s && s !== STEPS.START) || (h && h.length > 0)) setShowResumePrompt(true)
    } catch (_) {}
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || currentStep === STEPS.START) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, stepHistory }))
  }, [isAuthenticated, currentStep, stepHistory])

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

  const reset = () => {
    setCurrentStep(STEPS.START)
    setStepHistory([])
    setForwardStack([])
    try { localStorage.removeItem(STORAGE_KEY) } catch (_) {}
  }

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

  const getProgress = () => {
    const idx = STEP_ORDER.indexOf(currentStep)
    if (idx === -1) return 100
    return ((idx + 1) / STEP_ORDER.length) * 100
  }

  const showProgressBar = currentStep !== STEPS.START && !currentStep.startsWith('end_')

  const getCurrentPart = () => {
    const p1 = ['step1','step2','step3','step4','step5','end_active_surveillance','end_definitive_treatment','end_refuse_defer']
    const p2 = ['step6','step7','step8','step9','end_watchful_waiting','end_high_intensity_as','end_standard_as_enrollment']
    const p3 = ['step10','step11','step12','step13','step14','end_continue_as']
    if (p1.includes(currentStep)) return 1
    if (p2.includes(currentStep)) return 2
    if (p3.includes(currentStep)) return 3
    return null
  }
  const currentPart = currentStep !== STEPS.START ? getCurrentPart() : null
  const currentStepLabel = currentStep !== STEPS.START ? (STEP_LABELS[currentStep] || null) : null

  const pathTaken = [...stepHistory, currentStep]
  const pathSummary = pathTaken.map(s => STEP_LABELS[s] || s).join(' → ')
  const pathSummaryFull = `Mount Sinai · Tewari Active Surveillance Program\nPath: ${pathSummary}\n${new Date().toLocaleString()}`

  const navProps = {
    onBack: goBack,
    onForward: goForward,
    canGoBack: stepHistory.length > 0,
    canGoForward: forwardStack.length > 0,
  }

  const endStateProps = {
    onReset: reset,
    pathSummary: pathSummaryFull,
    onBack: goBack,
    canGoBack: stepHistory.length > 0,
    onPrintChart: () => setShowChartForPrint(true),
  }

  if (!isAuthenticated) {
    return React.createElement(PasswordProtection, { onAuthenticated: () => setIsAuthenticated(true) })
  }

  return React.createElement('div', { className: 'min-h-screen bg-sinai-page' },

    // Sticky top header (shown for all non-start screens)
    currentStep !== STEPS.START && React.createElement(AppHeader, {
      currentPart,
      stepLabel: currentStepLabel,
      onReset: reset,
      showReset: true,
    }),

    showResumePrompt && React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40'
    },
      React.createElement('div', { className: 'bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-slate-200' },
        React.createElement('p', { className: 'text-sinai-cetacean font-semibold mb-4' }, 'Resume where you left off?'),
        React.createElement('div', { className: 'flex flex-col gap-2' },
          React.createElement('button', { onClick: resumeProgress, className: 'w-full py-2.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark' }, 'Resume'),
          React.createElement('button', { onClick: startOver, className: 'w-full py-2.5 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50' }, 'Start over')
        )
      )
    ),

    React.createElement('div', { className: `max-w-4xl mx-auto px-4 ${currentStep !== STEPS.START ? 'pt-6 pb-12' : 'py-8'}` },
      showProgressBar && React.createElement(ProgressBar, {
        progress: getProgress(),
        stepLabel: currentStepLabel,
        onBack: goBack,
        onForward: goForward,
        canGoBack: stepHistory.length > 0,
        canGoForward: forwardStack.length > 0,
      }),

      React.createElement('div', { className: 'step-card mt-6', key: currentStep },

        // ── PART 1 ──
        currentStep === STEPS.START &&
          React.createElement(StartScreen, { onStart: () => goToStep(STEPS.STEP1) }),

        currentStep === STEPS.STEP1 &&
          React.createElement(Step1PatientIntent, {
            onRefuseDefer: () => goToStep(STEPS.END_REFUSE_DEFER),
            onProceed: () => goToStep(STEPS.STEP2),
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
          React.createElement(EndStateWatchfulWaiting, {
            onReset: reset,
            pathSummary: pathSummaryFull,
            onBack: goBack,
            canGoBack: stepHistory.length > 0,
          }),

        currentStep === STEPS.END_HIGH_INTENSITY_AS &&
          React.createElement(EndStateHighIntensityAS, {
            onReset: reset,
            pathSummary: pathSummaryFull,
            onBack: goBack,
            canGoBack: stepHistory.length > 0,
          }),

        currentStep === STEPS.END_STANDARD_AS_ENROLLMENT &&
          React.createElement(EndStateStandardASEnrollment, {
            onReset: reset,
            pathSummary: pathSummaryFull,
            onBack: goBack,
            canGoBack: stepHistory.length > 0,
            onContinuePart3: () => goToStep(STEPS.STEP10),
          }),

        currentStep === STEPS.END_CONTINUE_AS &&
          React.createElement(EndStateContinueAS, {
            onReset: reset,
            pathSummary: pathSummaryFull,
            onBack: goBack,
            canGoBack: stepHistory.length > 0,
          }),
      ),

      React.createElement('footer', { className: 'mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-500' },
        React.createElement('p', { className: 'mb-1' }, 'Clinical decision support only; does not replace clinical judgment.'),
        React.createElement('p', null,
          'Refer to institutional protocol or ',
          React.createElement('a', { href: 'https://www.auanet.org/guidelines/guidelines/prostate-cancer-clinically-localized-guideline', target: '_blank', rel: 'noopener noreferrer', className: 'text-sinai-cerulean hover:underline' }, 'AUA'),
          ' / ',
          React.createElement('a', { href: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1459', target: '_blank', rel: 'noopener noreferrer', className: 'text-sinai-cerulean hover:underline' }, 'NCCN'),
          ' guidelines.'
        )
      )
    ),

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
}

export default App

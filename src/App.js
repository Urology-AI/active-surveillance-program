import React, { useState, useEffect } from 'react'
import StartScreen from './components/StartScreen.js'
import Step1PatientIntent from './components/Step1PatientIntent.js'
import Step2GleasonScore from './components/Step2GleasonScore.js'
import Step3RiskStratification from './components/Step3RiskStratification.js'
import Step4MedicalHistory from './components/Step4MedicalHistory.js'
import EndStateActiveSurveillance from './components/EndStateActiveSurveillance.js'
import EndStateDefinitiveTreatment from './components/EndStateDefinitiveTreatment.js'
import EndStateRefuseDefer from './components/EndStateRefuseDefer.js'
import ProgressBar from './components/ProgressBar.js'
import FlowChartDebug from './components/FlowChartDebug.js'
import PasswordProtection from './components/PasswordProtection.js'
import ChartPrintView from './components/ChartPrintView.js'

const STORAGE_KEY = 'sinai-pathway-progress'

const STEPS = {
  START: 'start',
  STEP1: 'step1',
  STEP2: 'step2',
  STEP3: 'step3',
  STEP4: 'step4',
  END_ACTIVE_SURVEILLANCE: 'end_active_surveillance',
  END_DEFINITIVE_TREATMENT: 'end_definitive_treatment',
  END_REFUSE_DEFER: 'end_refuse_defer',
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentStep, setCurrentStep] = useState(STEPS.START)
  const [stepHistory, setStepHistory] = useState([])
  const [forwardStack, setForwardStack] = useState([])
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [showChartForPrint, setShowChartForPrint] = useState(false)

  useEffect(() => {
    const authStatus = sessionStorage.getItem('authenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const { currentStep: s, stepHistory: h } = JSON.parse(raw)
      if (s && s !== STEPS.START || (h && h.length > 0)) setShowResumePrompt(true)
    } catch (_) {}
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || currentStep === STEPS.START) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, stepHistory }))
  }, [isAuthenticated, currentStep, stepHistory])

  useEffect(() => {
    const titles = {
      [STEPS.START]: 'Prostate Cancer Clinical Pathway',
      [STEPS.STEP1]: 'Step 1: Patient Intent',
      [STEPS.STEP2]: 'Step 2: Gleason Score',
      [STEPS.STEP3]: 'Step 3: Risk Stratification',
      [STEPS.STEP4]: 'Step 4: Medical History',
      [STEPS.END_ACTIVE_SURVEILLANCE]: 'Result: Active Surveillance',
      [STEPS.END_DEFINITIVE_TREATMENT]: 'Result: Definitive Treatment',
      [STEPS.END_REFUSE_DEFER]: 'Result: Refuse/Defer'
    }
    const t = titles[currentStep]
    document.title = t ? `${t} · Mount Sinai` : 'Mount Sinai · Prostate Cancer Clinical Pathway'
  }, [currentStep])

  const goToStep = (step) => {
    setStepHistory([...stepHistory, currentStep])
    setCurrentStep(step)
    setForwardStack([])
  }

  const goBack = () => {
    if (stepHistory.length > 0) {
      setForwardStack([currentStep, ...forwardStack])
      const previousStep = stepHistory[stepHistory.length - 1]
      setStepHistory(stepHistory.slice(0, -1))
      setCurrentStep(previousStep)
    }
  }

  const goForward = () => {
    if (forwardStack.length > 0) {
      const nextStep = forwardStack[0]
      setStepHistory([...stepHistory, currentStep])
      setForwardStack(forwardStack.slice(1))
      setCurrentStep(nextStep)
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
    const stepOrder = [
      STEPS.START,
      STEPS.STEP1,
      STEPS.STEP2,
      STEPS.STEP3,
      STEPS.STEP4,
    ]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex === -1) return 100 // End states
    return ((currentIndex + 1) / stepOrder.length) * 100
  }

  const showProgressBar = currentStep !== STEPS.START && 
    !currentStep.startsWith('end_')

  const STEP_LABELS = {
    [STEPS.START]: 'Start',
    [STEPS.STEP1]: 'Step 1: Patient Intent',
    [STEPS.STEP2]: 'Step 2: Gleason Score',
    [STEPS.STEP3]: 'Step 3: Risk Stratification',
    [STEPS.STEP4]: 'Step 4: Medical History',
    [STEPS.END_ACTIVE_SURVEILLANCE]: 'Active Surveillance',
    [STEPS.END_DEFINITIVE_TREATMENT]: 'Definitive Treatment',
    [STEPS.END_REFUSE_DEFER]: 'Refuse/Defer'
  }
  const pathTaken = [...stepHistory, currentStep]
  const pathSummary = pathTaken.map(s => STEP_LABELS[s] || s).join(' → ')
  const pathSummaryFull = `Mount Sinai · Prostate Cancer Clinical Pathway\nPath: ${pathSummary}\n${new Date().toLocaleString()}`

  // Show password protection if not authenticated
  if (!isAuthenticated) {
    return React.createElement(PasswordProtection, {
      onAuthenticated: () => setIsAuthenticated(true)
    })
  }

  return React.createElement('div', { className: 'min-h-screen bg-sinai-page py-8 px-4' },
    showResumePrompt && React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40'
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-slate-200'
      },
        React.createElement('p', { className: 'text-sinai-cetacean font-semibold mb-4' },
          'Resume where you left off?'
        ),
        React.createElement('div', { className: 'flex flex-col gap-2' },
          React.createElement('button', {
            onClick: resumeProgress,
            className: 'w-full py-2.5 bg-sinai-cerulean text-white font-semibold rounded-xl hover:bg-sinai-cerulean-dark'
          }, 'Resume'),
          React.createElement('button', {
            onClick: startOver,
            className: 'w-full py-2.5 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50'
          }, 'Start over')
        )
      )
    ),
    React.createElement('div', { className: 'max-w-4xl mx-auto' },
      showProgressBar && React.createElement(ProgressBar, {
        progress: getProgress(),
        onBack: goBack,
        onForward: goForward,
        canGoBack: stepHistory.length > 0,
        canGoForward: forwardStack.length > 0
      }),
      React.createElement('div', { className: 'mt-8' },
        currentStep === STEPS.START && React.createElement(StartScreen, { onStart: () => goToStep(STEPS.STEP1) }),
        currentStep === STEPS.STEP1 && React.createElement(Step1PatientIntent, {
          onRefuseDefer: () => goToStep(STEPS.END_REFUSE_DEFER),
          onProceed: () => goToStep(STEPS.STEP2),
          onBack: goBack,
          onForward: goForward,
          canGoBack: stepHistory.length > 0,
          canGoForward: forwardStack.length > 0
        }),
        currentStep === STEPS.STEP2 && React.createElement(Step2GleasonScore, {
          onGleason6: () => goToStep(STEPS.STEP4),
          onGleason7_3_4: () => goToStep(STEPS.STEP3),
          onGleason7_4_3_Plus: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
          onBack: goBack,
          onForward: goForward,
          canGoBack: stepHistory.length > 0,
          canGoForward: forwardStack.length > 0
        }),
        currentStep === STEPS.STEP3 && React.createElement(Step3RiskStratification, {
          onFavorable: () => goToStep(STEPS.STEP4),
          onUnfavorable: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
          onBack: goBack,
          onForward: goForward,
          canGoBack: stepHistory.length > 0,
          canGoForward: forwardStack.length > 0
        }),
        currentStep === STEPS.STEP4 && React.createElement(Step4MedicalHistory, {
          onHighRisk: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
          onLowRisk: () => goToStep(STEPS.END_ACTIVE_SURVEILLANCE),
          onBack: goBack,
          onForward: goForward,
          canGoBack: stepHistory.length > 0,
          canGoForward: forwardStack.length > 0
        }),
        currentStep === STEPS.END_ACTIVE_SURVEILLANCE && React.createElement(EndStateActiveSurveillance, {
          onReset: reset,
          pathSummary: pathSummaryFull,
          onBack: goBack,
          canGoBack: stepHistory.length > 0,
          onPrintChart: () => setShowChartForPrint(true)
        }),
        currentStep === STEPS.END_DEFINITIVE_TREATMENT && React.createElement(EndStateDefinitiveTreatment, {
          onReset: reset,
          pathSummary: pathSummaryFull,
          onBack: goBack,
          canGoBack: stepHistory.length > 0,
          onPrintChart: () => setShowChartForPrint(true)
        }),
        currentStep === STEPS.END_REFUSE_DEFER && React.createElement(EndStateRefuseDefer, {
          onReset: reset,
          pathSummary: pathSummaryFull,
          onBack: goBack,
          canGoBack: stepHistory.length > 0,
          onPrintChart: () => setShowChartForPrint(true)
        })
      ),
      React.createElement('footer', { className: 'mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500' },
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
      currentStep: currentStep,
      stepHistory: stepHistory,
      onStepClick: (step) => {
        if (step === STEPS.START || step.startsWith('end_')) {
          goToStep(step)
        }
      }
    }),
    showChartForPrint && React.createElement(ChartPrintView, {
      currentStep: currentStep,
      stepHistory: stepHistory,
      onClose: () => setShowChartForPrint(false)
    })
  )
}

export default App

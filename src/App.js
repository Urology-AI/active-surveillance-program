import React, { useState } from 'react'
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
  const [currentStep, setCurrentStep] = useState(STEPS.START)
  const [stepHistory, setStepHistory] = useState([])

  const goToStep = (step) => {
    setStepHistory([...stepHistory, currentStep])
    setCurrentStep(step)
  }

  const goBack = () => {
    if (stepHistory.length > 0) {
      const previousStep = stepHistory[stepHistory.length - 1]
      setStepHistory(stepHistory.slice(0, -1))
      setCurrentStep(previousStep)
    }
  }

  const reset = () => {
    setCurrentStep(STEPS.START)
    setStepHistory([])
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

  return React.createElement('div', { className: 'min-h-screen bg-gray-50 py-8 px-4' },
    React.createElement('div', { className: 'max-w-4xl mx-auto' },
      showProgressBar && React.createElement(ProgressBar, { progress: getProgress(), onBack: goBack }),
      React.createElement('div', { className: 'mt-8' },
        currentStep === STEPS.START && React.createElement(StartScreen, { onStart: () => goToStep(STEPS.STEP1) }),
        currentStep === STEPS.STEP1 && React.createElement(Step1PatientIntent, {
          onRefuseDefer: () => goToStep(STEPS.END_REFUSE_DEFER),
          onProceed: () => goToStep(STEPS.STEP2)
        }),
        currentStep === STEPS.STEP2 && React.createElement(Step2GleasonScore, {
          onGleason6: () => goToStep(STEPS.STEP4),
          onGleason7_3_4: () => goToStep(STEPS.STEP3),
          onGleason7_4_3_Plus: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT)
        }),
        currentStep === STEPS.STEP3 && React.createElement(Step3RiskStratification, {
          onFavorable: () => goToStep(STEPS.STEP4),
          onUnfavorable: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT)
        }),
        currentStep === STEPS.STEP4 && React.createElement(Step4MedicalHistory, {
          onHighRisk: () => goToStep(STEPS.END_DEFINITIVE_TREATMENT),
          onLowRisk: () => goToStep(STEPS.END_ACTIVE_SURVEILLANCE)
        }),
        currentStep === STEPS.END_ACTIVE_SURVEILLANCE && React.createElement(EndStateActiveSurveillance, { onReset: reset }),
        currentStep === STEPS.END_DEFINITIVE_TREATMENT && React.createElement(EndStateDefinitiveTreatment, { onReset: reset }),
        currentStep === STEPS.END_REFUSE_DEFER && React.createElement(EndStateRefuseDefer, { onReset: reset })
      )
    ),
    React.createElement(FlowChartDebug, {
      currentStep: currentStep,
      stepHistory: stepHistory,
      onStepClick: (step) => {
        // Allow navigation to start or end states, but not intermediate steps that require user input
        if (step === STEPS.START || step.startsWith('end_')) {
          goToStep(step)
        }
      }
    })
  )
}

export default App

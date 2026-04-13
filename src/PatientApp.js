import React, { useState, useEffect } from 'react'
import PatientForm from './PatientForm.js'
import PatientResults from './PatientResults.js'
import CareTeamModal from './components/CareTeamModal.js'
import { runAssessment } from './asEngine.js'
import { Info } from 'lucide-react'

const e = React.createElement
const PATIENT_EXPORT_VERSION = 1

export default function PatientApp({ onBack }) {
  const [view, setView]               = useState('form')   // 'form' | 'results'
  const [inputs, setInputs]           = useState(null)
  const [results, setResults]         = useState(null)
  const [initialValues, setInitialValues] = useState({})
  const [uploadError, setUploadError] = useState('')
  const [uploadNotice, setUploadNotice] = useState('')
  const [careOpen, setCareOpen] = useState(false)

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const psa      = params.get('psa')
    const source   = params.get('source')
    const epsaTier = params.get('epsaTier')
    if (psa || source || epsaTier) {
      setInitialValues({
        psa:               psa      ? parseFloat(psa) : undefined,
        source:            source   || undefined,
        epsaPreBiopsyTier: epsaTier || undefined,
      })
    }
  }, [])

  function handleFormSubmit(formInputs) {
    const epsaContext = {
      source:        initialValues.source            || null,
      prebiopsyTier: initialValues.epsaPreBiopsyTier || null,
    }
    const enrichedInputs = {
      ...formInputs,
      source:            initialValues.source            || null,
      epsaPreBiopsyTier: initialValues.epsaPreBiopsyTier || null,
      epsaContext,
    }
    const assessment = runAssessment(enrichedInputs)
    setInputs(enrichedInputs)
    setResults(assessment)
    setView('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function normalizeUploadedPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Uploaded file must contain a JSON object.')
    }

    const candidate = payload.inputs && typeof payload.inputs === 'object'
      ? payload.inputs
      : payload

    const requiredKeys = ['ggg', 'positiveCores', 'totalCores', 'maxCorePercent', 'psa', 'pirads']
    for (const key of requiredKeys) {
      if (candidate[key] === undefined || candidate[key] === null || candidate[key] === '') {
        throw new Error(`Uploaded JSON is missing required field: ${key}`)
      }
    }

    return {
      ...candidate,
      ggg: Number(candidate.ggg),
      positiveCores: Number(candidate.positiveCores),
      totalCores: Number(candidate.totalCores),
      maxCorePercent: Number(candidate.maxCorePercent),
      psa: Number(candidate.psa),
      prostateVolume: candidate.prostateVolume === null || candidate.prostateVolume === undefined || candidate.prostateVolume === ''
        ? null
        : Number(candidate.prostateVolume),
      pirads: Number(candidate.pirads),
      decipher: candidate.decipher === null || candidate.decipher === undefined || candidate.decipher === ''
        ? null
        : Number(candidate.decipher),
      gps: candidate.gps === null || candidate.gps === undefined || candidate.gps === ''
        ? null
        : Number(candidate.gps),
      prolaris: candidate.prolaris === null || candidate.prolaris === undefined || candidate.prolaris === ''
        ? null
        : Number(candidate.prolaris),
      lesionCount: candidate.lesionCount === null || candidate.lesionCount === undefined || candidate.lesionCount === ''
        ? null
        : Number(candidate.lesionCount),
      age: candidate.age === null || candidate.age === undefined || candidate.age === ''
        ? null
        : Number(candidate.age),
    }
  }

  function applyUploadedInputs(nextInputs) {
    const assessment = runAssessment(nextInputs)
    setInputs(nextInputs)
    setResults(assessment)
    setUploadError('')
    setUploadNotice('Patient data uploaded successfully.')
    setView('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleUploadData(ev) {
    const file = ev.target.files && ev.target.files[0]
    if (!file) return

    setUploadError('')
    setUploadNotice('')
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))
        const nextInputs = normalizeUploadedPayload(parsed)
        applyUploadedInputs(nextInputs)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Unable to parse uploaded JSON file.')
      } finally {
        ev.target.value = ''
      }
    }

    reader.onerror = () => {
      setUploadError('Unable to read uploaded file.')
      ev.target.value = ''
    }

    reader.readAsText(file)
  }

  function handleDownloadData() {
    if (!inputs || !results) return
    const payload = {
      exportType: 'active-surveillance-patient',
      version: PATIENT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      inputs,
      results,
    }
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'active-surveillance-patient-data.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleBackToForm() {
    setView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return e('div', { className: 'min-h-screen', style: { background: '#f8fafc' } },

    e(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),

    // Header
    e('div', { className: 'no-print', style: { background: '#00002D' } },
      e('div', { className: 'max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2' },
        e('button', {
          onClick: onBack,
          className: 'flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors shrink-0',
        },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Change role'
        ),
        e('div', { className: 'text-center min-w-0 flex-1' },
          e('div', { className: 'text-white text-xs font-semibold tracking-wide' }, 'MOUNT SINAI'),
          e('div', { className: 'text-white/50 text-xs' }, 'Patient Assessment')
        ),
        e('button', {
          type: 'button',
          onClick: () => setCareOpen(true),
          className: 'inline-flex h-8 items-center justify-center gap-1.5 shrink-0 rounded-full border border-white/20 bg-white/5 px-2.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
          title: 'Meet the Care Team',
          'aria-label': 'Meet the Care Team',
        },
          e(Info, { className: 'h-4 w-4' }),
          e('span', { className: 'hidden sm:inline text-[11px] font-semibold' }, 'Meet the Care Team')
        )
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
      e('div', { className: 'no-print mb-4 flex flex-wrap items-center gap-2' },
        e('label', {
          className: 'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors',
        },
          e('input', {
            type: 'file',
            accept: 'application/json,.json',
            onChange: handleUploadData,
            className: 'hidden',
          }),
          e('span', {}, 'Upload Patient JSON')
        ),
        view === 'results' && e('button', {
          type: 'button',
          onClick: handleDownloadData,
          className: 'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sm font-medium text-sky-700 hover:bg-sky-100 transition-colors',
        }, 'Download Data')
      ),
      uploadNotice && e('p', { className: 'mb-4 text-xs text-emerald-600' }, uploadNotice),
      uploadError && e('p', { className: 'mb-4 text-xs text-red-600' }, uploadError),
      view === 'form'
        ? e('div', {},
            e('div', { className: 'mb-5' },
              e('h1', { className: 'text-xl font-bold text-gray-900 mb-1' }, 'Active Surveillance Assessment'),
              e('p', { className: 'text-sm text-gray-500' }, 'Enter your biopsy and diagnostic data below. Sections marked optional provide additional precision when available.')
            ),
            e(PatientForm, { onSubmit: handleFormSubmit, initialValues })
          )
        : e(PatientResults, { results, inputs, onBack: handleBackToForm, onDownloadData: handleDownloadData, onUploadData: handleUploadData })
    )
  )
}

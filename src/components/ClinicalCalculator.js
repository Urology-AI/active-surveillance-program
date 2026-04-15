/**
 * ClinicalCalculator.js
 *
 * Clinical-facing AS Calculator tab.
 * Uses PatientForm (full form, not chat) + PatientResults.
 * Clinicians enter biopsy / imaging / genomic data and get the
 * multi-model AS risk assessment with cohort probability context.
 */
import React, { useState } from 'react'
import PatientForm from '../PatientForm.js'
import PatientResults from '../PatientResults.js'
import { runAssessment } from '../asEngine.js'

const e = React.createElement

const EXPORT_VERSION = 1

export default function ClinicalCalculator() {
  const [view,         setView]         = useState('form') // 'form' | 'results'
  const [inputs,       setInputs]       = useState(null)
  const [results,      setResults]      = useState(null)
  const [uploadError,  setUploadError]  = useState('')
  const [uploadNotice, setUploadNotice] = useState('')

  // ── Submit ──────────────────────────────────────────────────────────────────
  function handleSubmit(formInputs) {
    try {
      const assessment = runAssessment(formInputs)
      setInputs(formInputs)
      setResults(assessment)
      setView('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setUploadError(err?.message || 'Assessment failed — check required fields.')
    }
  }

  // ── Upload / Download ───────────────────────────────────────────────────────
  function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('File must contain a JSON object.')
    const candidate = payload.inputs && typeof payload.inputs === 'object' ? payload.inputs : payload
    const required  = ['ggg', 'positiveCores', 'totalCores', 'maxCorePercent', 'psa', 'pirads']
    for (const key of required) {
      if (candidate[key] == null || candidate[key] === '') {
        throw new Error(`Missing required field: ${key}`)
      }
    }
    const n = (v, fallback = null) =>
      (v === null || v === undefined || v === '') ? fallback : Number(v)
    const epsaPreBiopsyTier =
      candidate.epsaPreBiopsyTier ?? payload.epsaPreBiopsyTier ?? null
    const sourceMeta = candidate.source ?? payload.source ?? null
    const epsaContextRaw = candidate.epsaContext ?? payload.epsaContext ?? null

    const out = {
      ggg:             n(candidate.ggg),
      positiveCores:   n(candidate.positiveCores),
      totalCores:      n(candidate.totalCores),
      maxCorePercent:  n(candidate.maxCorePercent),
      psa:             n(candidate.psa),
      prostateVolume:  n(candidate.prostateVolume),
      pirads:          n(candidate.pirads),
      decipher:        n(candidate.decipher),
      gps:             n(candidate.gps),
      prolaris:        n(candidate.prolaris),
      confirmMDx:      candidate.confirmMDx    || null,
      psmaFinding:     candidate.psmaFinding   || null,
      lesionCount:     n(candidate.lesionCount),
      hasECE:          candidate.hasECE        === true,
      hasAbutment:     candidate.hasAbutment   === true,
      hasBroadContact: candidate.hasBroadContact === true,
      age:             n(candidate.age),
      germlineVariant: candidate.germlineVariant || null,
      psaVelocity:     n(candidate.psaVelocity),
      psaDoublingTime: n(candidate.psaDoublingTime),
    }

    if (epsaPreBiopsyTier)
      out.epsaPreBiopsyTier = epsaPreBiopsyTier
    if (
      sourceMeta === 'epsa' ||
      epsaPreBiopsyTier ||
      (epsaContextRaw && epsaContextRaw.source === 'epsa')
    ) {
      out.epsaContext =
        typeof epsaContextRaw === 'object' && epsaContextRaw !== null
          ? { source: 'epsa', ...epsaContextRaw }
          : { source: 'epsa' }
    }

    return out
  }

  function handleUpload(ev) {
    const file = ev.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploadNotice('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed    = JSON.parse(String(reader.result || '{}'))
        const nextInputs = normalizePayload(parsed)
        const assessment = runAssessment(nextInputs)
        setInputs(nextInputs)
        setResults(assessment)
        setUploadNotice('Patient data loaded.')
        setView('results')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Unable to parse file.')
      } finally {
        ev.target.value = ''
      }
    }
    reader.onerror = () => { setUploadError('Unable to read file.'); ev.target.value = '' }
    reader.readAsText(file)
  }

  function handleDownload() {
    if (!inputs || !results) return
    const payload = {
      exportType: 'as-clinical-calculator',
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      inputs,
      results,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `as-assessment-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return e('div', { className: 'max-w-2xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8' },

    // Upload / Download toolbar
    e('div', { className: 'no-print mb-4 flex flex-wrap items-stretch sm:items-center gap-2' },
      e('label', {
        className: 'inline-flex flex-1 min-w-[140px] sm:flex-initial justify-center sm:justify-start items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors active:scale-[0.99]',
      },
        e('input', {
          type: 'file', accept: 'application/json,.json',
          onChange: handleUpload,
          className: 'hidden',
        }),
        e('svg', { className: 'w-4 h-4 text-slate-500', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' })
        ),
        'Load Patient JSON'
      ),
      view === 'results' && e('button', {
        type: 'button', onClick: handleDownload,
        className: 'inline-flex flex-1 min-w-[140px] sm:flex-initial justify-center sm:justify-start items-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl border border-sky-200 bg-sky-50 text-sm font-medium text-sky-700 hover:bg-sky-100 transition-colors active:scale-[0.99]',
      },
        e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' })
        ),
        'Download JSON'
      ),
    ),

    uploadNotice && e('p', { className: 'mb-3 text-xs text-emerald-600 font-medium' }, uploadNotice),
    uploadError  && e('p', { className: 'mb-3 text-xs text-red-600'     }, uploadError),

    view === 'form'
      ? e('div', {},
          e('div', { className: 'mb-4 sm:mb-5' },
            e('h1', { className: 'text-lg sm:text-xl font-bold text-gray-900 mb-1' }, 'AS Risk Calculator'),
            e('p', { className: 'text-sm text-gray-500 leading-relaxed' },
              'Multi-model assessment — Basic + PSAD · Genomic · PSMA · Intensive Monitoring. ' +
              'Calibrated to N=218 Mount Sinai Tewari AS Program cohort. ' +
              'Guideline hard stops checked first · PSAD AUC 0.624 (Kadeer et al. 2025).'
            )
          ),
          e(PatientForm, { onSubmit: handleSubmit })
        )
      : e(PatientResults, {
          results,
          inputs,
          onBack: () => { setView('form'); window.scrollTo({ top: 0, behavior: 'smooth' }) },
          onDownloadData: handleDownload,
          onUploadData: handleUpload,
        })
  )
}

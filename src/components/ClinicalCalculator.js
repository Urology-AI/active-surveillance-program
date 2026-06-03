/**
 * ClinicalCalculator.js
 *
 * Clinical-facing AS Calculator tab.
 * Uses PatientForm (full form, not chat) + PatientResults.
 * Clinicians enter biopsy / imaging / genomic data and get the
 * multi-model AS risk assessment with cohort probability context.
 */
import React, { useState, useEffect } from 'react'
import PatientForm from '../PatientForm.js'
import PatientResults from '../PatientResults.js'
import { runAssessment } from '../asEngine.js'

const e = React.createElement

const EXPORT_VERSION = 1

export default function ClinicalCalculator({ onBack, epsaPrefill, onAssessmentRun }) {
  const [view,              setView]              = useState('form') // 'form' | 'results'
  const [inputs,            setInputs]            = useState(null)
  const [results,           setResults]           = useState(null)
  const [uploadError,       setUploadError]       = useState('')
  const [uploadNotice,      setUploadNotice]      = useState('')
  const [epsaBannerDismissed, setEpsaBannerDismissed] = useState(false)
  const [formKey,           setFormKey]           = useState(0)

  // ── URL-param ePSA pre-fill ────────────────────────────────────────────────
  useEffect(() => {
    if (!epsaPrefill) return
    try {
      const nextInputs = normalizePayload(epsaPrefill)
      if (nextInputs._epsaPreFill) {
        const { _epsaPreFill: _, ...prefillValues } = nextInputs
        setInputs(prefillValues)
        setResults(null)
        setFormKey(k => k + 1)
        setView('form')
        const tierLabel = prefillValues.epsaContext?.epsaTierLabel
          || prefillValues.epsaPreBiopsyTier
          || 'see ePSA'
        setUploadNotice(`ePSA data loaded · Pre-biopsy tier: ${tierLabel} — enter biopsy results to complete assessment.`)
      } else {
        const assessment = runAssessment(nextInputs)
        setInputs(nextInputs)
        setResults(assessment)
        setUploadNotice('ePSA data loaded.')
        setView('results')
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to process ePSA data from URL.')
    }
  }, [epsaPrefill])

  // ── Submit ──────────────────────────────────────────────────────────────────
  function handleSubmit(formInputs) {
    try {
      const assessment = runAssessment(formInputs)
      setInputs(formInputs)
      setResults(assessment)
      setView('results')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      onAssessmentRun?.(formInputs)
    } catch (err) {
      setUploadError(err?.message || 'Assessment failed — check required fields.')
    }
  }

  // ── Upload / Download ───────────────────────────────────────────────────────

  /**
   * Detect whether a JSON payload is from the ePSA tool.
   * ePSA exports have { part: 'complete', part1Data, part1Result, part2Data, part2Result }
   * or { part: 'part1', part1Data, ... } for a Part 1-only export.
   */
  function isEpsaPayload(payload) {
    return (
      payload &&
      typeof payload === 'object' &&
      (payload.part === 'complete' || payload.part === 'part1' || payload.part === 'part2') &&
      (payload.part1Data || payload.part2Data || payload.part1Result || payload.part2Result)
    )
  }

  /**
   * Extract pre-population fields from an ePSA JSON export.
   * These fields will be pre-filled in the form — the clinician only needs to
   * add post-biopsy data: GGG, positive cores, total cores, max core %.
   *
   * ePSA Part 1 result fields used:
   *   part1Result.epsaTierKey  → epsaPreBiopsyTier (low / intermediate / elevated)
   *   part1Data.age            → age
   *   part1Result.isBlack      → race context (not a form field, stored in epsaContext)
   *   part1Result.fhBinary     → family history context
   *
   * ePSA Part 2 data fields used (same variable names — shared format):
   *   part2Data.psa            → psa
   *   part2Data.prostateVolume → prostateVolume
   *   part2Data.pirads + knowPirads → pirads (only if knowPirads=true)
   *   part2Result.pathwayMode  → context (post_psa / post_mri)
   *   part2Result.psadValue    → informational only (computed from psa/vol)
   */
  function extractEpsaFields(payload) {
    const p1d = payload.part1Data   || {}
    const p1r = payload.part1Result || {}
    const p2d = payload.part2Data   || {}
    const p2r = payload.part2Result || {}

    const n = (v) => (v === null || v === undefined || v === '') ? null : Number(v)

    // PSA — same field name in both tools
    const psa = n(p2d.psa)

    // Prostate volume — same field name
    const prostateVolume = n(p2d.prostateVolume)

    // PI-RADS — only carry over if the clinician actually entered it in ePSA
    const piradsRaw = p2d.knowPirads === true || p2d.knowPirads === 'true'
      ? n(p2d.pirads)
      : null

    // Age from Part 1
    const age = n(p1d.age) ?? n(p1r.age)

    // ePSA tier — this is the key handoff field
    const epsaTierKey = p1r.epsaTierKey || p2r.epsaTierKey || null

    // Build epsaContext for display in results
    const epsaContext = {
      source: 'epsa',
      epsaTierKey,
      epsaTierLabel: p1r.epsaTierLabel || p2r.epsaTierLabel || null,
      pathwayMode:   p2r.pathwayMode   || p1r.pathwayMode   || null,
      psadValue:     p2r.psadValue     || null,
      psadFlag:      p2r.psadFlag      || false,
      isBlack:       p1r.isBlack       || false,
      fhBinary:      p1r.fhBinary      || 0,
      brcaStatus:    p1r.brcaStatus    || null,
      exportDate:    payload.exportDate || null,
    }

    return { psa, prostateVolume, pirads: piradsRaw, age, epsaTierKey, epsaContext }
  }

  function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('File must contain a JSON object.')

    const n = (v, fallback = null) =>
      (v === null || v === undefined || v === '') ? fallback : Number(v)

    // ── ePSA JSON format ─────────────────────────────────────────────────────
    // ePSA exports don't have biopsy data yet — return pre-population fields only,
    // skip the required-field check (biopsy fields will be entered in the form).
    if (isEpsaPayload(payload)) {
      const epsa = extractEpsaFields(payload)
      const out = {}
      if (epsa.psa           != null) out.psa            = epsa.psa
      if (epsa.prostateVolume != null) out.prostateVolume = epsa.prostateVolume
      if (epsa.pirads         != null) out.pirads         = epsa.pirads
      if (epsa.age            != null) out.age            = epsa.age
      if (epsa.epsaTierKey)            out.epsaPreBiopsyTier = epsa.epsaTierKey
      out.epsaContext = epsa.epsaContext
      // Return partial — form will be shown with these pre-filled, not results
      out._epsaPreFill = true
      return out
    }

    // ── AS Tool own JSON format ──────────────────────────────────────────────
    const candidate = payload.inputs && typeof payload.inputs === 'object' ? payload.inputs : payload
    const required  = ['ggg', 'positiveCores', 'totalCores', 'maxCorePercent', 'psa', 'pirads']
    for (const key of required) {
      if (candidate[key] == null || candidate[key] === '') {
        throw new Error(`Missing required field: ${key}`)
      }
    }

    const epsaPreBiopsyTier = candidate.epsaPreBiopsyTier ?? payload.epsaPreBiopsyTier ?? null
    const sourceMeta        = candidate.source ?? payload.source ?? null
    const epsaContextRaw    = candidate.epsaContext ?? payload.epsaContext ?? null

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
      confirmMDx:      candidate.confirmMDx     || null,
      psmaFinding:     candidate.psmaFinding    || null,
      lesionCount:     n(candidate.lesionCount),
      hasECE:          candidate.hasECE         === true,
      hasAbutment:     candidate.hasAbutment    === true,
      hasBroadContact: candidate.hasBroadContact === true,
      age:             n(candidate.age),
      germlineVariant: candidate.germlineVariant || null,
      psaVelocity:     n(candidate.psaVelocity),
      psaDoublingTime: n(candidate.psaDoublingTime),
    }

    if (epsaPreBiopsyTier) out.epsaPreBiopsyTier = epsaPreBiopsyTier
    if (sourceMeta === 'epsa' || epsaPreBiopsyTier || (epsaContextRaw?.source === 'epsa')) {
      out.epsaContext = typeof epsaContextRaw === 'object' && epsaContextRaw !== null
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
        const parsed     = JSON.parse(String(reader.result || '{}'))
        const nextInputs = normalizePayload(parsed)

        if (nextInputs._epsaPreFill) {
          // ePSA handoff — show pre-filled form, let clinician add biopsy data
          const { _epsaPreFill: _, ...prefillValues } = nextInputs
          setInputs(prefillValues)
          setResults(null)
          setFormKey(k => k + 1)  // remount PatientForm so useEffect fires with new values
          setView('form')
          const tierLabel = prefillValues.epsaContext?.epsaTierLabel
            || prefillValues.epsaPreBiopsyTier
            || 'see ePSA'
          setUploadNotice(`ePSA data loaded \u00b7 Pre-biopsy tier: ${tierLabel} \u2014 enter biopsy results to complete assessment.`)
        } else {
          const assessment = runAssessment(nextInputs)
          setInputs(nextInputs)
          setResults(assessment)
          setUploadNotice('Patient data loaded.')
          setView('results')
        }
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
  const MAGENTA  = '#DC298D'
  const CERULEAN = '#06ABEB'
  const CETACEAN = '#00002D'
  const isEpsaNotice = uploadNotice.startsWith('ePSA data loaded')

  return e('div', {
    style: {
      maxWidth: 880, width: '100%', margin: '0 auto',
      padding: '0 0 40px',
    },
  },

    // ── Action bar (Load / Export JSON only) ─────────────────────────────────
    e('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '10px 20px 4px',
      },
    },
      view === 'results'
        ? e('button', {
            type: 'button', onClick: handleDownload,
            style: {
              padding: '7px 13px', borderRadius: 9,
              background: '#fff', border: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 700, color: '#212070',
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,45,0.06)',
            },
          },
            e('svg', { width: 13, height: 13, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
              e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' })
            ),
            'Export JSON'
          )
        : e('label', {
            style: {
              padding: '7px 13px', borderRadius: 9,
              background: '#fff', border: '1px solid #e2e8f0',
              fontSize: 12, fontWeight: 700, color: '#212070',
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,45,0.06)',
            },
          },
            e('input', {
              type: 'file', accept: 'application/json,.json',
              onChange: handleUpload, style: { display: 'none' },
            }),
            e('svg', { width: 13, height: 13, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
              e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' })
            ),
            'Load JSON'
          )
    ),

    // ── Inner content wrapper ──────────────────────────────────────────────────
    e('div', { style: { padding: '0 20px' } },

    // ── ePSA banner ────────────────────────────────────────────────────────────
    isEpsaNotice && !epsaBannerDismissed && e('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: `${MAGENTA}0d`,
        border: `1px solid ${MAGENTA}44`,
        borderLeft: `4px solid ${MAGENTA}`,
        borderRadius: 10, marginBottom: 14,
      },
    },
      e('div', {
        style: {
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: `${MAGENTA}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: MAGENTA, fontSize: 11, fontWeight: 800,
        },
      }, 'ε'),
      e('div', { style: { flex: 1, minWidth: 0 } },
        e('div', {
          style: { fontSize: 12, fontWeight: 700, color: CETACEAN },
        }, uploadNotice.split(' — ')[0] || uploadNotice),
        e('div', {
          style: { fontSize: 11, color: '#64748b', marginTop: 1 },
        }, 'PSA, volume, PI-RADS and age pre-filled · Enter biopsy results to complete.')
      ),
      e('button', {
        type: 'button',
        onClick: () => setEpsaBannerDismissed(true),
        style: {
          fontSize: 11, color: MAGENTA, background: 'transparent',
          border: 'none', fontWeight: 600, cursor: 'pointer', padding: '2px 6px',
          flexShrink: 0,
        },
      }, 'Dismiss')
    ),

    // Non-ePSA notice
    !isEpsaNotice && uploadNotice && e('div', {
      style: {
        padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0',
        borderRadius: 8, fontSize: 12, color: '#166534', marginBottom: 14,
      },
    }, uploadNotice),

    // Error
    uploadError && e('div', {
      style: {
        padding: '8px 12px', background: '#fff1f2', border: '1px solid #fecdd3',
        borderRadius: 8, fontSize: 12, color: '#be123c', marginBottom: 14,
      },
    }, uploadError),

    // ── Form / Results ─────────────────────────────────────────────────────────
    view === 'form'
      ? e(PatientForm, { key: formKey, onSubmit: handleSubmit, initialValues: inputs || {} })
      : e(PatientResults, {
          results,
          inputs,
          onBack: () => { setView('form'); window.scrollTo({ top: 0, behavior: 'smooth' }) },
          onDownloadData: handleDownload,
          onUploadData: handleUpload,
        })
    ) // close inner content wrapper
  )
}

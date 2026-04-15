import React, { useState, useEffect } from 'react'

const e = React.createElement

// ─── Validation ───────────────────────────────────────────────────────────────
function validate({ ggg, positiveCores, totalCores, maxCorePercent, psa, prostateVolume, pirads, decipher, gps, prolaris, age }) {
  const errs = {}

  if (ggg === null) errs.ggg = 'Select a Grade Group to continue'

  const pc = positiveCores === '' ? null : Number(positiveCores)
  const tc = totalCores    === '' ? null : Number(totalCores)

  if (positiveCores === '')
    errs.positiveCores = 'Required'
  else if (!Number.isInteger(pc) || pc < 0)
    errs.positiveCores = 'Whole number ≥ 0'

  if (totalCores === '')
    errs.totalCores = 'Required'
  else if (!Number.isInteger(tc) || tc < 1)
    errs.totalCores = 'Whole number ≥ 1'

  if (!errs.positiveCores && !errs.totalCores && pc !== null && tc !== null && pc > tc)
    errs.positiveCores = 'Cannot exceed total cores'

  if (maxCorePercent === '')
    errs.maxCorePercent = 'Required'
  else if (Number(maxCorePercent) < 0 || Number(maxCorePercent) > 100)
    errs.maxCorePercent = 'Enter 0–100'

  if (psa === '')
    errs.psa = 'Required'
  else if (Number(psa) <= 0)
    errs.psa = 'Must be > 0'
  else if (Number(psa) > 100)
    errs.psa = 'Value > 100 ng/mL — verify'

  if (prostateVolume !== '' && prostateVolume !== null) {
    if (Number(prostateVolume) <= 0)  errs.prostateVolume = 'Must be > 0 cc'
    if (Number(prostateVolume) > 500) errs.prostateVolume = 'Value > 500 cc — verify'
  }

  if (pirads === null) errs.pirads = 'Select a PI-RADS score to continue'

  if (decipher !== '' && (Number(decipher) < 0 || Number(decipher) > 1))   errs.decipher  = '0.00–1.00'
  if (gps     !== '' && (Number(gps)      < 0 || Number(gps)      > 100))  errs.gps       = '0–100'
  if (prolaris!== '' && (Number(prolaris) < 0 || Number(prolaris) > 10))   errs.prolaris  = '0–10 (typical)'
  if (age     !== '' && (Number(age)      < 18|| Number(age)       > 120))  errs.age       = '18–120 years'

  return errs
}

// ─── Small UI components ──────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null
  return e('p', { className: 'mt-1 flex items-center gap-1 text-xs text-red-500' },
    e('svg', { className: 'w-3 h-3 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
      e('path', { fillRule: 'evenodd', clipRule: 'evenodd',
        d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' })
    ),
    msg
  )
}

function NumInput({ label, value, onChange, min, max, step, unit, hint, required, error, description }) {
  return e('div', {},
    e('label', { className: 'block text-xs font-medium text-gray-700 mb-0.5' },
      label,
      required && e('span', { className: 'text-red-400 ml-0.5' }, ' *'),
      unit && e('span', { className: 'font-normal text-gray-400 ml-1' }, `(${unit})`)
    ),
    description && e('p', { className: 'text-xs text-gray-400 mb-1 leading-snug' }, description),
    e('input', {
      type: 'number', value, min, max, step: step || 'any',
      onChange: ev => onChange(ev.target.value),
      className: `w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none ${
        error ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-white focus:border-sinai-cerulean'
      }`,
      placeholder: hint || '',
    }),
    e(FieldError, { msg: error })
  )
}

function YesNoButtons({ value, onChange, options }) {
  const opts = options || [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Unknown']]
  return e('div', { className: 'flex gap-2' },
    ...opts.map(([val, lbl]) =>
      e('button', {
        key: val, type: 'button',
        onClick: () => onChange(value === val ? '' : val),
        className: `flex-1 py-1.5 px-3 text-xs rounded-lg border font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 ${
          value === val
            ? 'border-sinai-cerulean bg-sinai-cerulean/10 text-sinai-cerulean'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 bg-white'
        }`,
      }, lbl)
    )
  )
}

// ─── Info tooltip panel ───────────────────────────────────────────────────────
function InfoPanel({ lines }) {
  const [show, setShow] = useState(false)
  return e('div', { className: 'relative flex-shrink-0', onClick: ev => ev.stopPropagation() },
    e('button', {
      type: 'button',
      onClick: () => setShow(v => !v),
      className: 'w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-sinai-cerulean hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sinai-cerulean',
      title: 'Evidence & cohort reference',
      'aria-label': 'Show model information',
    },
      e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
        e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
      )
    ),
    show && e('div', {
      className: 'absolute right-0 top-8 z-50 w-72 rounded-2xl shadow-xl border border-slate-200 bg-white p-4 text-xs',
      style: { maxWidth: 'min(288px, 90vw)' },
    },
      // Close button
      e('button', {
        type: 'button',
        onClick: () => setShow(false),
        className: 'absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors',
      },
        e('svg', { className: 'w-3 h-3', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2.5 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M6 18L18 6M6 6l12 12' })
        )
      ),
      lines.map((line, i) =>
        e('div', { key: i, className: i > 0 ? 'mt-2.5 pt-2.5 border-t border-slate-100' : '' },
          line.heading && e('p', { className: 'font-semibold text-slate-800 mb-1' }, line.heading),
          line.cohort && e('div', { className: 'flex items-start gap-1.5 mb-1' },
            e('span', { className: 'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide', style: { background: '#e0f2fe', color: '#075985' } }, 'Cohort'),
            e('p', { className: 'text-slate-600 leading-snug' }, line.cohort)
          ),
          line.literature && e('div', { className: 'flex items-start gap-1.5' },
            e('span', { className: 'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide', style: { background: '#fef9c3', color: '#854d0e' } }, 'Lit'),
            e('p', { className: 'text-slate-600 leading-snug' }, line.literature)
          ),
          line.note && e('p', { className: 'text-slate-400 italic mt-1 leading-snug' }, line.note)
        )
      )
    )
  )
}

function SectionToggle({ title, subtitle, badge, open, onToggle, info }) {
  return e('button', {
    type: 'button', onClick: onToggle,
    className: 'w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sinai-cerulean/30',
  },
    e('div', { className: 'flex items-center gap-3' },
      e('div', {},
        e('div', { className: 'font-semibold text-gray-900 text-sm' }, title),
        subtitle && e('div', { className: 'text-xs text-gray-400 mt-0.5' }, subtitle)
      ),
      badge && e('span', { className: 'text-xs px-2 py-0.5 rounded-full font-medium', style: { background: '#e0f2fe', color: '#075985' } }, badge)
    ),
    e('div', { className: 'flex items-center gap-2' },
      info && e(InfoPanel, { lines: info }),
      e('span', { className: 'text-xs text-sinai-cerulean font-medium' }, open ? 'Collapse' : 'Expand'),
      e('svg', {
        className: `w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`,
        fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
      },
        e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
      )
    )
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────
const GGG_OPTIONS = [
  { value: 1, label: 'GG 1', sub: '3+3=6', color: '#10b981', bg: '#f0fdf4', note: 'AS eligible' },
  { value: 2, label: 'GG 2', sub: '3+4=7', color: '#84cc16', bg: '#f7fee7', note: 'Select AS' },
  { value: 3, label: 'GG 3', sub: '4+3=7', color: '#f59e0b', bg: '#fffbeb', note: 'Unfav-int' },
  { value: 4, label: 'GG 4', sub: '4+4=8', color: '#f97316', bg: '#fff7ed', note: 'High risk' },
  { value: 5, label: 'GG 5', sub: '9–10',  color: '#ef4444', bg: '#fef2f2', note: 'Very high' },
]

const PIRADS_OPTIONS = [
  { value: 1, label: '1', desc: 'Very low' },
  { value: 2, label: '2', desc: 'Low' },
  { value: 3, label: '3', desc: 'Equivocal' },
  { value: 4, label: '4', desc: 'High' },
  { value: 5, label: '5', desc: 'Very high' },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatientForm({ onSubmit, initialValues = {} }) {
  // Required fields
  const [ggg,            setGgg]           = useState(null)
  const [positiveCores,  setPositiveCores] = useState('')
  const [totalCores,     setTotalCores]    = useState('')
  const [maxCorePercent, setMaxCorePct]    = useState('')
  const [psa,            setPsa]           = useState('')
  const [prostateVolume, setVolume]        = useState('')
  const [pirads,         setPirads]        = useState(null)
  // ePSA banner
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    if (initialValues.psa            != null) setPsa(String(initialValues.psa))
    if (initialValues.prostateVolume != null) setVolume(String(initialValues.prostateVolume))
    if (initialValues.pirads         != null) setPirads(initialValues.pirads)
    if (initialValues.age            != null) setAge(String(initialValues.age))
  }, [])
  // Section visibility — auto-expand MRI if PI-RADS pre-filled from ePSA
  const [showGenomic,    setShowGenomic]   = useState(false)
  const [showPSMA,       setShowPSMA]      = useState(false)
  const [showMRI,        setShowMRI]       = useState(initialValues.pirads != null)
  const [showExtra,      setShowExtra]     = useState(
    initialValues.age != null || initialValues.epsaPreBiopsyTier != null
  )
  // Genomic
  const [decipher,       setDecipher]      = useState('')
  const [gps,            setGps]           = useState('')
  const [prolaris,       setProlaris]      = useState('')
  const [confirmMDx,     setConfirmMDx]    = useState('')
  // PSMA
  const [psmaFinding,    setPsmaFinding]   = useState('')
  const [lesionCount,    setLesionCount]   = useState('')
  // Advanced MRI
  const [ece,            setEce]           = useState('')
  const [abutment,       setAbutment]      = useState('')
  const [broadContact,   setBroadContact]  = useState('')
  // Additional
  const [age,            setAge]           = useState('')
  const [familyHistory,  setFamilyHistory] = useState('')
  const [brca2,          setBrca2]         = useState('')
  const [hoxb13,         setHoxb13]        = useState('')
  // Validation
  const [attempted,      setAttempted]     = useState(false)

  // Derived PSAD — live preview
  const psadPreview = psa && prostateVolume && Number(prostateVolume) > 0
    ? (Number(psa) / Number(prostateVolume)).toFixed(3) : null

  // Errors computed during every render once form has been submitted once
  const errors = attempted ? validate({ ggg, positiveCores, totalCores, maxCorePercent, psa, prostateVolume, pirads, decipher, gps, prolaris, age }) : {}
  const errorCount = Object.keys(errors).length

  function buildInputs() {
    const base = {
      ggg,
      positiveCores:  Number(positiveCores),
      totalCores:     Number(totalCores),
      maxCorePercent: Number(maxCorePercent),
      psa:            Number(psa),
      prostateVolume: prostateVolume ? Number(prostateVolume) : null,
      pirads,
      decipher:       decipher  !== '' ? Number(decipher)  : null,
      gps:            gps       !== '' ? Number(gps)       : null,
      prolaris:       prolaris  !== '' ? Number(prolaris)  : null,
      confirmMDx:     confirmMDx || null,
      psmaFinding:    psmaFinding || null,
      lesionCount:    lesionCount !== '' ? Number(lesionCount) : null,
      ece:            ece || null,
      abutment:       abutment || null,
      broadContact:   broadContact || null,
      age:            age !== '' ? Number(age) : null,
      familyHistory:  familyHistory || null,
      brca2:          brca2 || null,
      hoxb13:         hoxb13 || null,
    }
    const isEpsa = initialValues.epsaContext?.source === 'epsa' || initialValues.source === 'epsa'
    if (isEpsa && initialValues.epsaPreBiopsyTier) {
      base.epsaPreBiopsyTier = initialValues.epsaPreBiopsyTier
      base.epsaContext = {
        source: 'epsa',
        ...(initialValues.epsaContext && typeof initialValues.epsaContext === 'object' ? initialValues.epsaContext : {}),
      }
    }
    return base
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    setAttempted(true)
    const errs = validate({ ggg, positiveCores, totalCores, maxCorePercent, psa, prostateVolume, pirads, decipher, gps, prolaris, age })
    if (Object.keys(errs).length > 0) {
      // Scroll to first error
      const el = document.querySelector('[data-error-anchor]')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onSubmit(buildInputs())
  }

  const isEpsaHandoff = initialValues.epsaContext?.source === 'epsa' || initialValues.source === 'epsa'
  const showBanner = !bannerDismissed
    && isEpsaHandoff
    && initialValues.epsaPreBiopsyTier

  return e('form', { onSubmit: handleSubmit, noValidate: true, className: 'space-y-4' },

    // ── ePSA handoff banner (only when arriving from ePSA with tier param) ─
    showBanner && e('div', {
      className: 'flex items-start justify-between gap-3 px-4 py-3 rounded-xl border',
      style: { background: '#eff6ff', borderColor: '#bfdbfe' },
    },
      e('div', { className: 'flex items-start gap-2.5 flex-1 min-w-0' },
        e('svg', { className: 'w-4 h-4 flex-shrink-0 mt-0.5', style: { color: '#2563eb' }, fill: 'currentColor', viewBox: '0 0 20 20' },
          e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1zm1 8a1 1 0 10-2 0 1 1 0 002 0z' })
        ),
        e('div', {},
          e('p', { className: 'text-xs font-semibold', style: { color: '#1d4ed8' } },
            `Continuing from your ePSA assessment \u00b7 Pre-biopsy risk: ${initialValues.epsaPreBiopsyTier}`
          ),
          e('p', { className: 'text-xs mt-0.5', style: { color: '#3b82f6' } },
            'PSA, prostate volume, PI-RADS, and age have been pre-filled. Enter biopsy results (GGG, cores) to complete the assessment.'
          )
        )
      ),
      e('button', {
        type: 'button',
        onClick: () => setBannerDismissed(true),
        className: 'flex-shrink-0 text-blue-300 hover:text-blue-500 transition-colors focus:outline-none',
        'aria-label': 'Dismiss',
      },
        e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M6 18L18 6M6 6l12 12' })
        )
      )
    ),

    // ── Section 1: Required ────────────────────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
      e('div', { className: 'flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50' },
        e('div', { className: 'flex items-center gap-2' },
          e('div', { className: 'w-2 h-2 rounded-full flex-shrink-0', style: { background: '#06ABEB' } }),
          e('span', { className: 'font-semibold text-gray-900 text-sm' }, 'Biopsy & Clinical Data')
        ),
        e('div', { className: 'flex items-center gap-2' },
          e(InfoPanel, { lines: [
            {
              heading: 'Basic + PSAD Model',
              cohort: 'N=218 Mount Sinai Tewari AS Program. PSAD: AUC 0.616 (Mann-Whitney), NPV 94.4% at Youden cutoff 0.065. GG1 upgrade rate 24.2%, GG2 5.7%. PSA alone AUC 0.534 — not discriminatory.',
              literature: 'NCCN 2024 VLOW criteria. Kadeer et al., Eur Urol 2025 (PSAD AUC 0.624). Epstein JI et al., Eur Urol 2016 (ISUP grading).',
              note: 'Core ratio & max core % are NCCN eligibility gates only — AUC 0.465 / 0.504 in cohort (not independently discriminatory).',
            },
          ]}),
          e('span', { className: 'text-xs text-red-400 font-medium' }, 'Required')
        )
      ),

      e('div', { className: 'p-4 space-y-5' },

        // ── Grade Group ──────────────────────────────────────────────────
        e('div', { 'data-error-anchor': errors.ggg ? '' : undefined },
          e('div', { className: 'flex items-baseline justify-between mb-2' },
            e('label', { className: 'block text-xs font-medium text-gray-700' },
              'Grade Group (ISUP 2016)', e('span', { className: 'text-red-400 ml-0.5' }, ' *')
            ),
            e('span', { className: 'text-xs text-gray-400' }, 'Gleason score equivalent')
          ),
          e('div', { className: 'grid grid-cols-5 gap-1.5' },
            ...GGG_OPTIONS.map(opt =>
              e('button', {
                key: opt.value, type: 'button',
                onClick: () => setGgg(opt.value),
                className: `rounded-xl p-2 text-center border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 ${
                  ggg === opt.value ? 'shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`,
                style: ggg === opt.value ? { borderColor: opt.color, background: opt.bg } : {},
                title: opt.note,
              },
                e('div', { className: 'text-sm font-bold leading-tight', style: { color: ggg === opt.value ? opt.color : '#374151' } }, opt.label),
                e('div', { className: 'text-xs mt-0.5 leading-tight', style: { color: ggg === opt.value ? opt.color : '#9ca3af' } }, opt.sub),
                e('div', { className: 'text-xs mt-0.5 font-medium', style: { color: ggg === opt.value ? opt.color : '#d1d5db', fontSize: '10px' } }, opt.note)
              )
            )
          ),
          errors.ggg && e('p', { className: 'mt-2 text-xs text-red-500 flex items-center gap-1' },
            e('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' },
              e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' })
            ),
            errors.ggg
          )
        ),

        // ── Cores ────────────────────────────────────────────────────────
        e('div', { className: 'grid grid-cols-3 gap-3' },
          e(NumInput, {
            label: 'Positive cores', value: positiveCores, onChange: setPositiveCores,
            min: 0, max: 60, step: '1', hint: 'e.g. 3', required: true,
            error: errors.positiveCores,
            description: 'Cores with cancer',
          }),
          e(NumInput, {
            label: 'Total cores', value: totalCores, onChange: setTotalCores,
            min: 1, max: 60, step: '1', hint: 'e.g. 12', required: true,
            error: errors.totalCores,
            description: 'Cores sampled',
          }),
          e(NumInput, {
            label: 'Max core involvement', value: maxCorePercent, onChange: setMaxCorePct,
            min: 0, max: 100, hint: 'e.g. 40', required: true, unit: '%',
            error: errors.maxCorePercent,
            description: 'Highest % in single core',
          })
        ),

        // ── PSA + Volume ─────────────────────────────────────────────────
        e('div', { className: 'grid grid-cols-2 gap-3' },
          e(NumInput, {
            label: 'PSA', value: psa, onChange: setPsa,
            min: 0.01, step: '0.1', hint: 'e.g. 6.5', required: true, unit: 'ng/mL',
            error: errors.psa,
          }),
          e('div', {},
            e(NumInput, {
              label: 'Prostate volume', value: prostateVolume, onChange: setVolume,
              min: 1, max: 500, step: '0.1', hint: 'e.g. 40', unit: 'cc',
              error: errors.prostateVolume,
              description: 'Enables PSAD calculation',
            }),
            psadPreview && e('div', {
              className: 'mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold',
              style: {
                background: Number(psadPreview) > 0.177 ? '#fef2f2' : Number(psadPreview) > 0.15 ? '#fffbeb' : '#f0fdf4',
                color:      Number(psadPreview) > 0.177 ? '#dc2626' : Number(psadPreview) > 0.15 ? '#d97706' : '#16a34a',
              },
            },
              e('svg', { className: 'w-3 h-3 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
                e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1zm1 8a1 1 0 10-2 0 1 1 0 002 0z' })
              ),
              e('span', {}, `PSAD ${psadPreview}`),
              e('span', { style: { fontWeight: 400, opacity: 0.7 } },
                Number(psadPreview) > 0.177 ? '— above Kadeer 2025 cutoff (0.177)'
                : Number(psadPreview) > 0.15  ? '— above NCCN VLOW threshold (0.15)'
                : '— within NCCN very low risk range'
              )
            )
          )
        ),

        // ── PI-RADS ──────────────────────────────────────────────────────
        e('div', {},
          e('div', { className: 'flex items-baseline justify-between mb-2' },
            e('label', { className: 'text-xs font-medium text-gray-700' },
              'PI-RADS v2.1', e('span', { className: 'text-red-400 ml-0.5' }, ' *')
            ),
            e('span', { className: 'text-xs text-gray-400' }, 'mpMRI assessment category')
          ),
          e('div', { className: 'flex gap-1.5' },
            ...PIRADS_OPTIONS.map(opt =>
              e('button', {
                key: opt.value, type: 'button',
                onClick: () => setPirads(opt.value),
                className: `flex-1 py-2.5 rounded-xl border-2 text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 ${
                  pirads === opt.value
                    ? 'border-sinai-cerulean bg-sinai-cerulean/10 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`,
              },
                e('div', { className: `text-base font-bold ${pirads === opt.value ? 'text-sinai-cerulean' : 'text-gray-700'}` }, opt.label),
                e('div', { className: 'text-xs text-gray-400 mt-0.5' }, opt.desc)
              )
            )
          ),
          errors.pirads && e('p', { className: 'mt-2 text-xs text-red-500 flex items-center gap-1' },
            e('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' },
              e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' })
            ),
            errors.pirads
          )
        )
      )
    ),

    // ── Section 2: Genomic Biomarkers ─────────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
      e(SectionToggle, {
        title: 'Genomic Biomarkers',
        subtitle: 'Increases precision when available',
        badge: 'Optional',
        open: showGenomic, onToggle: () => setShowGenomic(v => !v),
        info: [
          {
            heading: 'Genomic Model',
            cohort: 'N=218 cohort: genomic testing rate <10% — internal AUC cannot be computed. These thresholds are literature-only; no internal cohort calibration is available.',
            literature: 'Decipher (Spratt DE et al., Lancet Oncol 2014; Nguyen PL et al. 2021): cutoffs 0.45 / 0.60. Oncotype GPS (Klein EA et al., Eur Urol 2021): cutoffs 20 / 40. Prolaris CCP (Cooperberg MR et al., Cancer 2013): cutoffs 1.5 / 2.1. ConfirmMDx (Stewart GD et al., J Urol 2013).',
            note: 'Literature AUCs: Decipher ~0.74, GPS ~0.69, Prolaris ~0.68. Enter if available — results will update the tier accordingly.',
          },
        ],
      }),
      showGenomic && e('div', { className: 'px-4 pb-5 border-t border-gray-50' },
        e('p', { className: 'text-xs text-gray-400 mt-3 mb-3 leading-relaxed' },
          'Thresholds derived from published validation studies: Decipher (Spratt 2014), Oncotype GPS (Klein 2021), Prolaris CCP (Cooperberg 2013), ConfirmMDx (Stewart 2013).'
        ),
        e('div', { className: 'grid grid-cols-2 gap-3' },
          e(NumInput, { label: 'Decipher score', value: decipher, onChange: setDecipher, min: 0, max: 1, step: '0.01', hint: '0.00–1.00', error: errors.decipher, description: 'GenomeDx genomic classifier' }),
          e(NumInput, { label: 'Oncotype GPS',   value: gps,     onChange: setGps,     min: 0, max: 100, hint: '0–100',   error: errors.gps,     description: 'Genomic Prostate Score' }),
          e(NumInput, { label: 'Prolaris CCP',   value: prolaris, onChange: setProlaris, min: 0, max: 10, step: '0.01', hint: '0–10', error: errors.prolaris, description: 'Cell Cycle Progression score' }),
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-0.5' }, 'ConfirmMDx'),
            e('p', { className: 'text-xs text-gray-400 mb-1' }, 'Epigenetic field effect'),
            e(YesNoButtons, {
              value: confirmMDx, onChange: setConfirmMDx,
              options: [['positive', 'Positive'], ['negative', 'Negative'], ['not_done', 'Not done']],
            })
          )
        )
      )
    ),

    // ── Section 3: PSMA PET/CT ────────────────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
      e(SectionToggle, {
        title: 'PSMA PET/CT',
        subtitle: 'If performed — staging and local extent',
        badge: 'Optional',
        open: showPSMA, onToggle: () => setShowPSMA(v => !v),
        info: [
          {
            heading: 'PSMA Model',
            cohort: 'N=218 cohort: PSMA PET/CT testing prevalence too low for internal validation. No cohort-derived sensitivity/specificity available.',
            literature: 'EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024. Staging classification: negative / local / regional / metastatic. Metastatic finding = hard contraindication to AS (also applies EAU 2024 systemic therapy indication). Regional nodal involvement triggers treatment discussion.',
            note: 'Not a continuous prediction model — classification only. Hard stop fires automatically for metastatic disease.',
          },
        ],
      }),
      showPSMA && e('div', { className: 'px-4 pb-5 border-t border-gray-50' },
        e('p', { className: 'text-xs text-gray-400 mt-3 mb-3 leading-relaxed' },
          'Staging classification per EAU-EANM-ESTRO-ESUR-SIOG Guidelines 2024. Metastatic disease is a hard contraindication to active surveillance.'
        ),
        e('div', { className: 'space-y-3' },
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-2' }, 'PSMA PET/CT finding'),
            e('div', { className: 'grid grid-cols-2 gap-2' },
              ...[
                ['negative',   'Negative',         'No PSMA-avid lesions',    false],
                ['local',      'Local only',        'No nodal/distant disease', false],
                ['regional',   'Regional nodes',    'Nodal involvement',        true],
                ['metastatic', 'Metastatic',        'Distant metastases',       true],
              ].map(([val, lbl, sub, danger]) =>
                e('button', {
                  key: val, type: 'button',
                  onClick: () => setPsmaFinding(psmaFinding === val ? '' : val),
                  className: `py-2.5 px-3 rounded-xl border-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 ${
                    psmaFinding === val
                      ? danger
                        ? 'border-red-400 bg-red-50'
                        : 'border-sinai-cerulean bg-sinai-cerulean/10'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`,
                },
                  e('div', { className: `text-sm font-semibold ${psmaFinding === val ? (danger ? 'text-red-700' : 'text-sinai-cerulean') : 'text-gray-700'}` }, lbl),
                  e('div', { className: 'text-xs text-gray-400 mt-0.5' }, sub)
                )
              )
            )
          ),
          (psmaFinding === 'local' || psmaFinding === 'regional') &&
            e(NumInput, { label: 'Lesion count', value: lesionCount, onChange: setLesionCount, min: 0, step: '1', hint: 'Number of PSMA-avid lesions' })
        )
      )
    ),

    // ── Section 4: Advanced MRI ───────────────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
      e(SectionToggle, {
        title: 'Advanced MRI Features',
        subtitle: 'Extracapsular features on mpMRI',
        badge: 'Optional',
        open: showMRI, onToggle: () => setShowMRI(v => !v),
        info: [
          {
            heading: 'Intensive Monitoring — MRI Features',
            cohort: 'N=218 cohort: Abutment present in 23% (N=50), upgrade rate 14.0% (Sens 25%, Spec 71%, PPV 14%, NPV 83%). ECE: only N=1 positive — no statistical calibration possible. Broad capsular contact: not captured in dataset.',
            literature: 'ECE & abutment: EAU Guidelines 2024 staging. Broad capsular contact >10 mm: EAU 2024. All three features increase monitoring intensity per NCCN 2024.',
            note: 'ECE and broad capsular contact are guideline-only triggers in this tool — no internal cohort data to validate them.',
          },
        ],
      }),
      showMRI && e('div', { className: 'px-4 pb-5 border-t border-gray-50' },
        e('p', { className: 'text-xs text-gray-400 mt-3 mb-3 leading-relaxed' },
          'Extracapsular features increase the monitoring intensity tier (Sub-model 4). All features should be assessed on dedicated diagnostic mpMRI.'
        ),
        e('div', { className: 'space-y-3' },
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Extracapsular extension (ECE)'),
            e('p', { className: 'text-xs text-gray-400 mb-1.5' }, 'Tumour extending through the prostatic capsule on MRI'),
            e(YesNoButtons, { value: ece, onChange: setEce })
          ),
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Neurovascular bundle abutment'),
            e('p', { className: 'text-xs text-gray-400 mb-1.5' }, 'Tumour abutting or invading the NVB'),
            e(YesNoButtons, { value: abutment, onChange: setAbutment })
          ),
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'Broad capsular contact > 10 mm'),
            e('p', { className: 'text-xs text-gray-400 mb-1.5' }, 'Tumour-capsule interface length > 10 mm'),
            e(YesNoButtons, { value: broadContact, onChange: setBroadContact })
          )
        )
      )
    ),

    // ── Section 5: Additional ─────────────────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
      e(SectionToggle, {
        title: 'Age, Family History & PSA Kinetics',
        subtitle: 'Germline risk factors and life expectancy context',
        badge: 'Optional',
        open: showExtra, onToggle: () => setShowExtra(v => !v),
        info: [
          {
            heading: 'Intensive Monitoring — Patient Factors',
            cohort: 'N=218 cohort age range: 71–88 (median 73). Zero patients under 60. Age <50 threshold is guideline-only — cannot be cohort-calibrated. Family history: FHx+ upgrade rate 14.3% vs FHx− 22.4% (inverse — likely surveillance bias). Age AUC 0.502 (not discriminatory in this cohort).',
            literature: 'Age <50: PRIAS protocol; AUA/ASTRO 2022 (long life expectancy = elevated cumulative risk). PSA velocity ≥2 ng/mL/yr: D\'Amico AV et al., JAMA 2004. PSA doubling time <3 yr: Bul M et al. PRIAS, Eur Urol 2013. BRCA2/HOXB13: NCCN 2024 (enhanced monitoring or treatment preferred).',
            note: 'PSA velocity and doubling time are not in the N=218 dataset — guideline thresholds only.',
          },
        ],
      }),
      showExtra && e('div', { className: 'px-4 pb-5 border-t border-gray-50' },
        e('div', { className: 'pt-3 space-y-3' },
          e('div', { className: 'grid grid-cols-2 gap-3' },
            e(NumInput, {
              label: 'Patient age', value: age, onChange: setAge,
              min: 18, max: 120, step: '1', hint: 'years', unit: 'yrs',
              error: errors.age,
              description: 'Age < 50 flags higher cumulative risk',
            }),
            e('div', {})
          ),
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-1.5' }, 'Family history of prostate cancer'),
            e(YesNoButtons, { value: familyHistory, onChange: setFamilyHistory, options: [['yes','Yes'],['no','No']] })
          ),
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'BRCA2 mutation'),
            e('p', { className: 'text-xs text-gray-400 mb-1.5' }, 'Pathogenic germline variant'),
            e(YesNoButtons, { value: brca2, onChange: setBrca2, options: [['yes','Positive'],['no','Negative'],['unknown','Unknown']] })
          ),
          e('div', {},
            e('label', { className: 'block text-xs font-medium text-gray-700 mb-1' }, 'HOXB13 mutation'),
            e('p', { className: 'text-xs text-gray-400 mb-1.5' }, 'G84E germline variant'),
            e(YesNoButtons, { value: hoxb13, onChange: setHoxb13, options: [['yes','Positive'],['no','Negative'],['unknown','Unknown']] })
          )
        )
      )
    ),

    // ── Error summary & Submit ────────────────────────────────────────────
    attempted && errorCount > 0 && e('div', {
      className: 'flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50',
    },
      e('svg', { className: 'w-4 h-4 text-red-500 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
        e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' })
      ),
      e('p', { className: 'text-sm text-red-700 font-medium' },
        `${errorCount} field${errorCount === 1 ? '' : 's'} need${errorCount === 1 ? 's' : ''} attention before calculating.`
      )
    ),

    e('button', {
      type: 'submit',
      className: 'btn-primary w-full py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all duration-150',
      style: { background: '#06ABEB' },
    }, 'Calculate Assessment')
  )
}

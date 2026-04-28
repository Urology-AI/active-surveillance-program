import React, { useState } from 'react'
import { MODEL_VALIDATION, COHORT_CALIBRATION } from './asEngine.js'

const e = React.createElement

// ─── Design tokens ────────────────────────────────────────────────────────────
const TIER_COLORS = {
  green:  { bg: '#f0fdf4', border: '#16a34a', text: '#14532d', badge: '#dcfce7', badgeText: '#166534' },
  yellow: { bg: '#fefce8', border: '#ca8a04', text: '#713f12', badge: '#fef9c3', badgeText: '#713f12' },
  amber:  { bg: '#fffbeb', border: '#d97706', text: '#78350f', badge: '#fde68a', badgeText: '#78350f' },
  red:    { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d', badge: '#fee2e2', badgeText: '#991b1b' },
}

const MONITORING_STYLES = {
  standard:             { color: '#16a34a', bg: '#f0fdf4',  label: 'Standard AS' },
  enhanced:             { color: '#d97706', bg: '#fffbeb',  label: 'Enhanced' },
  intensive:            { color: '#dc2626', bg: '#fef2f2',  label: 'Intensive' },
  treatment_discussion: { color: '#7c3aed', bg: '#f5f3ff',  label: 'Treatment Discussion' },
}

const POINTS_BADGE = {
  high:         'bg-red-100 text-red-700',
  intermediate: 'bg-amber-100 text-amber-700',
  low:          'bg-green-100 text-green-700',
  override:     'bg-purple-100 text-purple-700',
}

const COMBINED_TIER_LABELS = {
  standard_as:          'Standard Active Surveillance',
  enhanced_as:          'Enhanced Active Surveillance',
  intensive_as:         'Intensive Active Surveillance',
  treatment_discussion: 'Treatment Discussion Recommended',
  treatment_required:   'Treatment Required',
}

const VALIDATION_BADGES = {
  cohort_validated: {
    label: 'Cohort validated · N=1,213',
    style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  },
  literature_threshold: {
    label: 'Literature thresholds',
    style: { background: '#fef9c3', color: '#713f12', border: '1px solid #fde68a' },
  },
  guideline_checklist: {
    label: 'Guideline checklist',
    style: { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
  },
  staging_classifier: {
    label: 'Staging classifier · EAU 2024',
    style: { background: '#ede9fe', color: '#4c1d95', border: '1px solid #ddd6fe' },
  },
}

function formatEpsaTier(tier) {
  if (tier == null || tier === '') return null
  return String(tier)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Shared components ────────────────────────────────────────────────────────
function ValidationBadge({ type }) {
  const badge = VALIDATION_BADGES[type]
  if (!badge) return null
  return e('span', {
    className: 'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
    style: badge.style,
  }, badge.label)
}

function FactorRow({ factor }) {
  const pts    = factor.points
  const ptsTxt = pts === 'OVERRIDE' ? 'OVERRIDE' : pts > 0 ? `+${pts}` : pts === 0 ? '0' : String(pts)
  return e('div', { className: 'py-2 border-b border-gray-50 last:border-0' },
    e('div', { className: 'flex items-center justify-between gap-3' },
      e('span', { className: 'text-sm text-gray-800' }, factor.label),
      e('span', { className: `text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${POINTS_BADGE[factor.tier] || 'bg-gray-100 text-gray-600'}` }, ptsTxt)
    ),
    factor.basis && e('p', { className: 'text-xs text-gray-400 mt-0.5 leading-snug' }, factor.basis)
  )
}

function NotAssessed({ message }) {
  return e('div', { className: 'py-5 flex flex-col items-center gap-1.5 text-center' },
    e('svg', { className: 'w-8 h-8 text-gray-200', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5 },
      e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h3.75M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z' })
    ),
    e('p', { className: 'text-sm text-gray-400' }, message || 'Not assessed'),
    e('p', { className: 'text-xs text-gray-300' }, 'No data entered for this sub-model')
  )
}

function StatChip({ label, value, sub, highlight, colorScheme }) {
  const schemes = {
    green:  { bg: '#f0fdf4', border: '#bbf7d0', val: '#15803d', lbl: '#166534' },
    amber:  { bg: '#fffbeb', border: '#fde68a', val: '#b45309', lbl: '#78350f' },
    red:    { bg: '#fef2f2', border: '#fecaca', val: '#dc2626', lbl: '#991b1b' },
    blue:   { bg: '#e0f2fe', border: '#7dd3fc', val: '#0369a1', lbl: '#0c4a6e' },
    default:{ bg: '#f1f5f9', border: '#e2e8f0', val: '#1e293b', lbl: '#64748b' },
  }
  const s = schemes[colorScheme] || (highlight ? schemes.blue : schemes.default)
  return e('div', {
    className: 'flex flex-col items-center justify-center rounded-xl px-3 py-2.5 min-w-[80px]',
    style: { background: s.bg, border: `1px solid ${s.border}` },
  },
    e('span', { className: 'text-lg font-extrabold', style: { color: s.val } }, value),
    e('span', { className: 'text-[10px] font-semibold uppercase tracking-wide text-center leading-tight', style: { color: s.lbl } }, label),
    sub && e('span', { className: 'text-[10px] mt-0.5', style: { color: s.lbl } }, sub)
  )
}

// ─── Upgrade Risk Panel ───────────────────────────────────────────────────────
function UpgradeRiskPanel({ upgradeRisk }) {
  if (!upgradeRisk) return null

  if (!upgradeRisk.available) {
    return e('div', {
      className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-4',
    },
      e('div', { className: 'flex items-center justify-between mb-2' },
        e('span', { className: 'font-semibold text-gray-900 text-sm' }, 'Personalized Upgrade Risk'),
        e('span', { className: 'text-xs text-gray-400' }, 'Mount Sinai Model')
      ),
      e('p', { className: 'text-sm text-gray-400 text-center py-3' },
        'Enter positive core count to see personalized risk'
      )
    )
  }

  const BAND_COLORS = {
    green:  { border: '#16a34a', bg: '#f0fdf4', text: '#14532d', pctColor: '#15803d', badgeBg: '#dcfce7', badgeText: '#166534' },
    yellow: { border: '#ca8a04', bg: '#fefce8', text: '#713f12', pctColor: '#a16207', badgeBg: '#fef9c3', badgeText: '#713f12' },
    orange: { border: '#d97706', bg: '#fffbeb', text: '#78350f', pctColor: '#b45309', badgeBg: '#fde68a', badgeText: '#78350f' },
    red:    { border: '#dc2626', bg: '#fef2f2', text: '#7f1d1d', pctColor: '#dc2626', badgeBg: '#fee2e2', badgeText: '#991b1b' },
  }
  const c = BAND_COLORS[upgradeRisk.bandColor] || BAND_COLORS.green
  const M = upgradeRisk.model === 'withPsad'
    ? { auc: '0.668', n: 781 }
    : { auc: '0.609', n: 1197 }

  const cohortPct = Math.round(upgradeRisk.cohortAverage * 100)
  const belowAvg  = upgradeRisk.probabilityPct < cohortPct
  const inp       = upgradeRisk.inputs

  return e('div', {
    className: 'rounded-2xl border-2 shadow-sm overflow-hidden',
    style: { background: c.bg, borderColor: c.border },
  },
    // Header
    e('div', {
      className: 'px-4 pt-3.5 pb-2 flex items-center justify-between gap-2 border-b',
      style: { borderColor: c.border + '40' },
    },
      e('span', { className: 'font-semibold text-sm', style: { color: c.text } }, 'Personalized Upgrade Risk'),
      e('span', { className: 'text-xs font-medium', style: { color: c.text, opacity: 0.7 } }, 'Mount Sinai Model')
    ),

    // Body
    e('div', { className: 'px-4 py-3' },

      // Large percentage + band
      e('div', { className: 'flex items-end gap-3 mb-2' },
        e('div', {},
          e('span', { className: 'text-4xl font-bold leading-none', style: { color: c.pctColor } },
            `${upgradeRisk.probabilityPct}%`
          ),
          e('p', { className: 'text-xs mt-0.5', style: { color: c.text, opacity: 0.75 } }, 'upgrade risk')
        ),
        e('div', { className: 'mb-1' },
          e('span', {
            className: 'text-sm font-bold px-2.5 py-1 rounded-full',
            style: { background: c.badgeBg, color: c.badgeText },
          }, upgradeRisk.band),
          e('span', { className: 'ml-2 text-xs', style: { color: c.text, opacity: 0.75 } },
            `— ${belowAvg ? 'below' : 'above'} cohort average (${cohortPct}%)`
          )
        )
      ),

      // Inputs summary line
      e('p', { className: 'text-xs mb-2', style: { color: c.text, opacity: 0.75 } },
        'Based on: ',
        e('span', { className: 'font-medium' }, `GG${inp.ggg}`),
        inp.psad != null
          ? [' · ', e('span', { key: 'psad', className: 'font-medium' }, `PSAD ${inp.psad.toFixed(3)}`)]
          : null,
        ' · ',
        e('span', { className: 'font-medium' }, `${inp.positiveCores} positive core${inp.positiveCores !== 1 ? 's' : ''}`)
      ),

      // PSAD upgrade prompt (amber, only when PSAD not used)
      !upgradeRisk.psadUsed && e('div', {
        className: 'rounded-lg px-3 py-2 text-xs mb-2',
        style: { background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f' },
      },
        'Add prostate volume for PSAD-enhanced model (AUC 0.668)'
      ),

      // Model info line
      e('p', { className: 'text-xs', style: { color: c.text, opacity: 0.55 } },
        `N=${M.n} · AUC ${M.auc} · Internal validation only`
      )
    ),

    // Calibration disclaimer
    e('div', {
      className: 'px-4 py-2.5 border-t',
      style: { borderColor: c.border + '30', background: 'rgba(0,0,0,0.02)' },
    },
      e('p', { className: 'text-[11px] leading-snug', style: { color: c.text, opacity: 0.6 } },
        `Model calibrated on N=1,213 Mount Sinai AS patients. Well-calibrated 5–40%. Not validated externally. Use alongside clinical judgment.`
      )
    )
  )
}

// ─── Key Drivers ─────────────────────────────────────────────────────────────
function KeyDrivers({ asFactors, genomicFactors, genomicAssessed, psmaFactors, psmaAssessed }) {
  const [expanded, setExpanded] = useState(false)

  // Merge all factors; tag source
  const allFactors = [
    ...asFactors.map(f => ({ ...f, _src: 'basic' })),
    ...(genomicAssessed ? genomicFactors.map(f => ({ ...f, _src: 'genomic' })) : []),
    ...(psmaAssessed    ? psmaFactors.map(f => ({   ...f, _src: 'psma'    })) : []),
  ]

  // Always include GGG row (label starts with "Grade Group") and PSAD/PSA row
  const isKeyRow = f =>
    f.label?.startsWith('Grade Group') ||
    f.label?.startsWith('PSAD') ||
    f.label?.startsWith('PSA') ||
    f.points !== 0 ||
    f.tier === 'high' ||
    f.tier === 'intermediate' ||
    f.points === 'OVERRIDE'

  const shown = allFactors.filter(isKeyRow)
  const MAX = 6
  const visible = expanded ? shown : shown.slice(0, MAX)
  const hiddenCount = shown.length - MAX

  const iconFor = tier => {
    if (tier === 'low')      return e('span', { className: 'text-green-600 font-bold text-base flex-shrink-0' }, '✓')
    if (tier === 'intermediate') return e('span', { className: 'text-amber-500 text-base flex-shrink-0' }, '⚠')
    if (tier === 'high')     return e('span', { className: 'text-red-600 font-bold text-base flex-shrink-0' }, '✗')
    if (tier === 'override') return e('span', { className: 'text-purple-600 font-bold text-xs flex-shrink-0 px-1 py-0.5 rounded', style: { background: '#ede9fe' } }, 'OVERRIDE')
    return e('span', { className: 'text-gray-400 text-base flex-shrink-0' }, '·')
  }

  const labelFor = tier => {
    if (tier === 'low')          return e('span', { className: 'text-green-600 text-xs font-medium' }, 'Low risk')
    if (tier === 'intermediate') return e('span', { className: 'text-amber-600 text-xs font-medium' }, 'Monitor closely')
    if (tier === 'high')         return e('span', { className: 'text-red-600 text-xs font-medium' }, 'High risk')
    if (tier === 'override')     return e('span', { className: 'text-purple-600 text-xs font-medium' }, 'OVERRIDE')
    return null
  }

  return e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
    e('div', { className: 'px-4 pt-4 pb-2 border-b border-gray-50' },
      e('span', { className: 'font-semibold text-gray-900 text-sm' }, 'Key Drivers')
    ),
    e('div', { className: 'px-4 py-2 divide-y divide-gray-50' },
      visible.length === 0
        ? e('p', { className: 'py-3 text-xs text-gray-400 text-center' }, 'No significant drivers identified')
        : visible.map((f, i) =>
            e('div', { key: i, className: 'py-2.5 flex items-center gap-3' },
              iconFor(f.tier),
              e('span', { className: 'flex-1 text-sm text-gray-800 leading-snug min-w-0' }, f.label),
              labelFor(f.tier)
            )
          )
    ),
    !expanded && hiddenCount > 0 && e('div', { className: 'px-4 pb-3' },
      e('button', {
        type: 'button',
        onClick: () => setExpanded(true),
        className: 'text-xs text-sinai-cerulean font-medium hover:underline focus:outline-none',
      }, `+${hiddenCount} more factors`)
    )
  )
}

// ─── Monitoring Schedule ──────────────────────────────────────────────────────
function MonitoringSchedule({ monitoringSchedule, monitoringLabel, monitoringTier, features, featureCount }) {
  const monStyle = MONITORING_STYLES[monitoringTier] || MONITORING_STYLES.standard

  return e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
    e('div', { className: 'px-4 pt-4 pb-2 border-b border-gray-50 flex items-center justify-between gap-2 flex-wrap' },
      e('span', { className: 'font-semibold text-gray-900 text-sm' }, 'Monitoring Protocol'),
      e('span', {
        className: 'text-xs font-bold px-2.5 py-1 rounded-full',
        style: { background: monStyle.bg, color: monStyle.color },
      }, monStyle.label)
    ),
    e('div', { className: 'px-4 py-3 space-y-3' },
      e('ul', { className: 'space-y-2' },
        ...monitoringSchedule.map((item, i) =>
          e('li', { key: i, className: 'flex items-start gap-2.5' },
            e('div', { className: 'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5', style: { background: monStyle.bg } },
              e('div', { className: 'w-1.5 h-1.5 rounded-full', style: { background: monStyle.color } })
            ),
            e('span', { className: 'text-sm text-gray-700 leading-snug' }, item)
          )
        )
      ),
      featureCount > 0 && e('div', { className: 'pt-2 border-t border-gray-50' },
        e('p', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5' },
          `High-Risk Features (${featureCount})`
        ),
        e('ul', { className: 'space-y-1' },
          ...features.map((feat, i) =>
            e('li', { key: i, className: 'flex items-start gap-2 text-sm text-gray-700' },
              e('svg', { className: 'w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500', fill: 'currentColor', viewBox: '0 0 20 20' },
                e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' })
              ),
              e('span', null, typeof feat === 'string' ? feat : feat.label)
            )
          )
        )
      )
    )
  )
}

// ─── Cohort Context Chips ─────────────────────────────────────────────────────
function CohortChips({ cohortContext, inputs, psad }) {
  const [openChip, setOpenChip] = useState(null)
  if (!cohortContext) return null

  const chips = cohortContext.chips || {}
  const C = COHORT_CALIBRATION

  // Chip 1: Mount Sinai N=1,213
  const chip1Text = `Mount Sinai N=${chips.cohort_n || 1213}`
  const chip1Detail = `The Mount Sinai Tewari Active Surveillance Program has enrolled N=1,213 patients on active surveillance. Overall GG upgrade rate: ${(C.overview.overall_upgrade_rate * 100).toFixed(0)}% (${C.overview.upgrade_events} events). Currently in AS: ${C.intervention.currently_in_as} patients (${(C.intervention.currently_in_as_rate * 100).toFixed(0)}%). Of patients who left AS, ${(C.intervention.progressed_anxiety_preference / C.intervention.progressed_total * 100).toFixed(0)}% did so without upgrading — patient preference or anxiety, not disease progression.`

  // Chip 2: GGG upgrade rate
  const gggRate = chips.ggg_rate
  const chip2Text = gggRate != null ? `${chips.ggg_label}: ${(gggRate * 100).toFixed(1)}%` : chips.ggg_label || 'GGG rate'
  const chip2Detail = (() => {
    const gggNum = Number(inputs.ggg)
    if (!gggNum || !C.by_ggg[gggNum]) return 'No GGG data available.'
    const g = C.by_ggg[gggNum]
    return `In our N=${C.overview.n} cohort, GG${gggNum} patients upgraded at ${(g.upgrade_rate * 100).toFixed(1)}% (${g.upgraded}/${g.n} patients).${gggNum === 2 ? ' GG2 upgrade rate is paradoxically lower than GG1 (26.7%) — reflects selection effect: GG2 patients enrolled in AS are highly selected for low volume and favorable features.' : gggNum === 1 ? ' Of patients who left AS, approximately half did so without clinical upgrade.' : ''}`
  })()

  // Chip 3: PSAD tier or PI-RADS
  let chip3Text, chip3Detail
  if (chips.psad_tier_rate != null) {
    chip3Text = `PSAD tier: ${(chips.psad_tier_rate * 100).toFixed(1)}%`
    const psadNum = psad != null ? Number(psad) : null
    const tierLabel = psadNum != null
      ? psadNum < 0.065 ? 'PSAD < 0.065 (very low)' : psadNum < 0.15 ? 'PSAD 0.065–0.15 (intermediate)' : psadNum < 0.177 ? 'PSAD 0.15–0.177 (above NCCN)' : 'PSAD > 0.177 (above Kadeer cutoff)'
      : ''
    chip3Detail = `${tierLabel} tier: upgrade rate ${(chips.psad_tier_rate * 100).toFixed(1)}% in our GG1 N=${C.psad.n} cohort (AUC ${C.psad.auc}). PSAD tiers: <0.065 → 11.2% | 0.065–0.15 → 23.9% | 0.15–0.177 → 27.3% | >0.177 → 34.7%. Youden cutoff NPV 94.4% — fewer than 1 in 20 patients below PSAD 0.065 upgraded on repeat biopsy.`
  } else if (chips.pirads_rate != null) {
    chip3Text = `${chips.pirads_label}: ${(chips.pirads_rate * 100).toFixed(1)}%`
    const pr = inputs.pirads != null && inputs.pirads !== 0 ? C.pirads[inputs.pirads] : C.pirads.none
    chip3Detail = `PI-RADS ${inputs.pirads || 'N/A'} patients in our N=${C.overview.n} cohort: upgrade rate ${pr ? (pr.upgrade_rate * 100).toFixed(1) : '—'}% (N=${pr ? pr.n : '—'}). ${C.pirads.note || ''}`
  } else {
    chip3Text = 'No MRI / PSAD data'
    chip3Detail = 'Enter prostate volume to enable PSAD-based cohort calibration, or ensure PI-RADS score is selected.'
  }

  const chipData = [
    { key: 'cohort', text: chip1Text, detail: chip1Detail },
    { key: 'ggg',    text: chip2Text, detail: chip2Detail },
    { key: 'psad',   text: chip3Text, detail: chip3Detail },
  ]

  return e('div', { className: 'space-y-2' },
    e('div', { className: 'flex flex-wrap gap-2' },
      ...chipData.map(chip =>
        e('button', {
          key: chip.key,
          type: 'button',
          onClick: () => setOpenChip(openChip === chip.key ? null : chip.key),
          className: `text-xs font-medium px-3 py-1.5 rounded-full border transition-colors focus:outline-none ${
            openChip === chip.key
              ? 'border-sinai-cerulean bg-sinai-cerulean/10 text-sinai-cerulean'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`,
        }, chip.text)
      )
    ),
    openChip && e('div', {
      className: 'rounded-xl px-3.5 py-3 text-xs text-sky-800 leading-relaxed',
      style: { background: '#f0f9ff', border: '1px solid #bae6fd' },
    }, chipData.find(c => c.key === openChip)?.detail)
  )
}

// ─── Model Validation Card (for detail accordion) ─────────────────────────────
function ModelValidationCard() {
  const MV = MODEL_VALIDATION

  function MVStatChip({ label, value, sub, highlight }) {
    return e('div', {
      className: 'flex flex-col items-center justify-center rounded-xl px-3 py-2.5 min-w-[80px]',
      style: { background: highlight ? '#e0f2fe' : '#f1f5f9', border: `1px solid ${highlight ? '#7dd3fc' : '#e2e8f0'}` },
    },
      e('span', { className: 'text-lg font-extrabold', style: { color: highlight ? '#0369a1' : '#1e293b' } }, value),
      e('span', { className: 'text-[10px] font-semibold uppercase tracking-wide text-center leading-tight', style: { color: highlight ? '#0369a1' : '#64748b' } }, label),
      sub && e('span', { className: 'text-[10px] text-slate-400 mt-0.5' }, sub)
    )
  }

  function SubModelRow({ model, icon, validationType }) {
    return e('div', { className: 'py-2.5 border-b border-slate-100 last:border-0' },
      e('div', { className: 'flex items-start gap-2' },
        e('span', { className: 'text-base flex-shrink-0' }, icon),
        e('div', { className: 'flex-1 min-w-0' },
          e('div', { className: 'flex items-start justify-between gap-2 flex-wrap' },
            e('p', { className: 'text-xs font-semibold text-slate-800' }, model.label),
            validationType && e(ValidationBadge, { type: validationType })
          ),
          model.auc != null
            ? e('p', { className: 'text-xs text-slate-500 mt-0.5' },
                `AUC ${model.auc.toFixed(3)}`,
                model.auc_ci ? ` ${model.auc_ci}` : '',
                model.comparator ? ` · ${model.comparator}` : ''
              )
            : e('p', { className: 'text-xs text-slate-400 mt-0.5 italic' }, 'AUC not applicable for this sub-model'),
          e('p', { className: 'text-xs text-slate-400 mt-0.5 leading-snug' }, model.note),
          e('p', { className: 'text-[10px] text-slate-300 mt-0.5' }, model.source)
        )
      )
    )
  }

  const psadTierRows = [
    { label: '< 0.065',    rate: '11.2%', n: 170, key: 'very_low' },
    { label: '0.065–0.15', rate: '23.9%', n: 381, key: 'intermediate' },
    { label: '0.15–0.177', rate: '27.3%', n: 55,  key: 'nccn_zone' },
    { label: '> 0.177',   rate: '34.7%', n: 98,  key: 'high' },
  ]

  return e('div', { className: 'space-y-4' },

    // Cohort overview
    e('div', { className: 'rounded-xl p-3', style: { background: '#e0f2fe', border: '1px solid #bae6fd' } },
      e('p', { className: 'text-xs font-bold text-sky-800 mb-1' }, MV.cohort.name),
      e('div', { className: 'flex flex-wrap gap-2 mt-2' },
        e(MVStatChip, { label: 'Total N', value: String(MV.cohort.n), highlight: true }),
        e(MVStatChip, { label: 'Upgraded', value: String(MV.cohort.n_upgraded) }),
        e(MVStatChip, { label: 'Overall Rate', value: `${(MV.cohort.upgrade_rate * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'PSAD AUC', value: MV.basic_psad.auc_internal.toFixed(3), highlight: true }),
      ),
      e('p', { className: 'text-xs text-sky-700 mt-2 leading-snug' }, MV.cohort.follow_up),
      e('p', { className: 'text-[10px] text-sky-500 mt-0.5' }, MV.cohort.reference)
    ),

    // PSAD performance detail
    e('div', { className: 'rounded-xl p-3', style: { background: '#f0fdf4', border: '1px solid #bbf7d0' } },
      e('p', { className: 'text-xs font-bold text-green-800 mb-1' }, 'PSAD — Primary Discriminating Biomarker'),
      e('p', { className: 'text-[10px] text-green-600 mb-2' },
        `N=${MV.basic_psad.n_with_psad} (PSAD available) · ${MV.basic_psad.n_upgraded_with_psad} upgraded · AUC PSA alone ${MV.basic_psad.auc_psa_alone} · ΔAUC +${MV.basic_psad.delta_auc.toFixed(3)}`
      ),
      e('div', { className: 'flex flex-wrap gap-2 mb-3' },
        e(MVStatChip, { label: 'AUC (internal)', value: MV.basic_psad.auc_internal.toFixed(3), highlight: true }),
        e(MVStatChip, { label: 'AUC (Kadeer 2025)', value: MV.basic_psad.auc_published.toFixed(3) }),
        e(MVStatChip, { label: 'PSA alone AUC', value: MV.basic_psad.auc_psa_alone.toFixed(3) }),
      ),
      e('p', { className: 'text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1' },
        `Youden J Optimal Cutoff: ${MV.basic_psad.youden_cutoff} ng/mL²`
      ),
      e('div', { className: 'flex flex-wrap gap-2 mb-2' },
        e(MVStatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_youden * 100).toFixed(0)}%`, highlight: true }),
        e(MVStatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_youden * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'PPV', value: `${(MV.basic_psad.ppv_at_youden * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'NPV', value: `${(MV.basic_psad.npv_at_youden * 100).toFixed(0)}%`, highlight: true }),
      ),
      e('p', { className: 'text-[10px] text-green-500 mb-2' },
        `TP=${MV.basic_psad.tp_at_youden} · FP=${MV.basic_psad.fp_at_youden} · FN=${MV.basic_psad.fn_at_youden} · TN=${MV.basic_psad.tn_at_youden}`
      ),
      e('p', { className: 'text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1' },
        `NCCN Cutoff ${MV.basic_psad.nccn_cutoff} (published)`
      ),
      e('div', { className: 'flex flex-wrap gap-2 mb-2' },
        e(MVStatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_nccn * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_nccn * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'PPV', value: `${(MV.basic_psad.ppv_at_nccn * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'NPV', value: `${(MV.basic_psad.npv_at_nccn * 100).toFixed(0)}%` }),
      ),
      e('p', { className: 'text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1' },
        `Kadeer 2025 Cutoff ${MV.basic_psad.kadeer_cutoff}`
      ),
      e('div', { className: 'flex flex-wrap gap-2 mb-2' },
        e(MVStatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_kadeer * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_kadeer * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'PPV', value: `${(MV.basic_psad.ppv_at_kadeer * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'NPV', value: `${(MV.basic_psad.npv_at_kadeer * 100).toFixed(0)}%` }),
      ),
      e('p', { className: 'text-xs text-green-700 mt-1 leading-snug' }, MV.basic_psad.note),
      e('p', { className: 'text-[10px] text-green-500 mt-0.5' }, MV.basic_psad.source)
    ),

    // PSAD tier table
    e('div', {},
      e('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, 'PSAD Tier Breakdown (GG1 patients, N=704 with PSAD)'),
      e('div', { className: 'rounded-xl overflow-hidden', style: { border: '1px solid #e2e8f0' } },
        e('div', { className: 'grid px-3 py-1.5', style: { gridTemplateColumns: '1fr 80px 60px', background: '#f8fafc' } },
          e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'PSAD Range'),
          e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase text-center' }, 'Upgrade Rate'),
          e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase text-center' }, 'N'),
        ),
        ...psadTierRows.map(row =>
          e('div', {
            key: row.key,
            className: 'grid px-3 py-2 border-t border-slate-50',
            style: { gridTemplateColumns: '1fr 80px 60px' },
          },
            e('span', { className: 'text-xs text-slate-700' }, row.label),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, row.rate),
            e('span', { className: 'text-xs text-slate-400 text-center' }, row.n),
          )
        )
      )
    ),

    // Composite tier performance
    e('div', { className: 'rounded-xl p-3', style: { background: '#faf5ff', border: '1px solid #e9d5ff' } },
      e('p', { className: 'text-xs font-bold text-purple-800 mb-1' }, 'Composite Engine — Tier Performance'),
      e('p', { className: 'text-[10px] text-purple-600 mb-2' }, MV.composite.note),
      e('div', { className: 'flex flex-wrap gap-2 mb-2' },
        e(MVStatChip, { label: 'Sens ≥Enhanced', value: `${(MV.composite.threshold_enhanced.sensitivity * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'Spec ≥Enhanced', value: `${(MV.composite.threshold_enhanced.specificity * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'PPV ≥Enhanced', value: `${(MV.composite.threshold_enhanced.ppv * 100).toFixed(0)}%` }),
        e(MVStatChip, { label: 'NPV ≥Enhanced', value: `${(MV.composite.threshold_enhanced.npv * 100).toFixed(0)}%` }),
      ),
      e('p', { className: 'text-[10px] text-purple-500' }, MV.composite.threshold_enhanced.note)
    ),

    // Sub-model rows
    e('div', { className: 'rounded-xl overflow-hidden', style: { border: '1px solid #e2e8f0' } },
      e('div', { className: 'px-3 py-2', style: { background: '#f1f5f9' } },
        e('p', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wide' }, 'Sub-Model Validation Summary')
      ),
      e('div', { className: 'px-3' },
        e(SubModelRow, { model: { ...MV.basic_psad, auc: MV.basic_psad.auc_internal, auc_ci: `(Kadeer 2025: ${MV.basic_psad.auc_published})`, comparator: `PSA alone AUC ${MV.basic_psad.auc_psa_alone}` }, icon: '📊', validationType: 'cohort_validated' }),
        e(SubModelRow, { model: { ...MV.genomic, auc: MV.genomic.auc_internal }, icon: '🧬', validationType: 'literature_threshold' }),
        e(SubModelRow, { model: { ...MV.psma, auc: MV.psma.auc_internal }, icon: '🔬', validationType: 'staging_classifier' }),
        e(SubModelRow, { model: MV.monitoring, icon: '📋', validationType: 'guideline_checklist' }),
      )
    ),

    // Validation status note
    e('div', { className: 'rounded-xl px-3 py-2.5', style: { background: '#fefce8', border: '1px solid #fde68a' } },
      e('p', { className: 'text-xs font-semibold text-amber-800 mb-0.5' }, '⚠ Validation Status'),
      e('p', { className: 'text-xs text-amber-700 leading-snug' }, MV.composite.validation_status),
      e('p', { className: 'text-xs text-amber-600 mt-1 leading-snug' }, MV.composite.calibration)
    )
  )
}

// ─── Detail Accordion ─────────────────────────────────────────────────────────
function DetailAccordion({
  asFactors, asScore, asTierKey,
  genomicAssessed, genomicRiskTier, genomicScore, genomicFactors,
  psmaAssessed, psmaFinding, psmaScore, psmaFactors,
  monitoringSchedule, monitoringLabel, monitoringTier, features, featureCount,
  cohortContext, combinedTierKey,
}) {
  const [open, setOpen] = useState(false)
  const monStyle = MONITORING_STYLES[monitoringTier] || MONITORING_STYLES.standard

  const genomicBadgeStyle =
    !genomicAssessed                       ? { background: '#f3f4f6', color: '#6b7280' }
    : genomicRiskTier === 'high'           ? { background: '#fee2e2', color: '#991b1b' }
    : genomicRiskTier === 'intermediate'   ? { background: '#fde68a', color: '#78350f' }
    :                                        { background: '#dcfce7', color: '#166534' }

  const psmaBadgeStyle =
    !psmaAssessed                                                   ? { background: '#f3f4f6', color: '#6b7280' }
    : psmaFinding === 'metastatic' || psmaFinding === 'regional'   ? { background: '#fee2e2', color: '#991b1b' }
    : psmaFinding === 'local'                                       ? { background: '#fde68a', color: '#78350f' }
    :                                                                  { background: '#dcfce7', color: '#166534' }

  // Tier cohort data (selection-effect framing)
  const TIER_COHORT_DATA = {
    standard_as:   { rate: 0.292, n: 72,  source: 'N=218 internal validation sub-cohort', selectionNote: true },
    enhanced_as:   { rate: 0.194, n: 109, source: 'N=218 internal validation sub-cohort', selectionNote: true },
    intensive_as:  { rate: 0.121, n: 33,  source: 'N=218 internal validation sub-cohort', selectionNote: true },
  }
  const tierCohortData = TIER_COHORT_DATA[combinedTierKey]

  return e('div', { className: 'rounded-2xl border border-gray-200 overflow-hidden shadow-sm' },
    e('button', {
      type: 'button',
      onClick: () => setOpen(v => !v),
      className: 'w-full flex items-center justify-between px-4 py-3.5 text-left bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none',
    },
      e('div', { className: 'flex items-center gap-2' },
        e('svg', { className: 'w-4 h-4 text-gray-400', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
        ),
        e('span', { className: 'text-sm font-semibold text-gray-700' }, 'Evidence & Full Detail — for reference')
      ),
      e('div', { className: 'flex items-center gap-2' },
        e('span', { className: 'text-xs text-gray-400' }, open ? 'Collapse' : 'Expand'),
        e('svg', {
          className: `w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`,
          fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
        },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
        )
      )
    ),

    open && e('div', { className: 'px-4 py-4 space-y-6 border-t border-gray-100' },

      // Sub-model 1
      e('div', {},
        e('div', { className: 'flex items-center gap-2 mb-3' },
          e('span', { className: 'font-semibold text-gray-800 text-sm' }, 'Sub-model 1 — Basic & PSAD'),
          e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full', style: { background: '#e0f2fe', color: '#075985' } },
            `Score: ${asScore > 0 ? '+' : ''}${asScore}  ·  ${asTierKey?.replace(/_/g,' ')}`
          ),
          e(ValidationBadge, { type: 'cohort_validated' })
        ),
        e('div', { className: 'space-y-0' }, ...asFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
        e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
          e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
          'GGG: ISUP 2016 (Epstein et al., Eur Urol 2016). Core criteria: NCCN 2024 very low risk (Epstein 1994, Bastian 2004). PSAD thresholds: NCCN 2024 (0.15 ng/mL/cm³) and Kadeer et al. 2025 Youden optimal cutoff (0.177 ng/mL/cm³). PI-RADS v2.1: Turkbey et al., Eur Urol 2019.'
        )
      ),

      // Sub-model 2
      e('div', {},
        e('div', { className: 'flex items-center gap-2 mb-3' },
          e('span', { className: 'font-semibold text-gray-800 text-sm' }, 'Sub-model 2 — Genomic Biomarkers'),
          e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full', style: genomicBadgeStyle },
            genomicAssessed
              ? `${genomicRiskTier?.charAt(0).toUpperCase() + genomicRiskTier?.slice(1)} risk · Score: ${genomicScore > 0 ? '+' : ''}${genomicScore}`
              : 'Not assessed'
          ),
          e(ValidationBadge, { type: 'literature_threshold' })
        ),
        genomicAssessed
          ? e('div', {},
              e('div', { className: 'space-y-0' }, ...genomicFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
              e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
                e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
                'Decipher thresholds (0.45/0.60): Spratt et al., Lancet Oncol 2014. Oncotype GPS thresholds (20/40): Klein et al., Eur Urol 2021. Prolaris CCP thresholds (1.5/2.1): Cooperberg et al., Cancer 2013. ConfirmMDx: Stewart et al., J Urol 2013.'
              )
            )
          : e(NotAssessed, { message: 'Genomic data not entered' })
      ),

      // Sub-model 3
      e('div', {},
        e('div', { className: 'flex items-center gap-2 mb-3' },
          e('span', { className: 'font-semibold text-gray-800 text-sm' }, 'Sub-model 3 — PSMA PET/CT'),
          e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full', style: psmaBadgeStyle },
            psmaAssessed
              ? psmaFinding === 'metastatic' ? 'Metastatic — OVERRIDE'
              : psmaFinding === 'regional'   ? 'Regional nodes'
              : psmaFinding === 'local'      ? 'Local only'
              : 'Negative'
              : 'Not assessed'
          ),
          e(ValidationBadge, { type: 'staging_classifier' })
        ),
        psmaAssessed
          ? e('div', {},
              e('div', { className: 'space-y-0' }, ...psmaFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
              e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
                e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
                'Staging classification and management implications: EAU-EANM-ESTRO-ESUR-SIOG Guidelines on Prostate Cancer, 2024 edition.'
              )
            )
          : e(NotAssessed, { message: 'PSMA PET/CT not performed or data not entered' })
      ),

      // Sub-model 4
      e('div', {},
        e('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
          e('span', { className: 'font-semibold text-gray-800 text-sm' }, 'Sub-model 4 — Monitoring Protocol'),
          e('span', {
            className: 'text-xs font-bold px-2.5 py-1 rounded-full',
            style: { background: monStyle.bg, color: monStyle.color },
          }, monStyle.label),
          e(ValidationBadge, { type: 'guideline_checklist' })
        ),
        e('p', { className: 'text-xs text-gray-400 mb-2' }, monitoringLabel),
        e('ul', { className: 'space-y-2' },
          ...monitoringSchedule.map((item, i) =>
            e('li', { key: i, className: 'flex items-start gap-2.5' },
              e('div', { className: 'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5', style: { background: monStyle.bg } },
                e('div', { className: 'w-1.5 h-1.5 rounded-full', style: { background: monStyle.color } })
              ),
              e('span', { className: 'text-sm text-gray-700 leading-snug' }, item)
            )
          )
        ),
        featureCount > 0 && e('div', { className: 'mt-3 pt-3 border-t border-gray-50' },
          e('p', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2' }, `High-Risk Features (${featureCount})`),
          e('ul', { className: 'space-y-1.5' },
            ...features.map((feat, i) =>
              e('li', { key: i, className: 'flex items-start gap-2 text-sm text-gray-700' },
                e('svg', { className: 'w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500', fill: 'currentColor', viewBox: '0 0 20 20' },
                  e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' })
                ),
                e('div', {},
                  e('span', null, typeof feat === 'string' ? feat : feat.label),
                  typeof feat !== 'string' && feat.source &&
                    e('p', { className: 'text-xs text-gray-400 mt-0.5' }, feat.source)
                )
              )
            )
          )
        ),
        e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
          e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
          'Feature list and monitoring intensity tiers derived from PRIAS protocol (Bul et al., Eur Urol 2013), NCCN 2024 active surveillance monitoring guidelines, and Canary PASS (Newcomb et al., J Urol 2016). Cohort calibration (Layer 2) from Mount Sinai Tewari AS Program N=1,213.'
        )
      ),

      // Model Validation
      e('div', {},
        e('p', { className: 'font-semibold text-gray-800 text-sm mb-3' }, 'Model Validation'),
        e(ModelValidationCard)
      ),

      // Cohort Calibration
      cohortContext && cohortContext.cohortItems && cohortContext.cohortItems.length > 0 && e('div', {},
        e('p', { className: 'font-semibold text-gray-800 text-sm mb-3' }, 'Cohort Calibration — Per-Variable Breakdown'),
        e('div', { className: 'divide-y divide-sky-100 rounded-xl overflow-hidden', style: { border: '1px solid #bfdbfe', background: '#f0f9ff' } },
          ...cohortContext.cohortItems.map((item, idx) =>
            e('div', { key: idx, className: 'px-4 py-3' },
              e('div', { className: 'flex items-start gap-2' },
                e('div', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5', style: { background: '#06ABEB' } }),
                e('div', { className: 'flex-1 min-w-0' },
                  e('p', { className: 'text-xs font-semibold text-sky-800 mb-0.5' }, item.label),
                  e('p', { className: 'text-sm text-sky-950 leading-snug' }, item.finding),
                  item.note && e('p', { className: 'text-xs text-sky-600/80 mt-0.5 leading-snug italic' }, item.note)
                )
              )
            )
          )
        )
      ),

      // Selection effect explanation
      tierCohortData && e('div', { className: 'rounded-xl px-3 py-2.5', style: { background: '#fafafa', border: '1px solid #e5e7eb' } },
        e('p', { className: 'text-xs font-semibold text-slate-600 mb-1' },
          `Observed upgrade rate in this tier: ${(tierCohortData.rate * 100).toFixed(1)}% (${tierCohortData.n} patients, ${tierCohortData.source})`
        ),
        e('p', { className: 'text-xs text-slate-500 leading-snug' },
          'This figure reflects who was enrolled in this tier, not a prediction for this patient. ',
          e('span', { className: 'font-medium text-amber-700' },
            'Note: higher tiers show lower observed upgrade rates in this cohort'
          ),
          ' — this is the expected selection effect: the highest-risk patients are appropriately directed to treatment rather than AS enrollment.'
        )
      )
    )
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatientResults({ results, inputs, onBack, onDownloadData, onUploadData }) {
  const {
    asTierKey, asScore, asFactors, psad,
    genomicRiskTier, genomicScore, genomicFactors, genomicAssessed,
    psmaFinding, psmaScore, psmaFactors, psmaAssessed,
    monitoringTier, monitoringLabel, monitoringSchedule, features, featureCount,
    combinedTierKey, combinedRecommendation, combinedColor,
    cohortContext, outcomesData, upgradeRisk,
  } = results

  const colors   = TIER_COLORS[combinedColor]   || TIER_COLORS.green
  const MV = MODEL_VALIDATION
  const psadNum = psad != null ? Number(psad) : null
  const isEpsa = inputs.epsaPreBiopsyTier || inputs.epsaContext?.source === 'epsa'

  return e('div', { className: 'space-y-4' },

    // ── 1. Recommendation Banner ─────────────────────────────────────────
    e('div', {
      className: 'rounded-2xl border-2 p-5 shadow-sm',
      style: { background: colors.bg, borderColor: colors.border },
    },
      e('div', { className: 'flex items-start gap-4' },
        e('div', {
          className: 'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
          style: { background: colors.badge },
        },
          e('svg', { className: 'w-5 h-5', style: { color: colors.badgeText }, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
          )
        ),
        e('div', { className: 'flex-1 min-w-0' },
          e('div', { className: 'flex items-center gap-2 mb-1 flex-wrap' },
            e('span', { className: 'text-xs font-semibold uppercase tracking-wide', style: { color: colors.border } }, 'AI Surveillance Tool'),
            e('span', {
              className: 'text-xs font-bold px-2 py-0.5 rounded-full',
              style: { background: colors.badge, color: colors.badgeText },
            }, COMBINED_TIER_LABELS[combinedTierKey] || combinedTierKey),
            isEpsa && e('span', {
              className: 'text-xs font-semibold px-2 py-0.5 rounded-full',
              style: { background: '#dbeafe', color: '#1e40af' },
            }, 'Via ePSA')
          ),
          e('p', { className: 'text-base font-bold leading-snug', style: { color: colors.text } }, combinedRecommendation),

          // Inline PSAD line (only if PSAD computed)
          psadNum != null && e('p', { className: 'text-xs mt-2 leading-snug', style: { color: colors.text, opacity: 0.85 } },
            `PSAD ${psadNum.toFixed(3)} · `,
            psadNum < MV.basic_psad.youden_cutoff
              ? `below threshold (${MV.basic_psad.youden_cutoff}) · `
              : `above threshold (${MV.basic_psad.youden_cutoff}) · `,
            upgradeRisk?.available
              ? `Personalized risk: ${upgradeRisk.probabilityPct}%`
              : `NPV ${(MV.basic_psad.npv_at_youden * 100).toFixed(0)}% in N=${MV.basic_psad.n_with_psad} cohort`
          )
        )
      )
    ),

    // ── 2. Personalized Upgrade Risk ─────────────────────────────────────
    e(UpgradeRiskPanel, { upgradeRisk }),

    // ── 3. Key Drivers ───────────────────────────────────────────────────
    e(KeyDrivers, {
      asFactors,
      genomicFactors: genomicFactors || [],
      genomicAssessed,
      psmaFactors: psmaFactors || [],
      psmaAssessed,
    }),

    // ── 4. Monitoring Schedule ───────────────────────────────────────────
    e(MonitoringSchedule, {
      monitoringSchedule,
      monitoringLabel,
      monitoringTier,
      features,
      featureCount,
    }),

    // ── 5. Cohort Context Chips ──────────────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm p-4' },
      e('p', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2.5' }, 'Cohort Context'),
      e(CohortChips, { cohortContext, inputs, psad: psadNum })
    ),

    // ── 6. Actions ───────────────────────────────────────────────────────
    e('div', { className: 'flex flex-wrap gap-3 no-print' },
      e('button', {
        onClick: onBack,
        className: 'flex-1 min-w-[160px] py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors',
      },
        e('span', { className: 'flex items-center justify-center gap-1.5' },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Edit Inputs'
        )
      ),
      e('label', {
        className: 'flex-1 min-w-[160px] py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors text-center cursor-pointer',
      },
        e('input', {
          type: 'file',
          accept: 'application/json,.json',
          onChange: onUploadData,
          className: 'hidden',
        }),
        e('span', { className: 'flex items-center justify-center gap-1.5' }, 'Upload Data')
      ),
      e('button', {
        type: 'button',
        onClick: onDownloadData,
        className: 'flex-1 min-w-[160px] py-3 rounded-xl border-2 border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors',
      },
        e('span', { className: 'flex items-center justify-center gap-1.5' }, 'Download Data')
      ),
      e('button', {
        onClick: () => window.print(),
        className: 'flex-1 min-w-[160px] py-3 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity',
        style: { background: '#06ABEB' },
      },
        e('span', { className: 'flex items-center justify-center gap-1.5' },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' })
          ),
          'Print / Save PDF'
        )
      )
    ),

    // ── 7. Detail Accordion ──────────────────────────────────────────────
    e(DetailAccordion, {
      asFactors, asScore, asTierKey,
      genomicAssessed, genomicRiskTier, genomicScore, genomicFactors,
      psmaAssessed, psmaFinding, psmaScore, psmaFactors,
      monitoringSchedule, monitoringLabel, monitoringTier, features, featureCount,
      cohortContext,
      combinedTierKey,
    }),

    // ── Disclaimer ───────────────────────────────────────────────────────
    e('div', { className: 'rounded-xl p-4 space-y-2', style: { background: '#f8fafc', border: '1px solid #e2e8f0' } },
      e('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
        e('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide' }, 'Clinical Disclaimer'),
        isEpsa && e('span', {
          className: 'text-xs font-medium px-2 py-0.5 rounded-full',
          style: { background: '#dbeafe', color: '#1e40af' },
        }, 'Via ePSA')
      ),
      e('p', { className: 'text-xs text-gray-400 leading-relaxed' },
        'This tool provides algorithmic decision-support output only. It does not constitute medical advice, a diagnosis, or a treatment recommendation. Scoring thresholds are based on published literature; point weights are ordinal proxies for published risk tiers and have not been prospectively validated as an integrated composite score. All clinical decisions must be made by a qualified healthcare provider in the context of the patient\'s full clinical history, institutional protocols, and shared decision-making.'
      ),
      e('p', { className: 'text-xs text-gray-400' },
        'Key references: NCCN Prostate Cancer Guidelines v3.2024 · EAU Guidelines 2024 · Kadeer et al., Eur Urol 2025 · PRIAS protocol (Bul et al., 2013) · Mount Sinai Tewari AS Program N=1,213 cohort calibration data'
      )
    )
  )
}

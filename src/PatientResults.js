import React, { useState, useEffect } from 'react'
import { MODEL_VALIDATION, COHORT_CALIBRATION, CLINICAL_IMPACT_TABLE } from './asEngine.js'

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
// ─── Key Drivers ─────────────────────────────────────────────────────────────
function KeyDrivers({ asFactors, genomicFactors, genomicAssessed, psmaFactors, psmaAssessed }) {
  const [openIdx, setOpenIdx] = useState(-1)
  const [expanded, setExpanded] = useState(false)

  const allFactors = [
    ...asFactors.map(f => ({ ...f, _src: 'basic' })),
    ...(genomicAssessed ? genomicFactors.map(f => ({ ...f, _src: 'genomic' })) : []),
    ...(psmaAssessed    ? psmaFactors.map(f => ({   ...f, _src: 'psma'    })) : []),
  ]

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

  const colorFor = tier =>
    tier === 'low' ? '#10b981' : tier === 'high' ? '#f43f5e' : tier === 'intermediate' ? '#f59e0b' : '#94a3b8'
  const arrowFor = tier =>
    tier === 'low' ? '↑' : tier === 'high' ? '↓' : tier === 'intermediate' ? '→' : '·'
  const labelFor = tier =>
    tier === 'low' ? 'Low risk' : tier === 'high' ? 'High risk' : tier === 'intermediate' ? 'Monitor' : tier === 'override' ? 'OVERRIDE' : null

  return e('div', {
    style: { background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 1px 0 rgba(0,0,45,0.02), 0 4px 14px rgba(6,171,235,0.04)', overflow: 'hidden' },
  },
    e('div', {
      style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '16px 18px 12px', borderBottom: '1px solid #f1f5f9' },
    },
      e('div', {},
        e('div', { style: { fontSize: 16, fontWeight: 800, color: '#00002D', letterSpacing: '-0.005em' } }, 'Key Drivers'),
        e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } }, 'What\'s pushing the score')
      ),
      e('span', { style: { fontSize: 11, fontWeight: 700, color: '#DC298D' } }, 'Tap to explain')
    ),
    e('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px 12px' } },
      visible.length === 0
        ? e('p', { style: { padding: '12px 6px', fontSize: 12, color: '#94a3b8', textAlign: 'center' } }, 'No significant drivers identified')
        : visible.map((f, i) => {
            const color = f.points === 'OVERRIDE' ? '#7c3aed' : colorFor(f.tier)
            const open = openIdx === i
            const pts = f.points
            const barPct = pts === 'OVERRIDE' ? 100 : Math.min(100, Math.abs(typeof pts === 'number' ? pts : 0) * 10)
            return e('button', {
              key: i, type: 'button',
              onClick: () => setOpenIdx(open ? -1 : i),
              style: {
                background: open ? '#fff' : '#f8fafc',
                border: `1px solid ${open ? 'rgba(220,41,141,0.35)' : '#f1f5f9'}`,
                borderRadius: 12, padding: '11px 14px',
                cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left', fontFamily: 'inherit',
                boxShadow: open ? '0 4px 14px rgba(220,41,141,0.08)' : 'none',
              },
            },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                e('div', { style: { width: 22, textAlign: 'center', fontSize: 16, fontWeight: 800, color, flexShrink: 0, lineHeight: 1 } },
                  f.points === 'OVERRIDE' ? '!' : arrowFor(f.tier)
                ),
                e('div', { style: { flex: 1, fontSize: 14, fontWeight: 600, color: '#00002D', minWidth: 0, lineHeight: 1.3 } }, f.label),
                e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 90, flexShrink: 0 } },
                  e('div', { style: { flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', minWidth: 56 } },
                    e('div', { style: { width: barPct + '%', height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' } })
                  ),
                  labelFor(f.tier) && e('div', { style: { fontSize: 11, fontWeight: 700, color, minWidth: 40, textAlign: 'right' } }, labelFor(f.tier))
                )
              ),
              open && f.basis && e('div', {
                style: { paddingTop: 10, paddingLeft: 32, paddingBottom: 4, fontSize: 13, color: '#64748b', lineHeight: 1.55 },
              }, f.basis),
              open && !f.basis && e('div', {
                style: { paddingTop: 8, paddingLeft: 32, paddingBottom: 4, fontSize: 13, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' },
              }, f.tier === 'low' ? 'Pushes toward AS eligibility.' : f.tier === 'high' ? 'Pulls away from AS — surface during shared decision-making.' : 'Worth monitoring at next imaging cycle.')
            )
          })
    ),
    !expanded && hiddenCount > 0 && e('div', { style: { padding: '0 18px 14px' } },
      e('button', {
        type: 'button',
        onClick: () => setExpanded(true),
        style: { fontSize: 12, color: '#06ABEB', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 },
      }, `+${hiddenCount} more factors`)
    )
  )
}

// ─── Monitoring Schedule ──────────────────────────────────────────────────────
function MonitoringSchedule({ monitoringSchedule, monitoringLabel, monitoringTier, features, featureCount }) {
  const monStyle = MONITORING_STYLES[monitoringTier] || MONITORING_STYLES.standard

  return e('div', {
    style: { background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 1px 0 rgba(0,0,45,0.02), 0 4px 14px rgba(6,171,235,0.04)', overflow: 'hidden' },
  },
    e('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px 12px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' },
    },
      e('div', {},
        e('div', { style: { fontSize: 16, fontWeight: 800, color: '#00002D', letterSpacing: '-0.005em' } }, 'Monitoring Protocol'),
        e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } }, 'Recommended surveillance schedule')
      ),
      e('span', {
        style: { fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: monStyle.bg, color: monStyle.color },
      }, monStyle.label)
    ),
    e('div', { style: { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 } },
      e('ul', { style: { display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0, listStyle: 'none' } },
        ...monitoringSchedule.map((item, i) =>
          e('li', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
            e('div', {
              style: { flexShrink: 0, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, background: monStyle.bg },
            },
              e('div', { style: { width: 6, height: 6, borderRadius: '50%', background: monStyle.color } })
            ),
            e('span', { style: { fontSize: 14, color: '#334155', lineHeight: 1.5 } }, item)
          )
        )
      ),
      featureCount > 0 && e('div', { style: { paddingTop: 12, borderTop: '1px solid #f1f5f9' } },
        e('p', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8 } },
          `High-Risk Features (${featureCount})`
        ),
        e('ul', { style: { display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' } },
          ...features.map((feat, i) =>
            e('li', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#334155' } },
              e('svg', { style: { width: 14, height: 14, flexShrink: 0, marginTop: 2, color: '#f59e0b' }, fill: 'currentColor', viewBox: '0 0 20 20' },
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
        e('span', {
          className: 'flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500 rounded-full',
          style: { width: 20, height: 20, background: '#f1f5f9', border: '1px solid #e2e8f0', lineHeight: 1, marginTop: 2 },
        }, icon),
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

    // Sub-model validation basis
    e('div', { className: 'rounded-xl overflow-hidden', style: { border: '1px solid #e2e8f0' } },
      e('div', { className: 'px-3 py-2', style: { background: '#f1f5f9' } },
        e('p', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wide' }, 'Validation Basis by Sub-Model'),
        e('p', { className: 'text-[10px] text-slate-400 mt-0.5' }, 'Model-level performance metrics — not patient-specific scoring')
      ),
      e('div', { className: 'px-3' },
        e(SubModelRow, { model: { ...MV.basic_psad, auc: MV.basic_psad.auc_internal, auc_ci: `(Kadeer 2025: ${MV.basic_psad.auc_published})`, comparator: `PSA alone AUC ${MV.basic_psad.auc_psa_alone}` }, icon: '1', validationType: 'cohort_validated' }),
        e(SubModelRow, { model: { ...MV.genomic, auc: MV.genomic.auc_internal }, icon: '2', validationType: 'literature_threshold' }),
        e(SubModelRow, { model: { ...MV.psma, auc: MV.psma.auc_internal }, icon: '3', validationType: 'staging_classifier' }),
        e(SubModelRow, { model: MV.monitoring, icon: '4', validationType: 'guideline_checklist' }),
      )
    ),

    // Validation status
    e('div', { className: 'rounded-xl px-3 py-2.5', style: { background: '#fefce8', border: '1px solid #fde68a' } },
      e('p', { className: 'text-xs font-semibold text-amber-800 mb-0.5' }, 'Validation Status'),
      e('p', { className: 'text-xs text-amber-700 leading-snug' }, MV.composite.validation_status),
      e('p', { className: 'text-xs text-amber-600 mt-1 leading-snug' }, MV.composite.calibration)
    )
  )
}

// ─── Model Validation Modal ───────────────────────────────────────────────────
function ModelValidationModal({ onClose, isEpsa, epsaContext }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const MV = MODEL_VALIDATION

  return e('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: 0,
    },
    role: 'presentation',
  },
    // Backdrop
    e('div', {
      style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' },
      onClick: onClose,
      'aria-hidden': true,
    }),

    // Panel
    e('div', {
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'mv-modal-title',
      onClick: (ev) => ev.stopPropagation(),
      style: {
        position: 'relative',
        width: '100%', maxWidth: 720,
        height: '92vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: '20px 20px 0 0',
        overflow: 'hidden',
        boxShadow: '0 -12px 60px rgba(0,0,45,0.35)',
        background: '#fff',
      },
    },

      // ── Header ────────────────────────────────────────────────────────────
      e('header', {
        style: {
          flexShrink: 0,
          background: 'linear-gradient(118deg, #00002D 0%, #212070 60%, #06ABEB 160%)',
          padding: '20px 22px 18px',
          position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        },
      },
        // Decorative blob
        e('div', {
          style: {
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(220,41,141,0.22), transparent 70%)',
            pointerEvents: 'none',
          },
        }),
        e('div', { style: { position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 } },
          e('div', {},
            e('p', {
              style: { fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: '#06ABEB', textTransform: 'uppercase', margin: 0 },
            }, 'Mount Sinai · Tewari AS Program'),
            e('h2', {
              id: 'mv-modal-title',
              style: { fontSize: 20, fontWeight: 800, color: '#fff', margin: '6px 0 4px', letterSpacing: '-0.01em', lineHeight: 1.15 },
            }, 'Model Validation & Transparency'),
            e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
              e('span', {
                style: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(220,252,231,0.15)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.3)' },
              }, `N=${MV.cohort.n} cohort`),
              e('span', {
                style: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(219,234,254,0.12)', color: '#93c5fd', border: '1px solid rgba(147,197,253,0.25)' },
              }, MV.cohort.validation_type || 'Internal cohort validation'),
              isEpsa && e('span', {
                style: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(220,41,141,0.15)', color: '#f9a8d4', border: '1px solid rgba(220,41,141,0.3)' },
              }, 'Via ePSA'),
            )
          ),
          // Close button
          e('button', {
            type: 'button', onClick: onClose,
            'aria-label': 'Close',
            style: {
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1, fontFamily: 'inherit',
              transition: 'background 0.15s',
            },
          }, '×')
        )
      ),

      // ── Scrollable body ───────────────────────────────────────────────────
      e('div', {
        style: {
          flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
          background: '#f8fafc', padding: '20px 20px 32px',
          display: 'flex', flexDirection: 'column', gap: 16,
        },
      },

        // Intro
        e('div', {
          style: { borderRadius: 12, padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0' },
        },
          e('p', { style: { fontSize: 13, color: '#334155', lineHeight: 1.65, margin: 0 } },
            'This tool was developed and internally validated on the Mount Sinai Tewari Active Surveillance Program cohort (N=1,213 patients; endpoint: Grade Group upgrade on repeat biopsy). The metrics below document discriminatory performance, cutoff calibration, and the validation basis for each sub-model. External prospective validation is pending.'
          )
        ),

        // ePSA transparency section (shown only when assessment was seeded from ePSA)
        isEpsa && e('div', {
          style: {
            borderRadius: 12, padding: '14px 16px',
            background: 'rgba(220,41,141,0.05)',
            border: '1px solid rgba(220,41,141,0.22)',
            borderLeft: '4px solid #DC298D',
          },
        },
          e('p', { style: { fontSize: 12, fontWeight: 700, color: '#00002D', margin: '0 0 6px' } }, 'ePSA Pre-Biopsy Integration'),
          e('p', { style: { fontSize: 12, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' } },
            'This assessment was seeded from an ePSA export. The pre-biopsy risk tier is carried forward as contextual information only — it does not modify the post-biopsy scoring algorithm. Both outputs are displayed together to support shared decision-making across the full care pathway.'
          ),
          e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            epsaContext?.epsaTierLabel && e('div', {
              style: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(220,41,141,0.08)', borderRadius: 8, padding: '4px 10px' },
            },
              e('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Pre-biopsy tier:'),
              e('span', { style: { fontSize: 12, fontWeight: 700, color: '#DC298D' } }, epsaContext.epsaTierLabel)
            ),
            epsaContext?.pathwayMode && e('div', {
              style: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: '4px 10px' },
            },
              e('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Pathway:'),
              e('span', { style: { fontSize: 12, fontWeight: 600, color: '#334155' } }, epsaContext.pathwayMode === 'post_mri' ? 'Post-MRI' : 'Post-PSA')
            )
          )
        ),

        // Validation metrics (ModelValidationCard — contains cohort overview, PSAD
        // performance, tier table, composite engine, and per-sub-model summary)
        e(ModelValidationCard),

        // References + Disclaimer
        e('div', {
          style: { borderRadius: 12, padding: '12px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 },
        },
          e('p', { style: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 } }, 'Key References'),
          e('p', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.7, margin: 0 } },
            'Kadeer N et al., Eur Urol 2025 · NCCN Prostate Cancer Guidelines v3.2024 · EAU Guidelines 2024 · PRIAS (Bul et al., Eur Urol 2013) · Canary PASS (Newcomb et al., J Urol 2016) · Mount Sinai Tewari Active Surveillance Program N=1,213'
          ),
          e('div', { style: { borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 2 } },
            e('p', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' } }, 'Clinical Disclaimer'),
            e('p', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.6, margin: 0 } },
              'This tool provides algorithmic decision-support output only. It does not constitute medical advice, a diagnosis, or a treatment recommendation. All clinical decisions must be made by a qualified healthcare provider in the context of the full clinical history, institutional protocols, and shared decision-making.'
            )
          )
        )
      )
    )
  )
}

// ─── Evidence & Full Detail Modal ────────────────────────────────────────────
function EvidenceDetailModal({
  onClose,
  asFactors, asScore, asTierKey,
  genomicAssessed, genomicRiskTier, genomicScore, genomicFactors,
  psmaAssessed, psmaFinding, psmaScore, psmaFactors,
  monitoringSchedule, monitoringLabel, monitoringTier, features, featureCount,
  cohortContext, combinedTierKey,
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (ev) => { if (ev.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

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

  const TIER_COHORT_DATA = {
    standard_as:   { rate: 0.292, n: 72,  source: 'N=218 internal validation sub-cohort' },
    enhanced_as:   { rate: 0.194, n: 109, source: 'N=218 internal validation sub-cohort' },
    intensive_as:  { rate: 0.121, n: 33,  source: 'N=218 internal validation sub-cohort' },
  }
  const tierCohortData = TIER_COHORT_DATA[combinedTierKey]

  return e('div', {
    style: { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 },
    role: 'presentation',
  },
    e('div', {
      style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' },
      onClick: onClose, 'aria-hidden': true,
    }),
    e('div', {
      role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'ev-modal-title',
      onClick: (ev) => ev.stopPropagation(),
      style: {
        position: 'relative', width: '100%', maxWidth: 720, height: '92vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: '20px 20px 0 0', overflow: 'hidden',
        boxShadow: '0 -12px 60px rgba(0,0,45,0.35)', background: '#fff',
      },
    },
      // Header
      e('header', {
        style: {
          flexShrink: 0,
          background: 'linear-gradient(118deg, #00002D 0%, #0d4f6e 60%, #06ABEB 160%)',
          padding: '20px 22px 18px', position: 'relative',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        },
      },
        e('div', { style: { position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 } },
          e('div', {},
            e('p', { style: { fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: '#06ABEB', textTransform: 'uppercase', margin: 0 } }, 'Mount Sinai · Tewari AS Program'),
            e('h2', {
              id: 'ev-modal-title',
              style: { fontSize: 20, fontWeight: 800, color: '#fff', margin: '6px 0 4px', letterSpacing: '-0.01em', lineHeight: 1.15 },
            }, 'Evidence & Full Detail'),
            e('p', { style: { fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 } }, "This patient's scoring across all four sub-models, the guideline evidence behind each threshold, and cohort calibration context")
          ),
          e('button', {
            type: 'button', onClick: onClose, 'aria-label': 'Close',
            style: {
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1, fontFamily: 'inherit',
            },
          }, '×')
        )
      ),

      // Scrollable body
      e('div', {
        style: { flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', background: '#f8fafc', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
      },

        // Intro
        e('div', {
          style: { borderRadius: 12, padding: '12px 14px', background: '#fff', border: '1px solid #e2e8f0' },
        },
          e('p', { style: { fontSize: 13, color: '#334155', lineHeight: 1.65, margin: 0 } },
            'The four sub-models below were each applied to the entered clinical data. Each section shows the individual factor contributions, the resulting tier, and the published evidence underlying the scoring thresholds. For model-level performance metrics and validation statistics, see Model Validation & Transparency.'
          )
        ),

        // Sub-model 1
        e('div', { style: { background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '14px 16px' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' } },
            e('span', { style: { fontWeight: 700, fontSize: 13, color: '#00002D' } }, 'Sub-model 1 — Biopsy Pathology & PSA Density'),
            e('span', { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#e0f2fe', color: '#075985' } },
              `Score: ${asScore > 0 ? '+' : ''}${asScore}  ·  ${asTierKey?.replace(/_/g,' ')}`
            ),
            e(ValidationBadge, { type: 'cohort_validated' })
          ),
          e('div', {}, ...asFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
          e('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
            e('strong', { style: { color: '#64748b' } }, 'Evidence basis: '),
            'GGG: ISUP 2016 (Epstein et al., Eur Urol 2016). Core criteria: NCCN 2024 very low risk (Epstein 1994, Bastian 2004). PSAD thresholds: NCCN 2024 (0.15 ng/mL/cm³) and Kadeer et al. 2025 Youden optimal cutoff (0.177 ng/mL/cm³). PI-RADS v2.1: Turkbey et al., Eur Urol 2019.'
          )
        ),

        // Sub-model 2
        e('div', { style: { background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '14px 16px' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' } },
            e('span', { style: { fontWeight: 700, fontSize: 13, color: '#00002D' } }, 'Sub-model 2 — Genomic Biomarkers (Decipher / GPS / Prolaris)'),
            e('span', { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, ...genomicBadgeStyle } },
              genomicAssessed
                ? `${genomicRiskTier?.charAt(0).toUpperCase() + genomicRiskTier?.slice(1)} risk · Score: ${genomicScore > 0 ? '+' : ''}${genomicScore}`
                : 'Not assessed'
            ),
            e(ValidationBadge, { type: 'literature_threshold' })
          ),
          genomicAssessed
            ? e('div', {},
                e('div', {}, ...genomicFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
                e('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
                  e('strong', { style: { color: '#64748b' } }, 'Evidence basis: '),
                  'Decipher thresholds (0.45/0.60): Spratt et al., Lancet Oncol 2014. Oncotype GPS thresholds (20/40): Klein et al., Eur Urol 2021. Prolaris CCP thresholds (1.5/2.1): Cooperberg et al., Cancer 2013. ConfirmMDx: Stewart et al., J Urol 2013.'
                )
              )
            : e(NotAssessed, { message: 'Genomic data not entered' })
        ),

        // Sub-model 3
        e('div', { style: { background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '14px 16px' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' } },
            e('span', { style: { fontWeight: 700, fontSize: 13, color: '#00002D' } }, 'Sub-model 3 — PSMA PET/CT Staging'),
            e('span', { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, ...psmaBadgeStyle } },
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
                e('div', {}, ...psmaFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
                e('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
                  e('strong', { style: { color: '#64748b' } }, 'Evidence basis: '),
                  'Staging classification and management implications: EAU-EANM-ESTRO-ESUR-SIOG Guidelines on Prostate Cancer, 2024 edition.'
                )
              )
            : e(NotAssessed, { message: 'PSMA PET/CT not performed or data not entered' })
        ),

        // Sub-model 4
        e('div', { style: { background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '14px 16px' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' } },
            e('span', { style: { fontWeight: 700, fontSize: 13, color: '#00002D' } }, 'Sub-model 4 — Monitoring Intensity & Protocol'),
            e('span', { style: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: monStyle.bg, color: monStyle.color } }, monStyle.label),
            e(ValidationBadge, { type: 'guideline_checklist' })
          ),
          e('p', { style: { fontSize: 12, color: '#64748b', marginBottom: 8 } }, monitoringLabel),
          e('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 } },
            ...monitoringSchedule.map((item, i) =>
              e('li', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
                e('div', { style: { flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: monStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 } },
                  e('div', { style: { width: 6, height: 6, borderRadius: '50%', background: monStyle.color } })
                ),
                e('span', { style: { fontSize: 13, color: '#374151', lineHeight: 1.5 } }, item)
              )
            )
          ),
          featureCount > 0 && e('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' } },
            e('p', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 } }, `High-Risk Features (${featureCount})`),
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              ...features.map((feat, i) =>
                e('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#374151' } },
                  e('div', { style: { width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: 6 } }),
                  e('span', null, typeof feat === 'string' ? feat : feat.label)
                )
              )
            )
          ),
          e('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
            e('strong', { style: { color: '#64748b' } }, 'Evidence basis: '),
            'Feature list and monitoring intensity tiers derived from PRIAS protocol (Bul et al., Eur Urol 2013), NCCN 2024 active surveillance monitoring guidelines, and Canary PASS (Newcomb et al., J Urol 2016). Cohort calibration (Layer 2) from Mount Sinai Tewari AS Program N=1,213.'
          )
        ),

        // Cohort Calibration
        cohortContext && cohortContext.cohortItems && cohortContext.cohortItems.length > 0 && e('div', { style: { background: '#f0f9ff', borderRadius: 14, border: '1px solid #bfdbfe', overflow: 'hidden' } },
          e('div', { style: { padding: '10px 16px', borderBottom: '1px solid #bfdbfe', background: '#e0f2fe' } },
            e('p', { style: { fontSize: 12, fontWeight: 700, color: '#0369a1', margin: 0 } }, 'Cohort Calibration — Per-Variable Breakdown')
          ),
          e('div', { style: { padding: '0 16px' } },
            ...cohortContext.cohortItems.map((item, idx) =>
              e('div', { key: idx, style: { padding: '10px 0', borderBottom: idx < cohortContext.cohortItems.length - 1 ? '1px solid #e0f2fe' : 'none' } },
                e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
                  e('div', { style: { width: 6, height: 6, borderRadius: '50%', background: '#06ABEB', flexShrink: 0, marginTop: 6 } }),
                  e('div', { style: { flex: 1 } },
                    e('p', { style: { fontSize: 11, fontWeight: 700, color: '#075985', margin: '0 0 2px' } }, item.label),
                    e('p', { style: { fontSize: 13, color: '#0c4a6e', lineHeight: 1.5, margin: 0 } }, item.finding),
                    item.note && e('p', { style: { fontSize: 11, color: '#0369a1', marginTop: 2, lineHeight: 1.5, fontStyle: 'italic', margin: '2px 0 0' } }, item.note)
                  )
                )
              )
            )
          )
        ),

        // Selection effect
        tierCohortData && e('div', { style: { borderRadius: 12, padding: '12px 14px', background: '#fafafa', border: '1px solid #e5e7eb' } },
          e('p', { style: { fontSize: 12, fontWeight: 600, color: '#475569', margin: '0 0 4px' } },
            `Observed upgrade rate in this tier: ${(tierCohortData.rate * 100).toFixed(1)}% (${tierCohortData.n} patients, ${tierCohortData.source})`
          ),
          e('p', { style: { fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0 } },
            'This figure reflects who was enrolled in this tier, not a prediction for this patient. ',
            e('span', { style: { fontWeight: 600, color: '#b45309' } }, 'Note: higher tiers show lower observed upgrade rates in this cohort'),
            ' — this is the expected selection effect: the highest-risk patients are appropriately directed to treatment rather than AS enrollment.'
          )
        )
      )
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

// ─── Clinical Summary Panel (clinician-facing input + sub-model overview) ─────
function ClinicalSummaryPanel({ inputs, asScore, asTierKey, genomicAssessed, genomicRiskTier, genomicScore, psmaAssessed, psmaFinding, psmaScore, monitoringTier, psad, combinedTierKey }) {
  const [open, setOpen] = useState(true)

  const SUBMODEL_STYLES = {
    standard_as:   { label: 'AS Eligible',   bg: '#f0fdf4', border: '#16a34a', color: '#15803d' },
    enhanced_as:   { label: 'Enhanced',      bg: '#fffbeb', border: '#d97706', color: '#b45309' },
    intensive_as:  { label: 'Intensive',     bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' },
    treatment_discussion: { label: 'Tx Discussion', bg: '#f5f3ff', border: '#7c3aed', color: '#6d28d9' },
    treatment_required:   { label: 'Tx Required',   bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' },
  }

  const asStyle = SUBMODEL_STYLES[asTierKey] || { label: asTierKey, bg: '#f1f5f9', border: '#e2e8f0', color: '#334155' }

  const genomicStyle =
    !genomicAssessed           ? { label: 'Not assessed', bg: '#f8fafc', border: '#e2e8f0', color: '#94a3b8' }
    : genomicRiskTier === 'high'         ? { label: 'High risk',   bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' }
    : genomicRiskTier === 'intermediate' ? { label: 'Intermediate',bg: '#fffbeb', border: '#d97706', color: '#b45309' }
    :                                      { label: 'Favorable',   bg: '#f0fdf4', border: '#16a34a', color: '#15803d' }

  const psmaStyle =
    !psmaAssessed                                                     ? { label: 'Not assessed', bg: '#f8fafc', border: '#e2e8f0', color: '#94a3b8' }
    : psmaFinding === 'metastatic' || psmaFinding === 'regional'     ? { label: psmaFinding === 'metastatic' ? 'Metastatic' : 'Regional nodes', bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' }
    : psmaFinding === 'local'                                         ? { label: 'Local only',   bg: '#fffbeb', border: '#d97706', color: '#b45309' }
    :                                                                    { label: 'Negative',     bg: '#f0fdf4', border: '#16a34a', color: '#15803d' }

  const monStyle = MONITORING_STYLES[monitoringTier] || MONITORING_STYLES.standard

  const psadNum = psad != null ? Number(psad) : null

  function InputRow({ label, value, badge, badgeColor }) {
    if (value == null || value === '' || value === false) return null
    return e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8fafc' } },
      e('span', { style: { fontSize: 12, color: '#64748b' } }, label),
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
        e('span', { style: { fontSize: 13, fontWeight: 700, color: '#00002D' } }, value),
        badge && e('span', {
          style: { fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: badgeColor?.bg || '#f1f5f9', color: badgeColor?.color || '#64748b', border: `1px solid ${badgeColor?.border || '#e2e8f0'}` },
        }, badge)
      )
    )
  }

  function SubModelBadge({ label, score, style, scoreLabel }) {
    return e('div', {
      style: { padding: '10px 12px', borderRadius: 12, background: style.bg, border: `1px solid ${style.border}`, display: 'flex', flexDirection: 'column', gap: 3 },
    },
      e('span', { style: { fontSize: 11, fontWeight: 700, color: style.color } }, label),
      e('span', { style: { fontSize: 12, fontWeight: 800, color: style.color } }, style.label),
      score != null && e('span', { style: { fontSize: 10, color: style.color, opacity: 0.7 } }, scoreLabel || `Score: ${score > 0 ? '+' : ''}${score}`)
    )
  }

  return e('div', {
    style: { background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 1px 0 rgba(0,0,45,0.02), 0 4px 14px rgba(6,171,235,0.04)', overflow: 'hidden' },
  },
    e('button', {
      type: 'button',
      onClick: () => setOpen(v => !v),
      style: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
    },
      e('div', {},
        e('div', { style: { fontSize: 16, fontWeight: 800, color: '#00002D', letterSpacing: '-0.005em' } }, 'Clinical Summary'),
        e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } }, 'Patient inputs · Sub-model scores')
      ),
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
        e('span', { style: { fontSize: 11, fontWeight: 700, color: '#06ABEB' } }, open ? 'Collapse' : 'Expand'),
        e('svg', { width: 16, height: 16, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2, style: { color: '#94a3b8', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' } },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
        )
      )
    ),

    open && e('div', { style: { padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid #f1f5f9' } },

      // Sub-model grid
      e('div', {},
        e('p', { style: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '12px 0 8px' } }, 'Sub-model Results'),
        e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } },
          e(SubModelBadge, { label: 'Basic + PSAD', score: asScore, style: asStyle }),
          e(SubModelBadge, { label: 'Genomic', score: genomicAssessed ? genomicScore : null, style: genomicStyle }),
          e(SubModelBadge, { label: 'PSMA PET/CT', score: psmaAssessed ? psmaScore : null, style: psmaStyle }),
          e('div', {
            style: { padding: '10px 12px', borderRadius: 12, background: monStyle.bg, border: `1px solid ${monStyle.color}33`, display: 'flex', flexDirection: 'column', gap: 3 },
          },
            e('span', { style: { fontSize: 11, fontWeight: 700, color: monStyle.color } }, 'Monitoring Protocol'),
            e('span', { style: { fontSize: 12, fontWeight: 800, color: monStyle.color } }, monStyle.label)
          )
        )
      ),

      // Patient inputs
      e('div', {},
        e('p', { style: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 8, marginTop: 0 } }, 'Entered Data'),
        e('div', { style: { display: 'flex', flexDirection: 'column' } },
          e(InputRow, { label: 'Grade Group', value: inputs.ggg != null ? `GG${inputs.ggg}` : null }),
          e(InputRow, { label: 'Positive / Total Cores', value: inputs.positiveCores != null && inputs.totalCores != null ? `${inputs.positiveCores} / ${inputs.totalCores}` : null }),
          e(InputRow, { label: 'Max Core %', value: inputs.maxCorePercent != null ? `${inputs.maxCorePercent}%` : null }),
          e(InputRow, { label: 'PSA', value: inputs.psa != null ? `${inputs.psa} ng/mL` : null }),
          e(InputRow, { label: 'Prostate Volume', value: inputs.prostateVolume != null ? `${inputs.prostateVolume} cc` : null }),
          e(InputRow, { label: 'PSAD', value: psadNum != null ? psadNum.toFixed(3) : null,
            badge: psadNum != null ? (psadNum < 0.065 ? '< 0.065' : psadNum < 0.15 ? '0.065–0.15' : psadNum < 0.177 ? '0.15–0.177' : '> 0.177') : null,
            badgeColor: psadNum != null ? (psadNum < 0.15 ? { bg: '#f0fdf4', border: '#16a34a', color: '#15803d' } : { bg: '#fef2f2', border: '#dc2626', color: '#b91c1c' }) : null,
          }),
          e(InputRow, { label: 'PI-RADS', value: inputs.pirads != null && inputs.pirads !== 0 ? `PI-RADS ${inputs.pirads}` : null }),
          e(InputRow, { label: 'Age', value: inputs.age != null ? `${inputs.age} yr` : null }),
          inputs.decipher != null  && e(InputRow, { label: 'Decipher', value: String(inputs.decipher) }),
          inputs.gps      != null  && e(InputRow, { label: 'GPS (Oncotype)', value: String(inputs.gps) }),
          inputs.prolaris != null  && e(InputRow, { label: 'Prolaris CCP', value: String(inputs.prolaris) }),
          inputs.psmaFinding       && e(InputRow, { label: 'PSMA Finding', value: inputs.psmaFinding }),
          inputs.hasECE            && e(InputRow, { label: 'ECE', value: 'Present' }),
          inputs.hasAbutment       && e(InputRow, { label: 'Neurovascular Abutment', value: 'Present' }),
          inputs.hasBroadContact   && e(InputRow, { label: 'Broad Capsular Contact', value: 'Present' }),
        )
      )
    )
  )
}

// ─── Upgrade Risk Panel ───────────────────────────────────────────────────────
function UpgradeRiskPanel({ upgradeRisk, inputs }) {
  const [activeTab, setActiveTab] = useState(0)
  const [threshold, setThreshold] = useState(20)

  if (!upgradeRisk) return null

  const BAND_COLORS = {
    green:  { accent: '#15803d', bg: '#f0fdf4', border: '#16a34a', text: '#14532d' },
    yellow: { accent: '#ca8a04', bg: '#fefce8', border: '#ca8a04', text: '#713f12' },
    orange: { accent: '#ea580c', bg: '#fff7ed', border: '#ea580c', text: '#7c2d12' },
    red:    { accent: '#dc2626', bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
  }
  const bc = BAND_COLORS[upgradeRisk.bandColor] || BAND_COLORS.yellow

  const tabLabels = ['Risk Calculator', 'Threshold Adjuster', 'Patient Report']

  function renderRiskCalculator() {
    if (!upgradeRisk.available) {
      return e('div', {
        style: {
          padding: '28px 20px', borderRadius: 12, background: '#f8fafc',
          border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8',
          fontSize: 14, margin: 16,
        },
      }, 'Enter GGG and positive core count to see personalized risk')
    }

    const barFillPct = Math.min(100, (upgradeRisk.probability / 0.50) * 100)
    const cohortAvgPct = upgradeRisk.cohortAvgPct
    const cohortTickPct = Math.min(100, (cohortAvgPct / 50) * 100)
    const ggg = upgradeRisk.inputs?.ggg
    const psad = upgradeRisk.inputs?.psad
    const positiveCores = upgradeRisk.inputs?.positiveCores

    return e('div', { style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 } },
      // Large risk number
      e('div', { style: { textAlign: 'center', padding: '4px 0' } },
        e('div', { style: { fontSize: 72, fontWeight: 900, color: bc.accent, lineHeight: 1, letterSpacing: '-0.03em' } },
          `${upgradeRisk.pct}%`
        ),
        e('div', { style: { fontSize: 13, color: '#64748b', marginTop: 6 } },
          'upgrade risk at next biopsy'
        ),
        upgradeRisk.hasCi && e('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } },
          `95% CI: ${upgradeRisk.ciLo}%–${upgradeRisk.ciHi}%`
        )
      ),

      // Progress bar
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 0 } },
        e('div', { style: { position: 'relative', height: 12, borderRadius: 6, background: '#f1f5f9', overflow: 'visible' } },
          e('div', {
            style: {
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: barFillPct + '%', background: bc.accent, borderRadius: 6,
              transition: 'width 0.4s',
            },
          }),
          e('div', {
            style: {
              position: 'absolute', top: -3, bottom: -3, width: 2,
              background: '#94a3b8', borderRadius: 1,
              left: cohortTickPct + '%', transform: 'translateX(-50%)',
              zIndex: 2,
            },
          })
        ),
        e('div', { style: { position: 'relative', height: 18, marginTop: 2 } },
          e('div', {
            style: {
              position: 'absolute', fontSize: 10, color: bc.accent, fontWeight: 600,
              left: `clamp(0px, calc(${barFillPct}% - 32px), calc(100% - 72px))`,
              top: 2, whiteSpace: 'nowrap',
            },
          }, '↑ You are here')
        ),
        e('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 2 } },
          e('span', null, '0%'),
          e('span', null, '50%+')
        )
      ),

      // Percentile + band box
      e('div', {
        style: {
          padding: '12px 16px', borderRadius: 10,
          background: bc.bg, border: `1px solid ${bc.border}`,
          display: 'flex', flexDirection: 'column', gap: 4,
        },
      },
        e('p', { style: { fontSize: 13, color: bc.text, fontWeight: 600, margin: 0 } },
          `${upgradeRisk.pctBelow}% of Mount Sinai AS patients have lower risk`
        ),
        e('p', { style: { fontSize: 12, color: bc.text, margin: 0 } },
          'Band: ',
          e('span', { style: { fontWeight: 700 } }, upgradeRisk.band),
          ` — ${upgradeRisk.pct < cohortAvgPct ? 'below' : upgradeRisk.pct === cohortAvgPct ? 'at' : 'above'} cohort average (${cohortAvgPct}%)`
        )
      ),

      // PSAD alert if not used
      !upgradeRisk.psadUsed && e('div', {
        style: {
          padding: '10px 14px', borderRadius: 10,
          background: '#fffbeb', border: '1px solid #fde68a',
          fontSize: 12, color: '#78350f', display: 'flex', gap: 8, alignItems: 'flex-start',
        },
      },
        e('div', { style: { width: 4, height: 4, borderRadius: '50%', background: '#d97706', flexShrink: 0, marginTop: 6 } }),
        e('span', null, 'Add prostate volume for more accurate estimate')
      ),

      // Model note
      e('div', {
        style: {
          fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9',
          paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 2,
        },
      },
        e('p', { style: { margin: 0 } },
          `Model: GG${ggg}${psad != null ? ` · PSAD ${psad.toFixed(3)}` : ''} · ${positiveCores} positive ${positiveCores === 1 ? 'core' : 'cores'}`
        ),
        e('p', { style: { margin: 0 } },
          `AUC ${upgradeRisk.auc} · N=${upgradeRisk.modelN} · Internal validation only`
        )
      )
    )
  }

  function renderClinicalImpact() {
    const THRESHOLD_KEYS = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35]
    const thresholdKey = THRESHOLD_KEYS.reduce((prev, curr) =>
      Math.abs(curr - threshold / 100) < Math.abs(prev - threshold / 100) ? curr : prev
    )
    const data = CLINICAL_IMPACT_TABLE[thresholdKey]
    const thresholdPct = Math.round(thresholdKey * 100)
    const patientAbove = upgradeRisk.available && upgradeRisk.probability >= thresholdKey

    if (!data) return e('div', { style: { padding: 20 } }, 'No data available')

    return e('div', { style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 } },
      // Header + slider
      e('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
        e('div', {},
          e('p', { style: { fontSize: 14, fontWeight: 700, color: '#00002D', margin: '0 0 2px' } },
            `Clinical Impact at ${thresholdPct}% threshold`
          ),
          e('p', { style: { fontSize: 11, color: '#94a3b8', margin: 0 } },
            'For every 1,000 patients in active surveillance:'
          )
        ),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          e('span', { style: { fontSize: 10, color: '#94a3b8' } }, '10%'),
          e('input', {
            type: 'range', min: 10, max: 35, step: 5, value: threshold,
            onChange: ev => setThreshold(Number(ev.target.value)),
            style: { width: 80, accentColor: '#06ABEB' },
          }),
          e('span', { style: { fontSize: 10, color: '#94a3b8' } }, '35%')
        )
      ),

      // 4 stat boxes
      e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
        e('div', { style: { textAlign: 'center', padding: '12px 6px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd' } },
          e('div', { style: { fontSize: 26, fontWeight: 900, color: '#0369a1', lineHeight: 1 } }, String(data.biopsies)),
          e('div', { style: { fontSize: 9, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', marginTop: 4, lineHeight: 1.3 } }, 'biopsies\nperformed')
        ),
        e('div', { style: { textAlign: 'center', padding: '12px 6px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' } },
          e('div', { style: { fontSize: 26, fontWeight: 900, color: '#15803d', lineHeight: 1 } }, String(data.caught)),
          e('div', { style: { fontSize: 9, color: '#15803d', fontWeight: 600, textTransform: 'uppercase', marginTop: 4, lineHeight: 1.3 } }, 'upgrades\ncaught')
        ),
        e('div', { style: { textAlign: 'center', padding: '12px 6px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' } },
          e('div', { style: { fontSize: 26, fontWeight: 900, color: '#dc2626', lineHeight: 1 } }, String(data.missed)),
          e('div', { style: { fontSize: 9, color: '#dc2626', fontWeight: 600, textTransform: 'uppercase', marginTop: 4, lineHeight: 1.3 } }, 'upgrades\nmissed')
        ),
        e('div', { style: { textAlign: 'center', padding: '12px 6px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' } },
          e('div', { style: { fontSize: 26, fontWeight: 900, color: '#334155', lineHeight: 1 } }, String(data.avoided)),
          e('div', { style: { fontSize: 9, color: '#334155', fontWeight: 600, textTransform: 'uppercase', marginTop: 4, lineHeight: 1.3 } }, 'biopsies\navoided')
        )
      ),

      // Sens/Spec/PPV/NPV
      e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        ...['Sensitivity', 'Specificity', 'PPV', 'NPV'].map((label, i) => {
          const val = [data.sens, data.spec, data.ppv, data.npv][i]
          return e('div', {
            key: label,
            style: { padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' },
          },
            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              e('span', { style: { fontSize: 12, color: '#64748b' } }, label),
              e('span', { style: { fontSize: 13, fontWeight: 700, color: '#00002D' } }, val.toFixed(2))
            )
          )
        })
      ),

      // Patient position vs threshold
      upgradeRisk.available && e('div', {
        style: {
          padding: '12px 14px', borderRadius: 10,
          background: patientAbove ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${patientAbove ? '#fde68a' : '#bbf7d0'}`,
          fontSize: 12,
          color: patientAbove ? '#78350f' : '#14532d',
        },
      },
        e('p', { style: { margin: '0 0 2px', fontWeight: 600 } },
          `This patient’s risk: ${upgradeRisk.pct}% → ${patientAbove ? 'AT OR ABOVE threshold' : 'BELOW threshold'}`
        ),
        e('p', { style: { margin: 0 } },
          `→ Would ${patientAbove ? '' : 'NOT '}be recommended for biopsy at this threshold`
        )
      )
    )
  }

  function renderPatientReport() {
    const psad = upgradeRisk.inputs?.psad
    const ggg = upgradeRisk.inputs?.ggg
    const cores = upgradeRisk.inputs?.positiveCores
    const pctHigher = 100 - upgradeRisk.pctBelow

    return e('div', { style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 } },
      // Patient info
      e('div', {
        style: { padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12, color: '#334155' },
      },
        e('p', { style: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontSize: 10, margin: '0 0 8px' } },
          'Patient Information'
        ),
        e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px' } },
          e('span', null, `Grade Group: ${ggg}`),
          inputs.psa != null && e('span', null, `PSA: ${inputs.psa} ng/mL`),
          inputs.prostateVolume != null && e('span', null, `Volume: ${inputs.prostateVolume} cc`),
          psad != null && e('span', null, `PSAD: ${psad.toFixed(3)}`),
          cores != null && e('span', null, `Positive cores: ${cores}`)
        )
      ),

      // Risk section
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e('div', { style: { borderBottom: '2px solid #e2e8f0', paddingBottom: 8 } },
          e('p', { style: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', margin: 0 } },
            'Risk of Finding More Aggressive Cancer at Next Biopsy'
          )
        ),

        e('div', {},
          e('p', { style: { fontSize: 13, fontWeight: 700, color: '#00002D', margin: '0 0 6px' } }, 'What does this tell me?'),
          e('p', { style: { fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 } },
            'The Mount Sinai AS Tool provides an estimate of how likely you are to have more aggressive cancer detected at your next prostate biopsy. This estimate may help you and your doctor decide whether a biopsy is necessary at this time.'
          )
        ),

        e('div', {},
          e('p', { style: { fontSize: 13, fontWeight: 700, color: '#00002D', margin: '0 0 6px' } }, 'What is my risk?'),
          e('p', { style: { fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 } },
            upgradeRisk.available
              ? `Your risk of having more aggressive cancer on a prostate biopsy is about ${upgradeRisk.pct}%${upgradeRisk.hasCi ? ` (95% confidence interval: ${upgradeRisk.ciLo}%–${upgradeRisk.ciHi}%)` : ''}. This means that in 100 men like you, about ${upgradeRisk.pct} would have more aggressive cancer detected at the next biopsy.`
              : 'Risk estimate not available. Please enter grade group and positive core count.'
          )
        ),

        upgradeRisk.available && e('div', {},
          e('p', { style: { fontSize: 13, fontWeight: 700, color: '#00002D', margin: '0 0 6px' } }, 'How do I compare with other men?'),
          e('p', { style: { fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 } },
            `Your risk is ${upgradeRisk.band.toLowerCase()} when compared with other men on active surveillance at Mount Sinai. ${pctHigher}% of AS patients have a higher risk than you.`
          )
        )
      ),

      // Important notes
      e('div', {
        style: { padding: '12px 14px', borderRadius: 10, background: '#fefce8', border: '1px solid #fde68a', fontSize: 12, color: '#78350f' },
      },
        e('p', { style: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, margin: '0 0 6px', color: '#92400e' } },
          'Important Notes'
        ),
        e('p', { style: { lineHeight: 1.6, margin: 0 } },
          `This calculator is based on N=${upgradeRisk.modelN} Mount Sinai active surveillance patients. It provides an estimate only — not a guarantee. Use alongside clinical judgment and guideline-based recommendations. This calculator has not been externally validated.`
        )
      ),

      // Print button
      e('button', {
        onClick: () => window.print(),
        style: {
          height: 44, borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #00002D 0%, #212070 100%)',
          fontSize: 13, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer', width: '100%', fontFamily: 'inherit',
        },
      },
        e('svg', { width: 14, height: 14, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' })
        ),
        'Print Patient Report'
      )
    )
  }

  return e('div', {
    style: {
      background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9',
      boxShadow: '0 1px 0 rgba(0,0,45,0.02), 0 4px 14px rgba(6,171,235,0.04)',
      overflow: 'hidden',
    },
  },
    // Panel header
    e('div', {
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '16px 18px 0', borderBottom: '0',
      },
    },
      e('div', {},
        e('div', { style: { fontSize: 16, fontWeight: 800, color: '#00002D', letterSpacing: '-0.005em' } }, 'Personalized Upgrade Risk'),
        e('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 2 } }, 'Mount Sinai logistic regression · N=1,213 · AUC 0.65')
      ),
      upgradeRisk.available && e('span', {
        style: {
          fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 999,
          background: bc.bg, color: bc.accent, border: `1px solid ${bc.border}`,
        },
      }, `${upgradeRisk.pct}% — ${upgradeRisk.band}`)
    ),

    // Tab bar
    e('div', {
      style: {
        display: 'flex', borderBottom: '1px solid #f1f5f9',
        padding: '0 18px', marginTop: 12,
      },
    },
      ...tabLabels.map((label, i) =>
        e('button', {
          key: i, type: 'button',
          onClick: () => setActiveTab(i),
          style: {
            flex: 1, height: 38, border: 'none', background: 'transparent',
            fontSize: 12, fontWeight: activeTab === i ? 700 : 500,
            color: activeTab === i ? '#06ABEB' : '#94a3b8',
            borderBottom: `2px solid ${activeTab === i ? '#06ABEB' : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            padding: '0 4px',
          },
        }, label)
      )
    ),

    // Tab content
    activeTab === 0 ? renderRiskCalculator() :
    activeTab === 1 ? renderClinicalImpact() :
    renderPatientReport()
  )
}

const SHORT_TIER_LABEL = {
  standard_as:          'AS Eligible',
  enhanced_as:          'Enhanced AS',
  intensive_as:         'Intensive AS',
  treatment_discussion: 'SDM Required',
  treatment_required:   'Treatment Required',
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
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [showEvidenceModal,   setShowEvidenceModal]   = useState(false)

  // Tone pill colors for dark backgrounds
  const tonePill =
    combinedColor === 'green'  ? { bg: 'rgba(16,185,129,0.18)',  color: '#6ee7b7',  border: '1px solid rgba(16,185,129,0.4)' } :
    combinedColor === 'yellow' ? { bg: 'rgba(245,158,11,0.18)',  color: '#fcd34d',  border: '1px solid rgba(245,158,11,0.4)' } :
    combinedColor === 'amber'  ? { bg: 'rgba(245,158,11,0.18)',  color: '#fcd34d',  border: '1px solid rgba(245,158,11,0.4)' } :
                                 { bg: 'rgba(244,63,94,0.18)',   color: '#fda4af',  border: '1px solid rgba(244,63,94,0.4)'  }

  return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },

    // ── 1. Dark Hero Banner ──────────────────────────────────────────────
    e('div', {
      style: {
        background: 'linear-gradient(165deg, #00002D 0%, #212070 55%, #06ABEB 145%)',
        color: '#fff',
        borderRadius: 22,
        padding: '24px 22px 26px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 30px rgba(0,0,45,0.3)',
      },
    },
      // Decorative radial blob
      e('div', {
        style: {
          position: 'absolute', top: -80, right: -80,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,41,141,0.28), transparent 70%)',
          pointerEvents: 'none',
        },
      }),
      e('div', { style: { position: 'relative' } },
        // Eyebrow row
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
          e('div', { style: { fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#06ABEB', textTransform: 'uppercase' } }, 'AI Surveillance Tool'),
          e('span', { style: { color: 'rgba(255,255,255,0.3)' } }, '·'),
          e('span', {
            style: {
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
              background: tonePill.bg, color: tonePill.color, border: tonePill.border,
              letterSpacing: '0.04em',
            },
          }, SHORT_TIER_LABEL[combinedTierKey] || combinedTierKey),
          isEpsa && e('span', {
            style: {
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(219,234,254,0.15)', color: '#93c5fd',
              border: '1px solid rgba(147,197,253,0.3)',
            },
          }, 'Via ePSA')
        ),
        // Big tier label
        e('h2', {
          style: {
            fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, color: '#fff',
            margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.08,
          },
        }, COMBINED_TIER_LABELS[combinedTierKey] || combinedTierKey),
        // Recommendation text
        e('p', {
          style: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 1.55, margin: '0 0 14px', maxWidth: 560 },
        }, combinedRecommendation),
        // Upgrade risk / PSAD stat strip
        (upgradeRisk?.available
          ? e('div', {
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                padding: '7px 12px', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.12)',
              },
            },
              e('span', { style: { fontWeight: 800 } }, 'Personalized upgrade risk:'),
              e('span', { style: { color: 'rgba(255,255,255,0.3)' } }, '·'),
              e('span', { style: { fontWeight: 600 } },
                upgradeRisk.hasCi
                  ? `${upgradeRisk.pct}% (95% CI ${upgradeRisk.ciLo}%–${upgradeRisk.ciHi}%)`
                  : `${upgradeRisk.pct}%`
              )
            )
          : psadNum != null && e('div', {
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                padding: '7px 12px', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.12)',
              },
            },
              e('span', { style: { fontWeight: 800 } }, `PSAD ${psadNum.toFixed(3)}`),
              e('span', { style: { color: 'rgba(255,255,255,0.3)' } }, '·'),
              e('span', { style: { fontWeight: 400 } },
                psadNum < MV.basic_psad.youden_cutoff
                  ? `Below threshold (${MV.basic_psad.youden_cutoff}) · NPV 94.4% in N=1,213 cohort`
                  : `Above threshold (${MV.basic_psad.youden_cutoff}) · NPV 94.4% in N=1,213 cohort`
              )
            )
        )
      )
    ),

    // ── 2. Clinical Summary (sub-models + entered data) ─────────────────
    e(ClinicalSummaryPanel, {
      inputs, psad: psadNum, combinedTierKey,
      asScore, asTierKey,
      genomicAssessed, genomicRiskTier, genomicScore,
      psmaAssessed, psmaFinding, psmaScore,
      monitoringTier,
    }),

    // ── 3. Personalized Upgrade Risk Panel ──────────────────────────────
    e(UpgradeRiskPanel, { upgradeRisk, inputs }),

    // ── 4. Key Drivers ───────────────────────────────────────────────────
    e(KeyDrivers, {
      asFactors,
      genomicFactors: genomicFactors || [],
      genomicAssessed,
      psmaFactors: psmaFactors || [],
      psmaAssessed,
    }),

    // ── 5. Monitoring Schedule ───────────────────────────────────────────
    e(MonitoringSchedule, {
      monitoringSchedule,
      monitoringLabel,
      monitoringTier,
      features,
      featureCount,
    }),

    // ── 5. Cohort Context Chips ──────────────────────────────────────────
    e('div', {
      style: { background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9', boxShadow: '0 1px 0 rgba(0,0,45,0.02), 0 4px 14px rgba(6,171,235,0.04)', padding: '16px 18px' },
    },
      e('p', { style: { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 12, margin: '0 0 12px' } }, 'Cohort Context'),
      e(CohortChips, { cohortContext, inputs, psad: psadNum })
    ),

    // ── 6. Actions ───────────────────────────────────────────────────────
    e('div', { className: 'no-print', style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
      e('button', {
        onClick: onBack,
        style: {
          flex: '1 1 160px', height: 48, borderRadius: 12,
          border: '1.5px solid #e2e8f0', background: '#fff',
          fontSize: 13, fontWeight: 700, color: '#334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
        },
      },
        e('svg', { width: 15, height: 15, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
        ),
        'Back'
      ),
      e('button', {
        onClick: () => window.print(),
        style: {
          flex: '2 1 200px', height: 48, borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #00002D 0%, #212070 100%)',
          fontSize: 13, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,45,0.25)',
          transition: 'all 0.15s', fontFamily: 'inherit',
        },
      },
        e('svg', { width: 15, height: 15, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' })
        ),
        'Print Report'
      )
    ),

    // ── 7. Detail buttons ────────────────────────────────────────────────
    e('div', { className: 'no-print', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      // Evidence & Full Detail
      e('button', {
        type: 'button',
        onClick: () => setShowEvidenceModal(true),
        style: {
          flex: '1 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '10px 16px', borderRadius: 12,
          background: '#fff', border: '1.5px solid #e2e8f0',
          fontSize: 12, fontWeight: 700, color: '#334155',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 1px 4px rgba(0,0,45,0.06)',
        },
      },
        e('svg', { width: 14, height: 14, fill: 'none', viewBox: '0 0 24 24', stroke: '#06ABEB', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
        ),
        'Evidence & Full Detail'
      ),
      // Model Validation & Transparency
      e('button', {
        type: 'button',
        onClick: () => setShowValidationModal(true),
        style: {
          flex: '1 1 180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '10px 16px', borderRadius: 12,
          background: '#fff', border: '1.5px solid #e2e8f0',
          fontSize: 12, fontWeight: 700, color: '#334155',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 1px 4px rgba(0,0,45,0.06)',
        },
      },
        e('svg', { width: 14, height: 14, fill: 'none', viewBox: '0 0 24 24', stroke: '#DC298D', strokeWidth: 2 },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
        ),
        'Model Validation & Transparency'
      )
    ),

    // ── Modals ───────────────────────────────────────────────────────────
    showEvidenceModal && e(EvidenceDetailModal, {
      onClose: () => setShowEvidenceModal(false),
      asFactors, asScore, asTierKey,
      genomicAssessed, genomicRiskTier, genomicScore, genomicFactors,
      psmaAssessed, psmaFinding, psmaScore, psmaFactors,
      monitoringSchedule, monitoringLabel, monitoringTier, features, featureCount,
      cohortContext, combinedTierKey,
    }),
    showValidationModal && e(ModelValidationModal, {
      onClose: () => setShowValidationModal(false),
      isEpsa,
      epsaContext: inputs.epsaContext || null,
    })
  )
}

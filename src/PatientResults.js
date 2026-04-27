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

// Validation badge definitions for each sub-model
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

// Tier upgrade rate data with selection-effect context
const TIER_COHORT_DATA = {
  standard_as:   { rate: 0.292, n: 72,  source: 'N=218 internal validation sub-cohort', selectionNote: true },
  enhanced_as:   { rate: 0.194, n: 109, source: 'N=218 internal validation sub-cohort', selectionNote: true },
  intensive_as:  { rate: 0.121, n: 33,  source: 'N=218 internal validation sub-cohort', selectionNote: true },
  treatment_discussion: null,
  treatment_required:   null,
}

function formatEpsaTier(tier) {
  if (tier == null || tier === '') return null
  return String(tier)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Small components ─────────────────────────────────────────────────────────
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

function CollapsibleSection({ title, badge, badgeStyle, validationBadgeType, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)
  return e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
    e('button', {
      type: 'button', onClick: () => setOpen(v => !v),
      className: 'w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sinai-cerulean/30',
    },
      e('div', { className: 'flex flex-col gap-1 flex-1 min-w-0' },
        e('div', { className: 'flex items-center gap-2.5 flex-wrap' },
          e('span', { className: 'font-semibold text-gray-900 text-sm' }, title),
          badge && e('span', {
            className: 'text-xs font-semibold px-2 py-0.5 rounded-full',
            style: badgeStyle || { background: '#f3f4f6', color: '#374151' },
          }, badge)
        ),
        validationBadgeType && e('div', { className: 'flex' },
          e(ValidationBadge, { type: validationBadgeType })
        )
      ),
      e('svg', {
        className: `w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`,
        fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
      },
        e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
      )
    ),
    open && e('div', { className: 'px-4 pb-4 border-t border-gray-50' }, children)
  )
}

function ValidationBadge({ type }) {
  const badge = VALIDATION_BADGES[type]
  if (!badge) return null
  return e('span', {
    className: 'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
    style: badge.style,
  }, badge.label)
}

function TierCohortCallout({ tierKey }) {
  const data = TIER_COHORT_DATA[tierKey]
  if (!data) return null
  return e('div', {
    className: 'mt-3 rounded-xl px-3 py-2.5',
    style: { background: '#fafafa', border: '1px solid #e5e7eb' },
  },
    e('p', { className: 'text-xs font-semibold text-slate-600 mb-1' },
      `Observed upgrade rate in this tier: ${(data.rate * 100).toFixed(1)}% (${data.n} patients, ${data.source})`
    ),
    e('p', { className: 'text-xs text-slate-500 leading-snug' },
      'This figure reflects who was enrolled in this tier, not a prediction for this patient. ',
      e('span', { className: 'font-medium text-amber-700' },
        'Note: higher tiers show lower observed upgrade rates in this cohort'
      ),
      ' — this is the expected selection effect: the highest-risk patients are appropriately directed to treatment rather than AS enrollment. Standard tier patients are not lower-risk; they simply have fewer guideline-defined features.'
    )
  )
}

function PsadNpvCallout({ psad, cohortContext }) {
  if (!psad || !cohortContext) return null
  const MV = MODEL_VALIDATION
  const youdenCutoff = MV.basic_psad.youden_cutoff
  const npv = MV.basic_psad.npv_at_youden
  const psadNum = Number(psad)

  if (psadNum < youdenCutoff) {
    return e('div', {
      className: 'mt-2 rounded-xl px-3 py-2.5 flex items-start gap-2',
      style: { background: '#f0fdf4', border: '1px solid #bbf7d0' },
    },
      e('svg', { className: 'w-4 h-4 flex-shrink-0 mt-0.5', style: { color: '#16a34a' }, fill: 'currentColor', viewBox: '0 0 20 20' },
        e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' })
      ),
      e('div', {},
        e('p', { className: 'text-xs font-bold text-green-800' },
          `PSAD ${psadNum.toFixed(3)} — below Youden threshold (${youdenCutoff})`
        ),
        e('p', { className: 'text-xs text-green-700 mt-0.5 leading-snug' },
          `NPV ${(npv * 100).toFixed(0)}% in Mount Sinai AS cohort (N=${MV.basic_psad.n_with_psad}) — fewer than 1 in 20 patients below this threshold upgraded on repeat biopsy. This is the tool's strongest validated negative predictor.`
        )
      )
    )
  } else {
    return e('div', {
      className: 'mt-2 rounded-xl px-3 py-2.5 flex items-start gap-2',
      style: { background: '#fef9c3', border: '1px solid #fde68a' },
    },
      e('svg', { className: 'w-4 h-4 flex-shrink-0 mt-0.5', style: { color: '#ca8a04' }, fill: 'currentColor', viewBox: '0 0 20 20' },
        e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' })
      ),
      e('div', {},
        e('p', { className: 'text-xs font-bold text-amber-800' },
          `PSAD ${psadNum.toFixed(3)} — above Youden threshold (${youdenCutoff})`
        ),
        e('p', { className: 'text-xs text-amber-700 mt-0.5 leading-snug' },
          `Sensitivity ${(MV.basic_psad.sensitivity_at_youden * 100).toFixed(0)}% at this threshold — ${MV.basic_psad.tp_at_youden} of ${MV.basic_psad.n_upgraded_with_psad} upgraders in the cohort were above this level. AUC ${MV.basic_psad.auc_internal} (internal) / ${MV.basic_psad.auc_published} (Kadeer 2025).`
        )
      )
    )
  }
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

function SummaryCard({ label, value, subvalue, highlight }) {
  return e('div', { className: `bg-white rounded-xl border shadow-sm p-3 ${highlight ? 'border-red-200' : 'border-gray-100'}` },
    e('div', { className: 'text-xs text-gray-400 mb-0.5 font-medium' }, label),
    e('div', { className: `text-base font-bold leading-tight ${highlight ? 'text-red-600' : 'text-gray-900'}` }, value),
    subvalue && e('div', { className: 'text-xs text-gray-400 mt-0.5' }, subvalue)
  )
}

// ─── Shared StatChip ──────────────────────────────────────────────────────────
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

// ─── Outcomes Prediction Panel ────────────────────────────────────────────────
function OutcomesPredictionPanel({ outcomesData }) {
  const [open, setOpen] = useState(false)
  if (!outcomesData) return null

  const { interventionRisk, upgradeProbability, biopsyBurden, pendingData } = outcomesData
  const displayRate = upgradeProbability.display_rate
  const upgradeColor = displayRate < 15 ? 'green' : displayRate < 28 ? 'amber' : 'red'

  // PSAD tier table rows
  const psadTierRows = [
    { label: '< 0.065',   rate: '11.2%', n: 170, key: 'very_low' },
    { label: '0.065–0.15',rate: '23.9%', n: 381, key: 'intermediate' },
    { label: '0.15–0.177',rate: '27.3%', n: 55,  key: 'nccn_zone' },
    { label: '> 0.177',   rate: '34.7%', n: 98,  key: 'high' },
  ]
  const activeTierKey = upgradeProbability.using_psad_tier
    ? (upgradeProbability.psad_tier_label?.startsWith('PSAD <') ? 'very_low'
      : upgradeProbability.psad_tier_label?.startsWith('PSAD 0.065') ? 'intermediate'
      : upgradeProbability.psad_tier_label?.startsWith('PSAD 0.15') ? 'nccn_zone'
      : 'high')
    : null

  return e('div', {
    className: 'rounded-2xl overflow-hidden shadow-sm',
    style: { border: '1px solid #d1d5db', background: '#f8fafc' },
  },

    // Header
    e('div', {
      className: 'px-4 py-3.5 flex items-center justify-between',
      style: { background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' },
    },
      e('div', { className: 'flex items-center gap-2.5' },
        e('div', {
          className: 'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
          style: { background: '#212070' },
        },
          e('svg', { className: 'w-4 h-4 text-white', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
          )
        ),
        e('div', {},
          e('p', { className: 'text-sm font-bold text-slate-800' }, 'Outcomes Prediction'),
          e('p', { className: 'text-xs text-slate-500' }, `Cohort validated · N=1,213 Mount Sinai Tewari AS Program`)
        )
      ),
      e('div', { className: 'flex items-center gap-2' },
        e('span', {
          className: 'text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:block',
          style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
        }, 'Cohort validated · N=1,213'),
      )
    ),

    // Always-visible stat chips
    e('div', { className: 'px-4 py-4' },
      e('p', { className: 'text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2.5' },
        upgradeProbability.using_psad_tier
          ? `Upgrade probability based on ${upgradeProbability.psad_tier_label}`
          : `Upgrade probability based on GG${Math.round(upgradeProbability.by_ggg ?? 0) === upgradeProbability.by_ggg ? '' : ''}${upgradeProbability.by_ggg != null ? ' rate' : ''}`
      ),
      e('div', { className: 'flex flex-wrap gap-2.5 mb-4' },
        e(StatChip, {
          label: 'P(GG Upgrade)',
          value: `${displayRate != null ? displayRate.toFixed(1) : '—'}%`,
          sub: upgradeProbability.using_psad_tier ? 'PSAD tier' : 'GGG rate',
          colorScheme: upgradeColor,
        }),
        e(StatChip, {
          label: 'Clinical Exit',
          value: `${interventionRisk.clinical_pct.toFixed(1)}%`,
          sub: 'left due to upgrade',
          colorScheme: 'amber',
        }),
        e(StatChip, {
          label: 'Pref/Anxiety Exit',
          value: `${interventionRisk.anxiety_pct.toFixed(1)}%`,
          sub: 'left without upgrade',
          colorScheme: 'default',
        }),
        e(StatChip, {
          label: 'Currently in AS',
          value: '59.7%',
          sub: '724 / 1,213',
          colorScheme: 'green',
        })
      ),

      // Anxiety/clinical exit framing — always visible
      e('div', {
        className: 'rounded-xl px-3.5 py-3 mb-3',
        style: { background: '#fefce8', border: '1px solid #fde68a' },
      },
        e('p', { className: 'text-xs font-bold text-amber-800 mb-1' }, '⚠ Clinical exit vs anxiety/preference exit'),
        e('p', { className: 'text-xs text-amber-700 leading-relaxed' },
          `In our N=1,213 cohort, 47.4% of patients who left AS did so WITHOUT upgrading — patient preference or anxiety, not disease progression. Of ${interventionRisk.total_pct.toFixed(0)}% who left AS: ${interventionRisk.clinical_pct.toFixed(0)}% left because the cancer grew (clinical upgrade); ${interventionRisk.anxiety_pct.toFixed(0)}% left by personal choice. These are two very different clinical situations that must be clearly communicated in shared decision-making.`
        )
      ),

      // Expand button
      e('button', {
        type: 'button',
        onClick: () => setOpen(v => !v),
        className: 'w-full text-left text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-700 transition-colors',
      },
        e('svg', {
          className: `w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`,
          fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2.5,
        },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
        ),
        open ? 'Hide full cohort breakdown' : 'Show full cohort breakdown'
      )
    ),

    // Expanded detail
    open && e('div', { className: 'px-4 pb-4 space-y-3 border-t border-slate-100 pt-3' },

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
              style: {
                gridTemplateColumns: '1fr 80px 60px',
                background: row.key === activeTierKey ? '#eff6ff' : 'transparent',
              },
            },
              e('span', { className: 'text-xs text-slate-700 flex items-center gap-1.5' },
                row.key === activeTierKey && e('span', {
                  className: 'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
                  style: { background: '#2563eb' },
                }),
                row.label,
                row.key === activeTierKey && e('span', {
                  className: 'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                  style: { background: '#dbeafe', color: '#1d4ed8' },
                }, 'this patient')
              ),
              e('span', { className: 'text-xs font-semibold text-center', style: { color: row.key === activeTierKey ? '#2563eb' : '#374151' } }, row.rate),
              e('span', { className: 'text-xs text-slate-400 text-center' }, row.n),
            )
          )
        )
      ),

      // Age context (if <60)
      upgradeProbability.ageFlag && e('div', {
        className: 'rounded-xl px-3.5 py-3',
        style: { background: '#fef2f2', border: '1px solid #fecaca' },
      },
        e('p', { className: 'text-xs font-bold text-red-800 mb-0.5' }, 'Age context'),
        e('p', { className: 'text-xs text-red-700 leading-relaxed' }, upgradeProbability.ageFlag.note)
      ),

      // Race context (if African American)
      upgradeProbability.raceFlag && e('div', {
        className: 'rounded-xl px-3.5 py-3',
        style: { background: '#fff7ed', border: '1px solid #fed7aa' },
      },
        e('p', { className: 'text-xs font-bold text-orange-800 mb-0.5' }, 'Racial disparity context'),
        e('p', { className: 'text-xs text-orange-700 leading-relaxed' }, upgradeProbability.raceFlag.note)
      ),

      // Biopsy burden
      e('div', {
        className: 'rounded-xl px-3.5 py-3',
        style: { background: '#f0f9ff', border: '1px solid #bae6fd' },
      },
        e('p', { className: 'text-xs font-bold text-sky-800 mb-1' }, 'Expected biopsy burden'),
        e('div', { className: 'flex gap-3 mb-1.5' },
          e(StatChip, { label: '5-year', value: `~${biopsyBurden.yr5_expected}`, sub: 'biopsies', colorScheme: 'blue' }),
          e(StatChip, { label: '10-year', value: `~${biopsyBurden.yr10_expected}`, sub: 'biopsies', colorScheme: 'blue' }),
        ),
        e('p', { className: 'text-[10px] text-sky-600 leading-relaxed' }, biopsyBurden.note),
        e('p', { className: 'text-[10px] text-sky-400 mt-0.5 italic' }, biopsyBurden.basis)
      ),

      // Pending data placeholders
      e('div', {
        className: 'rounded-xl px-3.5 py-3',
        style: { background: '#f9fafb', border: '1px solid #e5e7eb' },
      },
        e('p', { className: 'text-xs font-bold text-slate-600 mb-2' }, 'Pending cohort data'),
        e('div', { className: 'space-y-2' },
          e('div', { className: 'flex items-start gap-2' },
            e('span', { className: 'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5', style: { background: '#fef9c3', color: '#713f12' } }, 'Pending'),
            e('p', { className: 'text-xs text-slate-500 leading-snug' }, pendingData.timeToUpgrade.note)
          ),
          e('div', { className: 'flex items-start gap-2' },
            e('span', { className: 'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5', style: { background: '#fef9c3', color: '#713f12' } }, 'Pending'),
            e('p', { className: 'text-xs text-slate-500 leading-snug' }, 'Adverse pathology at surgery (ECE, SVI, LN+) — requires RALP cohort pathology data.')
          ),
        )
      )
    )
  )
}

// ─── Model Validation Card ────────────────────────────────────────────────────
function ModelValidationCard() {
  const [open, setOpen] = useState(false)
  const MV = MODEL_VALIDATION

  // Stat chip (inline — uses module-level StatChip)
  function StatChip({ label, value, sub, highlight }) {
    return e('div', {
      className: 'flex flex-col items-center justify-center rounded-xl px-3 py-2.5 min-w-[80px]',
      style: { background: highlight ? '#e0f2fe' : '#f1f5f9', border: `1px solid ${highlight ? '#7dd3fc' : '#e2e8f0'}` },
    },
      e('span', { className: 'text-lg font-extrabold', style: { color: highlight ? '#0369a1' : '#1e293b' } }, value),
      e('span', { className: 'text-[10px] font-semibold uppercase tracking-wide text-center leading-tight', style: { color: highlight ? '#0369a1' : '#64748b' } }, label),
      sub && e('span', { className: 'text-[10px] text-slate-400 mt-0.5' }, sub)
    )
  }

  // Sub-model row
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

  return e('div', {
    className: 'rounded-2xl overflow-hidden shadow-sm',
    style: { border: '1px solid #e2e8f0', background: '#f8fafc' },
  },
    // Header
    e('button', {
      type: 'button',
      onClick: () => setOpen(v => !v),
      className: 'w-full flex items-center justify-between px-4 py-3.5 text-left',
      style: { background: '#f1f5f9' },
    },
      e('div', { className: 'flex items-center gap-2.5' },
        e('div', {
          className: 'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
          style: { background: '#212070' },
        },
          e('svg', { className: 'w-4 h-4 text-white', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
          )
        ),
        e('div', {},
          e('p', { className: 'text-sm font-bold text-slate-800' }, 'Model Validation'),
          e('p', { className: 'text-xs text-slate-500' }, `N=${MV.cohort.n} · ${MV.cohort.validation_type}`)
        )
      ),
      e('div', { className: 'flex items-center gap-2' },
        e('span', {
          className: 'text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:block',
          style: { background: '#e2e8f0', color: '#475569' },
        }, 'Internal validation'),
        e('svg', {
          className: `w-5 h-5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`,
          fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
        },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
        )
      )
    ),

    // Collapsed summary chips — always visible without opening
    !open && e('div', { className: 'px-4 py-3 flex flex-wrap gap-2.5 items-center' },
      e(StatChip, { label: 'Cohort N', value: String(MV.cohort.n), highlight: true }),
      e(StatChip, { label: 'Upgraded', value: String(MV.cohort.n_upgraded), sub: `${(MV.cohort.upgrade_rate * 100).toFixed(0)}% rate` }),
      e(StatChip, { label: 'PSAD AUC', value: MV.basic_psad.auc_internal.toFixed(3), highlight: true }),
      e(StatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_youden * 100).toFixed(0)}%`, sub: `NPV ${(MV.basic_psad.npv_at_youden * 100).toFixed(0)}%` }),
      e(StatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_youden * 100).toFixed(0)}%`, sub: `PPV ${(MV.basic_psad.ppv_at_youden * 100).toFixed(0)}%` }),
      e('p', { className: 'w-full text-xs text-slate-400 mt-1' }, 'Tap for full sub-model validation detail')
    ),

    // Expanded detail
    open && e('div', { className: 'px-4 pb-4' },

      // Cohort overview
      e('div', { className: 'mt-3 mb-3 rounded-xl p-3', style: { background: '#e0f2fe', border: '1px solid #bae6fd' } },
        e('p', { className: 'text-xs font-bold text-sky-800 mb-1' }, MV.cohort.name),
        e('div', { className: 'flex flex-wrap gap-2 mt-2' },
          e(StatChip, { label: 'Total N', value: String(MV.cohort.n), highlight: true }),
          e(StatChip, { label: 'Upgraded', value: String(MV.cohort.n_upgraded) }),
          e(StatChip, { label: 'Overall Rate', value: `${(MV.cohort.upgrade_rate * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'PSAD AUC', value: MV.basic_psad.auc_internal.toFixed(3), highlight: true }),
        ),
        e('p', { className: 'text-xs text-sky-700 mt-2 leading-snug' }, MV.cohort.follow_up),
        e('p', { className: 'text-[10px] text-sky-500 mt-0.5' }, MV.cohort.reference)
      ),

      // PSAD performance detail — full breakdown
      e('div', { className: 'mb-3 rounded-xl p-3', style: { background: '#f0fdf4', border: '1px solid #bbf7d0' } },
        e('p', { className: 'text-xs font-bold text-green-800 mb-1' }, 'PSAD — Primary Discriminating Biomarker'),
        e('p', { className: 'text-[10px] text-green-600 mb-2' },
          `N=${MV.basic_psad.n_with_psad} (PSAD available) · ${MV.basic_psad.n_upgraded_with_psad} upgraded · AUC PSA alone ${MV.basic_psad.auc_psa_alone} · ΔAUC +${MV.basic_psad.delta_auc.toFixed(3)}`
        ),

        // AUC comparison
        e('div', { className: 'flex flex-wrap gap-2 mb-3' },
          e(StatChip, { label: 'AUC (internal)', value: MV.basic_psad.auc_internal.toFixed(3), highlight: true }),
          e(StatChip, { label: 'AUC (Kadeer 2025)', value: MV.basic_psad.auc_published.toFixed(3) }),
          e(StatChip, { label: 'PSA alone AUC', value: MV.basic_psad.auc_psa_alone.toFixed(3) }),
        ),

        // Youden J optimal cutoff
        e('p', { className: 'text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1' },
          `Youden J Optimal Cutoff: ${MV.basic_psad.youden_cutoff} ng/mL²`
        ),
        e('div', { className: 'flex flex-wrap gap-2 mb-2' },
          e(StatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_youden * 100).toFixed(0)}%`, highlight: true }),
          e(StatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_youden * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'PPV', value: `${(MV.basic_psad.ppv_at_youden * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'NPV', value: `${(MV.basic_psad.npv_at_youden * 100).toFixed(0)}%`, highlight: true }),
        ),
        e('p', { className: 'text-[10px] text-green-500 mb-2' },
          `TP=${MV.basic_psad.tp_at_youden} · FP=${MV.basic_psad.fp_at_youden} · FN=${MV.basic_psad.fn_at_youden} · TN=${MV.basic_psad.tn_at_youden}`
        ),

        // NCCN / Kadeer published cutoffs
        e('p', { className: 'text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1' },
          `NCCN Cutoff ${MV.basic_psad.nccn_cutoff} (published)`
        ),
        e('div', { className: 'flex flex-wrap gap-2 mb-2' },
          e(StatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_nccn * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_nccn * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'PPV', value: `${(MV.basic_psad.ppv_at_nccn * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'NPV', value: `${(MV.basic_psad.npv_at_nccn * 100).toFixed(0)}%` }),
        ),

        e('p', { className: 'text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1' },
          `Kadeer 2025 Cutoff ${MV.basic_psad.kadeer_cutoff}`
        ),
        e('div', { className: 'flex flex-wrap gap-2 mb-2' },
          e(StatChip, { label: 'Sensitivity', value: `${(MV.basic_psad.sensitivity_at_kadeer * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'Specificity', value: `${(MV.basic_psad.specificity_at_kadeer * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'PPV', value: `${(MV.basic_psad.ppv_at_kadeer * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'NPV', value: `${(MV.basic_psad.npv_at_kadeer * 100).toFixed(0)}%` }),
        ),

        e('p', { className: 'text-xs text-green-700 mt-1 leading-snug' }, MV.basic_psad.note),
        e('p', { className: 'text-[10px] text-green-500 mt-0.5' }, MV.basic_psad.source)
      ),

      // Supporting variables table
      e('div', { className: 'mb-3 rounded-xl overflow-hidden', style: { border: '1px solid #e2e8f0' } },
        e('div', { className: 'px-3 py-2', style: { background: '#f1f5f9' } },
          e('p', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wide' }, 'Supporting Variables (N=1,213 Cohort)')
        ),
        e('div', { className: 'px-3 divide-y divide-slate-50' },
          // Header row
          e('div', { className: 'grid py-1.5', style: { gridTemplateColumns: '1fr 60px 60px 60px 60px' } },
            e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Variable'),
            e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase text-center' }, 'Sens'),
            e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase text-center' }, 'Spec'),
            e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase text-center' }, 'PPV'),
            e('span', { className: 'text-[10px] font-bold text-slate-500 uppercase text-center' }, 'NPV'),
          ),
          // PI-RADS row
          e('div', { className: 'grid py-2', style: { gridTemplateColumns: '1fr 60px 60px 60px 60px' } },
            e('span', { className: 'text-xs text-slate-700' }, 'PI-RADS ≥4', e('span', { className: 'text-[10px] text-slate-400 ml-1' }, `N=${MV.supporting_variables.pirads_ge4.n}`)),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.pirads_ge4.sensitivity * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.pirads_ge4.specificity * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.pirads_ge4.ppv * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.pirads_ge4.npv * 100).toFixed(0)}%`),
          ),
          // Abutment row
          e('div', { className: 'grid py-2', style: { gridTemplateColumns: '1fr 60px 60px 60px 60px' } },
            e('span', { className: 'text-xs text-slate-700' }, 'NVB Abutment', e('span', { className: 'text-[10px] text-slate-400 ml-1' }, `N=${MV.supporting_variables.abutment.n}`)),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.abutment.sensitivity * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.abutment.specificity * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.abutment.ppv * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.abutment.npv * 100).toFixed(0)}%`),
          ),
          // Max core row
          e('div', { className: 'grid py-2', style: { gridTemplateColumns: '1fr 60px 60px 60px 60px' } },
            e('span', { className: 'text-xs text-slate-700' }, 'Max Core >50%', e('span', { className: 'text-[10px] text-slate-400 ml-1' }, `N=${MV.supporting_variables.max_core_gt50.n}`)),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.max_core_gt50.sensitivity * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.max_core_gt50.specificity * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.max_core_gt50.ppv * 100).toFixed(0)}%`),
            e('span', { className: 'text-xs font-semibold text-center text-slate-700' }, `${(MV.supporting_variables.max_core_gt50.npv * 100).toFixed(0)}%`),
          ),
        )
      ),

      // Composite tier performance
      e('div', { className: 'mb-3 rounded-xl p-3', style: { background: '#faf5ff', border: '1px solid #e9d5ff' } },
        e('p', { className: 'text-xs font-bold text-purple-800 mb-1' }, 'Composite Engine — Tier Performance'),
        e('p', { className: 'text-[10px] text-purple-600 mb-2' }, MV.composite.note),
        e('div', { className: 'flex flex-wrap gap-2 mb-2' },
          e(StatChip, { label: 'Sens ≥Enhanced', value: `${(MV.composite.threshold_enhanced.sensitivity * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'Spec ≥Enhanced', value: `${(MV.composite.threshold_enhanced.specificity * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'PPV ≥Enhanced', value: `${(MV.composite.threshold_enhanced.ppv * 100).toFixed(0)}%` }),
          e(StatChip, { label: 'NPV ≥Enhanced', value: `${(MV.composite.threshold_enhanced.npv * 100).toFixed(0)}%` }),
        ),
        e('p', { className: 'text-[10px] text-purple-500' }, MV.composite.threshold_enhanced.note)
      ),

      // Multi-variable composite
      e('div', { className: 'mb-3 rounded-xl p-3', style: { background: '#f0f9ff', border: '1px solid #bae6fd' } },
        e('div', { className: 'flex items-start justify-between gap-2 mb-1' },
          e('p', { className: 'text-xs font-bold text-sky-800' }, 'Multi-Variable Composite: PSAD + PI-RADS + GGG'),
          e('span', { className: 'text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0', style: { background: '#fef9c3', color: '#713f12' } }, 'Estimated')
        ),
        e('div', { className: 'flex flex-wrap gap-2 mb-2' },
          e(StatChip, { label: 'PSAD AUC', value: MV.basic_psad.auc_internal.toFixed(3), highlight: true }),
          e(StatChip, { label: 'Composite AUC', value: MV.multivar_composite.auc_estimated_range, sub: 'estimated' }),
          e(StatChip, { label: 'ΔAUC', value: MV.multivar_composite.delta_over_psad_alone, sub: 'estimated' }),
          e(StatChip, { label: 'N complete', value: String(MV.multivar_composite.n_complete_cases) }),
        ),
        e('p', { className: 'text-xs text-sky-700 leading-snug' }, MV.multivar_composite.clinical_implication),
        e('p', { className: 'text-[10px] text-sky-500 mt-1 italic' }, MV.multivar_composite.status)
      ),

      // Sub-model rows
      e('div', { className: 'rounded-xl overflow-hidden mb-3', style: { border: '1px solid #e2e8f0' } },
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
      e('div', { className: 'mt-3 rounded-xl px-3 py-2.5', style: { background: '#fefce8', border: '1px solid #fde68a' } },
        e('p', { className: 'text-xs font-semibold text-amber-800 mb-0.5' }, '⚠ Validation Status'),
        e('p', { className: 'text-xs text-amber-700 leading-snug' }, MV.composite.validation_status),
        e('p', { className: 'text-xs text-amber-600 mt-1 leading-snug' }, MV.composite.calibration)
      )
    )
  )
}

// ─── Cohort context section (Layer 2) ────────────────────────────────────────
function CohortContextSection({ cohortContext }) {
  const [open, setOpen] = useState(false)
  const C = cohortContext
  if (!C || !C.cohortItems || C.cohortItems.length === 0) return null

  return e('div', { className: 'rounded-2xl overflow-hidden shadow-sm', style: { border: '1px solid #bfdbfe', background: '#f0f9ff' } },

    // Header — always visible
    e('button', {
      type: 'button',
      onClick: () => setOpen(v => !v),
      className: 'w-full flex items-center justify-between px-4 py-3.5 text-left',
      style: { background: '#e0f2fe' },
    },
      e('div', { className: 'flex items-center gap-2.5' },
        e('div', {
          className: 'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
          style: { background: '#06ABEB' },
        },
          e('svg', { className: 'w-4 h-4 text-white', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
          )
        ),
        e('div', {},
          e('p', { className: 'text-sm font-bold text-sky-900' }, 'Cohort Calibration'),
          e('p', { className: 'text-xs text-sky-700' }, `Mount Sinai Tewari AS Program · N=${C.cohortN} patients · Overall upgrade rate ${Math.round(C.cohortUpgradeRate * 100)}%`)
        )
      ),
      e('div', { className: 'flex items-center gap-2' },
        e('span', {
          className: 'text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:block',
          style: { background: '#bae6fd', color: '#0c4a6e' },
        }, 'Layer 2 — Real cohort data'),
        e('svg', {
          className: `w-5 h-5 text-sky-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`,
          fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
        },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
        )
      )
    ),

    // Collapsed summary — show a few key numbers without opening
    !open && e('div', { className: 'px-4 py-2.5 flex flex-wrap gap-3' },
      e('p', { className: 'text-xs text-sky-700 leading-relaxed' },
        'Real upgrade rates from our N=',
        e('strong', null, String(C.cohortN)),
        ' AS cohort are shown below each guideline tier. Tap to see per-variable calibration detail.'
      )
    ),

    // Expanded items
    open && e('div', { className: 'divide-y divide-sky-100' },
      ...C.cohortItems.map((item, idx) =>
        e('div', { key: idx, className: 'px-4 py-3' },
          e('div', { className: 'flex items-start gap-2' },
            e('div', {
              className: 'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5',
              style: { background: '#06ABEB' },
            }),
            e('div', { className: 'flex-1 min-w-0' },
              e('p', { className: 'text-xs font-semibold text-sky-800 mb-0.5' }, item.label),
              e('p', { className: 'text-sm text-sky-950 leading-snug' }, item.finding),
              item.note && e('p', { className: 'text-xs text-sky-600/80 mt-0.5 leading-snug italic' }, item.note)
            )
          )
        )
      ),
      e('div', { className: 'px-4 py-3 border-t border-sky-100' },
        e('p', { className: 'text-xs text-sky-600/70 leading-relaxed' },
          'Cohort calibration (Layer 2) provides real-world upgrade rate context from the Mount Sinai Tewari Active Surveillance Program. These figures do not modify the guideline-derived tier above. Some rates reflect selection effects — high-risk patients in certain subgroups often proceed directly to treatment rather than AS enrollment.'
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
    cohortContext, outcomesData,
  } = results

  const showEpsaCard = Boolean(
    inputs.epsaPreBiopsyTier ||
    inputs.epsaContext?.source === 'epsa'
  )

  const colors   = TIER_COLORS[combinedColor]   || TIER_COLORS.green
  const monStyle = MONITORING_STYLES[monitoringTier] || MONITORING_STYLES.standard

  // Genomic badge styling
  const genomicBadgeStyle =
    !genomicAssessed                       ? { background: '#f3f4f6', color: '#6b7280' }
    : genomicRiskTier === 'high'           ? { background: '#fee2e2', color: '#991b1b' }
    : genomicRiskTier === 'intermediate'   ? { background: '#fde68a', color: '#78350f' }
    :                                        { background: '#dcfce7', color: '#166534' }

  const psmaBadgeStyle =
    !psmaAssessed                                           ? { background: '#f3f4f6', color: '#6b7280' }
    : psmaFinding === 'metastatic' || psmaFinding === 'regional' ? { background: '#fee2e2', color: '#991b1b' }
    : psmaFinding === 'local'                               ? { background: '#fde68a', color: '#78350f' }
    :                                                          { background: '#dcfce7', color: '#166534' }

  return e('div', { className: 'space-y-4' },

    // ── Overall recommendation banner ───────────────────────────────────
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
            e('span', { className: 'text-[10px] text-slate-400 font-medium hidden sm:inline' }, '— Overall Recommendation'),
            e('span', {
              className: 'text-xs font-bold px-2 py-0.5 rounded-full',
              style: { background: colors.badge, color: colors.badgeText },
            }, COMBINED_TIER_LABELS[combinedTierKey] || combinedTierKey)
          ),
          e('p', { className: 'text-base font-bold leading-snug', style: { color: colors.text } }, combinedRecommendation),

          // PSAD NPV callout — most important validated signal
          psad != null && e(PsadNpvCallout, { psad, cohortContext }),

          // Tier upgrade rate with selection-effect framing
          e(TierCohortCallout, { tierKey: combinedTierKey })
        )
      )
    ),

    // ── Outcomes Prediction Panel ────────────────────────────────────────
    outcomesData && e(OutcomesPredictionPanel, { outcomesData }),

    // ── ePSA context (pre-biopsy handoff / JSON) ─────────────────────────
    showEpsaCard && e('div', {
      className: 'rounded-2xl border px-4 py-3 sm:p-4',
      style: { background: '#eff6ff', borderColor: '#93c5fd' },
    },
      e('div', { className: 'flex items-start gap-3' },
        e('svg', {
          className: 'w-5 h-5 flex-shrink-0 mt-0.5',
          style: { color: '#1d4ed8' },
          fill: 'currentColor',
          viewBox: '0 0 20 20',
        },
          e('path', { fillRule: 'evenodd', clipRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1zm1 8a1 1 0 10-2 0 1 1 0 002 0z' })
        ),
        e('div', { className: 'flex-1 min-w-0' },
          e('p', { className: 'text-xs font-bold text-blue-900 tracking-wide' }, 'ePSA-linked data'),
          inputs.epsaPreBiopsyTier && e('p', { className: 'text-sm text-blue-950 mt-1' },
            e('span', { className: 'text-blue-800/90 text-xs font-semibold' }, 'Pre-biopsy risk tier: '),
            formatEpsaTier(inputs.epsaPreBiopsyTier)
          ),
          cohortContext?.epsaAsEligiblePct != null && e('p', { className: 'text-xs text-blue-900/95 mt-2 leading-relaxed' },
            'In the Mount Sinai biopsied referral cohort (N=',
            String(cohortContext.cohortN ?? 218),
            '), about ',
            e('strong', null, `${Math.round(Number(cohortContext.epsaAsEligiblePct) * 100)}%`),
            ' of patients with this pre-biopsy ePSA tier had Grade Group 1–2 (AS-eligible) histology at biopsy',
            cohortContext.epsaAsEligibleNote
              ? e('span', null, ' (', cohortContext.epsaAsEligibleNote, ').')
              : '.'
          ),
          !inputs.epsaPreBiopsyTier && inputs.epsaContext?.source === 'epsa' &&
            e('p', { className: 'text-xs text-blue-800 mt-1.5 leading-relaxed' },
              'This assessment was tagged as ePSA-sourced, but no pre-biopsy tier was included — cohort context for ePSA is not shown.'
            )
        )
      )
    ),

    // ── Biopsy summary cards ────────────────────────────────────────────
    e('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
      e(SummaryCard, {
        label: 'Grade Group',
        value: `GG ${inputs.ggg}`,
        subvalue: ['','3+3=6','3+4=7','4+3=7','4+4=8','9–10'][inputs.ggg],
        highlight: inputs.ggg >= 3,
      }),
      e(SummaryCard, {
        label: 'Core ratio',
        value: `${inputs.positiveCores}/${inputs.totalCores}`,
        subvalue: `${Math.round(inputs.positiveCores / inputs.totalCores * 100)}% positive`,
        highlight: inputs.positiveCores / inputs.totalCores > 0.33,
      }),
      e(SummaryCard, {
        label: 'Max core',
        value: `${inputs.maxCorePercent}%`,
        subvalue: inputs.maxCorePercent > 50 ? 'Exceeds NCCN VLOW threshold' : 'Within NCCN VLOW threshold',
        highlight: inputs.maxCorePercent > 50,
      }),
      psad
        ? e(SummaryCard, {
            label: 'PSAD',
            value: `${psad.toFixed ? psad.toFixed(3) : psad}`,
            subvalue: Number(psad) > 0.177 ? 'Above Kadeer 2025 cutoff' : Number(psad) > 0.15 ? 'Above NCCN VLOW threshold' : 'Within NCCN very low risk',
            highlight: Number(psad) > 0.177,
          })
        : e(SummaryCard, {
            label: 'PSA',
            value: `${inputs.psa} ng/mL`,
            subvalue: inputs.psa >= 10 ? 'Above NCCN/PRIAS threshold' : 'Below NCCN/PRIAS threshold',
            highlight: inputs.psa >= 10,
          }),
      e(SummaryCard, {
        label: 'PI-RADS',
        value: `PI-RADS ${inputs.pirads}`,
        subvalue: ['','Very low','Low','Equivocal','High suspicion','Very high suspicion'][inputs.pirads],
        highlight: inputs.pirads >= 4,
      }),
      psad && e(SummaryCard, { label: 'PSA', value: `${inputs.psa} ng/mL`, subvalue: 'Serum PSA', highlight: inputs.psa >= 10 })
    ),

    // ── Sub-model 1: Basic & PSAD ───────────────────────────────────────
    e(CollapsibleSection, {
      title: 'Sub-model 1 — Basic & PSAD',
      badge: `Score: ${asScore > 0 ? '+' : ''}${asScore}  ·  ${asTierKey?.replace(/_/g,' ')}`,
      badgeStyle: { background: '#e0f2fe', color: '#075985' },
      validationBadgeType: 'cohort_validated',
      defaultOpen: true,
    },
      e('div', { className: 'pt-3 space-y-0' },
        ...asFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))
      ),
      e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
        e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
        'GGG: ISUP 2016 (Epstein et al., Eur Urol 2016). Core criteria: NCCN 2024 very low risk (Epstein 1994, Bastian 2004). PSAD thresholds: NCCN 2024 (0.15 ng/mL/cm³) and Kadeer et al. 2025 Youden optimal cutoff (0.177 ng/mL/cm³). PI-RADS v2.1: Turkbey et al., Eur Urol 2019. Point weights are ordinal proxies for the NCCN risk tier implied by each threshold; they are not regression-derived.'
      )
    ),

    // ── Sub-model 2: Genomic ────────────────────────────────────────────
    e(CollapsibleSection, {
      title: 'Sub-model 2 — Genomic Biomarkers',
      badge: genomicAssessed
        ? `${genomicRiskTier?.charAt(0).toUpperCase() + genomicRiskTier?.slice(1)} risk  ·  Score: ${genomicScore > 0 ? '+' : ''}${genomicScore}`
        : 'Not assessed',
      badgeStyle: genomicBadgeStyle,
      validationBadgeType: 'literature_threshold',
    },
      genomicAssessed
        ? e('div', {},
            e('div', { className: 'pt-3 space-y-0' }, ...genomicFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
            e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
              e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
              'Decipher thresholds (0.45/0.60): Spratt et al., Lancet Oncol 2014. Oncotype GPS thresholds (20/40): Klein et al., Eur Urol 2021. Prolaris CCP thresholds (1.5/2.1): Cooperberg et al., Cancer 2013. ConfirmMDx: Stewart et al., J Urol 2013.'
            )
          )
        : e(NotAssessed, { message: 'Genomic data not entered' })
    ),

    // ── Sub-model 3: PSMA PET/CT ────────────────────────────────────────
    e(CollapsibleSection, {
      title: 'Sub-model 3 — PSMA PET/CT',
      badge: psmaAssessed
        ? psmaFinding === 'metastatic' ? 'Metastatic — OVERRIDE'
        : psmaFinding === 'regional'   ? 'Regional nodes'
        : psmaFinding === 'local'      ? 'Local only'
        : 'Negative'
        : 'Not assessed',
      badgeStyle: psmaBadgeStyle,
      validationBadgeType: 'staging_classifier',
    },
      psmaAssessed
        ? e('div', {},
            e('div', { className: 'pt-3 space-y-0' }, ...psmaFactors.map((f, i) => e(FactorRow, { key: i, factor: f }))),
            e('div', { className: 'mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
              e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
              'Staging classification and management implications: EAU-EANM-ESTRO-ESUR-SIOG Guidelines on Prostate Cancer, 2024 edition. Metastatic PSMA finding constitutes a hard contraindication to active surveillance.'
            )
          )
        : e(NotAssessed, { message: 'PSMA PET/CT not performed or data not entered' })
    ),

    // ── Sub-model 4: Monitoring Protocol ────────────────────────────────
    e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
      // Header
      e('div', { className: 'p-4 border-b border-gray-50' },
        e('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
          e('span', { className: 'font-semibold text-gray-900 text-sm' }, 'Sub-model 4 — Monitoring Protocol'),
          e('span', {
            className: 'text-xs font-bold px-2.5 py-1 rounded-full',
            style: { background: monStyle.bg, color: monStyle.color },
          }, monStyle.label)
        ),
        e('div', { className: 'flex items-center gap-2 mt-1.5 flex-wrap' },
          e(ValidationBadge, { type: 'guideline_checklist' }),
          e('p', { className: 'text-xs text-gray-400' }, monitoringLabel)
        )
      ),

      e('div', { className: 'p-4 space-y-4' },
        // Schedule
        e('div', {},
          e('p', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2' }, 'Recommended Follow-up Schedule'),
          e('ul', { className: 'space-y-2' },
            ...monitoringSchedule.map((item, i) =>
              e('li', { key: i, className: 'flex items-start gap-2.5' },
                e('div', { className: 'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5', style: { background: monStyle.bg } },
                  e('div', { className: 'w-1.5 h-1.5 rounded-full', style: { background: monStyle.color } })
                ),
                e('span', { className: 'text-sm text-gray-700 leading-snug' }, item)
              )
            )
          )
        ),

        // High-risk features
        featureCount > 0 && e('div', { className: 'pt-3 border-t border-gray-50' },
          e('div', { className: 'flex items-center gap-2 mb-2' },
            e('p', { className: 'text-xs font-semibold uppercase tracking-wide text-gray-400' }, 'High-Risk Features Detected'),
            e('span', {
              className: 'text-xs font-bold px-1.5 py-0.5 rounded-full',
              style: { background: featureCount >= 5 ? '#f5f3ff' : featureCount >= 3 ? '#fef2f2' : '#fffbeb', color: featureCount >= 5 ? '#7c3aed' : featureCount >= 3 ? '#dc2626' : '#d97706' },
            }, `${featureCount} of 10`)
          ),
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

        // Evidence note
        e('div', { className: 'pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
          e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
          'Feature list and monitoring intensity tiers derived from PRIAS protocol (Bul et al., Eur Urol 2013), NCCN 2024 active surveillance monitoring guidelines, and Canary PASS (Newcomb et al., J Urol 2016). Cohort calibration (Layer 2) from Mount Sinai Tewari AS Program N=1,213.'
        )
      )
    ),

    // ── Model Validation ─────────────────────────────────────────────────
    e(ModelValidationCard),

    // ── Cohort Calibration Section (Layer 2) ─────────────────────────────
    cohortContext && cohortContext.cohortItems && cohortContext.cohortItems.length > 0 &&
    e(CohortContextSection, { cohortContext }),

    // ── Actions ─────────────────────────────────────────────────────────
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

    // ── Disclaimer ───────────────────────────────────────────────────────
    e('div', { className: 'rounded-xl p-4 space-y-2', style: { background: '#f8fafc', border: '1px solid #e2e8f0' } },
      e('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
        e('p', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide' }, 'Clinical Disclaimer'),
        showEpsaCard && e('span', {
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

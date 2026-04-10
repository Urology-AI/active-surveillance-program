import React, { useState } from 'react'

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

function CollapsibleSection({ title, badge, badgeStyle, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)
  return e('div', { className: 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden' },
    e('button', {
      type: 'button', onClick: () => setOpen(v => !v),
      className: 'w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sinai-cerulean/30',
    },
      e('div', { className: 'flex items-center gap-2.5' },
        e('span', { className: 'font-semibold text-gray-900 text-sm' }, title),
        badge && e('span', {
          className: 'text-xs font-semibold px-2 py-0.5 rounded-full',
          style: badgeStyle || { background: '#f3f4f6', color: '#374151' },
        }, badge)
      ),
      e('svg', {
        className: `w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`,
        fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
      },
        e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
      )
    ),
    open && e('div', { className: 'px-4 pb-4 border-t border-gray-50' }, children)
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

function SummaryCard({ label, value, subvalue, highlight }) {
  return e('div', { className: `bg-white rounded-xl border shadow-sm p-3 ${highlight ? 'border-red-200' : 'border-gray-100'}` },
    e('div', { className: 'text-xs text-gray-400 mb-0.5 font-medium' }, label),
    e('div', { className: `text-base font-bold leading-tight ${highlight ? 'text-red-600' : 'text-gray-900'}` }, value),
    subvalue && e('div', { className: 'text-xs text-gray-400 mt-0.5' }, subvalue)
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatientResults({ results, inputs, onBack }) {
  const {
    asTierKey, asScore, asFactors, psad,
    genomicRiskTier, genomicScore, genomicFactors, genomicAssessed,
    psmaFinding, psmaScore, psmaFactors, psmaAssessed,
    monitoringTier, monitoringLabel, monitoringSchedule, features, featureCount,
    combinedTierKey, combinedRecommendation, combinedColor,
  } = results

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
          e('div', { className: 'flex items-center gap-2 mb-1' },
            e('span', { className: 'text-xs font-semibold uppercase tracking-wide', style: { color: colors.border } }, 'Overall Recommendation'),
            e('span', {
              className: 'text-xs font-bold px-2 py-0.5 rounded-full',
              style: { background: colors.badge, color: colors.badgeText },
            }, COMBINED_TIER_LABELS[combinedTierKey] || combinedTierKey)
          ),
          e('p', { className: 'text-base font-bold leading-snug', style: { color: colors.text } }, combinedRecommendation)
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
        e('div', { className: 'flex items-center justify-between' },
          e('span', { className: 'font-semibold text-gray-900 text-sm' }, 'Sub-model 4 — Monitoring Protocol'),
          e('span', {
            className: 'text-xs font-bold px-2.5 py-1 rounded-full',
            style: { background: monStyle.bg, color: monStyle.color },
          }, monStyle.label)
        ),
        e('p', { className: 'text-xs text-gray-400 mt-1' }, monitoringLabel)
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
                feat
              )
            )
          )
        ),

        // Evidence note
        e('div', { className: 'pt-3 border-t border-gray-50 text-xs text-gray-400 leading-relaxed' },
          e('strong', { className: 'text-gray-500' }, 'Evidence basis: '),
          'Feature list and monitoring intensity tiers derived from PRIAS protocol (Bul et al., Eur Urol 2013), NCCN 2024 active surveillance monitoring guidelines, and Canary PASS (Newcomb et al., J Urol 2016).'
        )
      )
    ),

    // ── Actions ─────────────────────────────────────────────────────────
    e('div', { className: 'flex gap-3 no-print' },
      e('button', {
        onClick: onBack,
        className: 'flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors',
      },
        e('span', { className: 'flex items-center justify-center gap-1.5' },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Edit Inputs'
        )
      ),
      e('button', {
        onClick: () => window.print(),
        className: 'flex-1 py-3 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity',
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
        inputs.epsaContext?.source === 'epsa' && e('span', {
          className: 'text-xs font-medium px-2 py-0.5 rounded-full',
          style: { background: '#f3f4f6', color: '#6b7280' },
        }, 'Via ePSA')
      ),
      e('p', { className: 'text-xs text-gray-400 leading-relaxed' },
        'This tool provides algorithmic decision-support output only. It does not constitute medical advice, a diagnosis, or a treatment recommendation. Scoring thresholds are based on published literature; point weights are ordinal proxies for published risk tiers and have not been prospectively validated as an integrated composite score. All clinical decisions must be made by a qualified healthcare provider in the context of the patient\'s full clinical history, institutional protocols, and shared decision-making.'
      ),
      e('p', { className: 'text-xs text-gray-400' },
        'Key references: NCCN Prostate Cancer Guidelines v3.2024 · EAU Guidelines 2024 · Kadeer et al., Eur Urol 2025 · PRIAS protocol (Bul et al., 2013)'
      )
    )
  )
}

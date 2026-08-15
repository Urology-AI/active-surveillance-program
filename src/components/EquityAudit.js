/**
 * EquityAudit — practice-level equity audit prompt.
 *
 * Built around the disparity findings in Lee et al., JAMA 2026 (PROFOUND-VET):
 * after adjustment for clinical features, Black or African American race,
 * Hispanic or Latino ethnicity, and higher Area Deprivation Index were each
 * associated with LOWER odds of being managed with active surveillance.
 *
 * ── CLINICAL-SAFETY CONTRACT ────────────────────────────────────────────────
 * This component is an audit of *offer rates by the practice*, never a
 * patient-level risk adjustment. It takes no patient input, emits no score,
 * and returns no recommendation. Race and ethnicity are never inputs to any
 * tier, score, or recommendation anywhere in this tool. Local race-stratified
 * upgrade rates, where shown, are displayed with N and a 95% Wilson interval
 * and labelled as observational cohort context.
 * ────────────────────────────────────────────────────────────────────────────
 */
import React from 'react'
import {
  VA_BENCHMARK_CITATION,
  VA_ADJUSTED_ORS,
  VA_NULL_FINDINGS,
  VA_LIMITATIONS,
  getAdjustedOR,
  formatOR,
  orToPlainLanguage,
} from '../benchmarkData'
import { getLocalCohortSnapshot } from '../asEngine'

const e = React.createElement

const EQUITY_KEYS = ['black_race', 'hispanic_ethnicity', 'adi']

/** Forest-style row for one adjusted OR. Log-ish scale from 0.7 to 1.5. */
function ORRow({ row }) {
  const LO = 0.7, HI = 1.5
  const posOf = v => ((Math.log(Math.min(HI, Math.max(LO, v))) - Math.log(LO)) / (Math.log(HI) - Math.log(LO))) * 100
  const left = posOf(row.ciLow)
  const right = posOf(row.ciHigh)
  const point = posOf(row.or)
  const nullPos = posOf(1)
  const less = row.or < 1

  return e('div', { className: 'py-3 border-b border-slate-100 last:border-0' },
    e('div', { className: 'flex items-baseline justify-between gap-3 mb-2' },
      e('span', { className: 'text-sm font-semibold text-slate-700' },
        row.label + (row.unit ? `, ${row.unit}` : '')),
      e('span', { className: 'text-xs font-mono text-slate-500 whitespace-nowrap' },
        formatOR(row) + (row.p ? `, ${row.p}` : ''))
    ),
    e('div', { className: 'relative h-5' },
      e('div', { className: 'absolute inset-x-0 top-2 h-px bg-slate-200' }),
      e('div', { className: 'absolute top-0 w-px h-5 bg-slate-400', style: { left: `${nullPos}%` } }),
      e('div', {
        className: `absolute top-[7px] h-0.5 ${less ? 'bg-sinai-magenta/60' : 'bg-sinai-cerulean/60'}`,
        style: { left: `${left}%`, width: `${Math.max(0.6, right - left)}%` },
      }),
      e('div', {
        className: `absolute top-1 w-2.5 h-2.5 rounded-full ${less ? 'bg-sinai-magenta' : 'bg-sinai-cerulean'}`,
        style: { left: `calc(${point}% - 5px)` },
      })
    ),
    e('p', { className: 'text-[11px] text-slate-500 mt-1' },
      orToPlainLanguage(row), row.unit ? ` (${row.unit})` : '', '. Adjusted for the other listed covariates.')
  )
}

function AuditChecklist() {
  const items = [
    'For each of your last 100 favorable-risk diagnoses, was active surveillance documented as an option that was offered?',
    'Stratify that documented-offer rate by patient race, ethnicity, primary language, and neighbourhood deprivation. Compare the offer rates — not the acceptance rates — first.',
    'Where offer rates differ, check whether clinical features (Grade Group, PSA, percentage of positive cores) fully account for the difference. In the VA cohort they did not.',
    'Check whether interpreter use, visit length, or written surveillance materials differ across those same groups.',
    'Re-audit after two quarters. A single snapshot cannot distinguish a real gap from noise at typical single-practice volumes.',
  ]
  return e('div', { className: 'p-4 rounded-xl border-2 border-sinai-cerulean/30 bg-white' },
    e('h3', { className: 'text-base font-bold text-sinai-navy mb-1' }, 'Audit your own offer rates'),
    e('p', { className: 'text-xs text-slate-500 mb-3' },
      'These are questions to ask about your practice, not about a patient in front of you.'),
    e('ol', { className: 'space-y-2 list-decimal pl-5' },
      items.map((t, i) => e('li', { key: i, className: 'text-sm text-slate-700 leading-relaxed' }, t))
    )
  )
}

function LocalRaceContext() {
  const local = getLocalCohortSnapshot()

  return e('div', { className: 'p-4 rounded-xl border border-amber-300 bg-amber-50' },
    e('h3', { className: 'text-base font-bold text-amber-900 mb-1' },
      'Local race-stratified upgrade rates — context only'),
    e('p', { className: 'text-xs text-amber-900/80 mb-3 leading-relaxed' },
      'Observed upgrade rates among patients already enrolled on surveillance in the ',
      `${local.source} cohort (N=${local.n.toLocaleString()}). `,
      e('span', { className: 'font-semibold' },
        'These are not risk adjustments and are not used by any calculation in this tool. '),
      'At these sample sizes the intervals overlap substantially, so the differences shown are not statistically separable.'),

    e('div', { className: 'overflow-x-auto' },
      e('table', { className: 'w-full text-sm' },
        e('thead', null,
          e('tr', { className: 'text-left text-[11px] uppercase tracking-wide text-amber-900/60' },
            e('th', { className: 'py-1 pr-3 font-semibold' }, 'Group'),
            e('th', { className: 'py-1 pr-3 font-semibold' }, 'N'),
            e('th', { className: 'py-1 pr-3 font-semibold' }, 'Upgrade rate'),
            e('th', { className: 'py-1 font-semibold' }, '95% CI (Wilson)')
          )
        ),
        e('tbody', null,
          local.race.rows.map(r => e('tr', { key: r.key, className: 'border-t border-amber-200' },
            e('td', { className: 'py-1.5 pr-3 text-slate-700' }, r.label),
            e('td', { className: 'py-1.5 pr-3 font-mono text-slate-600' }, r.n),
            e('td', { className: 'py-1.5 pr-3 font-mono text-slate-700' }, `${(r.upgradeRate * 100).toFixed(1)}%`),
            e('td', { className: 'py-1.5 font-mono text-slate-500' }, r.ciLabel)
          ))
        )
      )
    ),

    e('p', { className: 'text-xs text-amber-900 mt-3 leading-relaxed font-semibold' },
      local.race.disclaimer),
    e('p', { className: 'text-xs text-amber-900/80 mt-2 leading-relaxed' },
      'Why this is deliberately inert: the national data on this page show that Black and Hispanic patients are already offered surveillance less often after adjustment for disease features. Feeding a race term into a risk output would mechanise that same gap under the appearance of precision. The tool therefore reports these numbers and stops there.')
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EquityAudit() {
  const equityRows = EQUITY_KEYS.map(getAdjustedOR).filter(Boolean)
  const clinicalRows = VA_ADJUSTED_ORS.filter(r => r.domain === 'clinical')
  const contextRows = VA_ADJUSTED_ORS.filter(r => r.domain === 'demographic' || r.domain === 'temporal')
  const gg2 = getAdjustedOR('gg2_vs_gg1')

  return e('div', { className: 'space-y-4' },

    e('div', { className: 'p-4 rounded-xl bg-sinai-cetacean text-white' },
      e('h2', { className: 'text-lg font-bold' }, 'Equity audit — who gets offered surveillance'),
      e('p', { className: 'text-xs text-white/70 mt-1 leading-relaxed' },
        'In a national VA cohort, social factors predicted whether a patient was managed with active surveillance even after adjustment for age, diagnosis year, Grade Group, and biopsy core burden. This view is a prompt to audit your own practice; it takes no patient data and produces no recommendation.')
    ),

    e('div', { className: 'p-4 rounded-xl border border-slate-200 bg-white' },
      e('h3', { className: 'text-base font-bold text-sinai-navy mb-1' },
        'Social factors, adjusted odds of surveillance use'),
      e('p', { className: 'text-xs text-slate-500 mb-2' },
        'Points left of the vertical line indicate less use of surveillance.'),
      equityRows.map(row => e(ORRow, { key: row.key, row })),
      e('p', { className: 'text-xs text-slate-600 mt-3 leading-relaxed' },
        'Each association is modest in size, but they run in the same direction and persist after clinical adjustment — consistent with differences in what is offered and how it is discussed rather than in the disease itself. Travel distance, by contrast, was not associated with surveillance use, which argues against simple access-to-clinic explanations.'),
      e('p', { className: 'text-[11px] text-slate-400 mt-2' }, VA_BENCHMARK_CITATION.short)
    ),

    e(AuditChecklist, {}),

    e('div', { className: 'p-4 rounded-xl border-2 border-sinai-magenta/30 bg-sinai-magenta-light/40' },
      e('h3', { className: 'text-base font-bold text-sinai-navy mb-1' },
        'The largest gap is clinical, not social'),
      e('p', { className: 'text-sm text-slate-700 leading-relaxed' },
        'Grade Group 2 versus Grade Group 1 carried ',
        e('span', { className: 'font-semibold' }, formatOR(gg2)),
        `, ${gg2.p} — roughly one-eighth the odds of surveillance. Favorable intermediate-risk patients remain overwhelmingly steered toward treatment despite guideline eligibility. For a practice already using this tool for FIR patients, closing that gap is the highest-yield change available.`),
      e('div', { className: 'mt-3' },
        clinicalRows.map(row => e(ORRow, { key: row.key, row }))
      ),
      e('p', { className: 'text-[11px] text-slate-400 mt-2' }, VA_BENCHMARK_CITATION.short)
    ),

    e('div', { className: 'p-4 rounded-xl border border-slate-200 bg-white' },
      e('h3', { className: 'text-base font-bold text-sinai-navy mb-2' }, 'Other adjusted associations'),
      contextRows.map(row => e(ORRow, { key: row.key, row })),
      VA_NULL_FINDINGS.map(f => e('p', { key: f.key, className: 'text-xs text-slate-600 mt-3' },
        e('span', { className: 'font-semibold' }, `${f.label}: `), f.finding)),
      e('p', { className: 'text-[11px] text-slate-400 mt-2' }, VA_BENCHMARK_CITATION.short)
    ),

    e(LocalRaceContext, {}),

    e('details', { className: 'rounded-xl border border-slate-200 bg-slate-50 p-4' },
      e('summary', { className: 'text-sm font-semibold text-slate-600 cursor-pointer' },
        'Source and limitations'),
      e('ul', { className: 'mt-3 space-y-1.5 list-disc pl-5' },
        VA_LIMITATIONS.map((l, i) => e('li', { key: i, className: 'text-xs text-slate-600 leading-relaxed' }, l))
      ),
      e('p', { className: 'text-[11px] text-slate-400 mt-3 leading-snug' },
        `${VA_BENCHMARK_CITATION.authors}. ${VA_BENCHMARK_CITATION.title}. ${VA_BENCHMARK_CITATION.journal}. ${VA_BENCHMARK_CITATION.published}. doi:${VA_BENCHMARK_CITATION.doi}`)
    )
  )
}

export { ORRow, AuditChecklist, LocalRaceContext }

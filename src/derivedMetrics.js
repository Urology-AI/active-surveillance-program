/**
 * derivedMetrics.js — trend computation over a longitudinal patient record.
 *
 * Everything here is *derived*. PSA velocity and doubling time are currently
 * hand-typed inputs to the risk engine (see `psaVelocity` / `psaDoublingTime` in
 * ClinicalCalculator's normalizePayload); computing them from the actual PSA
 * series is the point of this module.
 *
 * Contract: no function here ever fabricates a number. Every result is either
 *   { value: <number>, ... }   — computed, with the inputs that produced it
 * or
 *   { value: null, reason: <machine code>, detail: <human sentence> }
 * Degenerate cases (too few points, a flat or declining series, a series
 * collapsed to a single day) return null with a reason, never a placeholder.
 */

import { EVENT_TYPES, psaSeries, sortedEvents } from './patientRecord.js'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_PER_YEAR = 365.25
const DAYS_PER_MONTH = 30.44

export const MIN_PSA_POINTS = 3          // fewer than 3 → not a trend, a pair
export const MIN_SPAN_MONTHS = 6         // kinetics over < 6 months are noise
export const DEFAULT_WINDOW_MONTHS = 24  // trailing window for velocity

function daysBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY
}

function fail(reason, detail, extra) {
  return { value: null, reason, detail, ...(extra || {}) }
}

/**
 * Collapse duplicate dates. Two PSA draws stamped the same day are averaged and
 * flagged — keeping both would give that day double weight in the regression
 * and can make an x-variance check pass on what is really one time point.
 */
export function collapseDuplicateDates(points) {
  const byDate = new Map()
  for (const p of points) {
    const key = String(p.date).slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key).push(p)
  }
  let duplicatesCollapsed = 0
  const out = []
  for (const [date, group] of byDate) {
    if (group.length > 1) duplicatesCollapsed += group.length - 1
    const mean = group.reduce((s, g) => s + g.psa, 0) / group.length
    const volumes = group.map(g => g.volume).filter(v => v != null)
    out.push({
      date,
      psa: mean,
      volume: volumes.length ? volumes[volumes.length - 1] : null,
      collapsedFrom: group.length,
    })
  }
  out.sort((a, b) => new Date(a.date) - new Date(b.date))
  return { points: out, duplicatesCollapsed }
}

/** Ordinary least squares. Returns null when x has no variance. */
function linearRegression(pts) {
  const n = pts.length
  const sumX = pts.reduce((s, p) => s + p.x, 0)
  const sumY = pts.reduce((s, p) => s + p.y, 0)
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-10) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  if (!Number.isFinite(slope)) return null

  // R² for transparency — a velocity off a scattered series deserves a caveat.
  const meanY = sumY / n
  const ssTot = pts.reduce((s, p) => s + (p.y - meanY) ** 2, 0)
  const ssRes = pts.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const r2 = ssTot > 1e-12 ? 1 - ssRes / ssTot : null
  return { slope, intercept, r2 }
}

/**
 * Select the trailing window of PSA points used for kinetics.
 * Takes every point within `windowMonths` of the most recent draw. If that
 * leaves fewer than MIN_PSA_POINTS, widens to the full series rather than
 * failing — a wider window is honest as long as it is reported.
 */
export function selectWindow(points, windowMonths = DEFAULT_WINDOW_MONTHS) {
  if (!points.length) return { points: [], widened: false, windowMonths }
  const last = points[points.length - 1].date
  const cutoffDays = windowMonths * DAYS_PER_MONTH
  const within = points.filter(p => daysBetween(p.date, last) <= cutoffDays)
  if (within.length >= MIN_PSA_POINTS) return { points: within, widened: false, windowMonths }
  return { points, widened: true, windowMonths: null }
}

function preparePSA(seriesOrRecord, windowMonths) {
  const raw = Array.isArray(seriesOrRecord) ? seriesOrRecord : psaSeries(seriesOrRecord)
  const usable = raw.filter(p => p && p.date && Number.isFinite(p.psa) && p.psa > 0)
  const { points: deduped, duplicatesCollapsed } = collapseDuplicateDates(usable)
  const win = selectWindow(deduped, windowMonths)
  const pts = win.points
  const spanDays = pts.length >= 2 ? daysBetween(pts[0].date, pts[pts.length - 1].date) : 0
  return {
    all: deduped,
    points: pts,
    duplicatesCollapsed,
    widened: win.widened,
    windowMonths: win.windowMonths,
    spanDays,
    spanMonths: spanDays / DAYS_PER_MONTH,
    spanYears: spanDays / DAYS_PER_YEAR,
  }
}

/**
 * PSA velocity in ng/mL/year — slope of an OLS fit of PSA against time.
 *
 * Returns null with a reason when:
 *   too_few_points   — fewer than 3 distinct PSA dates
 *   span_too_short   — all draws inside a 6-month window (transient elevations
 *                      dominate; AUA/ASTRO 2026 §18 says re-test before acting)
 *   no_time_variance — every remaining point falls on one day
 */
export function computePSAVelocity(seriesOrRecord, options = {}) {
  const windowMonths = options.windowMonths ?? DEFAULT_WINDOW_MONTHS
  const prep = preparePSA(seriesOrRecord, windowMonths)
  const pts = prep.points

  if (pts.length < MIN_PSA_POINTS) {
    return fail('too_few_points',
      `Need at least ${MIN_PSA_POINTS} PSA values on distinct dates; have ${pts.length}.`,
      { n: pts.length })
  }
  if (prep.spanMonths < MIN_SPAN_MONTHS) {
    return fail('span_too_short',
      `PSA values span only ${Math.round(prep.spanMonths)} months. At least ${MIN_SPAN_MONTHS} months of serial values are needed before kinetics mean anything.`,
      { n: pts.length, spanMonths: prep.spanMonths })
  }

  const t0 = new Date(pts[0].date).getTime()
  const fit = linearRegression(pts.map(p => ({
    x: (new Date(p.date).getTime() - t0) / MS_PER_DAY / DAYS_PER_YEAR,
    y: p.psa,
  })))
  if (!fit) {
    return fail('no_time_variance', 'All PSA values fall on a single date — no time axis to fit.', { n: pts.length })
  }

  return {
    value: fit.slope,
    unit: 'ng/mL/yr',
    method: 'ordinary least squares, PSA vs. years',
    n: pts.length,
    r2: fit.r2,
    spanMonths: prep.spanMonths,
    windowMonths: prep.windowMonths,
    widenedWindow: prep.widened,
    duplicatesCollapsed: prep.duplicatesCollapsed,
    firstDate: pts[0].date,
    lastDate: pts[pts.length - 1].date,
  }
}

/**
 * PSA doubling time in months — ln(2) / slope of an OLS fit of ln(PSA) against
 * time. Reported in months, with `years` alongside for display.
 *
 * Returns null with a reason when:
 *   too_few_points     — fewer than 3 distinct PSA dates
 *   span_too_short     — under 6 months of data
 *   no_time_variance   — one distinct date
 *   not_rising         — slope <= 0: the series is flat or declining, so
 *                        doubling time is undefined (mathematically infinite or
 *                        negative). We say so rather than printing a number.
 * A very long but finite doubling time (> 120 months) is returned as a value
 * with `beyondHorizon: true` so the UI can render "> 10 years".
 */
export function computePSADoublingTime(seriesOrRecord, options = {}) {
  const windowMonths = options.windowMonths ?? DEFAULT_WINDOW_MONTHS
  const prep = preparePSA(seriesOrRecord, windowMonths)
  const pts = prep.points

  if (pts.length < MIN_PSA_POINTS) {
    return fail('too_few_points',
      `Need at least ${MIN_PSA_POINTS} PSA values on distinct dates; have ${pts.length}.`,
      { n: pts.length })
  }
  if (prep.spanMonths < MIN_SPAN_MONTHS) {
    return fail('span_too_short',
      `PSA values span only ${Math.round(prep.spanMonths)} months — too short for a doubling-time estimate.`,
      { n: pts.length, spanMonths: prep.spanMonths })
  }

  const t0 = new Date(pts[0].date).getTime()
  const fit = linearRegression(pts.map(p => ({
    x: (new Date(p.date).getTime() - t0) / MS_PER_DAY / DAYS_PER_MONTH,
    y: Math.log(p.psa),
  })))
  if (!fit) {
    return fail('no_time_variance', 'All PSA values fall on a single date — no time axis to fit.', { n: pts.length })
  }
  if (fit.slope <= 0) {
    const direction = fit.slope === 0 ? 'flat' : 'declining'
    return fail('not_rising',
      `PSA is ${direction} over this window — doubling time is undefined (PSA is not doubling).`,
      { n: pts.length, slope: fit.slope, direction, spanMonths: prep.spanMonths })
  }

  const months = Math.log(2) / fit.slope
  return {
    value: months,
    years: months / 12,
    unit: 'months',
    method: 'log-linear least squares, ln(PSA) vs. months',
    beyondHorizon: months > 120,
    n: pts.length,
    r2: fit.r2,
    spanMonths: prep.spanMonths,
    windowMonths: prep.windowMonths,
    widenedWindow: prep.widened,
    duplicatesCollapsed: prep.duplicatesCollapsed,
    firstDate: pts[0].date,
    lastDate: pts[pts.length - 1].date,
  }
}

/** PSA density from the most recent PSA event that carried a prostate volume. */
export function computePSADensity(record) {
  const series = psaSeries(record)
  const withVol = series.filter(p => p.volume > 0)
  const fallbackVol = record?.baseline?.prostateVolume
  const latest = series[series.length - 1]

  if (withVol.length) {
    const p = withVol[withVol.length - 1]
    return { value: p.psa / p.volume, unit: 'ng/mL/cc', date: p.date, volumeSource: 'measured at draw' }
  }
  if (latest && fallbackVol > 0) {
    return { value: latest.psa / fallbackVol, unit: 'ng/mL/cc', date: latest.date, volumeSource: 'baseline volume' }
  }
  return fail('no_volume', 'No prostate volume recorded — PSA density cannot be computed.')
}

export function formatDoublingTime(dt) {
  if (!dt || dt.value === null) return null
  if (dt.beyondHorizon) return '> 10 years'
  if (dt.value > 24) return `~${(dt.value / 12).toFixed(1)} years`
  return `~${Math.round(dt.value)} months`
}

export function formatVelocity(v) {
  if (!v || v.value === null) return null
  return `${v.value >= 0 ? '+' : ''}${v.value.toFixed(2)} ng/mL/yr`
}

// ─── Protocol adherence ───────────────────────────────────────────────────────
/**
 * Tewari AS protocol as implemented elsewhere in this app:
 *   · PSA + office visit — quarterly (every 3 months)
 *   · MRI / MUS / DRE    — annually
 *   · Biopsy             — approximately every 3 years
 *
 * `graceDays` is the slack before an item counts as overdue rather than due —
 * clinic scheduling is not exact, and flagging a 3-month PSA at day 91 would
 * make the panel noise.
 */
export const PROTOCOL = [
  { key: 'psa',    eventType: EVENT_TYPES.PSA,    label: 'PSA + office visit', cadenceDays: 91,   graceDays: 30,  cadenceLabel: 'quarterly' },
  { key: 'mri',    eventType: EVENT_TYPES.MRI,    label: 'MRI',                cadenceDays: 365,  graceDays: 60,  cadenceLabel: 'annual' },
  { key: 'dre',    eventType: EVENT_TYPES.DRE,    label: 'DRE',                cadenceDays: 365,  graceDays: 60,  cadenceLabel: 'annual' },
  { key: 'uroflow',eventType: EVENT_TYPES.UROFLOW,label: 'Uroflow / PVR',      cadenceDays: 365,  graceDays: 90,  cadenceLabel: 'annual' },
  { key: 'biopsy', eventType: EVENT_TYPES.BIOPSY, label: 'Surveillance biopsy',cadenceDays: 1095, graceDays: 180, cadenceLabel: 'every ~3 years' },
]

function addDays(iso, days) {
  const d = new Date(iso + (String(iso).length === 10 ? 'T00:00:00' : ''))
  d.setDate(d.getDate() + Math.round(days))
  return d.toISOString().slice(0, 10)
}

/**
 * Compute surveillance status per protocol item.
 *
 * For each item we take the most recent event of that type (falling back to the
 * enrollment date when the patient has never had one recorded), project the next
 * due date, and classify:
 *   overdue   — past due date + grace
 *   due       — past due date, inside grace
 *   due_soon  — within 45 days of due
 *   on_track  — otherwise
 *   unknown   — no prior event and no enrollment date to anchor to
 * A `never` flag marks items that have no recorded event at all, which is the
 * real "gap in monitoring" signal: not a late MRI, but an MRI that never
 * happened.
 */
export function computeAdherence(record, options = {}) {
  const asOf = options.asOf ? String(options.asOf).slice(0, 10) : new Date().toISOString().slice(0, 10)
  const enrollment = record?.enrollmentDate || null
  const items = PROTOCOL.map(rule => {
    const list = sortedEvents(record, rule.eventType)
    const last = list.length ? list[list.length - 1] : null
    const anchor = last ? last.date : enrollment

    if (!anchor) {
      return {
        key: rule.key, label: rule.label, cadenceLabel: rule.cadenceLabel,
        status: 'unknown', never: !last, lastDate: null, dueDate: null, daysOverdue: null,
        detail: `No ${rule.label.toLowerCase()} recorded and no enrollment date set — cannot project a due date.`,
      }
    }

    const dueDate = addDays(anchor, rule.cadenceDays)
    const daysPastDue = daysBetween(dueDate, asOf)
    let status
    if (daysPastDue > rule.graceDays) status = 'overdue'
    else if (daysPastDue > 0) status = 'due'
    else if (daysPastDue > -45) status = 'due_soon'
    else status = 'on_track'

    const sinceDays = daysBetween(anchor, asOf)
    return {
      key: rule.key,
      label: rule.label,
      cadenceLabel: rule.cadenceLabel,
      status,
      never: !last,
      anchoredToEnrollment: !last,
      lastDate: last ? last.date : null,
      dueDate,
      daysSinceLast: Math.round(sinceDays),
      monthsSinceLast: Math.round(sinceDays / DAYS_PER_MONTH),
      daysOverdue: daysPastDue > 0 ? Math.round(daysPastDue) : 0,
      detail: last
        ? `Last ${rule.label.toLowerCase()} ${Math.round(sinceDays / DAYS_PER_MONTH)} months ago (${last.date}); ${rule.cadenceLabel} cadence puts the next one at ${dueDate}.`
        : `No ${rule.label.toLowerCase()} on record. Projected from enrollment (${enrollment}) at ${rule.cadenceLabel} cadence: due ${dueDate}.`,
    }
  })

  const overdue = items.filter(i => i.status === 'overdue')
  const due = items.filter(i => i.status === 'due')
  return {
    asOf,
    items,
    overdue,
    due,
    dueSoon: items.filter(i => i.status === 'due_soon'),
    hasGaps: overdue.length > 0,
    summary: overdue.length
      ? `${overdue.length} surveillance item${overdue.length > 1 ? 's' : ''} overdue`
      : due.length
        ? `${due.length} surveillance item${due.length > 1 ? 's' : ''} due now`
        : 'Surveillance on schedule',
  }
}

/** One call for the UI: everything derivable from the record. */
export function computeDerivedMetrics(record, options = {}) {
  const series = psaSeries(record)
  return {
    psaSeries: series,
    velocity: computePSAVelocity(series, options),
    doublingTime: computePSADoublingTime(series, options),
    density: computePSADensity(record),
    adherence: computeAdherence(record, options),
  }
}

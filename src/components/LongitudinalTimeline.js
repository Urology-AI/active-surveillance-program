/**
 * LongitudinalTimeline — PSA trend over time with MRI, biopsy, DRE and genomic
 * events marked on the same time axis, derived kinetics, and the surveillance
 * due/overdue panel.
 *
 * Print-friendly: fixed max width, no fixed positioning, colors chosen to keep
 * contrast on a monochrome laser printer, and event markers labeled inline
 * rather than in a hover tooltip.
 */
import React from 'react'
import {
  EVENT_TYPES, EVENT_LABELS, sortedEvents, psaSeries, formatEventDate,
} from '../patientRecord.js'
import {
  computeDerivedMetrics, formatDoublingTime, formatVelocity,
} from '../derivedMetrics.js'

const e = React.createElement

const CERULEAN = '#06ABEB'
const NAVY = '#212070'
const CETACEAN = '#00002D'
const MAGENTA = '#DC298D'

const MARKER = {
  [EVENT_TYPES.MRI]:      { color: MAGENTA, glyph: 'M', label: 'MRI' },
  [EVENT_TYPES.BIOPSY]:   { color: NAVY,    glyph: 'B', label: 'Biopsy' },
  [EVENT_TYPES.DRE]:      { color: '#0f766e', glyph: 'D', label: 'DRE' },
  [EVENT_TYPES.GENOMICS]: { color: '#7c3aed', glyph: 'G', label: 'Genomics' },
}

const STATUS_STYLE = {
  overdue:  { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', word: 'Overdue' },
  due:      { bg: '#fffbeb', border: '#fde68a', text: '#b45309', word: 'Due now' },
  due_soon: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', word: 'Due soon' },
  on_track: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', word: 'On track' },
  unknown:  { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', word: 'Unknown' },
}

const cardStyle = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
  padding: '12px 14px', boxSizing: 'border-box',
}
const eyebrow = {
  fontSize: 10, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
}

function StatCard({ title, value, sub, tone }) {
  const s = tone ? STATUS_STYLE[tone] : null
  return e('div', {
    style: {
      ...cardStyle, flex: '1 1 150px',
      background: s ? s.bg : '#fff',
      borderColor: s ? s.border : '#e2e8f0',
    },
  },
    e('div', { style: { ...eyebrow, marginBottom: 4 } }, title),
    e('div', { style: { fontSize: 17, fontWeight: 800, lineHeight: 1.15, color: s ? s.text : CETACEAN } }, value),
    sub && e('div', { style: { fontSize: 10.5, color: '#64748b', marginTop: 4, lineHeight: 1.45 } }, sub)
  )
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function TrendChart({ series, markerEvents }) {
  if (!series.length) return null

  const W = 720, H = 260
  const padL = 46, padR = 22, padT = 16, padB = 62
  const cW = W - padL - padR
  const cH = H - padT - padB

  const psaVals = series.map(p => p.psa)
  const minPSA = Math.min(...psaVals)
  const maxPSA = Math.max(...psaVals)
  const spread = maxPSA - minPSA || Math.max(maxPSA * 0.2, 1)
  const yMin = Math.max(0, minPSA - spread * 0.25)
  const yMax = maxPSA + spread * 0.3

  const allDates = [...series.map(p => p.date), ...markerEvents.map(m => m.date)]
  const times = allDates.map(d => new Date(d).getTime())
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const tRange = maxT - minT || 1

  const toX = d => padL + ((new Date(d).getTime() - minT) / tRange) * cW
  const toY = v => padT + cH - ((v - yMin) / (yMax - yMin)) * cH

  const pts = series.map(p => ({ x: toX(p.date), y: toY(p.psa), psa: p.psa, date: p.date }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map(v => ({
    label: (Math.round(v * 10) / 10).toString(), y: toY(v), v,
  }))

  const fmtAxisDate = d => new Date(d + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

  // Year gridlines across the span
  const yearLines = []
  const startYear = new Date(minT).getFullYear()
  const endYear = new Date(maxT).getFullYear()
  for (let y = startYear + 1; y <= endYear; y++) {
    const t = new Date(`${y}-01-01T00:00:00`).getTime()
    if (t >= minT && t <= maxT) yearLines.push({ year: y, x: padL + ((t - minT) / tRange) * cW })
  }

  // Stagger marker labels so same-month events do not collide
  const markers = markerEvents.map((m, i) => ({
    ...m, x: toX(m.date), row: i % 3,
  }))

  return e('svg', {
    width: '100%', viewBox: `0 0 ${W} ${H}`,
    style: { display: 'block', overflow: 'visible' },
    role: 'img',
    'aria-label': 'PSA trend over time with MRI and biopsy events marked',
  },
    yTicks.map(t => e('line', {
      key: 'g' + t.label, x1: padL, y1: t.y, x2: W - padR, y2: t.y,
      stroke: '#eef2f7', strokeWidth: 1,
    })),
    yearLines.map(yl => e('g', { key: 'yr' + yl.year },
      e('line', { x1: yl.x, y1: padT, x2: yl.x, y2: padT + cH, stroke: '#f1f5f9', strokeWidth: 1 }),
      e('text', { x: yl.x, y: padT - 4, textAnchor: 'middle', fontSize: 8.5, fill: '#cbd5e1' }, yl.year)
    )),

    e('line', { x1: padL, y1: padT, x2: padL, y2: padT + cH, stroke: '#cbd5e1', strokeWidth: 1 }),
    e('line', { x1: padL, y1: padT + cH, x2: W - padR, y2: padT + cH, stroke: '#cbd5e1', strokeWidth: 1 }),

    yTicks.map(t => e('text', {
      key: 'y' + t.label, x: padL - 6, y: t.y + 3.5, textAnchor: 'end', fontSize: 9, fill: '#64748b',
    }, t.label)),
    e('text', {
      x: 12, y: padT + cH / 2, textAnchor: 'middle', fontSize: 9, fill: '#64748b',
      transform: `rotate(-90, 12, ${padT + cH / 2})`,
    }, 'PSA (ng/mL)'),

    // Event markers — vertical rules through the plot, glyph + date below axis
    markers.map((m, i) => {
      const cfg = MARKER[m.type] || { color: '#94a3b8', glyph: '?', label: m.type }
      const labelY = padT + cH + 20 + m.row * 13
      return e('g', { key: 'm' + i },
        e('line', {
          x1: m.x, y1: padT, x2: m.x, y2: padT + cH,
          stroke: cfg.color, strokeWidth: 1, strokeDasharray: '3,3', opacity: 0.55,
        }),
        e('circle', { cx: m.x, cy: padT + cH, r: 4.5, fill: cfg.color }),
        e('text', {
          x: m.x, y: padT + cH + 3.2, textAnchor: 'middle', fontSize: 6.5,
          fill: '#fff', fontWeight: 700,
        }, cfg.glyph),
        e('text', {
          x: m.x, y: labelY, textAnchor: 'middle', fontSize: 8, fill: cfg.color, fontWeight: 700,
        }, m.short)
      )
    }),

    e('path', {
      d: pathD, fill: 'none', stroke: CERULEAN, strokeWidth: 2.2,
      strokeLinejoin: 'round', strokeLinecap: 'round',
    }),
    pts.map((p, i) => e('circle', {
      key: 'p' + i, cx: p.x, cy: p.y, r: 3.6, fill: CERULEAN, stroke: '#fff', strokeWidth: 1.5,
    })),
    pts.length > 0 && e('text', {
      x: Math.min(pts[pts.length - 1].x + 8, W - padR),
      y: pts[pts.length - 1].y - 7,
      textAnchor: 'end', fontSize: 10, fill: NAVY, fontWeight: 700,
    }, String(Math.round(pts[pts.length - 1].psa * 100) / 100)),

    e('text', { x: padL, y: H - 6, textAnchor: 'start', fontSize: 8.5, fill: '#94a3b8' },
      fmtAxisDate(String(new Date(minT).toISOString().slice(0, 10)))),
    e('text', { x: W - padR, y: H - 6, textAnchor: 'end', fontSize: 8.5, fill: '#94a3b8' },
      fmtAxisDate(String(new Date(maxT).toISOString().slice(0, 10))))
  )
}

// ─── Adherence panel ──────────────────────────────────────────────────────────
function AdherencePanel({ adherence }) {
  return e('div', { style: { ...cardStyle, padding: 0, overflow: 'hidden' } },
    e('div', {
      style: {
        padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      },
    },
      e('div', { style: { ...eyebrow, marginBottom: 0 } }, 'Surveillance schedule'),
      e('div', {
        style: {
          fontSize: 11, fontWeight: 800,
          color: adherence.hasGaps ? '#b91c1c' : adherence.due.length ? '#b45309' : '#166534',
        },
      }, adherence.summary)
    ),
    adherence.items.map((item, i) => {
      const s = STATUS_STYLE[item.status] || STATUS_STYLE.unknown
      return e('div', {
        key: item.key,
        style: {
          padding: '9px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
          borderBottom: i < adherence.items.length - 1 ? '1px solid #f8fafc' : 'none',
          background: item.status === 'overdue' ? s.bg : '#fff',
        },
      },
        e('div', { style: { flex: 1, minWidth: 0 } },
          e('div', { style: { fontSize: 12.5, fontWeight: 700, color: CETACEAN } },
            item.label,
            e('span', { style: { fontWeight: 500, color: '#94a3b8', marginLeft: 6, fontSize: 11 } },
              `· ${item.cadenceLabel}`)
          ),
          e('div', { style: { fontSize: 10.5, color: '#64748b', marginTop: 2, lineHeight: 1.45 } },
            item.never
              ? (item.dueDate ? 'Never recorded — projected from enrollment date.' : 'Never recorded, and no enrollment date to project from.')
              : `Last: ${formatEventDate(item.lastDate)} (${item.monthsSinceLast} mo ago) · Next due: ${formatEventDate(item.dueDate)}`
          )
        ),
        e('span', {
          style: {
            flexShrink: 0, fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
            background: s.bg, border: `1px solid ${s.border}`, color: s.text, whiteSpace: 'nowrap',
          },
        }, item.status === 'overdue' ? `${s.word} · ${item.daysOverdue}d` : s.word)
      )
    })
  )
}

// ─── Event stream list ────────────────────────────────────────────────────────
function summarizeEvent(ev) {
  const d = ev.data || {}
  switch (ev.type) {
    case EVENT_TYPES.PSA:
      return `PSA ${d.psa} ng/mL${d.volume ? ` · volume ${d.volume} cc · PSAD ${(d.psa / d.volume).toFixed(3)}` : ''}`
    case EVENT_TYPES.MRI:
      return [
        d.pirads != null ? `PI-RADS ${d.pirads}` : 'PI-RADS not recorded',
        d.lesionCount != null ? `${d.lesionCount} lesion(s)` : null,
        d.newLesion ? 'new lesion' : null,
        d.notes || null,
      ].filter(Boolean).join(' · ')
    case EVENT_TYPES.BIOPSY:
      return [
        d.ggg != null ? `Grade Group ${d.ggg}` : 'GGG not recorded',
        d.positiveCores != null && d.totalCores != null ? `${d.positiveCores}/${d.totalCores} cores positive` : null,
        d.maxCorePercent != null ? `max core ${d.maxCorePercent}%` : null,
        d.targeted ? 'targeted' : null,
        d.notes || null,
      ].filter(Boolean).join(' · ')
    case EVENT_TYPES.GENOMICS:
      return [
        (d.assay || 'assay').toUpperCase(),
        d.score != null ? `score ${d.score}` : null,
        d.riskCategory || null,
        d.notes || null,
      ].filter(Boolean).join(' · ')
    case EVENT_TYPES.DRE:
      return `DRE ${d.finding === 'not_done' ? 'not done' : d.finding}${d.notes ? ` · ${d.notes}` : ''}`
    case EVENT_TYPES.UROFLOW:
      return [
        d.qmax != null ? `Qmax ${d.qmax} mL/s` : null,
        d.pvr != null ? `PVR ${d.pvr} mL` : null,
        d.ipss != null ? `IPSS ${d.ipss}` : null,
        d.notes || null,
      ].filter(Boolean).join(' · ') || 'Uroflow recorded'
    case EVENT_TYPES.NOTE:
      return [d.status ? d.status.replace(/_/g, ' ') : null, d.text || null].filter(Boolean).join(' · ') || 'Note'
    default:
      return ''
  }
}

function EventStream({ record, onRemove }) {
  const events = [...sortedEvents(record)].reverse()
  if (!events.length) return null
  return e('div', { style: { ...cardStyle, padding: 0, overflow: 'hidden' } },
    e('div', { style: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', ...eyebrow, marginBottom: 0 } },
      `Event stream — ${events.length} recorded`),
    events.map((ev, i) => {
      const cfg = MARKER[ev.type] || { color: CERULEAN }
      return e('div', {
        key: ev.id,
        style: {
          padding: '9px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
          borderBottom: i < events.length - 1 ? '1px solid #f8fafc' : 'none',
        },
      },
        e('div', {
          style: {
            width: 4, alignSelf: 'stretch', borderRadius: 2, background: cfg.color, flexShrink: 0,
          },
        }),
        e('div', { style: { flex: 1, minWidth: 0 } },
          e('div', { style: { fontSize: 12, fontWeight: 700, color: CETACEAN } },
            `${formatEventDate(ev.date)} — ${EVENT_LABELS[ev.type] || ev.type}`),
          e('div', { style: { fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.45, wordBreak: 'break-word' } },
            summarizeEvent(ev))
        ),
        onRemove && e('button', {
          type: 'button',
          className: 'lt-no-print',
          onClick: () => onRemove(ev.id),
          style: {
            flexShrink: 0, padding: '3px 9px', borderRadius: 6, border: '1px solid #fecaca',
            background: '#fff', color: '#ef4444', fontSize: 10.5, cursor: 'pointer',
          },
        }, 'Remove')
      )
    })
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LongitudinalTimeline({ record, onRemoveEvent, showEventStream = true }) {
  if (!record) return null

  const metrics = computeDerivedMetrics(record)
  const series = psaSeries(record)
  const { velocity, doublingTime, density, adherence } = metrics

  const markerEvents = []
  for (const type of [EVENT_TYPES.MRI, EVENT_TYPES.BIOPSY, EVENT_TYPES.GENOMICS, EVENT_TYPES.DRE]) {
    for (const ev of sortedEvents(record, type)) {
      const d = ev.data || {}
      let short = MARKER[type].label
      if (type === EVENT_TYPES.MRI && d.pirads != null) short = `PI-RADS ${d.pirads}`
      if (type === EVENT_TYPES.BIOPSY && d.ggg != null) short = `GG${d.ggg}`
      if (type === EVENT_TYPES.DRE) short = `DRE ${d.finding === 'not_done' ? '—' : d.finding}`
      if (type === EVENT_TYPES.GENOMICS) short = (d.assay || 'genomics').toUpperCase()
      markerEvents.push({ type, date: ev.date, short })
    }
  }

  const velText = formatVelocity(velocity)
  const dtText = formatDoublingTime(doublingTime)

  return e('div', {
    style: { maxWidth: 760, margin: '0 auto', boxSizing: 'border-box', color: CETACEAN },
  },
    // Print-friendly rules, scoped to this component's classes
    e('style', null, `
      @media print {
        .lt-no-print { display: none !important; }
        .lt-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
        .lt-root { max-width: 100% !important; }
      }
    `),

    e('div', { className: 'lt-root' },

      e('div', { style: { marginBottom: 12 } },
        e('div', { style: { fontSize: 15, fontWeight: 800, color: CETACEAN } },
          'Longitudinal Surveillance Record'),
        e('div', { style: { fontSize: 11.5, color: '#64748b', marginTop: 2, lineHeight: 1.5 } },
          record.label ? `${record.label} · ` : '',
          record.enrollmentDate
            ? `On surveillance since ${formatEventDate(record.enrollmentDate)}. `
            : 'Enrollment date not set. ',
          `${series.length} PSA value${series.length === 1 ? '' : 's'} · ${(record.events || []).length} total events.`
        )
      ),

      // Derived kinetics
      e('div', { className: 'lt-card', style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 } },
        e(StatCard, {
          title: 'PSA velocity',
          value: velText || 'Not computable',
          sub: velText
            ? `Least-squares fit, ${velocity.n} values over ${Math.round(velocity.spanMonths)} mo${velocity.r2 != null ? ` · R² ${velocity.r2.toFixed(2)}` : ''}${velocity.widenedWindow ? ' · full series (trailing window too sparse)' : ''}`
            : velocity.detail,
        }),
        e(StatCard, {
          title: 'PSA doubling time',
          value: dtText || 'Not computable',
          sub: dtText
            ? `Log-linear fit, ${doublingTime.n} values over ${Math.round(doublingTime.spanMonths)} mo`
            : doublingTime.detail,
        }),
        e(StatCard, {
          title: 'PSA density',
          value: density.value != null ? `${density.value.toFixed(3)} ng/mL/cc` : 'Not computable',
          sub: density.value != null
            ? `${formatEventDate(density.date)} · ${density.volumeSource}`
            : density.detail,
        })
      ),

      // Chart
      series.length >= 2
        ? e('div', { className: 'lt-card', style: { ...cardStyle, marginBottom: 12 } },
            e('div', { style: eyebrow }, 'PSA trend with surveillance events'),
            e(TrendChart, { series, markerEvents }),
            e('div', {
              style: {
                display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8,
                fontSize: 10, color: '#64748b',
              },
            },
              e('span', null,
                e('span', { style: { display: 'inline-block', width: 10, height: 3, background: CERULEAN, borderRadius: 2, marginRight: 5, verticalAlign: 'middle' } }),
                'PSA'),
              Object.entries(MARKER).map(([type, cfg]) =>
                e('span', { key: type },
                  e('span', {
                    style: {
                      display: 'inline-block', width: 8, height: 8, borderRadius: 999,
                      background: cfg.color, marginRight: 5, verticalAlign: 'middle',
                    },
                  }),
                  cfg.label)
              )
            )
          )
        : e('div', { className: 'lt-card', style: { ...cardStyle, marginBottom: 12, color: '#64748b', fontSize: 12 } },
            'At least two PSA values are needed to draw a trend. Add PSA readings to build the trajectory.'),

      // Adherence
      e('div', { className: 'lt-card', style: { marginBottom: 12 } },
        e(AdherencePanel, { adherence })),

      // Event stream
      showEventStream && e('div', { className: 'lt-card', style: { marginBottom: 12 } },
        e(EventStream, { record, onRemove: onRemoveEvent })),

      e('div', {
        style: {
          padding: '10px 12px', background: '#f8fafc', borderRadius: 8,
          fontSize: 10.5, color: '#64748b', lineHeight: 1.55,
        },
      },
        'Velocity, doubling time and density are computed from the recorded values shown above — they are informational context, not a risk classification, and do not change any risk tier. Protocol cadence shown is quarterly PSA and office visit, annual MRI/DRE/uroflow, and surveillance biopsy roughly every three years. All data is stored on this device only and is never uploaded.'
      )
    )
  )
}

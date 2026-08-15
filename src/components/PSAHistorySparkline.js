import React from 'react'
import { getPSAHistory } from '../patientSession.js'
import { loadStore, getActiveRecord, psaSeries } from '../patientRecord.js'
import { computePSAVelocity, computePSADoublingTime, formatVelocity, formatDoublingTime } from '../derivedMetrics.js'

const e = React.createElement

// PSA values come from the clinic-keyed session first (what this component has
// always used). If that session has no PSA history, fall back to the
// longitudinal record so the sparkline still reflects the patient's trajectory.
function resolveEntries(patientId, limit) {
  const fromSession = getPSAHistory(patientId, limit)
  if (fromSession.length >= 2) return { entries: fromSession, source: 'session', full: fromSession }
  const record = getActiveRecord(loadStore())
  const series = record ? psaSeries(record) : []
  if (series.length >= 2) return { entries: series.slice(-limit), source: 'record', full: series }
  return { entries: fromSession, source: 'session', full: fromSession }
}

// Simple SVG line sparkline for the last N PSA readings (and PSAD trend if
// volume was captured), with a dashed reference line at the doubling
// threshold (2x the earliest plotted PSA value).
export default function PSAHistorySparkline({ patientId }) {
  const resolved = resolveEntries(patientId, 3)
  const entries = resolved.entries
  if (!patientId || entries.length < 2) return null

  // Derived kinetics over the FULL series (not just the 3 plotted points).
  const velocity = computePSAVelocity(resolved.full)
  const doublingTime = computePSADoublingTime(resolved.full)

  const W = 320, H = 110
  const padL = 34, padR = 14, padT = 12, padB = 22
  const cW = W - padL - padR
  const cH = H - padT - padB

  const psaVals  = entries.map(en => en.psa)
  const baseline = psaVals[0]
  const doublingThreshold = baseline * 2

  const maxVal = Math.max(...psaVals, doublingThreshold)
  const minVal = Math.min(0, ...psaVals)
  const range  = (maxVal - minVal) || 1

  const times = entries.map(en => new Date(en.date).getTime())
  const minT  = Math.min(...times)
  const maxT  = Math.max(...times)
  const tRange = (maxT - minT) || 1

  const toX = d => padL + ((new Date(d).getTime() - minT) / tRange) * cW
  const toY = v => padT + cH - ((v - minVal) / range) * cH

  const pts   = entries.map(en => ({ x: toX(en.date), y: toY(en.psa) }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const yThresh = toY(doublingThreshold)

  const hasVolume = entries.some(en => en.volume)
  const psadSeries = hasVolume
    ? entries.filter(en => en.volume).map(en => (en.psa / en.volume))
    : null

  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return e('div', {
    style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' },
  },
    e('div', { style: { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
      `PSA History — Patient ${patientId}`,
      resolved.source === 'record' ? ' · from longitudinal record' : ''
    ),
    e('svg', { width: '100%', viewBox: `0 0 ${W} ${H}`, style: { overflow: 'visible', display: 'block' } },
      // axes
      e('line', { x1: padL, y1: padT, x2: padL, y2: padT + cH, stroke: '#e2e8f0', strokeWidth: 1 }),
      e('line', { x1: padL, y1: padT + cH, x2: W - padR, y2: padT + cH, stroke: '#e2e8f0', strokeWidth: 1 }),

      // dashed doubling-threshold line
      yThresh >= padT && yThresh <= padT + cH && e('line', {
        x1: padL, y1: yThresh, x2: W - padR, y2: yThresh,
        stroke: '#DC298D', strokeWidth: 1.2, strokeDasharray: '4,3',
      }),
      yThresh >= padT && yThresh <= padT + cH && e('text', {
        x: W - padR, y: yThresh - 4, textAnchor: 'end', fontSize: 8, fill: '#DC298D', fontWeight: 700,
      }, `Doubling (${doublingThreshold.toFixed(1)})`),

      // PSA line + dots
      e('path', { d: pathD, fill: 'none', stroke: '#06ABEB', strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      pts.map((p, i) => e('circle', { key: i, cx: p.x, cy: p.y, r: 3.5, fill: '#06ABEB', stroke: '#fff', strokeWidth: 1.5 })),

      // x labels
      entries.map((en, i) => e('text', {
        key: 'x' + i, x: toX(en.date), y: H - 4,
        textAnchor: i === 0 ? 'start' : i === entries.length - 1 ? 'end' : 'middle',
        fontSize: 8.5, fill: '#94a3b8',
      }, fmtDate(en.date))),

      // last value label
      e('text', {
        x: pts[pts.length - 1].x + 6, y: pts[pts.length - 1].y + 3.5,
        fontSize: 9, fill: '#0596c7', fontWeight: 700,
      }, psaVals[psaVals.length - 1])
    ),
    psadSeries && e('div', { style: { marginTop: 6, fontSize: 11, color: '#64748b' } },
      e('span', { style: { fontWeight: 700, color: '#212070' } }, 'PSAD trend: '),
      psadSeries.map(v => v.toFixed(3)).join(' → ')
    ),
    (velocity.value !== null || doublingTime.value !== null) &&
      e('div', { style: { marginTop: 4, fontSize: 11, color: '#64748b' } },
        e('span', { style: { fontWeight: 700, color: '#212070' } }, 'Derived: '),
        [
          velocity.value !== null ? `velocity ${formatVelocity(velocity)}` : null,
          doublingTime.value !== null ? `PSADT ${formatDoublingTime(doublingTime)}` : null,
        ].filter(Boolean).join(' · '),
        e('span', { style: { color: '#94a3b8' } },
          ` (${(velocity.value !== null ? velocity.n : doublingTime.n)} values)`)
      )
  )
}

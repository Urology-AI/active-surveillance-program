import React, { useState, useEffect } from 'react'

const e = React.createElement
const PSA_LOG_KEY = 'as_psa_log'

// ln(2) / slope (months) where slope from log-linear regression
function computePSADT(entries) {
  if (entries.length < 2) return null
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
  const t0 = new Date(sorted[0].date).getTime()
  const points = sorted
    .filter(en => en.psa > 0)
    .map(en => ({
      x: (new Date(en.date).getTime() - t0) / (1000 * 60 * 60 * 24 * 30.44),
      y: Math.log(en.psa),
    }))
  if (points.length < 2) return null
  const n = points.length
  const sumX  = points.reduce((s, p) => s + p.x, 0)
  const sumY  = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  if (slope <= 0) return null
  return Math.log(2) / slope // months
}

function formatPSADT(months) {
  if (months === null) return null
  if (months > 120) return '>10 years'
  if (months > 24) return `~${Math.round(months / 12 * 10) / 10} years`
  return `~${Math.round(months)} months`
}

function PSADTContext({ months }) {
  if (months === null) return null
  if (months > 120) return e('span', { style: { color: '#166534' } }, 'Very slow — reassuring')
  if (months > 48)  return e('span', { style: { color: '#166534' } }, 'Slow-growing pattern')
  if (months > 24)  return e('span', { style: { color: '#92400e' } }, 'Moderate — monitor closely')
  return e('span', { style: { color: '#dc2626' } }, 'Discuss with your care team')
}

function PSAChart({ entries }) {
  if (entries.length < 2) return null
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))

  const W = 340, H = 130
  const padL = 38, padR = 16, padT = 12, padB = 28
  const cW = W - padL - padR
  const cH = H - padT - padB

  const psaVals  = sorted.map(en => en.psa)
  const minPSA   = Math.min(...psaVals)
  const maxPSA   = Math.max(...psaVals)
  const spread   = maxPSA - minPSA || 1
  const yMin     = Math.max(0, minPSA - spread * 0.25)
  const yMax     = maxPSA + spread * 0.25

  const times    = sorted.map(en => new Date(en.date).getTime())
  const minT     = Math.min(...times)
  const maxT     = Math.max(...times)
  const tRange   = maxT - minT || 1

  const toX = date  => padL + ((new Date(date).getTime() - minT) / tRange) * cW
  const toY = psa   => padT + cH - ((psa - yMin) / (yMax - yMin)) * cH

  const pts  = sorted.map(en => ({ x: toX(en.date), y: toY(en.psa), psa: en.psa }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map(v => ({
    label: (Math.round(v * 10) / 10).toString(),
    y: toY(v),
  }))

  const xFirst = sorted[0]
  const xLast  = sorted[sorted.length - 1]
  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

  return e('svg', {
    width: '100%',
    viewBox: `0 0 ${W} ${H}`,
    style: { overflow: 'visible', display: 'block' },
  },
    // grid
    yTicks.map(t =>
      e('line', { key: `g${t.label}`, x1: padL, y1: t.y, x2: W - padR, y2: t.y, stroke: '#f1f5f9', strokeWidth: 1 })
    ),
    // axes
    e('line', { x1: padL, y1: padT, x2: padL, y2: padT + cH, stroke: '#e2e8f0', strokeWidth: 1 }),
    e('line', { x1: padL, y1: padT + cH, x2: W - padR, y2: padT + cH, stroke: '#e2e8f0', strokeWidth: 1 }),
    // y labels
    yTicks.map(t =>
      e('text', { key: `y${t.label}`, x: padL - 5, y: t.y + 3.5, textAnchor: 'end', fontSize: 8.5, fill: '#94a3b8' }, t.label)
    ),
    // x labels
    e('text', { x: toX(xFirst.date), y: H - 4, textAnchor: 'start', fontSize: 8.5, fill: '#94a3b8' }, fmtDate(xFirst.date)),
    xFirst.date !== xLast.date && e('text', { x: toX(xLast.date), y: H - 4, textAnchor: 'end', fontSize: 8.5, fill: '#94a3b8' }, fmtDate(xLast.date)),
    // y-axis label
    e('text', { x: 10, y: padT + cH / 2, textAnchor: 'middle', fontSize: 8, fill: '#94a3b8', transform: `rotate(-90, 10, ${padT + cH / 2})` }, 'PSA'),
    // line
    e('path', { d: pathD, fill: 'none', stroke: '#06ABEB', strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
    // dots
    pts.map((p, i) =>
      e('circle', { key: i, cx: p.x, cy: p.y, r: 3.5, fill: '#06ABEB', stroke: '#fff', strokeWidth: 1.5 })
    ),
    // last value label
    e('text', {
      x: pts[pts.length - 1].x + 7,
      y: pts[pts.length - 1].y + 3.5,
      fontSize: 9, fill: '#0596c7', fontWeight: '700',
    }, xLast.psa)
  )
}

export default function PSATracker() {
  const [entries,  setEntries]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ date: '', psa: '', volume: '' })
  const [error,    setError]    = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PSA_LOG_KEY)
      if (saved) setEntries(JSON.parse(saved))
    } catch (_) {}
  }, [])

  function persist(next) {
    setEntries(next)
    try { localStorage.setItem(PSA_LOG_KEY, JSON.stringify(next)) } catch (_) {}
  }

  function handleAdd(ev) {
    ev.preventDefault()
    const psa = parseFloat(form.psa)
    if (!form.date || isNaN(psa) || psa <= 0) {
      setError('Please enter a valid date and PSA value.')
      return
    }
    const vol = form.volume ? parseFloat(form.volume) : null
    const entry = { date: form.date, psa, ...(vol && vol > 0 ? { volume: vol } : {}) }
    const next = [...entries, entry].sort((a, b) => new Date(a.date) - new Date(b.date))
    persist(next)
    setForm({ date: '', psa: '', volume: '' })
    setShowForm(false)
    setError('')
  }

  function handleDelete(entryToRemove) {
    persist(entries.filter(en => en !== entryToRemove))
  }

  const sorted  = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
  const latest  = sorted[sorted.length - 1]
  const prev    = sorted[sorted.length - 2]
  const psadt   = computePSADT(entries)

  const velocityPerMonth = latest && prev
    ? (latest.psa - prev.psa) /
      ((new Date(latest.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24 * 30.44))
    : null

  const velLabel = velocityPerMonth !== null
    ? `${velocityPerMonth >= 0 ? '+' : ''}${velocityPerMonth.toFixed(2)} ng/mL/mo`
    : null

  return e('div', { style: { padding: '14px', maxWidth: 640, margin: '0 auto', boxSizing: 'border-box' } },

    // Header
    e('div', { style: { marginBottom: 14 } },
      e('div', { style: { fontSize: 16, fontWeight: 700, color: '#00002D' } }, 'PSA Log'),
      e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } },
        'Track your PSA values over time. Stored on this device only — never uploaded.'
      )
    ),

    // Stats cards
    entries.length > 0 && e('div', { style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' } },

      latest && e('div', {
        style: { flex: '1 1 90px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' },
      },
        e('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'Latest PSA'),
        e('div', { style: { fontSize: 22, fontWeight: 800, color: '#00002D', lineHeight: 1 } }, latest.psa),
        e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3 } },
          new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        ),
        latest.volume && e('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2 } },
          `PSAD: ${(latest.psa / latest.volume).toFixed(3)}`
        )
      ),

      velLabel !== null && e('div', {
        style: { flex: '1 1 90px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' },
      },
        e('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'Recent Velocity'),
        e('div', {
          style: { fontSize: 16, fontWeight: 800, color: velocityPerMonth > 0.5 ? '#b45309' : '#00002D', lineHeight: 1 },
        }, velLabel),
        e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3 } }, 'since last reading')
      ),

      psadt !== null && e('div', {
        style: {
          flex: '1 1 110px',
          background: psadt < 24 ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${psadt < 24 ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: 10, padding: '10px 12px',
        },
      },
        e('div', { style: { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'Doubling Time'),
        e('div', { style: { fontSize: 15, fontWeight: 800, color: psadt < 24 ? '#dc2626' : '#166534', lineHeight: 1 } }, formatPSADT(psadt)),
        e('div', { style: { fontSize: 10, marginTop: 3 } }, e(PSADTContext, { months: psadt }))
      )
    ),

    // Chart
    sorted.length >= 2 && e('div', {
      style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 12px 8px', marginBottom: 14 },
    },
      e('div', { style: { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, 'Trend'),
      e(PSAChart, { entries: sorted })
    ),

    // Add button
    !showForm && e('button', {
      type: 'button',
      onClick: () => setShowForm(true),
      style: {
        width: '100%', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: 10,
        background: '#f8fafc', color: '#06ABEB', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', marginBottom: 14, boxSizing: 'border-box',
      },
    }, '+ Add PSA Reading'),

    // Add form
    showForm && e('form', {
      onSubmit: handleAdd,
      style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px', marginBottom: 14 },
    },
      e('div', { style: { fontSize: 13, fontWeight: 700, color: '#00002D', marginBottom: 12 } }, 'Add PSA Reading'),
      e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
        e('div', { style: { flex: '1 1 120px' } },
          e('label', { style: { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 } }, 'Date'),
          e('input', {
            type: 'date', value: form.date,
            onChange: ev => setForm(f => ({ ...f, date: ev.target.value })),
            style: { width: '100%', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' },
          })
        ),
        e('div', { style: { flex: '1 1 100px' } },
          e('label', { style: { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 } }, 'PSA (ng/mL)'),
          e('input', {
            type: 'number', step: '0.01', min: '0', value: form.psa, placeholder: 'e.g. 4.2',
            onChange: ev => setForm(f => ({ ...f, psa: ev.target.value })),
            style: { width: '100%', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' },
          })
        ),
        e('div', { style: { flex: '1 1 110px' } },
          e('label', { style: { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 } }, 'Volume (cc) — optional'),
          e('input', {
            type: 'number', step: '0.1', min: '0', value: form.volume, placeholder: 'e.g. 45',
            onChange: ev => setForm(f => ({ ...f, volume: ev.target.value })),
            style: { width: '100%', padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' },
          })
        )
      ),
      (() => {
        const livePsa = parseFloat(form.psa)
        const liveVol = parseFloat(form.volume)
        const livePsad = !isNaN(livePsa) && !isNaN(liveVol) && livePsa > 0 && liveVol > 0
          ? (livePsa / liveVol).toFixed(3)
          : null
        return livePsad && e('div', {
          style: {
            padding: '8px 10px', background: '#f0f9ff', border: '1px solid #bae6fd',
            borderRadius: 8, fontSize: 12, color: '#0369a1', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          },
        },
          e('span', { style: { fontWeight: 700 } }, `PSA Density: ${livePsad} ng/mL/cc`),
          e('span', { style: { color: '#64748b' } },
            livePsad < 0.065 ? '· Low-risk range' : livePsad > 0.177 ? '· Elevated — discuss with care team' : '· Intermediate range'
          )
        )
      })(),
      error && e('div', { style: { fontSize: 12, color: '#dc2626', marginBottom: 8 } }, error),
      e('div', { style: { display: 'flex', gap: 8 } },
        e('button', {
          type: 'submit',
          style: { flex: 1, padding: '8px', borderRadius: 8, background: '#06ABEB', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
        }, 'Save'),
        e('button', {
          type: 'button',
          onClick: () => { setShowForm(false); setError('') },
          style: { padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontSize: 13, cursor: 'pointer' },
        }, 'Cancel')
      )
    ),

    // History table
    sorted.length > 0 && e('div', {
      style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
    },
      e('div', {
        style: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
      }, 'History'),
      sorted.map((entry, i) =>
        e('div', {
          key: i,
          style: {
            padding: '10px 12px', display: 'flex', alignItems: 'center',
            borderBottom: i < sorted.length - 1 ? '1px solid #f8fafc' : 'none',
          },
        },
          e('div', { style: { flex: 1 } },
            e('div', { style: { fontSize: 13, fontWeight: 600, color: '#00002D' } },
              new Date(entry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            ),
            e('div', { style: { fontSize: 11, color: '#64748b', marginTop: 1 } },
              `PSA: ${entry.psa} ng/mL`,
              entry.volume
                ? ` · Volume: ${entry.volume} cc · PSAD: ${(entry.psa / entry.volume).toFixed(3)}`
                : ''
            )
          ),
          e('button', {
            type: 'button',
            onClick: () => handleDelete(entry),
            style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontSize: 11, cursor: 'pointer' },
          }, 'Remove')
        )
      )
    ),

    // Empty state
    entries.length === 0 && !showForm && e('div', {
      style: { textAlign: 'center', padding: '32px 16px', color: '#94a3b8' },
    },
      e('div', { style: { fontSize: 32, marginBottom: 8 } }, '📈'),
      e('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, 'No PSA readings logged yet'),
      e('div', { style: { fontSize: 12 } }, 'Add your first reading to start tracking your trend.')
    ),

    // Disclaimer
    e('div', {
      style: { padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 },
    }, 'Doubling time and velocity are informational only — always discuss changes with your care team. Data stays on this device and is never uploaded or shared.')
  )
}

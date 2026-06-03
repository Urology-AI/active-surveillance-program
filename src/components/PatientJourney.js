import React, { useState, useEffect } from 'react'
import {
  PROGRESSION_STORAGE_KEY,
  defaultProgressionData,
  analyzeProgression,
  formatDate,
  formatPSADT,
  monthsOnAS,
  generateVisitId,
  loadProgressionData,
  saveProgressionData,
  getCohortContext,
} from '../progressionEngine.js'

const e = React.createElement

const C = {
  cerulean: '#06ABEB',
  navy: '#212070',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  slate: '#475569',
  bg: '#f8fafc',
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ d, size = 16, color = 'currentColor', viewBox = '0 0 24 24' }) {
  return e('svg', {
    width: size, height: size, viewBox,
    fill: 'none', stroke: color, strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0,
  }, e('path', { d }))
}

function TrendUp() {
  return e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: C.red, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    e('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
    e('polyline', { points: '17 6 23 6 23 12' })
  )
}
function TrendDown() {
  return e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: C.green, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    e('polyline', { points: '23 18 13.5 8.5 8.5 13.5 1 6' }),
    e('polyline', { points: '17 18 23 18 23 12' })
  )
}
function TrendFlat() {
  return e('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: C.green, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    e('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
  )
}

// ─── PSA Sparkline chart ──────────────────────────────────────────────────────
function PSASparkline({ psaPoints }) {
  if (!psaPoints || psaPoints.length < 2) return null
  const sorted = [...psaPoints].sort((a, b) => new Date(a.date) - new Date(b.date))

  const W = 320, H = 100
  const padL = 36, padR = 12, padT = 12, padB = 26
  const cW = W - padL - padR, cH = H - padT - padB

  const vals = sorted.map(p => p.psa)
  const minV = Math.min(...vals), maxV = Math.max(...vals)
  const spread = maxV - minV || 1
  const yMin = Math.max(0, minV - spread * 0.2), yMax = maxV + spread * 0.2

  const times = sorted.map(p => new Date(p.date).getTime())
  const minT = Math.min(...times), maxT = Math.max(...times)
  const tRange = maxT - minT || 1

  const toX = d => padL + ((new Date(d).getTime() - minT) / tRange) * cW
  const toY = v => padT + cH - ((v - yMin) / (yMax - yMin)) * cH

  const pts = sorted.map(p => ({ x: toX(p.date), y: toY(p.psa), psa: p.psa }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(padT + cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + cH).toFixed(1)} Z`

  const yLabels = [yMin, (yMin + yMax) / 2, yMax].map(v => ({ label: v.toFixed(1), y: toY(v) }))
  const first = sorted[0], last = sorted[sorted.length - 1]
  const fmtShort = d => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

  return e('svg', { width: W, height: H, style: { display: 'block', maxWidth: '100%' } },
    e('defs', null,
      e('linearGradient', { id: 'psaGrad', x1: 0, y1: 0, x2: 0, y2: 1 },
        e('stop', { offset: '0%', stopColor: C.cerulean, stopOpacity: 0.18 }),
        e('stop', { offset: '100%', stopColor: C.cerulean, stopOpacity: 0 })
      )
    ),
    // Area fill
    e('path', { d: areaD, fill: 'url(#psaGrad)', stroke: 'none' }),
    // Line
    e('path', { d: pathD, fill: 'none', stroke: C.cerulean, strokeWidth: 2, strokeLinejoin: 'round' }),
    // Dots
    ...pts.map((p, i) =>
      e('circle', { key: i, cx: p.x, cy: p.y, r: 3.5, fill: '#fff', stroke: C.cerulean, strokeWidth: 1.5 })
    ),
    // Y labels
    ...yLabels.map((l, i) =>
      e('text', { key: i, x: padL - 5, y: l.y + 4, textAnchor: 'end', fontSize: 9, fill: '#94a3b8' }, l.label)
    ),
    // X labels
    e('text', { x: toX(first.date), y: H - 6, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8' }, fmtShort(first.date)),
    e('text', { x: toX(last.date), y: H - 6, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8' }, fmtShort(last.date)),
  )
}

// ─── Status banner ────────────────────────────────────────────────────────────
function StatusBanner({ tier, flagCount, monthsOnAS: mos }) {
  const configs = {
    stable: { bg: '#f0fdf4', border: '#bbf7d0', text: C.green, icon: '✓', label: 'Stable on Surveillance', sub: 'No AUA/NCCN progression triggers detected.' },
    watch: { bg: '#fffbeb', border: '#fde68a', text: C.amber, icon: '!', label: 'Monitor Closely', sub: `${flagCount} concern${flagCount !== 1 ? 's' : ''} flagged — review with your care team.` },
    progressed: { bg: '#fef2f2', border: '#fecaca', text: C.red, icon: '⚠', label: 'Progression Detected', sub: 'Discuss treatment options with your urologist.' },
    no_data: { bg: '#f1f5f9', border: '#cbd5e1', text: C.slate, icon: '○', label: 'No Data Yet', sub: 'Add your enrollment and visit data to track progression.' },
  }
  const cfg = configs[tier] || configs.no_data

  return e('div', {
    style: {
      background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12,
      padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
    },
  },
    e('div', {
      style: {
        width: 32, height: 32, borderRadius: 999, background: cfg.text,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 800, flexShrink: 0,
      },
    }, cfg.icon),
    e('div', { style: { flex: 1 } },
      e('div', { style: { fontWeight: 700, fontSize: 14, color: cfg.text } }, cfg.label),
      e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } }, cfg.sub),
      mos != null && e('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } },
        `${Math.round(mos)} months on active surveillance`
      )
    )
  )
}

// ─── Flag card ────────────────────────────────────────────────────────────────
function FlagCard({ flag }) {
  const colors = {
    critical: { bg: '#fef2f2', border: '#fecaca', dot: C.red, text: C.red },
    warning:  { bg: '#fffbeb', border: '#fde68a', dot: C.amber, text: C.amber },
    info:     { bg: '#eff6ff', border: '#bfdbfe', dot: C.cerulean, text: C.cerulean },
  }
  const col = colors[flag.severity] || colors.info

  return e('div', {
    style: {
      background: col.bg, border: `1px solid ${col.border}`,
      borderRadius: 10, padding: '12px 14px',
    },
  },
    e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
      e('div', { style: { width: 8, height: 8, borderRadius: '50%', background: col.dot, flexShrink: 0 } }),
      e('span', { style: { fontWeight: 700, fontSize: 13, color: col.text } }, flag.label)
    ),
    e('p', { style: { margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 } }, flag.detail),
    e('p', { style: { margin: '6px 0 0', fontSize: 10, color: '#94a3b8' } }, `Source: ${flag.source}`)
  )
}

// ─── Visit timeline card ──────────────────────────────────────────────────────
function VisitCard({ visit, isFirst, onDelete }) {
  const hasBiopsy = visit.biopsy && visit.biopsy.gg != null
  const hasMRI    = visit.mri && (visit.mri.pirads != null || visit.mri.newLesion)

  return e('div', {
    style: {
      display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative',
    },
  },
    // Timeline dot + line
    e('div', {
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
    },
      e('div', {
        style: {
          width: 12, height: 12, borderRadius: '50%', marginTop: 4,
          background: hasBiopsy ? C.navy : C.cerulean,
          border: '2px solid #fff', boxShadow: `0 0 0 2px ${hasBiopsy ? C.navy : C.cerulean}`,
        },
      }),
      !isFirst && e('div', { style: { width: 2, flex: 1, background: '#e2e8f0', minHeight: 24, marginTop: 4 } })
    ),
    // Content
    e('div', {
      style: {
        flex: 1, background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 10, padding: '12px 14px', marginBottom: 10,
      },
    },
      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
        e('div', null,
          e('div', { style: { fontSize: 12, fontWeight: 700, color: '#1e293b' } }, formatDate(visit.date)),
          hasBiopsy && e('span', {
            style: {
              display: 'inline-block', marginTop: 3, padding: '2px 7px',
              background: '#e0f2fe', color: C.navy, fontSize: 10, fontWeight: 700,
              borderRadius: 999,
            },
          }, `Biopsy · GG${visit.biopsy.gg}`)
        ),
        e('button', {
          type: 'button',
          onClick: onDelete,
          style: {
            background: 'none', border: 'none', color: '#cbd5e1',
            cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1,
          },
        }, '×')
      ),
      // PSA row
      visit.psa != null && e('div', { style: { marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' } },
        e('div', null,
          e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'PSA'),
          e('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e293b' } }, `${visit.psa} ng/mL`)
        ),
        visit.prostateVolume != null && e('div', null,
          e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'PSAD'),
          e('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e293b' } },
            `${(visit.psa / visit.prostateVolume).toFixed(3)} ng/mL/cc`
          )
        )
      ),
      // MRI
      hasMRI && e('div', { style: { marginTop: 8 } },
        e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'MRI'),
        e('div', { style: { fontSize: 12, color: '#334155' } },
          visit.mri.pirads != null ? `PI-RADS ${visit.mri.pirads}` : '',
          visit.mri.newLesion ? ' · New lesion' : '',
          visit.mri.notes ? ` · ${visit.mri.notes}` : ''
        )
      ),
      // DRE
      visit.dre && visit.dre !== 'not_done' && e('div', { style: { marginTop: 8 } },
        e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'DRE'),
        e('div', {
          style: {
            fontSize: 12,
            color: visit.dre === 'abnormal' ? C.red : C.green,
            fontWeight: 600,
          },
        }, visit.dre === 'abnormal' ? 'Abnormal' : 'Normal')
      ),
      // Notes
      visit.notes && e('p', { style: { margin: '8px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 } }, visit.notes)
    )
  )
}

// ─── Add Visit Form ───────────────────────────────────────────────────────────
function AddVisitForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    psa: '', prostateVolume: '',
    hasBiopsy: false, biopsyGG: '', biopsyCores: '', biopsyPositive: '',
    hasMRI: false, pirads: '', newLesion: false, mriNotes: '',
    dre: 'not_done', notes: '',
  })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  function submit(ev) {
    ev.preventDefault()
    const visit = {
      id: generateVisitId(),
      date: form.date,
      psa: form.psa ? parseFloat(form.psa) : null,
      prostateVolume: form.prostateVolume ? parseFloat(form.prostateVolume) : null,
      biopsy: form.hasBiopsy && form.biopsyGG
        ? { gg: parseInt(form.biopsyGG), totalCores: form.biopsyCores ? parseInt(form.biopsyCores) : null, positiveCores: form.biopsyPositive ? parseInt(form.biopsyPositive) : null }
        : null,
      mri: form.hasMRI
        ? { pirads: form.pirads ? parseInt(form.pirads) : null, newLesion: form.newLesion, notes: form.mriNotes }
        : null,
      dre: form.dre || null,
      notes: form.notes,
    }
    onAdd(visit)
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, color: '#1e293b', boxSizing: 'border-box',
    outline: 'none', background: '#fff',
  }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }
  const rowStyle = { display: 'flex', gap: 10 }

  return e('form', {
    onSubmit: submit,
    style: {
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
    },
  },
    e('div', { style: { fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 } }, 'Add Visit Entry'),

    // Date
    e('div', null,
      e('label', { style: labelStyle }, 'Visit Date'),
      e('input', { type: 'date', value: form.date, onChange: ev => set('date', ev.target.value), style: inputStyle, required: true })
    ),

    // PSA + Volume
    e('div', { style: rowStyle },
      e('div', { style: { flex: 1 } },
        e('label', { style: labelStyle }, 'PSA (ng/mL)'),
        e('input', { type: 'number', step: '0.01', min: 0, value: form.psa, onChange: ev => set('psa', ev.target.value), placeholder: 'e.g. 4.2', style: inputStyle })
      ),
      e('div', { style: { flex: 1 } },
        e('label', { style: labelStyle }, 'Prostate Volume (cc)'),
        e('input', { type: 'number', step: '0.1', min: 0, value: form.prostateVolume, onChange: ev => set('prostateVolume', ev.target.value), placeholder: 'e.g. 45', style: inputStyle })
      )
    ),

    // Biopsy toggle
    e('div', null,
      e('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' } },
        e('input', { type: 'checkbox', checked: form.hasBiopsy, onChange: ev => set('hasBiopsy', ev.target.checked) }),
        e('span', { style: { fontSize: 13, fontWeight: 600, color: '#334155' } }, 'Biopsy performed at this visit')
      ),
      form.hasBiopsy && e('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
        e('div', null,
          e('label', { style: labelStyle }, 'Grade Group Result'),
          e('select', {
            value: form.biopsyGG, onChange: ev => set('biopsyGG', ev.target.value),
            style: inputStyle, required: form.hasBiopsy,
          },
            e('option', { value: '' }, 'Select…'),
            [1, 2, 3, 4, 5].map(g => e('option', { key: g, value: g }, `Grade Group ${g}`))
          )
        ),
        e('div', { style: rowStyle },
          e('div', { style: { flex: 1 } },
            e('label', { style: labelStyle }, 'Total Cores'),
            e('input', { type: 'number', min: 1, value: form.biopsyCores, onChange: ev => set('biopsyCores', ev.target.value), placeholder: 'e.g. 12', style: inputStyle })
          ),
          e('div', { style: { flex: 1 } },
            e('label', { style: labelStyle }, 'Positive Cores'),
            e('input', { type: 'number', min: 0, value: form.biopsyPositive, onChange: ev => set('biopsyPositive', ev.target.value), placeholder: 'e.g. 2', style: inputStyle })
          )
        )
      )
    ),

    // MRI toggle
    e('div', null,
      e('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' } },
        e('input', { type: 'checkbox', checked: form.hasMRI, onChange: ev => set('hasMRI', ev.target.checked) }),
        e('span', { style: { fontSize: 13, fontWeight: 600, color: '#334155' } }, 'MRI at this visit')
      ),
      form.hasMRI && e('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
        e('div', null,
          e('label', { style: labelStyle }, 'PI-RADS Score'),
          e('select', {
            value: form.pirads, onChange: ev => set('pirads', ev.target.value), style: inputStyle,
          },
            e('option', { value: '' }, 'Not recorded'),
            [1, 2, 3, 4, 5].map(p => e('option', { key: p, value: p }, `PI-RADS ${p}`))
          )
        ),
        e('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#334155' } },
          e('input', { type: 'checkbox', checked: form.newLesion, onChange: ev => set('newLesion', ev.target.checked) }),
          'New suspicious lesion'
        ),
        e('div', null,
          e('label', { style: labelStyle }, 'Notes (optional)'),
          e('input', { type: 'text', value: form.mriNotes, onChange: ev => set('mriNotes', ev.target.value), placeholder: 'e.g. stable 8mm lesion L PZ', style: inputStyle })
        )
      )
    ),

    // DRE
    e('div', null,
      e('label', { style: labelStyle }, 'Digital Rectal Exam (DRE)'),
      e('select', { value: form.dre, onChange: ev => set('dre', ev.target.value), style: inputStyle },
        e('option', { value: 'not_done' }, 'Not done at this visit'),
        e('option', { value: 'normal' }, 'Normal'),
        e('option', { value: 'abnormal' }, 'Abnormal — new finding')
      )
    ),

    // Notes
    e('div', null,
      e('label', { style: labelStyle }, 'Clinical Notes (optional)'),
      e('textarea', {
        value: form.notes, onChange: ev => set('notes', ev.target.value),
        placeholder: 'Any additional notes from this visit…',
        rows: 2,
        style: { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' },
      })
    ),

    // Actions
    e('div', { style: { display: 'flex', gap: 8 } },
      e('button', {
        type: 'submit',
        style: {
          flex: 1, padding: '9px', background: C.cerulean, color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        },
      }, 'Save Visit'),
      e('button', {
        type: 'button', onClick: onCancel,
        style: {
          padding: '9px 14px', background: '#f1f5f9', color: '#64748b',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        },
      }, 'Cancel')
    )
  )
}

// ─── Enrollment setup form ────────────────────────────────────────────────────
function EnrollmentForm({ onSave }) {
  const [form, setForm] = useState({ enrollmentDate: '', enrollmentGG: '1', enrollmentPSA: '', prostateVolume: '', age: '', race: 'unknown' })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#1e293b', boxSizing: 'border-box', outline: 'none', background: '#fff' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }

  function submit(ev) {
    ev.preventDefault()
    const data = {
      ...defaultProgressionData(),
      enrollmentDate: form.enrollmentDate,
      enrollmentGG: parseInt(form.enrollmentGG),
      enrollmentPSA: form.enrollmentPSA,
      prostateVolume: form.prostateVolume,
      age: form.age,
      race: form.race,
      visits: [],
    }
    onSave(data)
  }

  return e('div', {
    style: { padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  },
    e('div', { style: { textAlign: 'center', marginBottom: 4 } },
      e('div', { style: { fontSize: 22, marginBottom: 6 } }, '📋'),
      e('div', { style: { fontSize: 15, fontWeight: 700, color: '#1e293b' } }, 'Set Up Your Journey'),
      e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 } },
        'Enter your enrollment details to start tracking your active surveillance journey.'
      )
    ),
    e('form', { onSubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      e('div', null,
        e('label', { style: labelStyle }, 'AS Enrollment Date'),
        e('input', { type: 'date', value: form.enrollmentDate, onChange: ev => set('enrollmentDate', ev.target.value), style: inputStyle, required: true })
      ),
      e('div', { style: { display: 'flex', gap: 10 } },
        e('div', { style: { flex: 1 } },
          e('label', { style: labelStyle }, 'Grade Group at Enrollment'),
          e('select', { value: form.enrollmentGG, onChange: ev => set('enrollmentGG', ev.target.value), style: inputStyle },
            [1, 2, 3, 4, 5].map(g => e('option', { key: g, value: g }, `GG ${g}`))
          )
        ),
        e('div', { style: { flex: 1 } },
          e('label', { style: labelStyle }, 'PSA at Enrollment (ng/mL)'),
          e('input', { type: 'number', step: '0.01', min: 0, value: form.enrollmentPSA, onChange: ev => set('enrollmentPSA', ev.target.value), placeholder: 'e.g. 5.1', style: inputStyle, required: true })
        )
      ),
      e('div', { style: { display: 'flex', gap: 10 } },
        e('div', { style: { flex: 1 } },
          e('label', { style: labelStyle }, 'Prostate Volume (cc)'),
          e('input', { type: 'number', step: '0.1', min: 0, value: form.prostateVolume, onChange: ev => set('prostateVolume', ev.target.value), placeholder: 'e.g. 45', style: inputStyle })
        ),
        e('div', { style: { flex: 1 } },
          e('label', { style: labelStyle }, 'Age at Enrollment'),
          e('input', { type: 'number', min: 18, max: 120, value: form.age, onChange: ev => set('age', ev.target.value), placeholder: 'e.g. 65', style: inputStyle })
        )
      ),
      e('div', null,
        e('label', { style: labelStyle }, 'Race / Ethnicity (for cohort context)'),
        e('select', { value: form.race, onChange: ev => set('race', ev.target.value), style: inputStyle },
          e('option', { value: 'unknown' }, 'Prefer not to say'),
          e('option', { value: 'caucasian' }, 'Caucasian / White'),
          e('option', { value: 'african_american' }, 'African American / Black'),
          e('option', { value: 'other' }, 'Other')
        )
      ),
      e('button', {
        type: 'submit',
        style: { padding: '10px', background: C.cerulean, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
      }, 'Start Tracking My Journey')
    )
  )
}

// ─── Main PatientJourney component ────────────────────────────────────────────
export default function PatientJourney({ textScale = 1 }) {
  const [data, setData] = useState(null)
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [showCohort, setShowCohort] = useState(false)

  useEffect(() => {
    const saved = loadProgressionData()
    if (saved) setData(saved)
  }, [])

  function persistData(d) {
    setData(d)
    saveProgressionData(d)
  }

  function handleEnrollmentSave(d) {
    persistData(d)
  }

  function handleAddVisit(visit) {
    const updated = { ...data, visits: [...(data.visits || []), visit].sort((a, b) => new Date(b.date) - new Date(a.date)) }
    persistData(updated)
    setShowAddVisit(false)
  }

  function handleDeleteVisit(id) {
    const updated = { ...data, visits: data.visits.filter(v => v.id !== id) }
    persistData(updated)
  }

  function handleReset() {
    if (window.confirm('Reset all journey data? This cannot be undone.')) {
      try { localStorage.removeItem(PROGRESSION_STORAGE_KEY) } catch (_) {}
      setData(null)
      setShowAddVisit(false)
    }
  }

  // No enrollment data yet
  if (!data) {
    return e('div', { style: { overflowY: 'auto', maxWidth: 600, width: '100%', margin: '0 auto' } },
      e(EnrollmentForm, { onSave: handleEnrollmentSave })
    )
  }

  // Analyze
  const analysis = analyzeProgression(data)
  const mos = monthsOnAS(data.enrollmentDate)
  const psadt = analysis.psadt
  const psaVelocity = analysis.psaVelocity
  const cohortLines = getCohortContext(data, analysis)
  const sortedVisits = [...(data.visits || [])].sort((a, b) => new Date(b.date) - new Date(a.date))

  const latestPSA = data.visits.filter(v => v.psa != null).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.psa
    ?? (data.enrollmentPSA ? parseFloat(data.enrollmentPSA) : null)

  const fs = n => n * textScale

  return e('div', {
    style: { overflowY: 'auto', padding: '14px 14px 80px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  },

    // Header
    e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
      e('div', null,
        e('div', { style: { fontSize: fs(16), fontWeight: 800, color: '#1e293b' } }, 'My AS Journey'),
        data.enrollmentDate && e('div', { style: { fontSize: fs(11), color: '#94a3b8', marginTop: 2 } },
          `Enrolled ${formatDate(data.enrollmentDate)}`
        )
      ),
      e('button', {
        type: 'button', onClick: handleReset,
        style: { fontSize: 10, color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' },
      }, 'Reset')
    ),

    // Status banner
    e(StatusBanner, {
      tier: analysis.summaryTier,
      flagCount: analysis.flags.length,
      monthsOnAS: mos,
    }),

    // Key metrics row
    e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      // PSA
      e('div', {
        style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' },
      },
        e('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 } }, 'Latest PSA'),
        latestPSA != null
          ? e('div', { style: { fontSize: fs(20), fontWeight: 800, color: '#1e293b' } }, `${latestPSA}`, e('span', { style: { fontSize: fs(11), color: '#94a3b8', fontWeight: 500, marginLeft: 3 } }, 'ng/mL'))
          : e('div', { style: { fontSize: 13, color: '#cbd5e1' } }, '—')
      ),
      // PSADT
      e('div', {
        style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' },
      },
        e('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 } }, 'PSA Doubling Time'),
        psadt != null
          ? e('div', { style: { fontSize: fs(16), fontWeight: 800, color: psadt < 36 ? C.red : psadt < 60 ? C.amber : C.green } }, formatPSADT(psadt))
          : e('div', { style: { fontSize: 13, color: '#cbd5e1' } }, 'Need ≥ 2 PSAs')
      ),
      // Grade Group
      e('div', {
        style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' },
      },
        e('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 } }, 'Grade Group'),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          e('div', { style: { fontSize: fs(20), fontWeight: 800, color: analysis.upgradeEvent ? C.red : '#1e293b' } },
            `GG${analysis.latestGG}`
          ),
          analysis.upgradeEvent && e('span', { style: { fontSize: 10, color: C.red, fontWeight: 700 } }, '↑ Upgraded')
        )
      ),
      // Months on AS
      e('div', {
        style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' },
      },
        e('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 } }, 'Time on AS'),
        mos != null
          ? e('div', { style: { fontSize: fs(16), fontWeight: 800, color: '#1e293b' } },
              mos < 24 ? `${Math.round(mos)} mo` : `${(mos / 12).toFixed(1)} yr`
            )
          : e('div', { style: { fontSize: 13, color: '#cbd5e1' } }, '—')
      )
    ),

    // PSA Chart
    analysis.psaPoints.length >= 2 && e('div', {
      style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' },
    },
      e('div', { style: { fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 } }, 'PSA Trend'),
      e(PSASparkline, { psaPoints: analysis.psaPoints }),
      psaVelocity != null && e('div', { style: { marginTop: 6, fontSize: 11, color: '#64748b' } },
        `Velocity: ${psaVelocity > 0 ? '+' : ''}${psaVelocity.toFixed(2)} ng/mL/yr`,
        psaVelocity > 0.75 && e('span', { style: { color: C.amber, fontWeight: 700, marginLeft: 6 } }, '↑ Elevated')
      )
    ),

    // Progression flags
    analysis.flags.length > 0 && e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      e('div', { style: { fontSize: 12, fontWeight: 700, color: '#1e293b' } }, 'Clinical Signals'),
      ...analysis.flags.map((f, i) => e(FlagCard, { key: i, flag: f }))
    ),

    // Visit timeline
    e('div', null,
      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
        e('div', { style: { fontSize: 12, fontWeight: 700, color: '#1e293b' } },
          `Visit History (${sortedVisits.length})`
        ),
        !showAddVisit && e('button', {
          type: 'button',
          onClick: () => setShowAddVisit(true),
          style: {
            padding: '6px 12px', background: C.cerulean, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          },
        }, '+ Add Visit')
      ),

      // Enrollment node
      e('div', {
        style: { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
      },
        e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 } },
          e('div', { style: { width: 12, height: 12, borderRadius: '50%', background: C.navy, border: '2px solid #fff', boxShadow: `0 0 0 2px ${C.navy}`, marginTop: 4 } }),
          sortedVisits.length > 0 && e('div', { style: { width: 2, flex: 1, background: '#e2e8f0', minHeight: 24, marginTop: 4 } })
        ),
        e('div', {
          style: { flex: 1, background: '#fff', border: `1px solid ${C.navy}22`, borderRadius: 10, padding: '12px 14px', marginBottom: 0 },
        },
          e('div', { style: { fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 } }, 'AS Enrollment'),
          e('div', { style: { fontSize: 12, fontWeight: 600, color: '#1e293b' } }, formatDate(data.enrollmentDate)),
          e('div', { style: { marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' } },
            e('div', null,
              e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' } }, 'Grade Group'),
              e('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e293b' } }, `GG${data.enrollmentGG}`)
            ),
            data.enrollmentPSA && e('div', null,
              e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' } }, 'PSA'),
              e('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e293b' } }, `${data.enrollmentPSA} ng/mL`)
            ),
            data.prostateVolume && data.enrollmentPSA && e('div', null,
              e('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' } }, 'PSAD'),
              e('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e293b' } },
                `${(parseFloat(data.enrollmentPSA) / parseFloat(data.prostateVolume)).toFixed(3)}`
              )
            )
          )
        )
      ),

      // Add visit form
      showAddVisit && e('div', { style: { marginBottom: 10 } },
        e(AddVisitForm, { onAdd: handleAddVisit, onCancel: () => setShowAddVisit(false) })
      ),

      // Visit cards
      sortedVisits.length === 0 && !showAddVisit
        ? e('div', {
            style: { textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 12 },
          }, 'No visits recorded yet. Add your first follow-up visit above.')
        : sortedVisits.map((v, i) =>
            e(VisitCard, {
              key: v.id,
              visit: v,
              isFirst: i === sortedVisits.length - 1,
              onDelete: () => handleDeleteVisit(v.id),
            })
          )
    ),

    // Cohort context
    e('div', {
      style: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, overflow: 'hidden' },
    },
      e('button', {
        type: 'button',
        onClick: () => setShowCohort(prev => !prev),
        style: {
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px', background: 'none', border: 'none',
          fontSize: 12, fontWeight: 700, color: C.navy, cursor: 'pointer',
        },
      },
        'How patients like you have done in our program',
        e('span', null, showCohort ? '▲' : '▼')
      ),
      showCohort && e('div', { style: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 } },
        ...cohortLines.map((l, i) =>
          e('p', { key: i, style: { margin: 0, fontSize: 12, color: '#1e3a5f', lineHeight: 1.55 } }, l)
        ),
        e('p', { style: { margin: '8px 0 0', fontSize: 10, color: '#7dd3fc' } },
          'Source: Mount Sinai Tewari AS Program, N=1,213 patients'
        )
      )
    )
  )
}

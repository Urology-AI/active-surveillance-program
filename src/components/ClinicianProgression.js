import React, { useState, useEffect, useRef } from 'react'
import {
  defaultProgressionData,
  analyzeProgression,
  formatDate,
  formatPSADT,
  monthsOnAS,
  generateVisitId,
  getCohortContext,
  ROSTER_STORAGE_KEY,
  loadRoster,
  saveRoster,
  getActivePatient,
  upsertPatient,
  deletePatient,
  newPatientRecord,
  exportJSON,
  exportCSV,
  parseImportJSON,
  generatePatientId,
} from '../progressionEngine.js'

const e = React.createElement

const C = {
  cerulean: '#06ABEB',
  navy: '#212070',
  cetacean: '#00002D',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  slate: '#475569',
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const sig = x => 1 / (1 + Math.exp(-x))

const inputStyle = {
  width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 13, color: '#1e293b', boxSizing: 'border-box',
  outline: 'none', background: '#fff',
}
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 3 }
const sectionHead = {
  fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase',
  letterSpacing: '0.1em', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e2e8f0',
}

// ─── PSA chart ────────────────────────────────────────────────────────────────
function MiniPSAChart({ psaPoints }) {
  if (!psaPoints || psaPoints.length < 2) return null
  const sorted = [...psaPoints].sort((a, b) => new Date(a.date) - new Date(b.date))
  const W = 400, H = 120, padL = 40, padR = 16, padT = 12, padB = 28
  const cW = W - padL - padR, cH = H - padT - padB
  const vals = sorted.map(p => p.psa)
  const minV = Math.min(...vals), maxV = Math.max(...vals), spread = maxV - minV || 1
  const yMin = Math.max(0, minV - spread * 0.2), yMax = maxV + spread * 0.2
  const times = sorted.map(p => new Date(p.date).getTime())
  const minT = Math.min(...times), maxT = Math.max(...times), tRange = maxT - minT || 1
  const toX = d => padL + ((new Date(d).getTime() - minT) / tRange) * cW
  const toY = v => padT + cH - ((v - yMin) / (yMax - yMin)) * cH
  const pts = sorted.map(p => ({ x: toX(p.date), y: toY(p.psa) }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(padT + cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT + cH).toFixed(1)} Z`
  const yTicks = [yMin, (yMin + yMax) / 2, yMax]
  const fmtShort = d => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  return e('svg', { width: '100%', height: H, viewBox: `0 0 ${W} ${H}`, style: { display: 'block' } },
    e('defs', null,
      e('linearGradient', { id: 'cpGrad', x1: 0, y1: 0, x2: 0, y2: 1 },
        e('stop', { offset: '0%', stopColor: C.cerulean, stopOpacity: 0.15 }),
        e('stop', { offset: '100%', stopColor: C.cerulean, stopOpacity: 0 })
      )
    ),
    e('path', { d: areaD, fill: 'url(#cpGrad)', stroke: 'none' }),
    e('path', { d: pathD, fill: 'none', stroke: C.cerulean, strokeWidth: 2, strokeLinejoin: 'round' }),
    ...pts.map((p, i) => e('circle', { key: i, cx: p.x, cy: p.y, r: 4, fill: '#fff', stroke: C.cerulean, strokeWidth: 1.5 })),
    ...yTicks.map((v, i) => e('text', { key: i, x: padL - 5, y: toY(v) + 4, textAnchor: 'end', fontSize: 10, fill: '#94a3b8' }, v.toFixed(1))),
    e('text', { x: toX(sorted[0].date), y: H - 6, textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' }, fmtShort(sorted[0].date)),
    e('text', { x: toX(sorted[sorted.length - 1].date), y: H - 6, textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' }, fmtShort(sorted[sorted.length - 1].date)),
    e('text', { x: padL, y: padT - 2, fontSize: 9, fill: '#94a3b8', fontWeight: 700 }, 'PSA (ng/mL)')
  )
}

// ─── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ tier, size = 8 }) {
  const color = { stable: C.green, watch: C.amber, progressed: C.red }[tier] ?? '#94a3b8'
  return e('div', { style: { width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 } })
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value, sub, color = '#1e293b', footnote }) {
  return e('div', {
    style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', minWidth: 110 },
  },
    e('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 } }, label),
    e('div', { style: { fontSize: 20, fontWeight: 800, color } }, value),
    sub && e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, sub),
    footnote && e('div', { style: { fontSize: 9, color: C.amber, marginTop: 3, fontStyle: 'italic' } }, footnote)
  )
}

// ─── Trigger badge ────────────────────────────────────────────────────────────
function TriggerBadge({ flag }) {
  const sev = {
    critical: { bg: '#fef2f2', border: '#fca5a5', dot: C.red,     text: '#991b1b' },
    warning:  { bg: '#fffbeb', border: '#fde68a', dot: C.amber,   text: '#92400e' },
  }[flag.severity] || { bg: '#eff6ff', border: '#bfdbfe', dot: C.cerulean, text: '#1e40af' }
  return e('div', { style: { background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 8, padding: '10px 12px' } },
    e('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
      e('div', { style: { width: 8, height: 8, borderRadius: '50%', background: sev.dot, flexShrink: 0, marginTop: 4 } }),
      e('div', { style: { flex: 1 } },
        e('div', { style: { fontSize: 13, fontWeight: 700, color: sev.text } }, flag.label),
        e('div', { style: { fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.5 } }, flag.detail),
        e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4 } }, flag.source)
      )
    )
  )
}

// ─── Visit row ────────────────────────────────────────────────────────────────
function VisitRow({ visit, enrollmentGG, onDelete }) {
  const hasBiopsy = visit.biopsy && visit.biopsy.gg != null
  const upgraded  = hasBiopsy && visit.biopsy.gg > enrollmentGG
  const psad      = visit.psa && visit.prostateVolume ? (visit.psa / visit.prostateVolume).toFixed(3) : null
  return e('tr', { style: { borderBottom: '1px solid #f1f5f9' } },
    e('td', { style: { padding: '8px 12px', fontSize: 12, color: '#475569', whiteSpace: 'nowrap' } }, formatDate(visit.date)),
    e('td', { style: { padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#1e293b', textAlign: 'center' } }, visit.psa ?? '—'),
    e('td', { style: { padding: '8px 12px', fontSize: 12, color: '#475569', textAlign: 'center' } }, psad ?? '—'),
    e('td', { style: { padding: '8px 12px', textAlign: 'center' } },
      hasBiopsy
        ? e('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: upgraded ? '#fee2e2' : '#dcfce7', color: upgraded ? C.red : C.green } }, `GG${visit.biopsy.gg}${upgraded ? ' ↑' : ''}`)
        : e('span', { style: { fontSize: 12, color: '#cbd5e1' } }, '—')
    ),
    e('td', { style: { padding: '8px 12px', fontSize: 12, color: '#475569', textAlign: 'center' } }, visit.mri?.pirads != null ? `PI-RADS ${visit.mri.pirads}` : '—'),
    e('td', { style: { padding: '8px 12px', textAlign: 'center' } },
      visit.dre === 'abnormal' ? e('span', { style: { fontSize: 11, fontWeight: 700, color: C.red } }, 'Abn')
      : visit.dre === 'normal' ? e('span', { style: { fontSize: 11, color: C.green } }, 'Nml')
      : e('span', { style: { fontSize: 12, color: '#cbd5e1' } }, '—')
    ),
    e('td', { style: { padding: '8px 12px', textAlign: 'center' } },
      e('button', { type: 'button', onClick: onDelete, style: { background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 16, padding: '0 4px' } }, '×')
    )
  )
}

// ─── Add Visit Form ───────────────────────────────────────────────────────────
function AddVisitPanel({ onAdd, onCancel }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), psa: '', prostateVolume: '', hasBiopsy: false, biopsyGG: '', biopsyCores: '', biopsyPositive: '', hasMRI: false, pirads: '', newLesion: false, mriNotes: '', dre: 'not_done', notes: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  function submit(ev) {
    ev.preventDefault()
    onAdd({
      id: generateVisitId(),
      date: form.date,
      psa: form.psa ? parseFloat(form.psa) : null,
      prostateVolume: form.prostateVolume ? parseFloat(form.prostateVolume) : null,
      biopsy: form.hasBiopsy && form.biopsyGG ? { gg: parseInt(form.biopsyGG), totalCores: form.biopsyCores ? parseInt(form.biopsyCores) : null, positiveCores: form.biopsyPositive ? parseInt(form.biopsyPositive) : null } : null,
      mri: form.hasMRI ? { pirads: form.pirads ? parseInt(form.pirads) : null, newLesion: form.newLesion, notes: form.mriNotes } : null,
      dre: form.dre || null,
      notes: form.notes,
    })
  }
  return e('form', { onSubmit: submit, style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 } },
    e('div', { style: { fontSize: 12, fontWeight: 700, color: '#1e293b' } }, '+ Add Follow-up Visit'),
    e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
      e('div', { style: { minWidth: 140 } }, e('label', { style: labelStyle }, 'Visit Date'), e('input', { type: 'date', value: form.date, onChange: ev => set('date', ev.target.value), style: inputStyle, required: true })),
      e('div', { style: { minWidth: 100 } }, e('label', { style: labelStyle }, 'PSA (ng/mL)'), e('input', { type: 'number', step: '0.01', min: 0, value: form.psa, onChange: ev => set('psa', ev.target.value), placeholder: '4.2', style: inputStyle })),
      e('div', { style: { minWidth: 100 } }, e('label', { style: labelStyle }, 'Vol (cc)'), e('input', { type: 'number', step: '0.1', min: 0, value: form.prostateVolume, onChange: ev => set('prostateVolume', ev.target.value), placeholder: '45', style: inputStyle })),
      e('div', { style: { minWidth: 80 } }, e('label', { style: labelStyle }, 'DRE'), e('select', { value: form.dre, onChange: ev => set('dre', ev.target.value), style: inputStyle }, e('option', { value: 'not_done' }, 'N/A'), e('option', { value: 'normal' }, 'Normal'), e('option', { value: 'abnormal' }, 'Abnormal')))
    ),
    e('div', { style: { display: 'flex', gap: 20, flexWrap: 'wrap' } },
      e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#334155', fontWeight: 600 } }, e('input', { type: 'checkbox', checked: form.hasBiopsy, onChange: ev => set('hasBiopsy', ev.target.checked) }), 'Biopsy'),
      e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#334155', fontWeight: 600 } }, e('input', { type: 'checkbox', checked: form.hasMRI, onChange: ev => set('hasMRI', ev.target.checked) }), 'MRI')
    ),
    form.hasBiopsy && e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
      e('div', { style: { minWidth: 130 } }, e('label', { style: labelStyle }, 'Grade Group'), e('select', { value: form.biopsyGG, onChange: ev => set('biopsyGG', ev.target.value), style: inputStyle, required: form.hasBiopsy }, e('option', { value: '' }, 'Select…'), [1, 2, 3, 4, 5].map(g => e('option', { key: g, value: g }, `GG ${g}`)))),
      e('div', { style: { minWidth: 90 } }, e('label', { style: labelStyle }, 'Total Cores'), e('input', { type: 'number', min: 1, value: form.biopsyCores, onChange: ev => set('biopsyCores', ev.target.value), placeholder: '12', style: inputStyle })),
      e('div', { style: { minWidth: 90 } }, e('label', { style: labelStyle }, 'Pos Cores'), e('input', { type: 'number', min: 0, value: form.biopsyPositive, onChange: ev => set('biopsyPositive', ev.target.value), placeholder: '2', style: inputStyle }))
    ),
    form.hasMRI && e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' } },
      e('div', { style: { minWidth: 100 } }, e('label', { style: labelStyle }, 'PI-RADS'), e('select', { value: form.pirads, onChange: ev => set('pirads', ev.target.value), style: inputStyle }, e('option', { value: '' }, '—'), [1, 2, 3, 4, 5].map(p => e('option', { key: p, value: p }, `${p}`)))),
      e('label', { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#334155', marginBottom: 4 } }, e('input', { type: 'checkbox', checked: form.newLesion, onChange: ev => set('newLesion', ev.target.checked) }), 'New lesion'),
      e('div', { style: { flex: 1, minWidth: 140 } }, e('label', { style: labelStyle }, 'MRI Notes'), e('input', { type: 'text', value: form.mriNotes, onChange: ev => set('mriNotes', ev.target.value), placeholder: 'e.g. stable 8mm lesion', style: inputStyle }))
    ),
    e('div', null, e('label', { style: labelStyle }, 'Notes'), e('input', { type: 'text', value: form.notes, onChange: ev => set('notes', ev.target.value), placeholder: 'Clinical notes…', style: inputStyle })),
    e('div', { style: { display: 'flex', gap: 8 } },
      e('button', { type: 'submit', style: { padding: '8px 16px', background: C.cerulean, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'Save Visit'),
      e('button', { type: 'button', onClick: onCancel, style: { padding: '8px 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' } }, 'Cancel')
    )
  )
}

// ─── Enrollment / Edit patient form ──────────────────────────────────────────
function PatientForm({ initial, onSave, onCancel, isNew }) {
  const def = initial ?? newPatientRecord()
  const [form, setForm] = useState({
    label: def.label ?? '',
    enrollmentDate: def.enrollmentDate ?? '',
    enrollmentGG: String(def.enrollmentGG ?? 1),
    enrollmentPSA: String(def.enrollmentPSA ?? ''),
    prostateVolume: String(def.prostateVolume ?? ''),
    age: String(def.age ?? ''),
    race: def.race ?? 'unknown',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function submit(ev) {
    ev.preventDefault()
    const patch = {
      ...(initial ?? def),
      label: form.label,
      enrollmentDate: form.enrollmentDate,
      enrollmentGG: parseInt(form.enrollmentGG),
      enrollmentPSA: form.enrollmentPSA,
      prostateVolume: form.prostateVolume,
      age: form.age,
      race: form.race,
    }
    if (!patch.id) patch.id = generatePatientId()
    onSave(patch)
  }

  return e('form', { onSubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
    e('div', { style: sectionHead }, isNew ? 'New Patient' : 'Edit Patient'),
    e('div', null,
      e('label', { style: labelStyle }, 'Patient ID / Alias *'),
      e('input', { type: 'text', value: form.label, onChange: ev => set('label', ev.target.value), placeholder: 'e.g. MRN-4821 or J.D.', style: inputStyle, required: true }),
      e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3 } }, 'Use MRN, initials, or alias — no identifying names')
    ),
    e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
      e('div', { style: { flex: '1 1 140px' } }, e('label', { style: labelStyle }, 'AS Enrollment Date *'), e('input', { type: 'date', value: form.enrollmentDate, onChange: ev => set('enrollmentDate', ev.target.value), style: inputStyle, required: true })),
      e('div', { style: { flex: '1 1 110px' } }, e('label', { style: labelStyle }, 'Grade Group *'), e('select', { value: form.enrollmentGG, onChange: ev => set('enrollmentGG', ev.target.value), style: inputStyle }, [1, 2, 3, 4, 5].map(g => e('option', { key: g, value: g }, `GG ${g}`)))),
      e('div', { style: { flex: '1 1 110px' } }, e('label', { style: labelStyle }, 'PSA (ng/mL) *'), e('input', { type: 'number', step: '0.01', min: 0, value: form.enrollmentPSA, onChange: ev => set('enrollmentPSA', ev.target.value), placeholder: 'ng/mL', style: inputStyle, required: true }))
    ),
    e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
      e('div', { style: { flex: '1 1 110px' } }, e('label', { style: labelStyle }, 'Prostate Volume (cc)'), e('input', { type: 'number', step: '0.1', min: 0, value: form.prostateVolume, onChange: ev => set('prostateVolume', ev.target.value), placeholder: 'cc', style: inputStyle })),
      e('div', { style: { flex: '1 1 90px' } }, e('label', { style: labelStyle }, 'Age'), e('input', { type: 'number', min: 18, max: 120, value: form.age, onChange: ev => set('age', ev.target.value), placeholder: 'yr', style: inputStyle })),
      e('div', { style: { flex: '1 1 140px' } }, e('label', { style: labelStyle }, 'Race / Ethnicity'), e('select', { value: form.race, onChange: ev => set('race', ev.target.value), style: inputStyle }, e('option', { value: 'unknown' }, 'Not specified'), e('option', { value: 'caucasian' }, 'Caucasian / White'), e('option', { value: 'african_american' }, 'African American / Black'), e('option', { value: 'other' }, 'Other')))
    ),
    e('div', { style: { display: 'flex', gap: 8 } },
      e('button', { type: 'submit', style: { padding: '9px 20px', background: C.cerulean, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } }, isNew ? 'Create Patient' : 'Save Changes'),
      onCancel && e('button', { type: 'button', onClick: onCancel, style: { padding: '9px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' } }, 'Cancel')
    )
  )
}

// ─── Patient roster drawer ────────────────────────────────────────────────────
function RosterDrawer({ roster, onSelect, onNew, onImport, onExportAll, onExportAllCSV, onClose }) {
  const fileRef = useRef(null)

  function handleFileChange(ev) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = re => { onImport(re.target.result) }
    reader.readAsText(file)
    ev.target.value = ''
  }

  return e('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex',
    },
  },
    // Backdrop
    e('div', { onClick: onClose, style: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' } }),
    // Drawer panel
    e('div', {
      style: {
        position: 'relative', zIndex: 1,
        width: 300, background: '#fff',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
      },
    },
      // Header
      e('div', {
        style: { background: C.cetacean, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
      },
        e('div', { style: { fontSize: 13, fontWeight: 800, color: '#fff' } }, 'Patient Roster'),
        e('button', { type: 'button', onClick: onClose, style: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 } }, '×')
      ),

      // Action buttons
      e('div', { style: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 } },
        e('button', {
          type: 'button', onClick: onNew,
          style: { padding: '8px', background: C.cerulean, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' },
        }, '+ New Patient'),
        e('div', { style: { display: 'flex', gap: 6 } },
          e('button', {
            type: 'button', onClick: () => fileRef.current?.click(),
            style: { flex: 1, padding: '7px', background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
          }, '↑ Import JSON'),
          e('button', {
            type: 'button', onClick: onExportAll,
            style: { flex: 1, padding: '7px', background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
          }, '↓ JSON'),
          e('button', {
            type: 'button', onClick: onExportAllCSV,
            style: { flex: 1, padding: '7px', background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
          }, '↓ CSV'),
          e('input', { type: 'file', accept: '.json,application/json', ref: fileRef, onChange: handleFileChange, style: { display: 'none' } })
        )
      ),

      // Patient list
      e('div', { style: { flex: 1, overflowY: 'auto' } },
        roster.patients.length === 0
          ? e('div', { style: { padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 } }, 'No patients yet. Create one above.')
          : roster.patients.map(pt => {
              const analysis = analyzeProgression(pt)
              const isActive = pt.id === roster.activeId
              const mos = monthsOnAS(pt.enrollmentDate)
              return e('button', {
                key: pt.id, type: 'button',
                onClick: () => onSelect(pt.id),
                style: {
                  width: '100%', textAlign: 'left', padding: '12px 14px',
                  background: isActive ? '#f0f9ff' : '#fff',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: isActive ? `3px solid ${C.cerulean}` : '3px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                },
              },
                e(StatusDot, { tier: analysis.summaryTier, size: 10 }),
                e('div', { style: { flex: 1, minWidth: 0 } },
                  e('div', { style: { fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, pt.label || `Patient ${pt.id.slice(-5)}`),
                  e('div', { style: { fontSize: 11, color: '#64748b' } },
                    `GG${pt.enrollmentGG} · ${pt.enrollmentDate ? formatDate(pt.enrollmentDate) : 'No enrollment date'}`,
                  ),
                  mos != null && e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 1 } }, `${Math.round(mos)} months on AS · ${pt.visits?.length ?? 0} visits`)
                )
              )
            })
      )
    )
  )
}

// ─── Import toast ─────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [])
  return e('div', {
    style: {
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#bbf7d0'}`,
      color: type === 'error' ? C.red : C.green,
      padding: '10px 20px', borderRadius: 999,
      fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      zIndex: 300, whiteSpace: 'nowrap',
    },
  }, message)
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ClinicianProgression({ onBack, onGoToFlow }) {
  const [roster,        setRoster]       = useState(() => loadRoster())
  const [showRoster,    setShowRoster]   = useState(false)
  const [showAddVisit,  setShowAddVisit] = useState(false)
  const [editingPatient,setEditingPatient] = useState(null)  // null | 'new' | patient obj
  const [activePanel,  setActivePanel]  = useState('timeline')
  const [toast,        setToast]        = useState(null)
  const fileRef = useRef(null)

  const patient = getActivePatient(roster)

  function persistRoster(r) {
    setRoster(r)
    saveRoster(r)
  }

  function persistPatient(patch) {
    persistRoster(upsertPatient(roster, patch))
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  // ── Patient management ────────────────────────────────────────────────────
  function handleSelectPatient(id) {
    persistRoster({ ...roster, activeId: id })
    setShowRoster(false)
    setShowAddVisit(false)
    setEditingPatient(null)
    setActivePanel('timeline')
  }

  function handleNewPatient() {
    setShowRoster(false)
    setEditingPatient('new')
  }

  function handleSavePatientForm(patientData) {
    const r = upsertPatient(roster, { ...patientData, id: patientData.id ?? generatePatientId() })
    persistRoster(r)
    setEditingPatient(null)
    showToast('Patient saved')
  }

  function handleDeletePatient() {
    if (!patient) return
    if (!window.confirm(`Remove "${patient.label || 'this patient'}" from the roster? Visit data will be permanently deleted.`)) return
    const r = deletePatient(roster, patient.id)
    persistRoster(r)
    setEditingPatient(null)
    showToast('Patient removed')
  }

  // ── Visit management ──────────────────────────────────────────────────────
  function handleAddVisit(visit) {
    const updated = { ...patient, visits: [...(patient.visits ?? []), visit].sort((a, b) => new Date(a.date) - new Date(b.date)) }
    persistPatient(updated)
    setShowAddVisit(false)
  }

  function handleDeleteVisit(id) {
    persistPatient({ ...patient, visits: patient.visits.filter(v => v.id !== id) })
  }

  // ── Import / Export ───────────────────────────────────────────────────────
  function handleImport(text) {
    const result = parseImportJSON(text)
    if (!result.ok) { showToast(result.error, 'error'); return }

    if (result.type === 'roster') {
      // Merge imported patients — skip any with duplicate IDs
      const existingIds = new Set(roster.patients.map(p => p.id))
      const incoming = result.data.patients ?? []
      const merged = [...roster.patients]
      let added = 0
      incoming.forEach(pt => {
        if (existingIds.has(pt.id)) {
          // Update if label/data changed
          const idx = merged.findIndex(p => p.id === pt.id)
          if (idx >= 0) merged[idx] = { ...merged[idx], ...pt }
        } else {
          merged.push({ ...pt, id: pt.id ?? generatePatientId() })
          added++
        }
      })
      const r = { ...roster, patients: merged, activeId: roster.activeId ?? merged[0]?.id ?? null }
      persistRoster(r)
      showToast(`Imported ${added} new patient${added !== 1 ? 's' : ''}`)
    } else {
      // Single patient
      const pt = { ...result.data, id: result.data.id ?? generatePatientId() }
      const r = upsertPatient(roster, pt)
      persistRoster(r)
      showToast(`Imported patient "${pt.label || pt.id}"`)
    }
    setShowRoster(false)
  }

  function handleExportPatient() {
    if (!patient) return
    const filename = `as-patient-${(patient.label ?? patient.id).replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`
    exportJSON(patient, filename)
  }

  function handleExportAll() {
    exportJSON({ patients: roster.patients, exportedAt: new Date().toISOString() }, `as-roster-${new Date().toISOString().slice(0, 10)}.json`)
    showToast(`Exported ${roster.patients.length} patients`)
  }

  function handleExportPatientCSV() {
    if (!patient) return
    const filename = `as-patient-${(patient.label ?? patient.id).replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`
    exportCSV(patient, filename)
    showToast('Exported patient CSV')
  }

  function handleExportAllCSV() {
    exportCSV({ patients: roster.patients }, `as-roster-${new Date().toISOString().slice(0, 10)}.csv`)
    showToast(`Exported ${roster.patients.length} patients as CSV`)
  }

  // ── Shared header ─────────────────────────────────────────────────────────
  const header = e('div', {
    style: { background: C.cetacean, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' },
  },
    e('button', { type: 'button', onClick: onBack, style: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', flexShrink: 0 } }, '← Back'),

    // Patient switcher
    e('button', {
      type: 'button',
      onClick: () => setShowRoster(true),
      style: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0,
      },
    },
      patient ? e(StatusDot, { tier: analyzeProgression(patient).summaryTier, size: 8 }) : null,
      e('div', { style: { textAlign: 'left' } },
        e('div', { style: { fontSize: 12, fontWeight: 700, color: '#fff' } }, patient ? (patient.label || `Patient ${patient.id.slice(-5)}`) : 'No patient selected'),
        patient && e('div', { style: { fontSize: 10, color: 'rgba(255,255,255,0.45)' } }, `GG${patient.enrollmentGG} · ${patient.visits?.length ?? 0} visits`)
      ),
      e('span', { style: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: 2 } }, '▼')
    ),

    e('span', { style: { color: 'rgba(255,255,255,0.2)', fontSize: 16 } }, '|'),

    // Roster count
    e('span', { style: { fontSize: 11, color: 'rgba(255,255,255,0.45)', flexShrink: 0 } }, `${roster.patients.length} patient${roster.patients.length !== 1 ? 's' : ''}`),

    e('div', { style: { flex: 1 } }),

    // Action buttons
    e('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
      patient && e('button', {
        type: 'button',
        onClick: () => setEditingPatient(patient),
        style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
      }, 'Edit'),
      patient && e('button', {
        type: 'button', onClick: handleExportPatient,
        style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
      }, '↓ JSON'),
      patient && e('button', {
        type: 'button', onClick: handleExportPatientCSV,
        style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
      }, '↓ CSV'),
      onGoToFlow && patient && e('button', {
        type: 'button', onClick: onGoToFlow,
        style: { background: C.cerulean, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
      }, 'Run AS Assessment →')
    )
  )

  // ── New patient or edit form ───────────────────────────────────────────────
  if (editingPatient) {
    return e('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' } },
      header,
      e('div', { style: { flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' } },
        e(PatientForm, {
          initial: editingPatient === 'new' ? null : editingPatient,
          isNew: editingPatient === 'new',
          onSave: handleSavePatientForm,
          onCancel: () => setEditingPatient(null),
        }),
        editingPatient !== 'new' && e('div', { style: { marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' } },
          e('button', {
            type: 'button', onClick: handleDeletePatient,
            style: { color: C.red, background: 'none', border: `1px solid ${C.red}44`, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' },
          }, 'Remove patient from roster')
        )
      )
    )
  }

  // ── No patients yet ───────────────────────────────────────────────────────
  if (roster.patients.length === 0) {
    return e('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' } },
      header,
      e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 } },
        e('div', { style: { fontSize: 32 } }, '📋'),
        e('div', { style: { fontSize: 17, fontWeight: 700, color: '#1e293b' } }, 'No patients in roster'),
        e('div', { style: { fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 340 } }, 'Create a new patient record or import an existing JSON file to begin tracking.'),
        e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' } },
          e('button', {
            type: 'button', onClick: handleNewPatient,
            style: { padding: '10px 20px', background: C.cerulean, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
          }, '+ New Patient'),
          e('button', {
            type: 'button', onClick: () => fileRef.current?.click(),
            style: { padding: '10px 20px', background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
          }, '↑ Import JSON'),
          e('input', { type: 'file', accept: '.json,application/json', ref: fileRef, onChange: ev => { const f = ev.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = re => handleImport(re.target.result); r.readAsText(f); ev.target.value = '' }, style: { display: 'none' } })
        )
      ),
      showRoster && e(RosterDrawer, { roster, onSelect: handleSelectPatient, onNew: handleNewPatient, onImport: handleImport, onExportAll: handleExportAll, onExportAllCSV: handleExportAllCSV, onClose: () => setShowRoster(false) }),
      toast && e(Toast, { ...toast, onDone: () => setToast(null) })
    )
  }

  // ── Patient loaded — main view ─────────────────────────────────────────────
  const analysis     = analyzeProgression(patient)
  const mos          = monthsOnAS(patient.enrollmentDate)
  const cohortLines  = getCohortContext(patient, analysis)
  const sortedVisits = [...(patient.visits ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date))

  const tierConfig = {
    stable:     { bg: '#f0fdf4', border: '#bbf7d0', color: C.green, label: 'STABLE',     dot: '#22c55e' },
    watch:      { bg: '#fffbeb', border: '#fde68a', color: C.amber, label: 'MONITOR',    dot: C.amber   },
    progressed: { bg: '#fef2f2', border: '#fecaca', color: C.red,   label: 'PROGRESSED', dot: C.red     },
  }[analysis.summaryTier] ?? { bg: '#f8fafc', border: '#e2e8f0', color: C.slate, label: 'NO DATA', dot: '#94a3b8' }

  const tabs = [
    { key: 'timeline',  label: 'Visit Timeline'        },
    { key: 'analysis',  label: 'Progression Analysis'  },
    { key: 'cohort',    label: 'Cohort Context'         },
  ]

  return e('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' } },
    header,

    // Sub-tab nav
    e('div', { style: { background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexShrink: 0 } },
      tabs.map(t =>
        e('button', {
          key: t.key, type: 'button',
          onClick: () => setActivePanel(t.key),
          style: { padding: '10px 18px', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: activePanel === t.key ? C.cerulean : '#64748b', borderBottom: activePanel === t.key ? `2px solid ${C.cerulean}` : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s' },
        }, t.label)
      )
    ),

    e('div', { style: { flex: 1, overflowY: 'auto', padding: '16px' } },

      // ── TIMELINE TAB ────────────────────────────────────────────────────
      activePanel === 'timeline' && e('div', { style: { maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 } },

        // Status bar
        e('div', { style: { background: tierConfig.bg, border: `1px solid ${tierConfig.border}`, borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            e('div', { style: { width: 10, height: 10, borderRadius: '50%', background: tierConfig.dot } }),
            e('div', { style: { fontSize: 16, fontWeight: 800, color: tierConfig.color } }, tierConfig.label)
          ),
          e('div', { style: { fontSize: 12, color: '#475569', flex: 1 } },
            analysis.summaryTier === 'stable'
              ? 'No AUA/NCCN/PRIAS progression triggers detected.'
            : analysis.summaryTier === 'watch'
              ? `${analysis.flags.filter(f => f.severity === 'warning').length} concern${analysis.flags.filter(f => f.severity === 'warning').length !== 1 ? 's' : ''} flagged — biopsy re-evaluation indicated. See Analysis tab.`
            : 'Biopsy-confirmed grade upgrade — AUA/ASTRO §33: offer definitive treatment.'
          )
        ),

        // Stat chips
        e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
          e(StatChip, { label: 'Time on AS', value: mos != null ? (mos < 24 ? `${Math.round(mos)}mo` : `${(mos / 12).toFixed(1)}yr`) : '—' }),
          e(StatChip, {
            label: 'PSA Doubling Time',
            value: analysis.psadt != null
              ? (analysis.psaSpanMonths < 6 ? `~${formatPSADT(analysis.psadt)}*` : formatPSADT(analysis.psadt))
              : '≥2 PSAs needed',
            color: analysis.psadt != null && analysis.psaSpanMonths >= 6
              ? (analysis.psadt < 36 ? C.amber : analysis.psadt < 60 ? C.amber : C.green)
              : '#94a3b8',
            footnote: analysis.psadt != null && analysis.psaSpanMonths < 6 ? '* < 6 months data — unreliable' : null,
          }),
          e(StatChip, { label: 'PSA Velocity', value: analysis.psaVelocity != null ? `${analysis.psaVelocity > 0 ? '+' : ''}${analysis.psaVelocity.toFixed(2)}` : '—', sub: 'ng/mL/yr', color: analysis.psaVelocity != null && analysis.psaVelocity > 0.75 ? C.amber : '#1e293b' }),
          e(StatChip, { label: 'Grade Group', value: `GG${analysis.latestGG}`, color: analysis.upgradeEvent ? C.red : C.green, sub: analysis.upgradeEvent ? `↑ from GG${patient.enrollmentGG}` : 'Unchanged' }),
          e(StatChip, { label: 'Visits', value: sortedVisits.length, sub: 'follow-up visits' })
        ),

        // PSA chart
        analysis.psaPoints.length >= 2 && e('div', { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' } },
          e('div', { style: { fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 } }, 'PSA Trajectory'),
          e(MiniPSAChart, { psaPoints: analysis.psaPoints })
        ),

        // Visit table
        e('div', { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' } },
          e('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            e('div', { style: { fontSize: 13, fontWeight: 700, color: '#1e293b' } }, 'Visit Log'),
            !showAddVisit && e('button', { type: 'button', onClick: () => setShowAddVisit(true), style: { padding: '6px 12px', background: C.cerulean, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, '+ Add Visit')
          ),
          showAddVisit && e('div', { style: { padding: '14px 16px', borderBottom: '1px solid #f1f5f9' } },
            e(AddVisitPanel, { onAdd: handleAddVisit, onCancel: () => setShowAddVisit(false) })
          ),
          // Enrollment row
          e('div', { style: { padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 8 } },
            e('div', { style: { width: 8, height: 8, borderRadius: '50%', background: C.navy, flexShrink: 0 } }),
            `Enrollment — ${formatDate(patient.enrollmentDate)} — GG${patient.enrollmentGG} — PSA ${patient.enrollmentPSA} ng/mL${patient.prostateVolume ? ` — PSAD ${(parseFloat(patient.enrollmentPSA) / parseFloat(patient.prostateVolume)).toFixed(3)}` : ''}`
          ),
          sortedVisits.length > 0
            ? e('div', { style: { overflowX: 'auto' } },
                e('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
                  e('thead', null,
                    e('tr', { style: { background: '#fafafa' } },
                      ['Date', 'PSA', 'PSAD', 'Biopsy', 'MRI', 'DRE', ''].map((h, i) =>
                        e('th', { key: i, style: { padding: '8px 12px', textAlign: i > 1 ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid #f1f5f9' } }, h)
                      )
                    )
                  ),
                  e('tbody', null, sortedVisits.map(v => e(VisitRow, { key: v.id, visit: v, enrollmentGG: patient.enrollmentGG, onDelete: () => handleDeleteVisit(v.id) })))
                )
              )
            : e('div', { style: { padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 } }, 'No follow-up visits yet. Add a visit above.')
        )
      ),

      // ── ANALYSIS TAB ────────────────────────────────────────────────────
      activePanel === 'analysis' && e('div', { style: { maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 } },
        e('div', { style: { fontSize: 14, fontWeight: 800, color: '#1e293b' } }, 'AUA/NCCN Progression Triggers'),
        e('div', { style: { fontSize: 12, color: '#64748b', marginTop: -8 } }, 'Any flagged trigger warrants clinical review and shared decision-making.'),
        analysis.flags.length === 0
          ? e('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 18px', fontSize: 13, color: C.green, fontWeight: 600 } }, '✓ No AUA/NCCN progression triggers detected. Patient remains appropriate for continued active surveillance.')
          : e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, ...analysis.flags.map((f, i) => e(TriggerBadge, { key: i, flag: f }))),
        e('div', { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' } },
          e('div', { style: { ...sectionHead, marginBottom: 12 } }, 'Calculated Metrics'),
          e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 } },
            e('div', null, e('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 } }, 'PSA Doubling Time'), e('div', { style: { fontSize: 16, fontWeight: 700, color: analysis.psadt != null ? (analysis.psadt < 36 ? C.red : analysis.psadt < 60 ? C.amber : C.green) : '#cbd5e1' } }, analysis.psadt != null ? formatPSADT(analysis.psadt) : 'Insufficient data'), e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'AUA trigger: < 3 years')),
            e('div', null, e('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 } }, 'PSA Velocity'), e('div', { style: { fontSize: 16, fontWeight: 700, color: analysis.psaVelocity != null && analysis.psaVelocity > 0.75 ? C.amber : '#1e293b' } }, analysis.psaVelocity != null ? `${analysis.psaVelocity > 0 ? '+' : ''}${analysis.psaVelocity.toFixed(2)} ng/mL/yr` : 'Insufficient data'), e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'Secondary trigger: > 0.75 ng/mL/yr')),
            e('div', null, e('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 } }, 'Grade Group'), e('div', { style: { fontSize: 16, fontWeight: 700, color: analysis.upgradeEvent ? C.red : C.green } }, analysis.upgradeEvent ? `GG${analysis.upgradeEvent.fromGG} → GG${analysis.upgradeEvent.toGG}` : `GG${patient.enrollmentGG} — Unchanged`), e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'Primary endpoint: any upgrade')),
            e('div', null, e('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 } }, 'Enrollment PSAD'), e('div', { style: { fontSize: 16, fontWeight: 700, color: '#1e293b' } }, patient.enrollmentPSA && patient.prostateVolume ? `${(parseFloat(patient.enrollmentPSA) / parseFloat(patient.prostateVolume)).toFixed(3)} ng/mL/cc` : '—'), e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'NCCN threshold: < 0.15'))
          )
        ),
        e('div', { style: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 14px' } },
          e('div', { style: { fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 } }, 'Evidence Basis'),
          e('p', { style: { margin: 0, fontSize: 11, color: '#1e3a5f', lineHeight: 1.6 } }, 'Triggers based on AUA/NCCN/EAU 2024 guidelines. PSADT by log-linear regression (PRIAS Bul 2013: < 3 years). PSA velocity per Carter 2006. Grade upgrade is the primary endpoint. All decisions require clinical correlation and shared decision-making.')
        )
      ),

      // ── COHORT TAB ──────────────────────────────────────────────────────
      activePanel === 'cohort' && e('div', { style: { maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 } },
        e('div', { style: { fontSize: 14, fontWeight: 800, color: '#1e293b' } }, 'Mount Sinai Cohort Context'),
        e('div', { style: { fontSize: 12, color: '#64748b', marginTop: -8 } }, 'N=1,213 Mount Sinai Tewari AS Program — real upgrade event data for contextualizing this patient\'s trajectory.'),
        ...cohortLines.map((l, i) => e('div', { key: i, style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#334155', lineHeight: 1.6 } }, l)),
        e('div', { style: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 } },
          [
            { label: 'Overall Upgrade Rate',       value: '25.1%', sub: 'any follow-up biopsy'    },
            { label: 'Currently Stable on AS',     value: '59.7%', sub: '724 of 1,213 patients'   },
            { label: 'Left by Choice (no upgrade)',value: '19.1%', sub: 'anxiety / preference'     },
            { label: 'GG1 Upgrade Rate',           value: '26.7%', sub: 'N=1,111 GG1 patients'    },
            { label: 'GG2 Upgrade Rate',           value: '8.0%',  sub: 'N=100 GG2 patients'      },
            { label: 'AA Upgrade Rate',            value: '34.1%', sub: 'N=129 African American'  },
          ].map((s, i) =>
            e('div', { key: i },
              e('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, s.label),
              e('div', { style: { fontSize: 18, fontWeight: 800, color: C.navy } }, s.value),
              e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, s.sub)
            )
          )
        ),
        e('div', { style: { fontSize: 10, color: '#94a3b8', textAlign: 'center' } }, 'Source: Kadeer et al. 2025 · Mount Sinai Tewari AS Program · N=1,213')
      )
    ),

    // Roster drawer
    showRoster && e(RosterDrawer, {
      roster,
      onSelect: handleSelectPatient,
      onNew: handleNewPatient,
      onImport: handleImport,
      onExportAll: handleExportAll,
      onExportAllCSV: handleExportAllCSV,
      onClose: () => setShowRoster(false),
    }),

    // Toast
    toast && e(Toast, { ...toast, onDone: () => setToast(null) })
  )
}

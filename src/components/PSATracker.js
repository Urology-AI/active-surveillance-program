/**
 * PSATracker — patient-facing surveillance log.
 *
 * Originally a flat list of PSA readings in `as_psa_log`. It now reads and
 * writes the longitudinal patient record (src/patientRecord.js), so a PSA value
 * is one event type among several (MRI, biopsy, genomics, DRE, uroflow, note)
 * on one shared timeline. The old flat log is migrated automatically on first
 * load — see migrateLegacyPSALog.
 *
 * Two views: "Log" (add events, quick stats) and "Timeline"
 * (LongitudinalTimeline: trend, derived kinetics, surveillance due/overdue).
 */
import React, { useState, useEffect } from 'react'
import {
  EVENT_TYPES, EVENT_LABELS, EVENT_TYPE_LIST,
  loadStore, saveStore, getActiveRecord, upsertRecord,
  newPatientRecord, makeEvent, appendEvent, removeEvent,
  psaSeries, sortedEvents, exportRecordJSON, importRecordJSON, downloadJSON,
  formatEventDate, normalizeStore,
} from '../patientRecord.js'
import {
  computePSAVelocity, computePSADoublingTime, computeAdherence,
  formatVelocity, formatDoublingTime,
} from '../derivedMetrics.js'
import LongitudinalTimeline from './LongitudinalTimeline.js'

const e = React.createElement

const CERULEAN = '#06ABEB'
const CETACEAN = '#00002D'
const NAVY = '#212070'

const inputStyle = {
  width: '100%', padding: '7px 8px', border: '1px solid #e2e8f0',
  borderRadius: 7, fontSize: 13, boxSizing: 'border-box', background: '#fff',
}
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', boxSizing: 'border-box' }
const eyebrow = { fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }

const EMPTY_FORM = {
  type: EVENT_TYPES.PSA,
  date: '',
  // psa
  psa: '', volume: '',
  // mri
  pirads: '', lesionCount: '', newLesion: false,
  // biopsy
  ggg: '', positiveCores: '', totalCores: '', maxCorePercent: '', targeted: false,
  // genomics
  assay: 'decipher', score: '', riskCategory: '',
  // dre
  finding: 'normal',
  // uroflow
  qmax: '', pvr: '', ipss: '',
  // note
  status: '', text: '',
  notes: '',
}

function field(label, key, form, setForm, opts = {}) {
  return e('div', { key, style: { flex: opts.flex || '1 1 110px' } },
    e('label', { style: labelStyle }, label),
    e('input', {
      type: opts.type || 'number',
      step: opts.step || (opts.type === 'text' || opts.type === 'date' ? undefined : '0.01'),
      min: opts.type === 'number' || !opts.type ? '0' : undefined,
      value: form[key],
      placeholder: opts.placeholder || '',
      onChange: ev => setForm(f => ({ ...f, [key]: ev.target.value })),
      style: inputStyle,
    })
  )
}

function checkbox(label, key, form, setForm) {
  return e('label', {
    key,
    style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', flex: '1 1 140px' },
  },
    e('input', {
      type: 'checkbox', checked: !!form[key],
      onChange: ev => setForm(f => ({ ...f, [key]: ev.target.checked })),
    }),
    label
  )
}

function select(label, key, options, form, setForm) {
  return e('div', { key, style: { flex: '1 1 140px' } },
    e('label', { style: labelStyle }, label),
    e('select', {
      value: form[key],
      onChange: ev => setForm(f => ({ ...f, [key]: ev.target.value })),
      style: inputStyle,
    }, options.map(o => e('option', { key: o.value, value: o.value }, o.label)))
  )
}

function sortedForDisplay(record) {
  return [...sortedEvents(record)].reverse()
}

// One-line human summary of an event for the compact history list.
function describeEvent(ev) {
  const d = ev.data || {}
  switch (ev.type) {
    case EVENT_TYPES.PSA:
      return `PSA ${d.psa} ng/mL${d.volume ? ` · volume ${d.volume} cc · PSAD ${(d.psa / d.volume).toFixed(3)}` : ''}`
    case EVENT_TYPES.MRI:
      return [d.pirads != null ? `PI-RADS ${d.pirads}` : null, d.newLesion ? 'new lesion' : null, d.notes || null]
        .filter(Boolean).join(' · ') || 'MRI recorded'
    case EVENT_TYPES.BIOPSY:
      return [
        d.ggg != null ? `Grade Group ${d.ggg}` : null,
        d.positiveCores != null && d.totalCores != null ? `${d.positiveCores}/${d.totalCores} cores` : null,
        d.maxCorePercent != null ? `max core ${d.maxCorePercent}%` : null,
      ].filter(Boolean).join(' · ') || 'Biopsy recorded'
    case EVENT_TYPES.GENOMICS:
      return [(d.assay || '').toUpperCase(), d.score != null ? `score ${d.score}` : null, d.riskCategory || null]
        .filter(Boolean).join(' · ')
    case EVENT_TYPES.DRE:
      return `DRE ${d.finding === 'not_done' ? 'not done' : d.finding}`
    case EVENT_TYPES.UROFLOW:
      return [d.qmax != null ? `Qmax ${d.qmax}` : null, d.pvr != null ? `PVR ${d.pvr}` : null, d.ipss != null ? `IPSS ${d.ipss}` : null]
        .filter(Boolean).join(' · ') || 'Uroflow recorded'
    case EVENT_TYPES.NOTE:
      return [d.status ? d.status.replace(/_/g, ' ') : null, d.text || null].filter(Boolean).join(' · ') || 'Note'
    default:
      return ''
  }
}

function payloadFromForm(form) {
  switch (form.type) {
    case EVENT_TYPES.PSA:
      return { psa: form.psa, volume: form.volume }
    case EVENT_TYPES.MRI:
      return { pirads: form.pirads, lesionCount: form.lesionCount, newLesion: form.newLesion, notes: form.notes }
    case EVENT_TYPES.BIOPSY:
      return {
        ggg: form.ggg, positiveCores: form.positiveCores, totalCores: form.totalCores,
        maxCorePercent: form.maxCorePercent, targeted: form.targeted, notes: form.notes,
      }
    case EVENT_TYPES.GENOMICS:
      return { assay: form.assay, score: form.score, riskCategory: form.riskCategory, notes: form.notes }
    case EVENT_TYPES.DRE:
      return { finding: form.finding, notes: form.notes }
    case EVENT_TYPES.UROFLOW:
      return { qmax: form.qmax, pvr: form.pvr, ipss: form.ipss, notes: form.notes }
    case EVENT_TYPES.NOTE:
      return { status: form.status, text: form.text }
    default:
      return {}
  }
}

export default function PSATracker() {
  const [store, setStore] = useState(() => ({ schemaVersion: 1, records: [], activeId: null }))
  const [view, setView] = useState('log')       // 'log' | 'timeline'
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => { setStore(loadStore()) }, [])

  const record = getActiveRecord(store)

  function commit(nextStore, message) {
    setStore(nextStore)
    const ok = saveStore(nextStore)
    if (!ok) setNotice('Saved for this session only — this browser refused to store data locally.')
    else if (message) { setNotice(message); setTimeout(() => setNotice(''), 2200) }
  }

  function ensureRecord() {
    if (record) return { store, record }
    const fresh = newPatientRecord('')
    const next = upsertRecord(store, fresh)
    return { store: next, record: fresh }
  }

  function handleAdd(ev) {
    ev.preventDefault()
    setError('')
    const ctx = ensureRecord()
    const event = makeEvent(form.type, form.date, payloadFromForm(form))
    if (!event) {
      setError(form.type === EVENT_TYPES.PSA
        ? 'Enter a valid date and a PSA value greater than 0.'
        : 'Enter a valid date for this event.')
      return
    }
    const updated = appendEvent(ctx.record, event)
    commit(upsertRecord(ctx.store, updated), 'Event added')
    setForm({ ...EMPTY_FORM, type: form.type })
    setShowForm(false)
  }

  function handleRemove(eventId) {
    if (!record) return
    commit(upsertRecord(store, removeEvent(record, eventId)), 'Event removed')
  }

  function handleEnrollmentChange(value) {
    const ctx = ensureRecord()
    commit(upsertRecord(ctx.store, { ...ctx.record, enrollmentDate: value, updatedAt: new Date().toISOString() }))
  }

  function handleExport() {
    const ok = downloadJSON(exportRecordJSON(store), `surveillance-record-${new Date().toISOString().slice(0, 10)}.json`)
    if (!ok) setError('Could not generate the export file in this browser.')
  }

  function handleImport(ev) {
    const file = ev.target.files && ev.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importRecordJSON(String(reader.result))
      if (!result.ok) { setError(result.error); return }
      setError('')
      if (result.kind === 'store') commit(normalizeStore(result.store), 'Record file imported')
      else commit(upsertRecord(store, result.record), 'Record imported')
    }
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
    ev.target.value = ''
  }

  const series = record ? psaSeries(record) : []
  const latest = series[series.length - 1] || null
  const velocity = computePSAVelocity(series)
  const doublingTime = computePSADoublingTime(series)
  const adherence = computeAdherence(record)
  const velText = formatVelocity(velocity)
  const dtText = formatDoublingTime(doublingTime)

  // ── Type-specific form fields ───────────────────────────────────────────────
  function typeFields() {
    switch (form.type) {
      case EVENT_TYPES.PSA:
        return [
          field('PSA (ng/mL)', 'psa', form, setForm, { placeholder: 'e.g. 4.2' }),
          field('Volume (cc) — optional', 'volume', form, setForm, { step: '0.1', placeholder: 'e.g. 45' }),
        ]
      case EVENT_TYPES.MRI:
        return [
          field('PI-RADS (1–5)', 'pirads', form, setForm, { step: '1', placeholder: '1–5' }),
          field('Lesion count', 'lesionCount', form, setForm, { step: '1', placeholder: 'e.g. 1' }),
          checkbox('New lesion since last MRI', 'newLesion', form, setForm),
          field('Notes', 'notes', form, setForm, { type: 'text', flex: '1 1 100%' }),
        ]
      case EVENT_TYPES.BIOPSY:
        return [
          field('Grade Group (1–5)', 'ggg', form, setForm, { step: '1', placeholder: '1–5' }),
          field('Positive cores', 'positiveCores', form, setForm, { step: '1' }),
          field('Total cores', 'totalCores', form, setForm, { step: '1' }),
          field('Max core involvement (%)', 'maxCorePercent', form, setForm, { step: '1' }),
          checkbox('MRI-targeted biopsy', 'targeted', form, setForm),
          field('Notes', 'notes', form, setForm, { type: 'text', flex: '1 1 100%' }),
        ]
      case EVENT_TYPES.GENOMICS:
        return [
          select('Assay', 'assay', [
            { value: 'decipher', label: 'Decipher' },
            { value: 'gps', label: 'Oncotype DX GPS' },
            { value: 'prolaris', label: 'Prolaris' },
            { value: 'confirmmdx', label: 'ConfirmMDx' },
            { value: 'other', label: 'Other' },
          ], form, setForm),
          field('Score', 'score', form, setForm, { placeholder: 'e.g. 0.45' }),
          field('Risk category', 'riskCategory', form, setForm, { type: 'text', placeholder: 'e.g. low' }),
          field('Notes', 'notes', form, setForm, { type: 'text', flex: '1 1 100%' }),
        ]
      case EVENT_TYPES.DRE:
        return [
          select('Finding', 'finding', [
            { value: 'normal', label: 'Normal' },
            { value: 'abnormal', label: 'Abnormal / nodule' },
            { value: 'not_done', label: 'Not done' },
          ], form, setForm),
          field('Notes', 'notes', form, setForm, { type: 'text', flex: '1 1 100%' }),
        ]
      case EVENT_TYPES.UROFLOW:
        return [
          field('Qmax (mL/s)', 'qmax', form, setForm, { step: '0.1' }),
          field('PVR (mL)', 'pvr', form, setForm, { step: '1' }),
          field('IPSS', 'ipss', form, setForm, { step: '1' }),
          field('Notes', 'notes', form, setForm, { type: 'text', flex: '1 1 100%' }),
        ]
      case EVENT_TYPES.NOTE:
        return [
          select('Status', 'status', [
            { value: '', label: '— none —' },
            { value: 'on_surveillance', label: 'On surveillance' },
            { value: 'watchful_waiting', label: 'Watchful waiting' },
            { value: 'treated', label: 'Treated' },
            { value: 'other', label: 'Other' },
          ], form, setForm),
          field('Note', 'text', form, setForm, { type: 'text', flex: '1 1 100%', placeholder: 'Free text' }),
        ]
      default:
        return []
    }
  }

  const tabBtn = active => ({
    flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 12.5, fontWeight: 700,
    background: active ? CERULEAN : '#f1f5f9',
    color: active ? '#fff' : '#475569',
  })

  return e('div', { style: { padding: 14, maxWidth: 760, margin: '0 auto', boxSizing: 'border-box' } },

    // Header
    e('div', { style: { marginBottom: 12 } },
      e('div', { style: { fontSize: 16, fontWeight: 700, color: CETACEAN } }, 'Surveillance Record'),
      e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 } },
        'PSA, MRI, biopsy and other surveillance events on one timeline. Stored on this device only — never uploaded.')
    ),

    // View tabs
    e('div', { className: 'lt-no-print', style: { display: 'flex', gap: 8, marginBottom: 12 } },
      e('button', { type: 'button', onClick: () => setView('log'), style: tabBtn(view === 'log') }, 'Log'),
      e('button', { type: 'button', onClick: () => setView('timeline'), style: tabBtn(view === 'timeline') }, 'Timeline & trends')
    ),

    notice && e('div', {
      style: { padding: '8px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#0369a1', marginBottom: 10 },
    }, notice),

    view === 'timeline'
      ? e(LongitudinalTimeline, { record, onRemoveEvent: handleRemove })
      : e(React.Fragment, null,

        // Overdue banner — the point of the tool
        adherence.hasGaps && e('div', {
          style: {
            padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 10, marginBottom: 12,
          },
        },
          e('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#b91c1c' } }, adherence.summary),
          e('div', { style: { fontSize: 11.5, color: '#b91c1c', marginTop: 3, lineHeight: 1.5 } },
            adherence.overdue.map(i => `${i.label} (${i.daysOverdue} days past due)`).join(' · ')),
          e('div', { style: { fontSize: 11, color: '#7f1d1d', marginTop: 4 } },
            'Discuss scheduling with your care team.')
        ),

        // Quick stats
        series.length > 0 && e('div', { style: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
          latest && e('div', { style: { ...cardStyle, flex: '1 1 120px' } },
            e('div', { style: eyebrow }, 'Latest PSA'),
            e('div', { style: { fontSize: 22, fontWeight: 800, color: CETACEAN, lineHeight: 1 } }, latest.psa),
            e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3 } }, formatEventDate(latest.date)),
            latest.volume ? e('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2 } },
              `PSAD: ${(latest.psa / latest.volume).toFixed(3)}`) : null
          ),
          e('div', { style: { ...cardStyle, flex: '1 1 140px' } },
            e('div', { style: eyebrow }, 'PSA velocity'),
            e('div', { style: { fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: velocity.value != null && velocity.value > 0.75 ? '#b45309' : CETACEAN } },
              velText || 'Not computable'),
            e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 } },
              velText ? `From ${velocity.n} readings over ${Math.round(velocity.spanMonths)} months` : velocity.detail)
          ),
          e('div', { style: { ...cardStyle, flex: '1 1 140px' } },
            e('div', { style: eyebrow }, 'Doubling time'),
            e('div', { style: { fontSize: 15, fontWeight: 800, lineHeight: 1.15, color: doublingTime.value != null && doublingTime.value < 36 ? '#b45309' : CETACEAN } },
              dtText || 'Not computable'),
            e('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 } },
              dtText ? `From ${doublingTime.n} readings over ${Math.round(doublingTime.spanMonths)} months` : doublingTime.detail)
          )
        ),

        // Enrollment date
        e('div', { style: { ...cardStyle, marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' } },
          e('div', { style: { flex: '1 1 180px' } },
            e('label', { style: labelStyle }, 'Surveillance start date'),
            e('input', {
              type: 'date',
              value: (record && record.enrollmentDate) || '',
              onChange: ev => handleEnrollmentChange(ev.target.value),
              style: inputStyle,
            })
          ),
          e('div', { style: { flex: '2 1 260px', fontSize: 10.5, color: '#94a3b8', lineHeight: 1.5 } },
            'Used to project when surveillance tests are due when none has been recorded yet.')
        ),

        // Add button
        !showForm && e('button', {
          type: 'button', className: 'lt-no-print',
          onClick: () => { setShowForm(true); setError('') },
          style: {
            width: '100%', padding: 10, border: '1px dashed #cbd5e1', borderRadius: 10,
            background: '#f8fafc', color: CERULEAN, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', marginBottom: 12, boxSizing: 'border-box',
          },
        }, '+ Add surveillance event'),

        // Add form
        showForm && e('form', {
          onSubmit: handleAdd,
          style: { ...cardStyle, marginBottom: 12 },
        },
          e('div', { style: { fontSize: 13, fontWeight: 700, color: CETACEAN, marginBottom: 12 } }, 'Add surveillance event'),
          e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
            select('Event type', 'type', EVENT_TYPE_LIST.map(t => ({ value: t, label: EVENT_LABELS[t] })), form, setForm),
            e('div', { key: 'date', style: { flex: '1 1 140px' } },
              e('label', { style: labelStyle }, 'Date'),
              e('input', {
                type: 'date', value: form.date,
                onChange: ev => setForm(f => ({ ...f, date: ev.target.value })),
                style: inputStyle,
              })
            )
          ),
          e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, alignItems: 'flex-end' } },
            typeFields()),

          form.type === EVENT_TYPES.PSA && (() => {
            const p = parseFloat(form.psa), v = parseFloat(form.volume)
            if (!(p > 0) || !(v > 0)) return null
            const d = p / v
            return e('div', {
              style: {
                padding: '8px 10px', background: '#f0f9ff', border: '1px solid #bae6fd',
                borderRadius: 8, fontSize: 12, color: '#0369a1', marginBottom: 10,
                display: 'flex', gap: 6, flexWrap: 'wrap',
              },
            },
              e('span', { style: { fontWeight: 700 } }, `PSA density: ${d.toFixed(3)} ng/mL/cc`),
              e('span', { style: { color: '#64748b' } },
                d < 0.065 ? '· Low-risk range' : d > 0.177 ? '· Elevated — discuss with care team' : '· Intermediate range')
            )
          })(),

          error && e('div', { style: { fontSize: 12, color: '#dc2626', marginBottom: 8 } }, error),

          e('div', { style: { display: 'flex', gap: 8 } },
            e('button', {
              type: 'submit',
              style: { flex: 1, padding: 8, borderRadius: 8, background: CERULEAN, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
            }, 'Save event'),
            e('button', {
              type: 'button',
              onClick: () => { setShowForm(false); setError('') },
              style: { padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontSize: 13, cursor: 'pointer' },
            }, 'Cancel')
          )
        ),

        !showForm && error && e('div', { style: { fontSize: 12, color: '#dc2626', marginBottom: 8 } }, error),

        // Import / export
        e('div', { className: 'lt-no-print', style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
          e('button', {
            type: 'button', onClick: handleExport,
            style: { flex: '1 1 140px', padding: '8px', borderRadius: 8, border: `1px solid ${NAVY}`, background: '#fff', color: NAVY, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
          }, 'Export record (JSON)'),
          e('label', {
            style: { flex: '1 1 140px', padding: '8px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center' },
          },
            'Import record (JSON)',
            e('input', { type: 'file', accept: 'application/json,.json', onChange: handleImport, style: { display: 'none' } })
          ),
          e('button', {
            type: 'button', onClick: () => window.print(),
            style: { flex: '1 1 120px', padding: '8px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
          }, 'Print')
        ),

        // Empty state
        (!record || !(record.events || []).length) && !showForm && e('div', {
          style: { textAlign: 'center', padding: '32px 16px', color: '#94a3b8' },
        },
          e('div', { style: { fontSize: 32, marginBottom: 8 } }, '📈'),
          e('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, 'No surveillance events logged yet'),
          e('div', { style: { fontSize: 12 } }, 'Add your first PSA reading to start building the trajectory.')
        ),

        // Compact history — the full chart and trends live in the Timeline view
        record && (record.events || []).length > 0 && e('div', {
          style: { ...cardStyle, padding: 0, overflow: 'hidden' },
        },
          e('div', { style: { ...eyebrow, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', marginBottom: 0 } }, 'History'),
          sortedForDisplay(record).map((ev, i, arr) =>
            e('div', {
              key: ev.id,
              style: {
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none',
              },
            },
              e('div', { style: { flex: 1, minWidth: 0 } },
                e('div', { style: { fontSize: 13, fontWeight: 600, color: CETACEAN } },
                  `${formatEventDate(ev.date)} — ${EVENT_LABELS[ev.type] || ev.type}`),
                e('div', { style: { fontSize: 11, color: '#64748b', marginTop: 1, wordBreak: 'break-word' } },
                  describeEvent(ev))
              ),
              e('button', {
                type: 'button', className: 'lt-no-print',
                onClick: () => handleRemove(ev.id),
                style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontSize: 11, cursor: 'pointer' },
              }, 'Remove')
            )
          )
        )
      ),

    e('div', {
      style: { padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.55, marginTop: 12 },
    }, 'Doubling time, velocity and schedule reminders are informational only — always discuss changes with your care team. Data stays on this device and is never uploaded or shared.')
  )
}

/**
 * BatchCalculator.js
 *
 * Multi-patient AS Calculator — add patients one at a time through a full
 * labeled form (same fields as the single-patient calculator), then view,
 * edit, and calculate personalized upgrade risk + guideline pathway stage
 * for all of them in a summary table. Uses the same asEngine.runAssessment
 * pipeline as the single-patient calculator. Patients are saved to this
 * browser's local storage and can be exported/imported as JSON.
 */
import React, { useState, useEffect, useRef } from 'react'
import { runAssessment } from '../asEngine.js'

const e = React.createElement

const MAGENTA  = '#DC298D'
const CERULEAN = '#06ABEB'
const CETACEAN = '#00002D'

const STORAGE_KEY = 'as-batch-patients-v1'
const BATCH_EXPORT_TYPE  = 'as-batch-calculator'
const SINGLE_EXPORT_TYPE = 'as-clinical-calculator'

let nextId = 1
function makeRow() {
  return {
    id: nextId++,
    ggg: '1',
    positiveCores: '',
    totalCores: '',
    maxCorePercent: '',
    psa: '',
    prostateVolume: '',
    pirads: '',
    result: null,
    error: null,
  }
}

const ROW_DEFAULTS = {
  ggg: '1', positiveCores: '', totalCores: '',
  maxCorePercent: '', psa: '', prostateVolume: '', pirads: '',
  result: null, error: null,
}

// Accepts a single patient's inputs (+ optional precomputed results) and
// returns a row. Used for both blank rows and imported/converted patients.
function rowFromInputs(inputs, results) {
  return {
    ...ROW_DEFAULTS,
    id: nextId++,
    ggg:            inputs?.ggg            != null ? String(inputs.ggg) : '1',
    positiveCores:  inputs?.positiveCores  != null ? String(inputs.positiveCores) : '',
    totalCores:     inputs?.totalCores     != null ? String(inputs.totalCores) : '',
    maxCorePercent: inputs?.maxCorePercent != null ? String(inputs.maxCorePercent) : '',
    psa:            inputs?.psa            != null ? String(inputs.psa) : '',
    prostateVolume: inputs?.prostateVolume != null ? String(inputs.prostateVolume) : '',
    pirads:         inputs?.pirads         != null ? String(inputs.pirads) : '',
    result: results || null,
    error: null,
  }
}

function loadStoredRows() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    let maxId = 0
    const rows = parsed.map(r => {
      maxId = Math.max(maxId, Number(r.id) || 0)
      return { ...ROW_DEFAULTS, ...r }
    })
    nextId = maxId + 1
    return rows
  } catch {
    return null
  }
}

const LABEL_STYLE = {
  display: 'block', fontSize: 12, fontWeight: 700, color: CETACEAN, marginBottom: 4,
}

const MODAL_FIELD_STYLE = {
  width: '100%', padding: '9px 10px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 14, color: CETACEAN,
  background: '#fff', boxSizing: 'border-box',
}

const TH_STYLE = {
  textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b',
  padding: '8px 8px', textTransform: 'uppercase', letterSpacing: 0.3,
  borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
}

const TD_STYLE = {
  padding: '10px 8px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9',
  fontSize: 13, color: CETACEAN,
}

function bandColor(band) {
  if (band === 'High')     return '#dc2626'
  if (band === 'Elevated') return '#ea580c'
  if (band === 'Average')  return '#ca8a04'
  return '#16a34a'
}

const GGG_LABELS  = { '1': 'GG1', '2': 'GG2', '3': 'GG3' }
const PIRADS_LABELS = { '0': 'No MRI', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5' }

function dash(v) {
  return v === '' || v == null ? e('span', { style: { color: '#cbd5e1' } }, '—') : v
}

function PatientEntryModal({ row, onSave, onClose }) {
  const [draft, setDraft] = useState(row)

  function set(field, value) {
    setDraft(d => ({ ...d, [field]: value }))
  }

  return e('div', {
    style: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,45,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    },
    onClick: onClose,
  },
    e('div', {
      style: {
        background: '#fff', borderRadius: 14, padding: 24, width: '100%',
        maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,45,0.25)',
      },
      onClick: ev => ev.stopPropagation(),
    },
      e('h3', { style: { fontSize: 17, fontWeight: 800, color: CETACEAN, margin: '0 4px 4px' } },
        'Patient Details'
      ),
      e('p', { style: { fontSize: 11.5, color: '#94a3b8', margin: '0 4px 16px' } },
        `Patient #${draft.id} — no names or identifiers are stored, only this ID.`
      ),

      e('div', { style: { marginBottom: 14 } },
        e('label', { style: LABEL_STYLE }, 'Grade Group (GGG) *'),
        e('select', {
          value: draft.ggg, onChange: ev => set('ggg', ev.target.value), style: MODAL_FIELD_STYLE,
        },
          e('option', { value: '1' }, 'GG1'),
          e('option', { value: '2' }, 'GG2'),
          e('option', { value: '3' }, 'GG3')
        )
      ),

      e('div', { style: { display: 'flex', gap: 10, marginBottom: 14 } },
        e('div', { style: { flex: 1 } },
          e('label', { style: LABEL_STYLE }, 'Positive Cores *'),
          e('input', {
            type: 'number', min: 0, placeholder: '3', value: draft.positiveCores,
            onChange: ev => set('positiveCores', ev.target.value), style: MODAL_FIELD_STYLE,
          })
        ),
        e('div', { style: { flex: 1 } },
          e('label', { style: LABEL_STYLE }, 'Total Cores *'),
          e('input', {
            type: 'number', min: 1, placeholder: '12', value: draft.totalCores,
            onChange: ev => set('totalCores', ev.target.value), style: MODAL_FIELD_STYLE,
          })
        )
      ),

      e('div', { style: { marginBottom: 14 } },
        e('label', { style: LABEL_STYLE }, 'Max Core Involvement (%) *'),
        e('input', {
          type: 'number', min: 0, max: 100, placeholder: '40', value: draft.maxCorePercent,
          onChange: ev => set('maxCorePercent', ev.target.value), style: MODAL_FIELD_STYLE,
        })
      ),

      e('div', { style: { display: 'flex', gap: 10, marginBottom: 14 } },
        e('div', { style: { flex: 1 } },
          e('label', { style: LABEL_STYLE }, 'PSA (ng/mL) *'),
          e('input', {
            type: 'number', step: '0.1', min: 0, placeholder: '6.5', value: draft.psa,
            onChange: ev => set('psa', ev.target.value), style: MODAL_FIELD_STYLE,
          })
        ),
        e('div', { style: { flex: 1 } },
          e('label', { style: LABEL_STYLE }, 'Prostate Volume (cc)'),
          e('input', {
            type: 'number', step: '0.1', min: 0, placeholder: '40', value: draft.prostateVolume,
            onChange: ev => set('prostateVolume', ev.target.value), style: MODAL_FIELD_STYLE,
          })
        )
      ),

      e('div', { style: { marginBottom: 22 } },
        e('label', { style: LABEL_STYLE }, 'PI-RADS *'),
        e('select', {
          value: draft.pirads, onChange: ev => set('pirads', ev.target.value), style: MODAL_FIELD_STYLE,
        },
          e('option', { value: '' }, '— No MRI / not entered —'),
          e('option', { value: '0' }, 'No MRI'),
          e('option', { value: '1' }, '1'),
          e('option', { value: '2' }, '2'),
          e('option', { value: '3' }, '3'),
          e('option', { value: '4' }, '4'),
          e('option', { value: '5' }, '5')
        )
      ),

      e('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } },
        e('button', {
          type: 'button', onClick: onClose,
          style: {
            padding: '9px 16px', borderRadius: 9, background: '#fff',
            border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700,
            color: CETACEAN, cursor: 'pointer',
          },
        }, 'Cancel'),
        e('button', {
          type: 'button', onClick: () => onSave(draft),
          style: {
            padding: '9px 18px', borderRadius: 9, background: CERULEAN,
            border: 'none', fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: 'pointer', boxShadow: '0 1px 3px rgba(6,171,235,0.3)',
          },
        }, 'Save Patient')
      )
    )
  )
}

export default function BatchCalculator() {
  const [rows, setRows] = useState(() => loadStoredRows() || [])
  const [modalRowId, setModalRowId] = useState(null)
  const [pendingNewRow, setPendingNewRow] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  }, [rows])

  function updateRow(id, patch) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch, result: null, error: null } : r)))
  }

  function addRowViaForm() {
    setPendingNewRow(makeRow())
    setModalRowId('new')
  }

  function saveModalRow(draft) {
    if (modalRowId === 'new') {
      setRows(rs => [...rs, draft])
      setPendingNewRow(null)
    } else {
      updateRow(draft.id, draft)
    }
    setModalRowId(null)
  }

  function closeModal() {
    setModalRowId(null)
    setPendingNewRow(null)
  }

  const modalRow = modalRowId === 'new' ? pendingNewRow : rows.find(r => r.id === modalRowId) || null

  function removeRow(id) {
    setRows(rs => rs.filter(r => r.id !== id))
  }

  function toInputs(row) {
    return {
      ggg:            Number(row.ggg),
      positiveCores:  row.positiveCores  === '' ? null : Number(row.positiveCores),
      totalCores:     row.totalCores     === '' ? null : Number(row.totalCores),
      maxCorePercent: row.maxCorePercent === '' ? null : Number(row.maxCorePercent),
      psa:            row.psa           === '' ? null : Number(row.psa),
      prostateVolume: row.prostateVolume === '' ? null : Number(row.prostateVolume),
      pirads:         row.pirads        === '' ? null : Number(row.pirads),
    }
  }

  function calculateAll() {
    setRows(rs => rs.map(r => {
      const hasAnyValue = r.positiveCores !== '' || r.totalCores !== '' ||
        r.maxCorePercent !== '' || r.psa !== '' || r.prostateVolume !== '' || r.pirads !== ''
      if (!hasAnyValue) return r

      try {
        const assessment = runAssessment(toInputs(r))
        return { ...r, result: assessment, error: null }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Calculation failed'
        return { ...r, result: null, error: msg }
      }
    }))
  }

  function exportCsv() {
    const header = [
      'Patient ID', 'GGG', 'Positive Cores', 'Total Cores', 'Max Core %',
      'PSA', 'Prostate Volume', 'PI-RADS', 'PSAD', 'Upgrade Risk %',
      'Risk Band', 'Guideline Tier', 'Error',
    ]
    const lines = [header.join(',')]
    rows.forEach(r => {
      const psad = r.result?.psad != null ? r.result.psad.toFixed(3) : ''
      const pct  = r.result?.upgradeRisk?.available ? r.result.upgradeRisk.pct : ''
      const band = r.result?.upgradeRisk?.available ? r.result.upgradeRisk.band : ''
      const tier = r.result?.combinedRecommendation || ''
      const cells = [
        r.id, r.ggg, r.positiveCores, r.totalCores, r.maxCorePercent,
        r.psa, r.prostateVolume, r.pirads, psad, pct, band,
        `"${tier.replace(/"/g, '""')}"`, r.error || '',
      ]
      lines.push(cells.join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `as-batch-assessment-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportJson() {
    const payload = {
      exportType: BATCH_EXPORT_TYPE,
      version: 1,
      exportedAt: new Date().toISOString(),
      patients: rows.map(r => ({ id: r.id, inputs: toInputs(r), results: r.result })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `as-batch-patients-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function triggerImport() {
    fileInputRef.current?.click()
  }

  // A patient entry is only skipped if it isn't an object at all (e.g. null,
  // a bare number/string in a malformed array). Missing or partial fields
  // within an otherwise-valid entry are fine — rowFromInputs fills gaps with
  // blanks, and Calculate All will just flag that row as incomplete.
  function safeRowFromEntry(p) {
    if (p == null || typeof p !== 'object') return null
    return rowFromInputs(p.inputs && typeof p.inputs === 'object' ? p.inputs : p, p.results)
  }

  // Accepts three shapes: a batch export ({exportType:'as-batch-calculator', patients:[...]}),
  // a single-patient calculator export ({exportType:'as-clinical-calculator', inputs, results}),
  // or a bare array of {inputs, results} / raw-input objects. Any shape may
  // have missing/partial fields — those come through as blank inputs.
  function rowsFromImportedJson(parsed) {
    let entries
    if (parsed && parsed.exportType === SINGLE_EXPORT_TYPE) {
      entries = [parsed]
    } else if (parsed && parsed.exportType === BATCH_EXPORT_TYPE && Array.isArray(parsed.patients)) {
      entries = parsed.patients
    } else if (Array.isArray(parsed)) {
      entries = parsed
    } else if (parsed && typeof parsed === 'object') {
      entries = [parsed]
    } else {
      throw new Error('Unrecognized file format')
    }

    const rows = entries.map(safeRowFromEntry).filter(Boolean)
    if (rows.length === 0) throw new Error('No usable patient data found in file')
    return rows
  }

  function importJson(ev) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const imported = rowsFromImportedJson(parsed)
        setRows(rs => [...rs, ...imported])
      } catch (err) {
        window.alert('Could not import file: ' + (err instanceof Error ? err.message : 'invalid JSON'))
      }
    }
    reader.readAsText(file)
    ev.target.value = ''
  }

  const hasAnyResult = rows.some(r => r.result || r.error)

  return e('div', {
    style: { maxWidth: 1180, width: '100%', margin: '0 auto', padding: '20px 20px 60px' },
  },
    e('div', { style: { marginBottom: 16 } },
      e('h2', { style: { fontSize: 18, fontWeight: 800, color: CETACEAN, margin: 0 } },
        'Batch Patient Risk Calculator'
      ),
      e('p', { style: { fontSize: 13, color: '#64748b', margin: '4px 0 0' } },
        'Add each patient through the form, then calculate personalized upgrade risk and pathway stage for all of them at once. Saved automatically in this browser.'
      )
    ),

    // ── Table (view + edit only — use the form to add patients) ────────────
    e('div', {
      style: {
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,45,0.06)',
      },
    },
      e('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 980 } },
        e('thead', null,
          e('tr', null,
            e('th', { style: TH_STYLE }, 'Patient'),
            e('th', { style: TH_STYLE }, 'GGG'),
            e('th', { style: TH_STYLE }, 'Pos. Cores'),
            e('th', { style: TH_STYLE }, 'Total Cores'),
            e('th', { style: TH_STYLE }, 'Max Core %'),
            e('th', { style: TH_STYLE }, 'PSA'),
            e('th', { style: TH_STYLE }, 'Vol (cc)'),
            e('th', { style: TH_STYLE }, 'PI-RADS'),
            e('th', { style: { ...TH_STYLE, minWidth: 110 } }, 'Upgrade Risk'),
            e('th', { style: { ...TH_STYLE, minWidth: 130 } }, 'Pathway Stage'),
            e('th', { style: TH_STYLE }, '')
          )
        ),
        e('tbody', null,
          rows.length === 0
            ? e('tr', null,
                e('td', { colSpan: 11, style: { padding: '28px 8px', textAlign: 'center', fontSize: 13, color: '#94a3b8' } },
                  'No patients yet. Click “+ Add Patient” to enter data using the form.'
                )
              )
            : rows.map((r, i) => e('tr', { key: r.id },
                e('td', { style: { ...TD_STYLE, fontWeight: 700 } }, `Patient #${r.id}`),
                e('td', { style: TD_STYLE }, GGG_LABELS[r.ggg] || dash(r.ggg)),
                e('td', { style: TD_STYLE }, dash(r.positiveCores)),
                e('td', { style: TD_STYLE }, dash(r.totalCores)),
                e('td', { style: TD_STYLE }, r.maxCorePercent === '' ? dash('') : `${r.maxCorePercent}%`),
                e('td', { style: TD_STYLE }, dash(r.psa)),
                e('td', { style: TD_STYLE }, dash(r.prostateVolume)),
                e('td', { style: TD_STYLE }, PIRADS_LABELS[r.pirads] || dash(r.pirads)),
                e('td', { style: TD_STYLE },
                  r.error
                    ? e('div', { style: { fontSize: 11.5, color: '#be123c', maxWidth: 160 } }, r.error)
                    : r.result?.hardStop
                      ? e('div', { style: { fontSize: 12, fontWeight: 700, color: '#dc2626' } }, r.result.hardStopLabel || 'Hard stop')
                      : r.result?.upgradeRisk?.available
                        ? e('div', null,
                            e('span', {
                              style: { fontSize: 16, fontWeight: 800, color: bandColor(r.result.upgradeRisk.band) },
                            }, `${r.result.upgradeRisk.pct}%`),
                            e('span', { style: { fontSize: 11, color: '#64748b', marginLeft: 6 } },
                              r.result.upgradeRisk.band
                            )
                          )
                        : e('span', { style: { fontSize: 12, color: '#cbd5e1' } }, '—')
                ),
                e('td', { style: TD_STYLE },
                  r.result?.combinedRecommendation
                    ? e('div', null,
                        e('div', {
                          style: { fontSize: 12, fontWeight: 700, color: CETACEAN, textTransform: 'capitalize' },
                        }, r.result.combinedTierKey ? r.result.combinedTierKey.replace(/_/g, ' ') : ''),
                        e('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2, maxWidth: 170 } },
                          r.result.combinedRecommendation
                        )
                      )
                    : r.result?.hardStop
                      ? e('div', { style: { fontSize: 11, color: '#dc2626', maxWidth: 170 } },
                          r.result.hardStopLabel || 'Hard stop'
                        )
                      : e('span', { style: { fontSize: 12, color: '#cbd5e1' } }, '—')
                ),
                e('td', { style: { ...TD_STYLE, textAlign: 'right', whiteSpace: 'nowrap' } },
                  e('button', {
                    type: 'button',
                    onClick: () => setModalRowId(r.id),
                    title: 'Edit patient details',
                    style: {
                      border: '1px solid #e2e8f0', background: '#fff', color: CETACEAN,
                      cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '4px 8px',
                      borderRadius: 6, marginRight: 6,
                    },
                  }, 'Edit'),
                  e('button', {
                    type: 'button',
                    onClick: () => removeRow(r.id),
                    title: 'Remove patient',
                    style: {
                      border: 'none', background: 'transparent', color: '#94a3b8',
                      cursor: 'pointer', fontSize: 16, padding: '2px 6px', lineHeight: 1,
                    },
                  }, '×')
                )
              ))
        )
      )
    ),

    // ── Actions ────────────────────────────────────────────────────────────
    e('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' } },
      e('button', {
        type: 'button', onClick: addRowViaForm,
        style: {
          padding: '8px 16px', borderRadius: 9, background: MAGENTA,
          border: 'none', fontSize: 12.5, fontWeight: 700, color: '#fff',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(220,41,141,0.3)',
        },
      }, '+ Add Patient'),
      e('button', {
        type: 'button', onClick: calculateAll,
        style: {
          padding: '8px 16px', borderRadius: 9, background: CERULEAN,
          border: 'none', fontSize: 12.5, fontWeight: 700, color: '#fff',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(6,171,235,0.3)',
        },
      }, 'Calculate All'),
      hasAnyResult && e('button', {
        type: 'button', onClick: exportCsv,
        style: {
          padding: '8px 14px', borderRadius: 9, background: '#fff',
          border: '1px solid #e2e8f0', fontSize: 12.5, fontWeight: 700,
          color: CETACEAN, cursor: 'pointer',
        },
      }, 'Export CSV'),
      e('span', { style: { width: 1, height: 20, background: '#e2e8f0', margin: '0 2px' } }),
      e('button', {
        type: 'button', onClick: exportJson,
        title: 'Save all patients to a JSON file',
        style: {
          padding: '8px 14px', borderRadius: 9, background: '#fff',
          border: '1px solid #e2e8f0', fontSize: 12.5, fontWeight: 700,
          color: CETACEAN, cursor: 'pointer',
        },
      }, 'Export JSON'),
      e('button', {
        type: 'button', onClick: triggerImport,
        title: 'Load patients from a batch JSON export or a single-patient calculator JSON export',
        style: {
          padding: '8px 14px', borderRadius: 9, background: '#fff',
          border: '1px solid #e2e8f0', fontSize: 12.5, fontWeight: 700,
          color: CETACEAN, cursor: 'pointer',
        },
      }, 'Import JSON'),
      e('input', {
        ref: fileInputRef, type: 'file', accept: 'application/json',
        style: { display: 'none' }, onChange: importJson,
      })
    ),

    e('p', { style: { fontSize: 11.5, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 } },
      'Each patient is calculated with the full AS guideline + cohort-calibration model — same result you’d get entering the patient individually. ' +
      'Patients are stored in this browser only (local storage); use Export JSON to back up or move them to another device.'
    ),

    modalRow && e(PatientEntryModal, {
      row: modalRow,
      onSave: saveModalRow,
      onClose: closeModal,
    })
  )
}

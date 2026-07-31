/**
 * BatchCalculator.js
 *
 * Multi-patient AS Calculator — enter the basic Biopsy & Clinical Data fields
 * (Grade Group, cores, max core %, PSA, prostate volume, PI-RADS) for several
 * patients at once and get each patient's personalized upgrade risk % and
 * guideline tier in a single table. Uses the same asEngine.runAssessment
 * pipeline as the single-patient calculator.
 */
import React, { useState } from 'react'
import { runAssessment } from '../asEngine.js'

const e = React.createElement

const MAGENTA  = '#DC298D'
const CERULEAN = '#06ABEB'
const CETACEAN = '#00002D'

let nextId = 1
function makeRow() {
  return {
    id: nextId++,
    label: '',
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

const FIELD_STYLE = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  border: '1px solid #e2e8f0', fontSize: 12.5, color: CETACEAN,
  background: '#fff',
}

const TH_STYLE = {
  textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b',
  padding: '8px 8px', textTransform: 'uppercase', letterSpacing: 0.3,
  borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
}

const TD_STYLE = {
  padding: '6px 8px', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9',
}

function bandColor(band) {
  if (band === 'High')     return '#dc2626'
  if (band === 'Elevated') return '#ea580c'
  if (band === 'Average')  return '#ca8a04'
  return '#16a34a'
}

export default function BatchCalculator() {
  const [rows, setRows] = useState(() => [makeRow(), makeRow(), makeRow()])

  function updateRow(id, patch) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch, result: null, error: null } : r)))
  }

  function addRow() {
    setRows(rs => [...rs, makeRow()])
  }

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
      // Skip fully-empty rows silently
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
      'Label', 'GGG', 'Positive Cores', 'Total Cores', 'Max Core %',
      'PSA', 'Prostate Volume', 'PI-RADS', 'PSAD', 'Upgrade Risk %',
      'Risk Band', 'Guideline Tier', 'Error',
    ]
    const lines = [header.join(',')]
    rows.forEach((r, i) => {
      const label = r.label || `Patient ${i + 1}`
      const psad = r.result?.psad != null ? r.result.psad.toFixed(3) : ''
      const pct  = r.result?.upgradeRisk?.available ? r.result.upgradeRisk.pct : ''
      const band = r.result?.upgradeRisk?.available ? r.result.upgradeRisk.band : ''
      const tier = r.result?.combinedRecommendation || ''
      const cells = [
        label, r.ggg, r.positiveCores, r.totalCores, r.maxCorePercent,
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

  const hasAnyResult = rows.some(r => r.result || r.error)

  return e('div', {
    style: { maxWidth: 1180, width: '100%', margin: '0 auto', padding: '20px 20px 60px' },
  },
    e('div', { style: { marginBottom: 16 } },
      e('h2', { style: { fontSize: 18, fontWeight: 800, color: CETACEAN, margin: 0 } },
        'Batch Patient Risk Calculator'
      ),
      e('p', { style: { fontSize: 13, color: '#64748b', margin: '4px 0 0' } },
        'Enter the basic Biopsy & Clinical Data for multiple patients and calculate personalized upgrade risk for all of them at once.'
      )
    ),

    // ── Table ──────────────────────────────────────────────────────────────
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
            e('th', { style: { ...TH_STYLE, minWidth: 90 } }, 'GGG *'),
            e('th', { style: { ...TH_STYLE, minWidth: 80 } }, 'Pos. Cores *'),
            e('th', { style: { ...TH_STYLE, minWidth: 80 } }, 'Total Cores *'),
            e('th', { style: { ...TH_STYLE, minWidth: 80 } }, 'Max Core % *'),
            e('th', { style: { ...TH_STYLE, minWidth: 80 } }, 'PSA *'),
            e('th', { style: { ...TH_STYLE, minWidth: 90 } }, 'Vol (cc)'),
            e('th', { style: { ...TH_STYLE, minWidth: 90 } }, 'PI-RADS *'),
            e('th', { style: { ...TH_STYLE, minWidth: 140 } }, 'Upgrade Risk'),
            e('th', { style: TH_STYLE }, '')
          )
        ),
        e('tbody', null,
          rows.map((r, i) => e('tr', { key: r.id },
            e('td', { style: TD_STYLE },
              e('input', {
                type: 'text', placeholder: `Patient ${i + 1}`, value: r.label,
                onChange: ev => updateRow(r.id, { label: ev.target.value }),
                style: { ...FIELD_STYLE, minWidth: 100 },
              })
            ),
            e('td', { style: TD_STYLE },
              e('select', {
                value: r.ggg,
                onChange: ev => updateRow(r.id, { ggg: ev.target.value }),
                style: FIELD_STYLE,
              },
                e('option', { value: '1' }, 'GG1'),
                e('option', { value: '2' }, 'GG2'),
                e('option', { value: '3' }, 'GG3')
              )
            ),
            e('td', { style: TD_STYLE },
              e('input', {
                type: 'number', min: 0, placeholder: '3', value: r.positiveCores,
                onChange: ev => updateRow(r.id, { positiveCores: ev.target.value }),
                style: FIELD_STYLE,
              })
            ),
            e('td', { style: TD_STYLE },
              e('input', {
                type: 'number', min: 1, placeholder: '12', value: r.totalCores,
                onChange: ev => updateRow(r.id, { totalCores: ev.target.value }),
                style: FIELD_STYLE,
              })
            ),
            e('td', { style: TD_STYLE },
              e('input', {
                type: 'number', min: 0, max: 100, placeholder: '40', value: r.maxCorePercent,
                onChange: ev => updateRow(r.id, { maxCorePercent: ev.target.value }),
                style: FIELD_STYLE,
              })
            ),
            e('td', { style: TD_STYLE },
              e('input', {
                type: 'number', step: '0.1', min: 0, placeholder: '6.5', value: r.psa,
                onChange: ev => updateRow(r.id, { psa: ev.target.value }),
                style: FIELD_STYLE,
              })
            ),
            e('td', { style: TD_STYLE },
              e('input', {
                type: 'number', step: '0.1', min: 0, placeholder: '40', value: r.prostateVolume,
                onChange: ev => updateRow(r.id, { prostateVolume: ev.target.value }),
                style: FIELD_STYLE,
              })
            ),
            e('td', { style: TD_STYLE },
              e('select', {
                value: r.pirads,
                onChange: ev => updateRow(r.id, { pirads: ev.target.value }),
                style: FIELD_STYLE,
              },
                e('option', { value: '' }, '—'),
                e('option', { value: '0' }, 'No MRI'),
                e('option', { value: '1' }, '1'),
                e('option', { value: '2' }, '2'),
                e('option', { value: '3' }, '3'),
                e('option', { value: '4' }, '4'),
                e('option', { value: '5' }, '5')
              )
            ),
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
                        ),
                        e('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } },
                          r.result.combinedRecommendation
                            ? r.result.combinedTierKey?.replace(/_/g, ' ')
                            : ''
                        )
                      )
                    : e('span', { style: { fontSize: 12, color: '#cbd5e1' } }, '—')
            ),
            e('td', { style: { ...TD_STYLE, textAlign: 'right' } },
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
    e('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
      e('button', {
        type: 'button', onClick: addRow,
        style: {
          padding: '8px 14px', borderRadius: 9, background: '#fff',
          border: '1px solid #e2e8f0', fontSize: 12.5, fontWeight: 700,
          color: CETACEAN, cursor: 'pointer',
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
      }, 'Export CSV')
    ),

    e('p', { style: { fontSize: 11.5, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 } },
      '* Required fields. Prostate volume is optional but needed to compute PSAD. ' +
      'Each row is calculated with the full AS guideline + cohort-calibration model — same result you’d get entering the patient individually. ' +
      'Rows left blank are skipped when calculating.'
    )
  )
}

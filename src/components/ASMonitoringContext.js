/**
 * ASMonitoringContext — stores and displays key monitoring parameters across visits.
 *
 * mode='edit'  → form to enter current visit data (Step 10)
 * mode='read'  → compact reference panel with computed flags (Step 13)
 */
import React, { useState, useEffect } from 'react'

const CTX_KEY = 'as_clinician_monitoring_ctx'

const EMPTY = {
  currentPSA: '',
  currentPSADate: '',
  previousPSA: '',
  previousPSADate: '',
  prostateVolume: '',
  lastBiopsyDate: '',
}

function yearsApart(dateA, dateB) {
  const diff = (new Date(dateB) - new Date(dateA)) / (1000 * 60 * 60 * 24 * 365.25)
  return Math.abs(diff)
}

function monthsAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 30.44)
  return Math.round(diff)
}

export function loadMonitoringContext() {
  try {
    const raw = localStorage.getItem(CTX_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_) { return null }
}

function saveContext(data) {
  try { localStorage.setItem(CTX_KEY, JSON.stringify(data)) } catch (_) {}
}

export function computeMetrics(ctx) {
  if (!ctx) return null
  const result = {}

  const psa1 = parseFloat(ctx.previousPSA)
  const psa2 = parseFloat(ctx.currentPSA)
  const vol  = parseFloat(ctx.prostateVolume)

  if (ctx.currentPSADate && ctx.previousPSADate && !isNaN(psa1) && !isNaN(psa2) && psa1 > 0 && psa2 > 0) {
    const yrs = yearsApart(ctx.previousPSADate, ctx.currentPSADate)
    if (yrs > 0.05) { // at least ~18 days apart
      result.velocity = (psa2 - psa1) / yrs
      const ratio = psa2 / psa1
      if (ratio > 0 && ratio !== 1) {
        result.doublingTimeYears = Math.log(2) / (Math.log(ratio) / yrs)
      }
    }
  }

  if (!isNaN(psa2) && psa2 > 0 && !isNaN(vol) && vol > 0) {
    result.psad = psa2 / vol
  }

  if (ctx.lastBiopsyDate) {
    result.monthsSinceBiopsy = monthsAgo(ctx.lastBiopsyDate)
    if (result.monthsSinceBiopsy > 36)      result.biopsyStatus = 'overdue'
    else if (result.monthsSinceBiopsy > 24) result.biopsyStatus = 'due-soon'
    else if (result.monthsSinceBiopsy > 12) result.biopsyStatus = 'on-schedule'
    else                                    result.biopsyStatus = 'recent'
  }

  return result
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(val, decimals = 2) {
  const n = parseFloat(val)
  return isNaN(n) ? '—' : n.toFixed(decimals)
}

function BiopsyBadge({ status, months }) {
  const map = {
    overdue:     { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    label: `Overdue — ${months} mo ago` },
    'due-soon':  { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-700',  label: `Due soon — ${months} mo ago` },
    'on-schedule':{ bg: 'bg-blue-50',  border: 'border-blue-200',   text: 'text-blue-700',   label: `On schedule — ${months} mo ago` },
    recent:      { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: `Recent — ${months} mo ago` },
  }
  const s = map[status]
  if (!s) return null
  return React.createElement('span', {
    className: `inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}`,
  }, s.label)
}

// ─── Edit mode ────────────────────────────────────────────────────────────────

export function MonitoringContextEditor({ onSaved }) {
  const [form, setForm]   = useState(() => loadMonitoringContext() || EMPTY)
  const [saved, setSaved] = useState(false)

  function handleSave(ev) {
    ev.preventDefault()
    saveContext(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    onSaved && onSaved(form)
  }

  const metrics = computeMetrics(form)
  const velFlag  = metrics?.velocity !== undefined && metrics.velocity > 0.75
  const psadFlag = metrics?.psad !== undefined && metrics.psad > 0.15

  function field(label, key, type = 'number', placeholder = '') {
    return React.createElement('div', { key, className: 'flex flex-col gap-1' },
      React.createElement('label', { className: 'text-xs font-semibold text-slate-500' }, label),
      React.createElement('input', {
        type,
        step: type === 'number' ? '0.01' : undefined,
        min: type === 'number' ? '0' : undefined,
        value: form[key],
        placeholder,
        onChange: ev => setForm(f => ({ ...f, [key]: ev.target.value })),
        className: 'border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sinai-cerulean/40 bg-white',
      })
    )
  }

  return React.createElement('form', { onSubmit: handleSave, className: 'space-y-4' },

    // PSA row
    React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
      field('Current PSA (ng/mL)', 'currentPSA', 'number', 'e.g. 5.2'),
      field('Current PSA Date', 'currentPSADate', 'date')
    ),
    React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
      field('Previous PSA (ng/mL)', 'previousPSA', 'number', 'e.g. 4.8'),
      field('Previous PSA Date', 'previousPSADate', 'date')
    ),
    React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
      field('Prostate Volume (cc) — optional', 'prostateVolume', 'number', 'e.g. 42'),
      field('Last Biopsy Date', 'lastBiopsyDate', 'date')
    ),

    // Live computed preview
    metrics && (metrics.velocity !== undefined || metrics.psad !== undefined || metrics.monthsSinceBiopsy !== undefined) &&
      React.createElement('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm space-y-1' },
        React.createElement('p', { className: 'text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2' }, 'Computed'),
        metrics.velocity !== undefined && React.createElement('div', { className: `flex items-center justify-between ${velFlag ? 'text-red-700 font-semibold' : 'text-slate-700'}` },
          React.createElement('span', null, 'PSA Velocity'),
          React.createElement('span', null, `${fmt(metrics.velocity)} ng/mL/yr${velFlag ? ' ⚠ > 0.75' : ''}`)
        ),
        metrics.doublingTimeYears !== undefined && React.createElement('div', { className: 'flex items-center justify-between text-slate-700' },
          React.createElement('span', null, 'PSA Doubling Time'),
          React.createElement('span', null,
            metrics.doublingTimeYears < 0 ? 'Declining' :
            metrics.doublingTimeYears > 10 ? '> 10 yrs' :
            `${fmt(metrics.doublingTimeYears, 1)} yrs`
          )
        ),
        metrics.psad !== undefined && React.createElement('div', { className: `flex items-center justify-between ${psadFlag ? 'text-amber-700 font-semibold' : 'text-slate-700'}` },
          React.createElement('span', null, 'PSA Density'),
          React.createElement('span', null, `${fmt(metrics.psad, 3)}${psadFlag ? ' ⚠ > 0.15' : ''}`)
        ),
        metrics.monthsSinceBiopsy !== undefined && React.createElement('div', { className: 'flex items-center justify-between text-slate-700' },
          React.createElement('span', null, 'Last Biopsy'),
          React.createElement(BiopsyBadge, { status: metrics.biopsyStatus, months: metrics.monthsSinceBiopsy })
        )
      ),

    React.createElement('button', {
      type: 'submit',
      className: 'w-full py-2.5 rounded-xl text-sm font-bold bg-sinai-cerulean text-white hover:bg-sinai-cerulean/90 transition-colors',
    }, saved ? 'Saved' : 'Save Visit Context')
  )
}

// ─── Read mode (Step 13 reference panel) ─────────────────────────────────────

export function MonitoringContextPanel() {
  const [ctx, setCtx] = useState(null)

  useEffect(() => {
    setCtx(loadMonitoringContext())
  }, [])

  if (!ctx) return React.createElement('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic' },
    'No visit context saved — enter data at Step 10 to see PSA calculations here.'
  )

  const m = computeMetrics(ctx)
  if (!m) return null

  const velFlag  = m.velocity !== undefined && m.velocity > 0.75
  const psadFlag = m.psad !== undefined && m.psad > 0.15

  return React.createElement('div', { className: 'p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2' },
    React.createElement('p', { className: 'text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2' }, 'Visit Context — PSA Calculations'),

    React.createElement('div', { className: 'grid grid-cols-2 gap-x-6 gap-y-2 text-sm' },

      m.velocity !== undefined && React.createElement(React.Fragment, { key: 'vel' },
        React.createElement('div', { className: 'text-slate-500' }, 'PSA Velocity'),
        React.createElement('div', { className: velFlag ? 'font-bold text-red-600' : 'font-semibold text-slate-700' },
          `${fmt(m.velocity)} ng/mL/yr`,
          velFlag && React.createElement('span', { className: 'ml-1.5 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold' }, '⚠ > 0.75')
        )
      ),

      m.doublingTimeYears !== undefined && React.createElement(React.Fragment, { key: 'dt' },
        React.createElement('div', { className: 'text-slate-500' }, 'Doubling Time'),
        React.createElement('div', { className: 'font-semibold text-slate-700' },
          m.doublingTimeYears < 0 ? 'PSA declining' :
          m.doublingTimeYears > 10 ? '> 10 yrs' :
          `${fmt(m.doublingTimeYears, 1)} yrs`
        )
      ),

      m.psad !== undefined && React.createElement(React.Fragment, { key: 'psad' },
        React.createElement('div', { className: 'text-slate-500' }, 'PSA Density'),
        React.createElement('div', { className: psadFlag ? 'font-bold text-amber-600' : 'font-semibold text-slate-700' },
          fmt(m.psad, 3),
          psadFlag && React.createElement('span', { className: 'ml-1.5 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold' }, '⚠ > 0.15')
        )
      ),

      m.monthsSinceBiopsy !== undefined && React.createElement(React.Fragment, { key: 'bx' },
        React.createElement('div', { className: 'text-slate-500' }, 'Last Biopsy'),
        React.createElement('div', null, React.createElement(BiopsyBadge, { status: m.biopsyStatus, months: m.monthsSinceBiopsy }))
      )
    ),

    // Biopsy schedule guidance
    m.biopsyStatus && React.createElement('div', {
      className: `mt-1 pt-2 border-t border-slate-200 text-xs ${
        m.biopsyStatus === 'overdue' ? 'text-red-600 font-semibold' :
        m.biopsyStatus === 'due-soon' ? 'text-amber-600 font-semibold' :
        'text-slate-500'
      }`,
    },
      m.biopsyStatus === 'overdue'      ? 'Per protocol (1–3 yr cycle): biopsy is overdue. Consider scheduling now.' :
      m.biopsyStatus === 'due-soon'     ? 'Per protocol (1–3 yr cycle): biopsy due within the next year.' :
      m.biopsyStatus === 'on-schedule'  ? 'Per protocol (1–3 yr cycle): next biopsy due in the next 12–24 months.' :
                                          'Per protocol: recent biopsy — next due in 1–3 years from last biopsy date.'
    )
  )
}

import React from 'react'
import { Activity, RotateCcw } from 'lucide-react'

const PART_META = {
  1: { short: 'Part 1', full: 'Initial Risk Stratification', dot: '#06ABEB' },
  2: { short: 'Part 2', full: 'Pre-Enrollment Verification', dot: '#DC298D' },
  3: { short: 'Part 3', full: 'Standard Protocol', dot: '#10b981' },
}

export default function AppHeader({ currentPart, stepLabel, onReset, showReset }) {
  const meta = currentPart ? PART_META[currentPart] : null

  return React.createElement('header', {
    className: 'sticky top-0 z-40 print:hidden',
    style: { background: 'linear-gradient(90deg, #00002D 0%, #212070 100%)', boxShadow: '0 2px 16px 0 rgba(0,0,45,0.35)' }
  },
    React.createElement('div', { className: 'max-w-4xl mx-auto px-4 flex items-center gap-3', style: { height: '52px' } },

      // Brand mark
      React.createElement('div', { className: 'flex items-center gap-2.5 shrink-0' },
        React.createElement('div', {
          className: 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          style: { background: 'linear-gradient(135deg, #06ABEB 0%, #0596c7 100%)' }
        },
          React.createElement(Activity, { className: 'w-4 h-4 text-white' })
        ),
        React.createElement('div', { className: 'leading-none' },
          React.createElement('div', { style: { fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', color: '#06ABEB', textTransform: 'uppercase', lineHeight: 1 } }, 'Mount Sinai'),
          React.createElement('div', { style: { fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.3 } }, 'Tewari AS Program')
        )
      ),

      // Divider
      React.createElement('div', { style: { width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', flexShrink: 0, margin: '0 4px' } }),

      // Part + step breadcrumb
      React.createElement('div', { className: 'flex-1 min-w-0 flex items-center gap-2' },
        meta && React.createElement('span', {
          className: 'shrink-0 inline-flex items-center gap-1 text-white font-bold rounded-full px-2.5 py-0.5',
          style: { fontSize: '11px', background: 'rgba(255,255,255,0.12)', letterSpacing: '0.03em' }
        },
          React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: meta.dot, flexShrink: 0 } }),
          meta.short
        ),
        meta && React.createElement('span', {
          className: 'hidden sm:block shrink-0',
          style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }
        }, meta.full),
        stepLabel && React.createElement('span', {
          style: { fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '0 2px' }
        }, '·'),
        stepLabel && React.createElement('span', {
          className: 'truncate',
          style: { fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }
        }, stepLabel)
      ),

      // Reset button
      showReset && React.createElement('button', {
        onClick: onReset,
        className: 'flex items-center gap-1.5 shrink-0 rounded-lg transition-all',
        style: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' },
        onMouseEnter: e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' },
        onMouseLeave: e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent' }
      },
        React.createElement(RotateCcw, { style: { width: '11px', height: '11px' } }),
        React.createElement('span', { className: 'hidden sm:inline' }, 'Reset')
      )
    )
  )
}

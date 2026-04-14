import React from 'react'
import { Activity, ChevronRight } from 'lucide-react'

const PARTS = [
  { num: '1', title: 'Initial Risk Stratification', color: '#06ABEB', steps: 'Steps 1 – 5' },
  { num: '2', title: 'Pre-Enrollment Verification', color: '#DC298D', steps: 'Steps 6 – 9' },
  { num: '3', title: 'Standard AS Protocol', color: '#10b981', steps: 'Steps 10 – 14' },
]

export default function StartScreen({ onStart }) {
  return React.createElement('div', { className: 'max-w-xl mx-auto' },

    // Hero card
    React.createElement('div', {
      className: 'bg-white rounded-2xl border border-slate-100 overflow-hidden',
      style: { boxShadow: '0 8px 40px -8px rgba(33,32,112,0.18)' },
    },

      // Top gradient banner
      React.createElement('div', {
        className: 'px-4 sm:px-8 pt-6 sm:pt-8 pb-6 sm:pb-7 text-center',
        style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 55%, #06ABEB 140%)' },
      },
        React.createElement('div', { className: 'flex justify-center mb-5' },
          React.createElement('div', {
            className: 'w-16 h-16 rounded-2xl flex items-center justify-center',
            style: { background: 'rgba(6,171,235,0.25)', border: '1.5px solid rgba(6,171,235,0.4)' },
          },
            React.createElement(Activity, { className: 'w-8 h-8 text-white' })
          )
        ),
        React.createElement('p', {
          style: { fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: '#06ABEB', textTransform: 'uppercase', marginBottom: '6px' },
        }, 'Mount Sinai · Urology'),
        React.createElement('h1', {
          className: 'font-bold text-white mb-2',
          style: { fontSize: '26px', letterSpacing: '-0.01em', lineHeight: 1.15 },
        }, 'Tewari Active\nSurveillance Program'),
        React.createElement('p', {
          style: { fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' },
        }, 'Prostate Cancer Clinical Pathway')
      ),

      // Content body
      React.createElement('div', { className: 'p-6 md:p-8' },

        // Trigger callout
        React.createElement('div', {
          className: 'flex items-center gap-3 p-4 rounded-xl mb-6',
          style: { background: 'rgb(6 171 235 / 0.06)', border: '1px solid rgb(6 171 235 / 0.2)' },
        },
          React.createElement('div', {
            className: 'w-2.5 h-2.5 rounded-full shrink-0',
            style: { background: '#06ABEB' },
          }),
          React.createElement('p', {
            className: 'text-sm font-semibold',
            style: { color: '#212070' },
          }, 'Trigger: 1st Positive Biopsy · 4-Week Clinic Follow-Up')
        ),

        // Three parts overview
        React.createElement('div', { className: 'space-y-2 mb-6' },
          React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wider text-slate-400 mb-3' }, 'Pathway Overview'),
          PARTS.map(p =>
            React.createElement('div', {
              key: p.num,
              className: 'flex items-center gap-3 p-3 rounded-xl',
              style: { background: '#f8fafc', border: '1px solid #f1f5f9' },
            },
              React.createElement('div', {
                className: 'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold',
                style: { fontSize: '12px', background: p.color },
              }, p.num),
              React.createElement('div', { className: 'flex-1 min-w-0' },
                React.createElement('p', { className: 'text-sm font-semibold text-slate-800 leading-tight' }, p.title),
                React.createElement('p', { className: 'text-xs text-slate-400 mt-0.5' }, p.steps)
              )
            )
          )
        ),

        // CTA button
        React.createElement('button', {
          onClick: onStart,
          className: 'btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-base',
          style: { background: 'linear-gradient(135deg, #06ABEB 0%, #0596c7 100%)', boxShadow: '0 4px 18px rgba(6,171,235,0.35)' },
        },
          'Begin Assessment',
          React.createElement(ChevronRight, { className: 'w-5 h-5' })
        )
      )
    )
  )
}

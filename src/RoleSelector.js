import React, { useState } from 'react'
import { Activity, User } from 'lucide-react'
import CareTeamModal from './components/CareTeamModal.js'

const e = React.createElement

const C = {
  navy: '#221f72',
  navyDark: '#17134f',
  navy10: '#e8e7f5',
  cyan: '#0288d1',
  magenta: '#d31f7a',
  ink: '#1a1a24',
  muted: '#5c5c70',
  line: '#e2e2ea',
  bg: '#f4f4f8',
  shadow: '0 1px 2px rgba(26,26,36,0.04), 0 8px 24px rgba(26,26,36,0.06)',
}

function BrandMark() {
  return e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
    e('div', {
      style: {
        width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: C.navy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    },
      e(Activity, { style: { width: 17, height: 17, color: '#fff' } })
    ),
    e('div', null,
      e('div', { style: { fontSize: 17, fontWeight: 700, color: C.navy, lineHeight: 1.2 } }, 'Tewari AS Program'),
      e('div', { style: { fontSize: 12, color: C.muted } }, 'Mount Sinai · Urology')
    )
  )
}

// Inline stethoscope SVG (lucide Stethoscope path)
function StethIcon() {
  return e('svg', {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: C.navy, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    e('path', { d: 'M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3' }),
    e('path', { d: 'M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4' }),
    e('circle', { cx: 20, cy: 10, r: 2 })
  )
}

function ChevronRightIcon() {
  return e('svg', {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
    stroke: C.muted, strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    e('polyline', { points: '9 18 15 12 9 6' })
  )
}

function InfoIcon() {
  return e('svg', {
    width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    e('circle', { cx: 12, cy: 12, r: 10 }),
    e('line', { x1: 12, y1: 16, x2: 12, y2: 12 }),
    e('line', { x1: 12, y1: 8, x2: '12.01', y2: 8 })
  )
}

const ROLES = [
  {
    key: 'patient',
    title: 'I am a Patient',
    desc: 'Educational resources and guideline topics for your care.',
    icon: () => e(User, { style: { width: 18, height: 18, color: C.navy } }),
    tileStyle: { background: C.navy10 },
  },
  {
    key: 'clinician',
    title: 'I am a Clinician',
    desc: 'Clinical pathway and AS decision-support calculator.',
    icon: StethIcon,
    tileStyle: { background: C.navy10 },
  },
]

export default function RoleSelector({ onSelectRole }) {
  const [careOpen, setCareOpen] = useState(false)

  return e('div', {
    style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, color: C.ink },
  },
    e(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),

    // Header — same shell as ePSA / e-Biopsy
    e('header', { style: { background: '#fff', borderBottom: `1px solid ${C.line}`, flexShrink: 0 } },
      e('div', {
        style: {
          maxWidth: 760, margin: '0 auto', padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        },
      },
        e(BrandMark),
        e('button', {
          type: 'button',
          onClick: () => setCareOpen(true),
          style: {
            background: '#fff', border: `1px solid ${C.line}`, color: C.muted,
            padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          },
        }, e(InfoIcon), 'Care Team')
      ),
      e('div', { style: { height: 3, background: `linear-gradient(90deg, ${C.navy} 0%, ${C.cyan} 55%, ${C.magenta} 100%)` } })
    ),

    e('main', { style: { flex: 1, width: '100%', maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px' } },
      // Hero card
      e('div', {
        style: {
          background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10,
          boxShadow: C.shadow, overflow: 'hidden',
        },
      },
        e('div', { style: { background: `linear-gradient(140deg, ${C.navy} 0%, ${C.navyDark} 100%)`, color: '#fff', padding: '28px 24px' } },
          e('p', {
            style: {
              margin: '0 0 6px', fontSize: 12, fontWeight: 600, letterSpacing: '.06em',
              textTransform: 'uppercase', color: '#9fd8f6',
            },
          }, 'Mount Sinai · Urology'),
          e('h1', { style: { margin: '0 0 8px', fontSize: 28, fontWeight: 700, lineHeight: 1.25, color: '#fff' } }, 'Tewari Active Surveillance Program'),
          e('p', { style: { margin: 0, opacity: 0.92, lineHeight: 1.55 } },
            'Guideline-based education for patients and a decision-support pathway for clinicians.')
        ),
        e('div', { style: { padding: '22px 24px 24px' } },
          e('p', {
            style: {
              margin: '0 0 10px', fontSize: 12, fontWeight: 600, letterSpacing: '.06em',
              textTransform: 'uppercase', color: C.cyan,
            },
          }, 'Choose your role'),
          e('div', { style: { display: 'grid', gap: 8 } },
            ROLES.map(r =>
              e('button', {
                key: r.key,
                type: 'button',
                onClick: () => onSelectRole(r.key),
                style: {
                  background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8,
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14,
                  textAlign: 'left', cursor: 'pointer', width: '100%', color: C.ink,
                  transition: 'border-color 0.15s, background 0.15s',
                },
                onMouseEnter: ev => { ev.currentTarget.style.borderColor = C.navy; ev.currentTarget.style.background = '#fafaff' },
                onMouseLeave: ev => { ev.currentTarget.style.borderColor = C.line; ev.currentTarget.style.background = '#fff' },
              },
                e('div', {
                  style: {
                    width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...r.tileStyle,
                  },
                }, e(r.icon)),
                e('div', { style: { flex: 1, minWidth: 0 } },
                  e('div', { style: { color: C.navy, fontSize: 16, fontWeight: 600, marginBottom: 2 } }, r.title),
                  e('div', { style: { color: C.muted, fontSize: 14, lineHeight: 1.4 } }, r.desc)
                ),
                e(ChevronRightIcon)
              )
            )
          )
        )
      ),

      e('p', { style: { textAlign: 'center', fontSize: 13, color: C.muted, lineHeight: 1.5, margin: '20px 0 0' } },
        'For educational and clinical decision-support purposes only. Not a substitute for professional medical advice.')
    )
  )
}

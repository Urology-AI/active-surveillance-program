import React, { useState } from 'react'
import { Activity, User } from 'lucide-react'
import CareTeamModal from './components/CareTeamModal.js'

const e = React.createElement

const C = {
  cetacean: '#00002D',
  navy: '#212070',
  cerulean: '#06ABEB',
  ceruleanDark: '#0596c7',
}

function BrandMark() {
  return e('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
    e('div', {
      style: {
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.cerulean} 0%, ${C.ceruleanDark} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    },
      e(Activity, { style: { width: 16, height: 16, color: '#fff' } })
    ),
    e('div', { style: { lineHeight: 1 } },
      e('div', {
        style: {
          fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
          color: C.cerulean, textTransform: 'uppercase',
        },
      }, 'Mount Sinai'),
      e('div', {
        style: { fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 },
      }, 'Tewari AS Program')
    )
  )
}

// Inline stethoscope SVG (lucide Stethoscope path)
function StethIcon() {
  return e('svg', {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    e('path', { d: 'M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3' }),
    e('path', { d: 'M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4' }),
    e('circle', { cx: 20, cy: 10, r: 2 })
  )
}

function ChevronRightIcon() {
  return e('svg', {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2,
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
    icon: () => e(User, { style: { width: 18, height: 18, color: C.cerulean } }),
    tileStyle: {
      background: `${C.cerulean}22`,
      border: `1px solid ${C.cerulean}44`,
    },
  },
  {
    key: 'clinician',
    title: 'I am a Clinician',
    desc: 'Clinical pathway and AS decision-support calculator.',
    icon: StethIcon,
    tileStyle: {
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.18)',
    },
  },
]

export default function RoleSelector({ onSelectRole }) {
  const [careOpen, setCareOpen] = useState(false)

  return e('div', {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(165deg, ${C.cetacean} 0%, ${C.navy} 70%, ${C.cerulean} 150%)`,
    },
  },
    e(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),

    // Top strip
    e('div', {
      style: {
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      },
    },
      e(BrandMark),
      e('button', {
        type: 'button',
        onClick: () => setCareOpen(true),
        style: {
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'rgba(255,255,255,0.8)',
          padding: '5px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 5,
          cursor: 'pointer',
        },
      },
        e(InfoIcon),
        'Care Team'
      )
    ),

    // Centered main content
    e('div', {
      style: {
        flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 28px',
      },
    },

      // Eyebrow + title + divider
      e('div', { style: { textAlign: 'center', marginBottom: 32 } },
        e('p', {
          style: {
            fontSize: 10, fontWeight: 800, letterSpacing: '0.22em',
            color: C.cerulean, textTransform: 'uppercase',
            margin: 0, marginBottom: 8,
          },
        }, 'Mount Sinai · Urology'),
        e('h1', {
          style: {
            color: '#fff', fontSize: 26, fontWeight: 700,
            margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em',
          },
        }, 'Tewari Active', e('br'), 'Surveillance Program'),
        e('div', {
          style: {
            width: 40, height: 2,
            background: C.cerulean,
            margin: '14px auto 0',
          },
        })
      ),

      // "Choose your role" label
      e('p', {
        style: {
          fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
          textAlign: 'center', margin: '0 0 14px',
        },
      }, 'Choose your role'),

      // Role buttons
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        ROLES.map(r =>
          e('button', {
            key: r.key,
            type: 'button',
            onClick: () => onSelectRole(r.key),
            style: {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              textAlign: 'left', cursor: 'pointer', width: '100%',
              transition: 'background 0.15s, border-color 0.15s',
            },
            onMouseEnter: ev => {
              ev.currentTarget.style.background = 'rgba(255,255,255,0.10)'
              ev.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
            },
            onMouseLeave: ev => {
              ev.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              ev.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
            },
          },
            // Icon tile
            e('div', {
              style: {
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...r.tileStyle,
              },
            },
              e(r.icon)
            ),
            // Text
            e('div', { style: { flex: 1, minWidth: 0 } },
              e('div', { style: { color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 2 } }, r.title),
              e('div', { style: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.35 } }, r.desc)
            ),
            e(ChevronRightIcon)
          )
        )
      )
    ),

    // Footer disclaimer
    e('p', {
      style: {
        textAlign: 'center', fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        padding: '18px 40px', lineHeight: 1.5, margin: 0, flexShrink: 0,
      },
    }, 'For educational and clinical decision-support purposes only. Not a substitute for professional medical advice.')
  )
}

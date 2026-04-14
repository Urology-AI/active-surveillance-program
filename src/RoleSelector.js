import React, { useState } from 'react'
import { Info } from 'lucide-react'
import CareTeamModal from './components/CareTeamModal.js'

const e = React.createElement

export default function RoleSelector({ onSelectRole }) {
  const [careOpen, setCareOpen] = useState(false)

  return e('div', { className: 'min-h-screen flex flex-col', style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 60%, #06ABEB 100%)' } },

    e(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),

    // Top bar
    e('header', {
      className: 'no-print sticky top-0 z-40 w-full shrink-0 border-b border-white/10',
      style: { background: 'rgba(0,0,45,0.88)', backdropFilter: 'blur(10px)' },
    },
      e('div', { className: 'mx-auto flex max-w-2xl items-center justify-end px-4 py-3' },
        e('button', {
          type: 'button',
          onClick: () => setCareOpen(true),
          className: 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-white/90 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          title: 'Meet the Care Team',
          'aria-label': 'Meet the Care Team',
        },
          e(Info, { className: 'h-4 w-4' }),
          e('span', { className: 'text-xs font-semibold' }, 'Meet the Care Team')
        )
      )
    ),

    e('div', { className: 'flex flex-1 flex-col items-center justify-center p-6' },

    // Logo / wordmark
    e('div', { className: 'mb-10 text-center' },
      e('div', { className: 'text-white text-2xl font-bold tracking-wide mb-1' }, 'MOUNT SINAI'),
      e('div', { className: 'text-white/70 text-sm tracking-widest uppercase' }, 'Tewari Active Surveillance Program'),
      e('div', { className: 'mt-3 w-16 h-0.5 mx-auto', style: { background: '#06ABEB' } })
    ),

    // Cards
    e('div', { className: 'w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5' },

      // Patient card
      e('button', {
        onClick: () => onSelectRole('patient'),
        className: 'group relative bg-white rounded-2xl p-8 text-left shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/[0.04] hover:shadow-xl hover:shadow-slate-900/8 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 border-t-4',
        style: { borderTopColor: '#06ABEB' },
      },
        e('div', { className: 'flex items-start gap-4' },
          e('div', { className: 'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', style: { background: 'rgb(6 171 235 / 0.12)' } },
            e('svg', { className: 'w-6 h-6', style: { color: '#06ABEB' }, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
              e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
            )
          ),
          e('div', {},
            e('h2', { className: 'text-lg font-bold text-gray-900 mb-1' }, 'I am a Patient'),
            e('p', { className: 'text-sm text-gray-500 leading-relaxed' }, 'Get a personalised active surveillance assessment based on your biopsy results and diagnostic data.')
          )
        ),
        e('div', { className: 'mt-5 flex items-center gap-1 text-sm font-medium transition-all duration-150 group-hover:gap-2', style: { color: '#06ABEB' } },
          'Begin assessment',
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 5l7 7-7 7' })
          )
        )
      ),

      // Clinician card
      e('button', {
        onClick: () => onSelectRole('clinician'),
        className: 'group relative bg-white rounded-2xl p-8 text-left shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/[0.04] hover:shadow-xl hover:shadow-slate-900/8 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 border-t-4',
        style: { borderTopColor: '#212070' },
      },
        e('div', { className: 'flex items-start gap-4' },
          e('div', { className: 'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', style: { background: 'rgb(33 32 112 / 0.1)' } },
            e('svg', { className: 'w-6 h-6', style: { color: '#212070' }, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
              e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
            )
          ),
          e('div', {},
            e('h2', { className: 'text-lg font-bold text-gray-900 mb-1' }, 'I am a Clinician'),
            e('p', { className: 'text-sm text-gray-500 leading-relaxed' }, 'Access the clinical decision support tool for guided pathway navigation and shared decision-making.')
          )
        ),
        e('div', { className: 'mt-5 flex items-center gap-1 text-sm font-medium transition-all duration-150 group-hover:gap-2', style: { color: '#212070' } },
          'Enter clinical tool',
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 5l7 7-7 7' })
          )
        )
      )
    ),

    // Footer
    e('p', { className: 'mt-10 text-white/40 text-xs text-center max-w-sm' },
      'For educational and clinical decision-support purposes only. Not a substitute for professional medical advice.'
    )
    )
  )
}

import React, { useState } from 'react'
import { Activity, RotateCcw, Info, ChevronLeft, GitBranch, Calculator, Users } from 'lucide-react'
import CareTeamModal from './CareTeamModal.js'

export const PROGRAM_HEADER_SHELL_STYLE = {
  background: 'linear-gradient(90deg, #00002D 0%, #212070 100%)',
  boxShadow: '0 2px 16px 0 rgba(0,0,45,0.35)',
}

export const PART_META = {
  1: { short: 'Part 1', full: 'Initial Risk Stratification', dot: '#06ABEB' },
  2: { short: 'Part 2', full: 'Pre-Enrollment Verification', dot: '#DC298D' },
  3: { short: 'Part 3', full: 'Standard Protocol', dot: '#10b981' },
}

/** Shared brand block: Mount Sinai + Tewari AS Program (same look everywhere). */
export function ProgramHeaderBrand({ compact = false }) {
  return React.createElement('div', { className: 'flex items-center gap-2.5 shrink-0' },
    React.createElement('div', {
      className: `${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center shrink-0`,
      style: { background: 'linear-gradient(135deg, #06ABEB 0%, #0596c7 100%)' },
    },
      React.createElement(Activity, { className: compact ? 'w-3.5 h-3.5 text-white' : 'w-4 h-4 text-white' })
    ),
    React.createElement('div', { className: 'leading-none' },
      React.createElement('div', {
        style: {
          fontSize: compact ? '8px' : '9px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: '#06ABEB',
          textTransform: 'uppercase',
          lineHeight: 1,
        },
      }, 'Mount Sinai'),
      React.createElement('div', {
        style: {
          fontSize: compact ? '12px' : '13px',
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1.3,
        },
      }, 'Tewari AS Program')
    )
  )
}

/** Same “Meet the Care Team” control as the main header (for clinician shell, etc.). */
export function MeetCareTeamHeaderButton({ onClick }) {
  return React.createElement('button', {
    type: 'button',
    onClick,
    className: 'flex items-center gap-1.5 shrink-0 rounded-full transition-all px-2.5 h-8',
    style: { color: 'rgba(255,255,255,0.78)', background: 'transparent', border: '1px solid rgba(255,255,255,0.16)' },
    title: 'Meet the Care Team',
    onMouseEnter: (e) => {
      e.currentTarget.style.color = 'rgba(255,255,255,0.98)'
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.color = 'rgba(255,255,255,0.78)'
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
      e.currentTarget.style.background = 'transparent'
    },
  },
    React.createElement(Info, { style: { width: '13px', height: '13px' } }),
    React.createElement('span', { className: 'hidden sm:inline', style: { fontSize: '11px', fontWeight: 600 } }, 'Meet the Care Team')
  )
}

function ClinicianToolToggle({ mode, onChange }) {
  const pill = (active) => ({
    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
    background: active ? '#06ABEB' : 'transparent',
    border: `1px solid ${active ? 'rgba(6,171,235,0.7)' : 'rgba(255,255,255,0.12)'}`,
  })
  return React.createElement('div', {
    className: 'flex items-center rounded-full p-0.5 shrink-0',
    style: { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' },
    role: 'group',
    'aria-label': 'Switch clinical tool',
  },
    React.createElement('button', {
      type: 'button',
      onClick: () => onChange('pathway'),
      className: 'flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold transition-colors',
      style: pill(mode === 'pathway'),
      title: 'Clinical pathway',
    },
      React.createElement(GitBranch, { className: 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-90' }),
      React.createElement('span', { className: 'hidden min-[380px]:inline' }, 'Pathway'),
      React.createElement('span', { className: 'min-[380px]:hidden' }, 'Path')
    ),
    React.createElement('button', {
      type: 'button',
      onClick: () => onChange('calculator'),
      className: 'flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold transition-colors',
      style: pill(mode === 'calculator'),
      title: 'AS risk calculator',
    },
      React.createElement(Calculator, { className: 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-90' }),
      React.createElement('span', { className: 'hidden min-[380px]:inline' }, 'Calculator'),
      React.createElement('span', { className: 'min-[380px]:hidden' }, 'Calc')
    ),
    React.createElement('button', {
      type: 'button',
      onClick: () => onChange('batch'),
      className: 'flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold transition-colors',
      style: pill(mode === 'batch'),
      title: 'Batch patient risk',
    },
      React.createElement(Users, { className: 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-90' }),
      React.createElement('span', { className: 'hidden min-[380px]:inline' }, 'Batch'),
      React.createElement('span', { className: 'min-[380px]:hidden' }, 'Batch')
    )
  )
}

/**
 * Common top bar: Mount Sinai · Tewari AS Program | Part / pathway · Step | Meet the Care Team | Reset
 * Optional clinician shell: Change role + Pathway | Calculator toggle.
 */
export default function ProgramHeaderBar({
  currentPart,
  stepLabel,
  onReset,
  showReset,
  changeRoleOnClick,
  clinicianToolMode,
  onClinicianToolModeChange,
}) {
  const meta = currentPart ? PART_META[currentPart] : null
  const [careOpen, setCareOpen] = useState(false)
  const brandCompact = Boolean(changeRoleOnClick && clinicianToolMode)

  return React.createElement(React.Fragment, null,
    React.createElement(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),
    React.createElement('header', {
      className: 'sticky top-0 z-50 print:hidden',
      style: PROGRAM_HEADER_SHELL_STYLE,
    },
      React.createElement('div', {
        className: 'max-w-4xl mx-auto px-3 sm:px-4 flex flex-wrap items-center gap-x-2 gap-y-2 min-h-[48px] py-2 sm:py-0 sm:h-[48px]',
      },

        changeRoleOnClick && React.createElement('button', {
          type: 'button',
          onClick: changeRoleOnClick,
          className: 'flex shrink-0 items-center gap-0.5 sm:gap-1 rounded-lg text-white/70 hover:text-white text-[11px] sm:text-sm font-medium transition-colors -ml-1 px-1.5 py-1',
          title: 'Change role',
        },
          React.createElement(ChevronLeft, { className: 'w-4 h-4 shrink-0' }),
          React.createElement('span', { className: 'hidden min-[400px]:inline' }, 'Change role'),
          React.createElement('span', { className: 'min-[400px]:hidden' }, 'Role')
        ),

        React.createElement(ProgramHeaderBrand, { compact: brandCompact }),

        React.createElement('div', { style: { width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', flexShrink: 0, margin: '0 2px' } }),

        React.createElement('div', { className: 'flex-1 min-w-[120px] min-h-[24px] flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar' },
          meta && React.createElement('span', {
            className: 'shrink-0 inline-flex items-center gap-1 text-white font-bold rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px]',
            style: { background: 'rgba(255,255,255,0.12)', letterSpacing: '0.03em' },
          },
            React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: meta.dot, flexShrink: 0 } }),
            meta.short
          ),
          meta && React.createElement('span', {
            className: 'hidden md:block shrink-0',
            style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
          }, meta.full),
          meta && stepLabel && React.createElement('span', {
            className: 'shrink-0',
            style: { fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '0 2px' },
          }, '·'),
          stepLabel && React.createElement('span', {
            className: 'truncate max-w-[42vw] sm:max-w-none text-[11px] sm:text-xs',
            style: { color: 'rgba(255,255,255,0.55)', fontWeight: 500 },
          }, stepLabel)
        ),

        clinicianToolMode && onClinicianToolModeChange &&
          React.createElement(ClinicianToolToggle, { mode: clinicianToolMode, onChange: onClinicianToolModeChange }),

        React.createElement('div', { className: 'flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0' },
          React.createElement(MeetCareTeamHeaderButton, { onClick: () => setCareOpen(true) }),
          showReset && onReset && React.createElement('button', {
            onClick: onReset,
            className: 'flex items-center gap-1 sm:gap-1.5 shrink-0 rounded-lg transition-all',
            style: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: '7px 10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' },
            onMouseEnter: (e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.background = 'transparent'
            },
          },
            React.createElement(RotateCcw, { style: { width: '11px', height: '11px' } }),
            React.createElement('span', { className: 'hidden sm:inline' }, 'Reset')
          )
        )
      )
    )
  )
}

import React, { useState } from 'react'
import { Activity, RotateCcw, Info, ChevronLeft, GitBranch, Calculator } from 'lucide-react'
import CareTeamModal from './CareTeamModal.js'

export const PROGRAM_HEADER_SHELL_STYLE = {
  background: '#ffffff',
  borderBottom: '1px solid #e2e2ea',
}

export const PROGRAM_ACCENT_STRIP_STYLE = {
  height: '3px',
  background: 'linear-gradient(90deg, #221f72 0%, #0288d1 55%, #d31f7a 100%)',
}

export const PART_META = {
  1: { short: 'Part 1', full: 'Initial Risk Stratification', dot: '#0288d1' },
  2: { short: 'Part 2', full: 'Pre-Enrollment Verification', dot: '#d31f7a' },
  3: { short: 'Part 3', full: 'Standard Protocol', dot: '#10b981' },
}

/** Shared brand block: Mount Sinai + Tewari AS Program (same look everywhere). */
export function ProgramHeaderBrand({ compact = false }) {
  return React.createElement('div', { className: 'flex items-center gap-2.5 shrink-0' },
    React.createElement('div', {
      className: `${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg flex items-center justify-center shrink-0`,
      style: { background: '#221f72' },
    },
      React.createElement(Activity, { className: compact ? 'w-3.5 h-3.5 text-white' : 'w-4 h-4 text-white' })
    ),
    React.createElement('div', { className: 'leading-none' },
      React.createElement('div', {
        style: {
          fontSize: compact ? '13px' : '15px',
          fontWeight: 700,
          color: '#221f72',
          lineHeight: 1.3,
        },
      }, 'Tewari AS Program'),
    React.createElement('div', { style: { fontSize: 12, color: '#5c5c70', lineHeight: 1.3 } }, 'Mount Sinai · Urology')
    )
  )
}

/** Same “Meet the Care Team” control as the main header (for clinician shell, etc.). */
export function MeetCareTeamHeaderButton({ onClick }) {
  return React.createElement('button', {
    type: 'button',
    onClick,
    className: 'flex items-center gap-1.5 shrink-0 rounded-full transition-all px-2.5 h-8',
    style: { color: '#5c5c70', background: '#fff', border: '1px solid #e2e2ea' },
    title: 'Meet the Care Team',
    onMouseEnter: (e) => {
      e.currentTarget.style.color = '#221f72'
      e.currentTarget.style.borderColor = '#221f72'
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.color = '#5c5c70'
      e.currentTarget.style.borderColor = '#e2e2ea'
    },
  },
    React.createElement(Info, { style: { width: '13px', height: '13px' } }),
    React.createElement('span', { className: 'hidden sm:inline', style: { fontSize: '11px', fontWeight: 600 } }, 'Meet the Care Team')
  )
}

function ClinicianToolToggle({ mode, onChange }) {
  const pill = (active) => ({
    color: active ? '#221f72' : '#5c5c70',
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
  })
  return React.createElement('div', {
    className: 'flex items-center rounded-full p-0.5 shrink-0',
    style: { background: '#f4f4f8' },
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
          className: 'flex shrink-0 items-center gap-0.5 sm:gap-1 rounded-lg text-[#5c5c70] hover:text-[#221f72] text-[11px] sm:text-sm font-medium transition-colors -ml-1 px-1.5 py-1',
          title: 'Change role',
        },
          React.createElement(ChevronLeft, { className: 'w-4 h-4 shrink-0' }),
          React.createElement('span', { className: 'hidden min-[400px]:inline' }, 'Change role'),
          React.createElement('span', { className: 'min-[400px]:hidden' }, 'Role')
        ),

        React.createElement(ProgramHeaderBrand, { compact: brandCompact }),

        React.createElement('div', { style: { width: '1px', height: '24px', background: '#e2e2ea', flexShrink: 0, margin: '0 2px' } }),

        React.createElement('div', { className: 'flex-1 min-w-[120px] min-h-[24px] flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar' },
          meta && React.createElement('span', {
            className: 'shrink-0 inline-flex items-center gap-1 text-[#221f72] font-bold rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px]',
            style: { background: '#e8e7f5', letterSpacing: '0.03em' },
          },
            React.createElement('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: meta.dot, flexShrink: 0 } }),
            meta.short
          ),
          meta && React.createElement('span', {
            className: 'hidden md:block shrink-0',
            style: { fontSize: '11px', color: '#5c5c70', fontWeight: 600 },
          }, meta.full),
          meta && stepLabel && React.createElement('span', {
            className: 'shrink-0',
            style: { fontSize: '11px', color: '#bbb', margin: '0 2px' },
          }, '·'),
          stepLabel && React.createElement('span', {
            className: 'truncate max-w-[42vw] sm:max-w-none text-[11px] sm:text-xs',
            style: { color: '#5c5c70', fontWeight: 500 },
          }, stepLabel)
        ),

        clinicianToolMode && onClinicianToolModeChange &&
          React.createElement(ClinicianToolToggle, { mode: clinicianToolMode, onChange: onClinicianToolModeChange }),

        React.createElement('div', { className: 'flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0' },
          React.createElement(MeetCareTeamHeaderButton, { onClick: () => setCareOpen(true) }),
          showReset && onReset && React.createElement('button', {
            onClick: onReset,
            className: 'flex items-center gap-1 sm:gap-1.5 shrink-0 rounded-lg transition-all',
            style: { fontSize: '12px', color: '#5c5c70', padding: '7px 10px', background: '#fff', border: '1px solid #e2e2ea' },
            onMouseEnter: (e) => {
              e.currentTarget.style.color = '#221f72'
              e.currentTarget.style.borderColor = '#221f72'
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.color = '#5c5c70'
              e.currentTarget.style.borderColor = '#e2e2ea'
            },
          },
            React.createElement(RotateCcw, { style: { width: '11px', height: '11px' } }),
            React.createElement('span', { className: 'hidden sm:inline' }, 'Reset')
          )
        )
      ),
      React.createElement('div', { style: PROGRAM_ACCENT_STRIP_STYLE })
    )
  )
}

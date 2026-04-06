import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import RoleSelector from './RoleSelector.js'
import PatientApp from './PatientApp.js'
import './index.css'

const e = React.createElement

function Root() {
  const [role, setRole] = useState(null) // null | 'patient' | 'clinician'

  if (role === 'patient') {
    return e(PatientApp, { onBack: () => setRole(null) })
  }

  if (role === 'clinician') {
    return e('div', {},
      // Back button overlay (no-print)
      e('div', {
        className: 'no-print fixed top-0 left-0 right-0 z-50 flex items-center px-4 py-2',
        style: { background: 'rgba(0,0,45,0.92)', backdropFilter: 'blur(8px)' },
      },
        e('button', {
          onClick: () => setRole(null),
          className: 'flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors',
        },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Change role'
        )
      ),
      // Existing clinical app — completely untouched
      e('div', { style: { paddingTop: '40px' } },
        e(App)
      )
    )
  }

  return e(RoleSelector, { onSelectRole: setRole })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null,
    React.createElement(Root)
  )
)

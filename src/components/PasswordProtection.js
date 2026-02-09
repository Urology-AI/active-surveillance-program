import React, { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function PasswordProtection({ onAuthenticated }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'urology2026'

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        // Store authentication in sessionStorage (clears when browser closes)
        sessionStorage.setItem('authenticated', 'true')
        onAuthenticated()
      } else {
        setError('Incorrect password. Please try again.')
        setIsLoading(false)
        setPassword('')
      }
    }, 300)
  }

  return React.createElement('div', {
    className: 'min-h-screen bg-sinai-page flex items-center justify-center px-4 py-8'
  },
    React.createElement('div', {
      className: 'form-card bg-white rounded-2xl shadow-sinai-lg border border-slate-100 p-8 md:p-12 w-full max-w-md'
    },
      React.createElement('div', { className: 'text-center mb-8' },
        React.createElement('div', {
          className: 'inline-flex items-center justify-center w-16 h-16 bg-sinai-cerulean/10 rounded-full mb-4 ring-4 ring-sinai-cerulean/5'
        },
          React.createElement(Lock, { className: 'w-8 h-8 text-sinai-cerulean' })
        ),
        React.createElement('p', { className: 'text-xs font-semibold uppercase tracking-wider text-sinai-navy mb-1' },
          'Mount Sinai'
        ),
        React.createElement('h1', {
          className: 'text-xl md:text-2xl font-bold text-sinai-cetacean mb-2'
        },
          'Prostate Cancer Clinical Pathway'
        ),
        React.createElement('p', {
          className: 'text-slate-600 text-sm'
        },
          'Please enter the password to access'
        )
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'mb-6' },
          React.createElement('label', {
            htmlFor: 'password',
            className: 'block text-sm font-semibold text-sinai-navy mb-2'
          },
            'Password'
          ),
          React.createElement('div', { className: 'relative' },
            React.createElement('input', {
              type: showPassword ? 'text' : 'password',
              id: 'password',
              value: password,
              onChange: (e) => {
                setPassword(e.target.value)
                setError('')
              },
              className: `w-full px-4 py-3.5 pr-12 rounded-xl border-2 transition-all duration-200 ${
                error ? 'border-red-400 bg-red-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
              }`,
              placeholder: 'Enter password',
              autoFocus: true,
              disabled: isLoading
            }),
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowPassword(!showPassword),
              className: 'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-sinai-cerulean hover:bg-sinai-cerulean/10 transition-colors',
              disabled: isLoading,
              'aria-label': showPassword ? 'Hide password' : 'Show password'
            },
              showPassword
                ? React.createElement(EyeOff, { className: 'w-5 h-5' })
                : React.createElement(Eye, { className: 'w-5 h-5' })
            )
          ),
          error && React.createElement('p', {
            className: 'mt-2.5 text-sm text-red-600 font-medium flex items-center gap-1.5'
          },
            error
          )
        ),
        React.createElement('button', {
          type: 'submit',
          disabled: isLoading || !password,
          className: `btn-primary w-full py-3.5 px-4 bg-sinai-cerulean text-white font-semibold rounded-xl ${
            isLoading || !password
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-sinai-cerulean-dark hover:shadow-sinai'
          }`
        },
          isLoading ? 'Verifying...' : 'Access Application'
        )
      ),
      React.createElement('div', {
        className: 'mt-6 pt-6 border-t border-slate-100 text-center text-xs font-medium text-slate-500'
      },
        'Authorized personnel only'
      )
    )
  )
}

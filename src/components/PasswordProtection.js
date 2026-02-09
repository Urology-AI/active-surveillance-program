import React, { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function PasswordProtection({ onAuthenticated }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Default password - change this to your desired password
  const CORRECT_PASSWORD = 'urology2026'

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
    className: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4'
  },
    React.createElement('div', {
      className: 'bg-white rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-md'
    },
      React.createElement('div', { className: 'text-center mb-8' },
        React.createElement('div', {
          className: 'inline-flex items-center justify-center w-16 h-16 bg-primary-blue/10 rounded-full mb-4'
        },
          React.createElement(Lock, { className: 'w-8 h-8 text-primary-blue' })
        ),
        React.createElement('h1', {
          className: 'text-2xl md:text-3xl font-bold text-gray-900 mb-2'
        },
          'Prostate Cancer Clinical Pathway'
        ),
        React.createElement('p', {
          className: 'text-gray-600'
        },
          'Please enter the password to access'
        )
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'mb-6' },
          React.createElement('label', {
            htmlFor: 'password',
            className: 'block text-sm font-medium text-gray-700 mb-2'
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
              className: `w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all ${
                error ? 'border-red-500' : 'border-gray-300'
              }`,
              placeholder: 'Enter password',
              autoFocus: true,
              disabled: isLoading
            }),
            React.createElement('button', {
              type: 'button',
              onClick: () => setShowPassword(!showPassword),
              className: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700',
              disabled: isLoading
            },
              showPassword
                ? React.createElement(EyeOff, { className: 'w-5 h-5' })
                : React.createElement(Eye, { className: 'w-5 h-5' })
            )
          ),
          error && React.createElement('p', {
            className: 'mt-2 text-sm text-red-600'
          },
            error
          )
        ),
        React.createElement('button', {
          type: 'submit',
          disabled: isLoading || !password,
          className: `w-full py-3 px-4 bg-primary-blue text-white font-semibold rounded-lg transition-all ${
            isLoading || !password
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-600 hover:shadow-lg'
          }`
        },
          isLoading ? 'Verifying...' : 'Access Application'
        )
      ),
      React.createElement('div', {
        className: 'mt-6 text-center text-xs text-gray-500'
      },
        'Authorized personnel only'
      )
    )
  )
}

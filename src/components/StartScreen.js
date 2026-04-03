import React, { useState } from 'react'
import { Activity, ChevronRight, Users, Phone, Mail, ArrowLeft, MapPin } from 'lucide-react'

const PARTS = [
  { num: '1', title: 'Initial Risk Stratification', color: '#06ABEB', steps: 'Steps 1 – 5' },
  { num: '2', title: 'Pre-Enrollment Verification', color: '#DC298D', steps: 'Steps 6 – 9' },
  { num: '3', title: 'Standard AS Protocol', color: '#10b981', steps: 'Steps 10 – 14' },
]

const PHYSICIAN_TEAM = [
  { name: 'Ash Tewari', creds: 'MBBS, MCh, FRCS (Hon.)', phone: '347-271-1644', email: 'ash.tewari@mountsinai.org' },
  { name: 'Mani Menon', creds: 'MD', phone: '212-241-8714', email: 'mani.menon@mountsinai.org' },
  { name: 'Kyrollis Attalla', creds: 'MD', phone: null, email: 'kyrollis.attalla@mountsinai.org' },
  { name: 'Vinayak Wagaskar', creds: 'MD', phone: '646-532-8130', email: 'vinayak.wagaskar@mountsinai.org' },
  { name: 'Mitchell Benson', creds: 'MD', phone: '646-243-4398', email: 'mitchell.benson@mountsinai.org' },
  { name: 'Leon Telis', creds: 'MD', phone: '212-844-8900', email: 'leon.telis@mountsinai.org' },
  { name: 'Murilo Luz', creds: 'MD', phone: '646-574-0242', email: 'murilo.dealmeidaluz@mountsinai.org' },
  { name: 'Avinash Reddy', creds: 'MD', phone: '212-241-4812', email: 'avinash.reddy@mountsinai.org' },
]

const FELLOWS_PAS_NURSES = [
  { name: 'Neeraja Tillu', creds: 'MD', phone: '646-799-1870', email: 'neeraja.tillu@mountsinai.org' },
  { name: 'Coskun Kacagan', creds: 'MD', phone: '929-729-2115', email: 'coskun.kacagan@mountsinai.org' },
  { name: 'Kacie Schlussel', creds: 'PA', phone: '919-496-7379', email: 'kacie.schlussel@mountsinai.org' },
  { name: 'Lexi Jacobson', creds: 'PA', phone: '646-661-9075', email: 'lexi.jacobson@mountsinai.org' },
  { name: 'Diana Goldberg', creds: 'PA', phone: '646-983-4805', email: 'diana.goldberg@mountsinai.org' },
  { name: 'Marisa Wall', creds: 'PA', phone: '929-618-1925', email: 'marisa.wall@mountsinai.org' },
  { name: 'Amanda Rogers', creds: 'PA', phone: '646-984-1736', email: 'amanda.rogers@mountsinai.org' },
  { name: 'Ellen Chai', creds: 'PA', phone: '646-581-1103', email: 'ellen.chai@mountsinai.org' },
  { name: 'Rachael Bell', creds: 'RN', phone: '660-221-4997', email: 'rachael.bell@mountsinai.org' },
  { name: 'Joseph Kiper', creds: 'RN', phone: '929-618-7256', email: 'joseph.kiper@mountsinai.org' },
]

const ADMIN_TEAM = [
  { name: 'Joseph Andre', creds: null, phone: '929-697-3643', email: 'joseph.andre@mountsinai.org' },
  { name: 'Divya Kurup', creds: null, phone: '347-978-5740', email: 'divya.kurup@mountsinai.org' },
]

function getInitials(name) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name[0].toUpperCase()
}

function PersonCard({ person, avatarColor }) {
  return React.createElement('div', {
    className: 'flex items-start gap-3 p-3 rounded-xl border',
    style: { background: '#f8fafc', borderColor: '#f1f5f9' }
  },
    React.createElement('div', {
      className: 'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold',
      style: { fontSize: '13px', background: avatarColor }
    }, getInitials(person.name)),

    React.createElement('div', { className: 'flex-1 min-w-0' },
      React.createElement('p', {
        className: 'text-sm font-semibold text-slate-800 leading-tight'
      }, person.name + (person.creds ? `, ${person.creds}` : '')),

      person.phone && React.createElement('a', {
        href: `tel:${person.phone.replace(/-/g, '')}`,
        className: 'flex items-center gap-1.5 mt-1 text-xs hover:underline',
        style: { color: '#06ABEB' }
      },
        React.createElement(Phone, { className: 'w-3 h-3 shrink-0' }),
        person.phone
      ),

      React.createElement('a', {
        href: `mailto:${person.email}`,
        className: 'flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 hover:underline',
        style: { minWidth: 0 }
      },
        React.createElement(Mail, { className: 'w-3 h-3 shrink-0 text-slate-400' }),
        React.createElement('span', { className: 'truncate block' }, person.email)
      )
    )
  )
}

function TeamSection({ title, members, avatarColor, accentColor }) {
  return React.createElement('div', { className: 'mb-6' },
    React.createElement('div', {
      className: 'flex items-center gap-2 mb-3',
      style: { borderBottom: `2px solid ${accentColor}`, paddingBottom: '8px' }
    },
      React.createElement('p', {
        className: 'text-xs font-bold uppercase tracking-wider',
        style: { color: accentColor }
      }, title)
    ),
    React.createElement('div', { className: 'grid grid-cols-1 gap-2' },
      members.map((p, i) =>
        React.createElement(PersonCard, { key: i, person: p, avatarColor })
      )
    )
  )
}

function TeamView({ onBack }) {
  return React.createElement('div', { className: 'max-w-xl mx-auto' },
    React.createElement('div', {
      className: 'bg-white rounded-2xl border border-slate-100 overflow-hidden',
      style: { boxShadow: '0 8px 40px -8px rgba(33,32,112,0.18)' }
    },

      // Header
      React.createElement('div', {
        className: 'px-6 pt-6 pb-5',
        style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 55%, #06ABEB 140%)' }
      },
        React.createElement('button', {
          onClick: onBack,
          className: 'flex items-center gap-1.5 mb-4 text-sm font-medium',
          style: { color: 'rgba(255,255,255,0.65)' },
          onMouseEnter: e => e.currentTarget.style.color = 'white',
          onMouseLeave: e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)',
        },
          React.createElement(ArrowLeft, { className: 'w-4 h-4' }),
          'Back'
        ),
        React.createElement('p', {
          style: { fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: '#06ABEB', textTransform: 'uppercase', marginBottom: '4px' }
        }, 'Mount Sinai · Urology'),
        React.createElement('h2', {
          className: 'font-bold text-white',
          style: { fontSize: '22px', letterSpacing: '-0.01em', lineHeight: 1.2 }
        }, 'Active Surveillance\nCare Team')
      ),

      // Team content
      React.createElement('div', { className: 'p-6' },

        React.createElement(TeamSection, {
          title: 'Physician Team',
          members: PHYSICIAN_TEAM,
          avatarColor: '#212070',
          accentColor: '#212070',
        }),

        React.createElement(TeamSection, {
          title: "Fellows, PA's & Nurses",
          members: FELLOWS_PAS_NURSES,
          avatarColor: '#06ABEB',
          accentColor: '#06ABEB',
        }),

        React.createElement(TeamSection, {
          title: 'Administrative Team',
          members: ADMIN_TEAM,
          avatarColor: '#DC298D',
          accentColor: '#DC298D',
        }),

        // Office info
        React.createElement('div', {
          className: 'rounded-xl p-4 mt-2',
          style: { background: 'rgb(6 171 235 / 0.05)', border: '1px solid rgb(6 171 235 / 0.18)' }
        },
          React.createElement('p', {
            className: 'text-xs font-bold uppercase tracking-wider text-slate-400 mb-3'
          }, 'Office Information'),
          React.createElement('div', { className: 'space-y-2' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Phone, { className: 'w-3.5 h-3.5 text-slate-400 shrink-0' }),
              React.createElement('span', { className: 'text-xs text-slate-500' }, 'Main Office:'),
              React.createElement('a', {
                href: 'tel:2122419955',
                className: 'text-xs font-medium hover:underline',
                style: { color: '#06ABEB' }
              }, '212-241-9955')
            ),
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Phone, { className: 'w-3.5 h-3.5 text-slate-400 shrink-0' }),
              React.createElement('span', { className: 'text-xs text-slate-500' }, 'Active Surveillance:'),
              React.createElement('a', {
                href: 'tel:9296973643',
                className: 'text-xs font-medium hover:underline',
                style: { color: '#06ABEB' }
              }, '929-697-3643')
            ),
            React.createElement('div', { className: 'flex items-start gap-2' },
              React.createElement(MapPin, { className: 'w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5' }),
              React.createElement('span', { className: 'text-xs text-slate-500' },
                '110 East 60th Street, 5th Floor, New York, NY 10022'
              )
            )
          )
        )
      )
    ),

    React.createElement('p', { className: 'text-center text-xs text-slate-400 mt-5 px-4' },
      'Clinical decision support only — does not replace clinical judgment.'
    )
  )
}

export default function StartScreen({ onStart }) {
  const [showTeam, setShowTeam] = useState(false)

  if (showTeam) {
    return React.createElement(TeamView, { onBack: () => setShowTeam(false) })
  }

  return React.createElement('div', { className: 'max-w-xl mx-auto' },

    // Hero card
    React.createElement('div', {
      className: 'bg-white rounded-2xl border border-slate-100 overflow-hidden',
      style: { boxShadow: '0 8px 40px -8px rgba(33,32,112,0.18)' }
    },

      // Top gradient banner
      React.createElement('div', {
        className: 'px-8 pt-8 pb-7 text-center',
        style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 55%, #06ABEB 140%)' }
      },
        React.createElement('div', { className: 'flex justify-center mb-5' },
          React.createElement('div', {
            className: 'w-16 h-16 rounded-2xl flex items-center justify-center',
            style: { background: 'rgba(6,171,235,0.25)', border: '1.5px solid rgba(6,171,235,0.4)' }
          },
            React.createElement(Activity, { className: 'w-8 h-8 text-white' })
          )
        ),
        React.createElement('p', {
          style: { fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: '#06ABEB', textTransform: 'uppercase', marginBottom: '6px' }
        }, 'Mount Sinai · Urology'),
        React.createElement('h1', {
          className: 'font-bold text-white mb-2',
          style: { fontSize: '26px', letterSpacing: '-0.01em', lineHeight: 1.15 }
        }, 'Tewari Active\nSurveillance Program'),
        React.createElement('p', {
          style: { fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }
        }, 'Prostate Cancer Clinical Pathway')
      ),

      // Content body
      React.createElement('div', { className: 'p-6 md:p-8' },

        // Trigger callout
        React.createElement('div', {
          className: 'flex items-center gap-3 p-4 rounded-xl mb-6',
          style: { background: 'rgb(6 171 235 / 0.06)', border: '1px solid rgb(6 171 235 / 0.2)' }
        },
          React.createElement('div', {
            className: 'w-2.5 h-2.5 rounded-full shrink-0',
            style: { background: '#06ABEB' }
          }),
          React.createElement('p', {
            className: 'text-sm font-semibold',
            style: { color: '#212070' }
          }, 'Trigger: 1st Positive Biopsy · 4-Week Clinic Follow-Up')
        ),

        // Three parts overview
        React.createElement('div', { className: 'space-y-2 mb-6' },
          React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wider text-slate-400 mb-3' }, 'Pathway Overview'),
          PARTS.map(p =>
            React.createElement('div', {
              key: p.num,
              className: 'flex items-center gap-3 p-3 rounded-xl',
              style: { background: '#f8fafc', border: '1px solid #f1f5f9' }
            },
              React.createElement('div', {
                className: 'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-bold',
                style: { fontSize: '12px', background: p.color }
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
          style: { background: 'linear-gradient(135deg, #06ABEB 0%, #0596c7 100%)', boxShadow: '0 4px 18px rgba(6,171,235,0.35)' }
        },
          'Begin Assessment',
          React.createElement(ChevronRight, { className: 'w-5 h-5' })
        ),

        // Team link
        React.createElement('div', { className: 'mt-6 pt-5 border-t border-slate-100' },
          React.createElement('button', {
            onClick: () => setShowTeam(true),
            className: 'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors',
            style: { background: '#f8fafc', border: '1px solid #f1f5f9' },
            onMouseEnter: e => { e.currentTarget.style.background = 'rgb(6 171 235 / 0.06)'; e.currentTarget.style.borderColor = 'rgb(6 171 235 / 0.25)' },
            onMouseLeave: e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#f1f5f9' },
          },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Users, { className: 'w-4 h-4 text-slate-400' }),
              React.createElement('span', { className: 'text-sm font-semibold text-slate-700' }, 'Meet the Care Team'),
              React.createElement('span', {
                className: 'text-xs font-medium px-1.5 py-0.5 rounded-full',
                style: { background: 'rgb(6 171 235 / 0.1)', color: '#06ABEB' }
              }, `${PHYSICIAN_TEAM.length + FELLOWS_PAS_NURSES.length + ADMIN_TEAM.length} members`)
            ),
            React.createElement(ChevronRight, { className: 'w-4 h-4 text-slate-400' })
          )
        )
      )
    ),

    // Disclaimer
    React.createElement('p', { className: 'text-center text-xs text-slate-400 mt-5 px-4' },
      'Clinical decision support only — does not replace clinical judgment.'
    )
  )
}

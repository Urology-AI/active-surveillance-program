import React, { useEffect } from 'react'
import { Phone, Mail, MapPin, X } from 'lucide-react'

const PHYSICIAN_TEAM = [
  { name: 'Ash Tewari', creds: 'MBBS, MCh, FRCS (Hon.)', phone: '347-271-1644', email: 'ash.tewari@mountsinai.org' },
  { name: 'Mani Menon', creds: 'MD', phone: '212-241-8714', email: 'mani.menon@mountsinai.org' },
  { name: 'Kyrollis Attalla', creds: 'MD', phone: null, email: 'kyrollis.attalla@mountsinai.org' },
  { name: 'Vinayak Wagaskar', creds: 'MD', phone: '646-532-8130', email: 'vinayak.wagaskar@mountsinai.org' },
  { name: 'Mitchell Benson', creds: 'MD', phone: '646-243-4398', email: 'mitchell.benson@mountsinai.org' },
  { name: 'Leon Telis', creds: 'MD', phone: '212-844-8900', email: 'leon.telis@mountsinai.org' },
  { name: 'Murilo Luz', creds: 'MD', phone: '646-574-0242', email: 'murilo.dealmeidaluz@mountsinai.org' },
  { name: 'Avinash Reddy', creds: 'MD', phone: '212-241-4812', email: 'avinash.reddy@mountsinai.org' },
  { name: 'Adriana Pedraza', creds: 'MD', phone: '332-254-9466', email: 'adriana.pedrazabermeo@mountsinai.org' },
]

const FELLOWS_PAS_NURSES = [
  { name: 'Neeraja Tillu', creds: 'MD', phone: '646-799-1870', email: 'neeraja.tillu@mountsinai.org' },
  { name: 'Erena Pradhan', creds: 'MBBS', phone: '929-246-2707', email: 'erena.pradhan@mountsinai.org' },
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
  { name: 'Joseph Andre', creds: null, phone: '929-687-3643', email: 'joseph.andre@mountsinai.org' },
  { name: 'Shreshth Shukla', creds: null, phone: '929-237-2338', email: 'Shreshth.Shukla@mountsinai.org' },
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
    style: { background: '#f8fafc', borderColor: '#f1f5f9' },
  },
    React.createElement('div', {
      className: 'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold',
      style: { fontSize: '13px', background: avatarColor },
    }, getInitials(person.name)),

    React.createElement('div', { className: 'flex-1 min-w-0' },
      React.createElement('p', {
        className: 'text-sm font-semibold text-slate-800 leading-tight',
      }, person.name + (person.creds ? `, ${person.creds}` : '')),

      person.phone && React.createElement('a', {
        href: `tel:${String(person.phone).replace(/\D/g, '')}`,
        className: 'flex items-center gap-1.5 mt-1 text-xs hover:underline',
        style: { color: '#06ABEB' },
      },
        React.createElement(Phone, { className: 'w-3 h-3 shrink-0' }),
        person.phone
      ),

      React.createElement('a', {
        href: `mailto:${person.email}`,
        className: 'flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 hover:underline',
        style: { minWidth: 0 },
      },
        React.createElement(Mail, { className: 'w-3 h-3 shrink-0 text-slate-400' }),
        React.createElement('span', { className: 'truncate block' }, person.email)
      )
    )
  )
}

function TeamSection({ title, members, avatarColor, accentColor }) {
  return React.createElement('div', { className: 'mb-5 last:mb-0' },
    React.createElement('div', {
      className: 'flex items-center gap-2 mb-3',
      style: { borderBottom: `2px solid ${accentColor}`, paddingBottom: '8px' },
    },
      React.createElement('p', {
        className: 'text-xs font-bold uppercase tracking-wider',
        style: { color: accentColor },
      }, title)
    ),
    React.createElement('div', { className: 'grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3' },
      members.map((p, i) =>
        React.createElement(PersonCard, { key: i, person: p, avatarColor })
      )
    )
  )
}

const MEMBER_COUNT = PHYSICIAN_TEAM.length + FELLOWS_PAS_NURSES.length + ADMIN_TEAM.length

export default function CareTeamModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (ev) => {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  if (!open) return null

  return React.createElement('div', {
    className: 'fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4',
    role: 'presentation',
  },
    React.createElement('div', {
      className: 'absolute inset-0 bg-black/50',
      onClick: onClose,
      'aria-hidden': true,
    }),
    React.createElement('div', {
      className: 'relative flex h-[94vh] w-full max-w-6xl flex-col rounded-t-2xl border border-slate-100 bg-white shadow-2xl sm:h-[92vh] sm:rounded-2xl',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'care-team-modal-title',
      onClick: (ev) => ev.stopPropagation(),
    },
      React.createElement('div', {
        className: 'flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6',
        style: { background: 'linear-gradient(135deg, #00002D 0%, #212070 55%, #06ABEB 140%)' },
      },
        React.createElement('div', { className: 'min-w-0 pt-0.5' },
          React.createElement('p', {
            className: 'text-[10px] font-extrabold uppercase tracking-widest',
            style: { color: '#06ABEB' },
          }, 'Mount Sinai · Urology'),
          React.createElement('h2', {
            id: 'care-team-modal-title',
            className: 'text-base font-bold leading-snug text-white sm:text-lg',
          }, 'Active Surveillance Care Team'),
          React.createElement('p', {
            className: 'mt-0.5 text-xs text-white/55',
          }, `${MEMBER_COUNT} members`)
        ),
        React.createElement('button', {
          type: 'button',
          onClick: onClose,
          className: 'flex shrink-0 items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          'aria-label': 'Close',
        },
          React.createElement(X, { className: 'h-5 w-5' })
        )
      ),

      React.createElement('div', {
        className: 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5',
      },
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
        React.createElement('div', {
          className: 'rounded-xl p-4',
          style: { background: 'rgb(6 171 235 / 0.05)', border: '1px solid rgb(6 171 235 / 0.18)' },
        },
          React.createElement('p', {
            className: 'mb-3 text-xs font-bold uppercase tracking-wider text-slate-400',
          }, 'Office Information'),
          React.createElement('div', { className: 'space-y-2' },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Phone, { className: 'h-3.5 w-3.5 shrink-0 text-slate-400' }),
              React.createElement('span', { className: 'text-xs text-slate-500' }, 'Main Office:'),
              React.createElement('a', {
                href: 'tel:2122419955',
                className: 'text-xs font-medium hover:underline',
                style: { color: '#06ABEB' },
              }, '212-241-9955')
            ),
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement(Phone, { className: 'h-3.5 w-3.5 shrink-0 text-slate-400' }),
              React.createElement('span', { className: 'text-xs text-slate-500' }, 'Active Surveillance:'),
              React.createElement('a', {
                href: 'tel:9296973643',
                className: 'text-xs font-medium hover:underline',
                style: { color: '#06ABEB' },
              }, '929-697-3643')
            ),
            React.createElement('div', { className: 'flex items-start gap-2' },
              React.createElement(MapPin, { className: 'mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400' }),
              React.createElement('span', { className: 'text-xs text-slate-500' },
                '110 East 60th Street, 5th Floor, New York, NY 10022'
              )
            )
          )
        ),
        React.createElement('p', {
          className: 'mt-4 text-center text-[11px] text-slate-400',
        }, 'Clinical decision support only — does not replace clinical judgment.')
      )
    )
  )
}

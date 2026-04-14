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
    className:
      'group flex gap-3.5 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md sm:gap-4',
  },
    React.createElement('div', {
      className:
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-inner sm:h-11 sm:w-11 sm:text-[13px]',
      style: { background: avatarColor },
    }, getInitials(person.name)),

    React.createElement('div', { className: 'min-w-0 flex-1' },
      React.createElement('p', { className: 'text-[15px] font-semibold leading-snug tracking-tight text-slate-900' }, person.name),
      person.creds &&
        React.createElement('p', { className: 'mt-0.5 text-xs font-medium text-slate-500' }, person.creds),

      React.createElement('div', { className: 'mt-3 space-y-2 border-t border-slate-100 pt-3' },
        person.phone &&
          React.createElement('a', {
            href: `tel:${String(person.phone).replace(/\D/g, '')}`,
            className:
              'flex items-center gap-2 text-xs font-medium tabular-nums text-[#0596c7] transition-colors hover:text-[#212070]',
          },
            React.createElement(Phone, { className: 'h-3.5 w-3.5 shrink-0 opacity-70' }),
            person.phone
          ),
        React.createElement('a', {
          href: `mailto:${person.email}`,
          className: 'flex items-start gap-2 text-xs text-slate-600 transition-colors hover:text-slate-900',
          style: { minWidth: 0 },
        },
          React.createElement(Mail, { className: 'mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400' }),
          React.createElement('span', { className: 'break-all leading-snug' }, person.email)
        )
      )
    )
  )
}

function TeamSection({ title, subtitle, members, accentColor }) {
  return React.createElement('section', {
    className: 'scroll-mt-6',
    'aria-label': title,
  },
    React.createElement('div', { className: 'mb-4 flex items-start gap-3 sm:mb-5' },
      React.createElement('div', {
        className: 'mt-0.5 h-9 w-1 shrink-0 rounded-full sm:h-10',
        style: { background: accentColor },
      }),
      React.createElement('div', { className: 'min-w-0 flex-1' },
        React.createElement('h3', { className: 'text-base font-semibold tracking-tight text-slate-900 sm:text-[17px]' }, title),
        React.createElement('p', { className: 'mt-0.5 text-xs text-slate-500' }, subtitle)
      )
    ),
    React.createElement('div', {
      className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-3',
    },
      members.map((p, i) =>
        React.createElement(PersonCard, { key: `${p.email}-${i}`, person: p, avatarColor: accentColor })
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
    className: 'fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-5',
    role: 'presentation',
  },
    React.createElement('div', {
      className: 'absolute inset-0 bg-slate-950/50 backdrop-blur-sm',
      onClick: onClose,
      'aria-hidden': true,
    }),
    React.createElement('div', {
      className:
        'relative flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_25px_80px_-12px_rgba(15,23,42,0.35)] sm:h-[min(92vh,900px)] sm:rounded-2xl',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'care-team-modal-title',
      'aria-describedby': 'care-team-modal-desc',
      onClick: (ev) => ev.stopPropagation(),
    },
      // Header
      React.createElement('header', {
        className: 'relative shrink-0 border-b border-white/10 px-4 py-4 sm:px-7 sm:py-5',
        style: { background: 'linear-gradient(118deg, #00002D 0%, #1a195c 42%, #212070 72%, #0d4f6e 100%)' },
      },
        React.createElement('div', {
          className: 'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent',
        }),
        React.createElement('div', { className: 'flex items-start justify-between gap-4' },
          React.createElement('div', { className: 'min-w-0 flex-1' },
            React.createElement('p', {
              className: 'text-[10px] font-bold uppercase tracking-[0.2em] text-[#5ec8f5]',
            }, 'Mount Sinai'),
            React.createElement('p', {
              className: '-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45',
            }, 'Department of Urology'),
            React.createElement('h2', {
              id: 'care-team-modal-title',
              className: 'mt-2 text-lg font-bold leading-tight text-white sm:text-xl',
            }, 'Active Surveillance Care Team'),
            React.createElement('div', { className: 'mt-3 flex flex-wrap items-center gap-2' },
              React.createElement('span', {
                className: 'inline-flex items-center rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/95',
              }, `${MEMBER_COUNT} members`),
              React.createElement('span', {
                className: 'hidden text-[11px] text-white/50 sm:inline',
              }, '·'),
              React.createElement('span', {
                className: 'hidden text-[11px] text-white/55 sm:inline',
              }, 'Directory for clinical coordination')
            )
          ),
          React.createElement('button', {
            type: 'button',
            onClick: onClose,
            className:
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:h-10 sm:w-10',
            'aria-label': 'Close',
          },
            React.createElement(X, { className: 'h-5 w-5' })
          )
        )
      ),

      // Body
      React.createElement('div', {
        className: 'min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/90',
      },
        React.createElement('div', { className: 'px-4 py-5 sm:px-7 sm:py-6' },
          React.createElement('div', {
            id: 'care-team-modal-desc',
            className:
              'mb-7 rounded-lg border border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:flex sm:items-center sm:gap-4 sm:px-5 sm:py-4',
          },
            React.createElement('div', {
              className: 'hidden h-12 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#06ABEB] to-[#212070] sm:block',
            }),
            React.createElement('p', {
              className: 'text-sm leading-relaxed text-slate-600',
            },
              React.createElement('span', { className: 'font-medium text-slate-800' }, 'Clinical directory. '),
              'Use the contacts below for pathway questions, scheduling, and administrative support.'
            )
          ),

          React.createElement('div', { className: 'space-y-10 sm:space-y-12' },
            React.createElement(TeamSection, {
              title: 'Physician team',
              subtitle: 'Urology faculty · clinical leadership',
              members: PHYSICIAN_TEAM,
              accentColor: '#212070',
            }),
            React.createElement(TeamSection, {
              title: "Fellows, physician assistants & nursing",
              subtitle: 'Clinical support and patient navigation',
              members: FELLOWS_PAS_NURSES,
              accentColor: '#06ABEB',
            }),
            React.createElement(TeamSection, {
              title: 'Administrative team',
              subtitle: 'Program coordination',
              members: ADMIN_TEAM,
              accentColor: '#DC298D',
            })
          ),

          React.createElement('div', {
            className: 'mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6',
          },
            React.createElement('div', { className: 'mb-4 flex items-center gap-2' },
              React.createElement('div', {
                className: 'flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600',
              }, React.createElement(MapPin, { className: 'h-4 w-4' })),
              React.createElement('h3', {
                className: 'text-sm font-semibold tracking-tight text-slate-900',
              }, 'Office information')
            ),
            React.createElement('div', {
              className: 'grid gap-4 sm:grid-cols-2',
            },
              React.createElement('div', { className: 'space-y-1' },
                React.createElement('p', { className: 'text-[11px] font-semibold uppercase tracking-wide text-slate-400' }, 'Main office'),
                React.createElement('a', {
                  href: 'tel:2122419955',
                  className: 'inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-[#0596c7] hover:text-[#212070]',
                },
                  React.createElement(Phone, { className: 'h-4 w-4 opacity-70' }),
                  '212-241-9955'
                )
              ),
              React.createElement('div', { className: 'space-y-1' },
                React.createElement('p', { className: 'text-[11px] font-semibold uppercase tracking-wide text-slate-400' }, 'Active surveillance line'),
                React.createElement('a', {
                  href: 'tel:9296973643',
                  className: 'inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-[#0596c7] hover:text-[#212070]',
                },
                  React.createElement(Phone, { className: 'h-4 w-4 opacity-70' }),
                  '929-697-3643'
                )
              ),
              React.createElement('div', { className: 'sm:col-span-2' },
                React.createElement('p', { className: 'text-[11px] font-semibold uppercase tracking-wide text-slate-400' }, 'Address'),
                React.createElement('p', { className: 'mt-1 text-sm leading-snug text-slate-600' },
                  '110 East 60th Street, 5th Floor, New York, NY 10022'
                )
              )
            )
          ),

          React.createElement('p', {
            className: 'mt-6 border-t border-slate-200/80 pt-5 text-center text-[11px] leading-relaxed text-slate-400',
          }, 'Clinical decision support only — does not replace clinical judgment.')
        )
      )
    )
  )
}

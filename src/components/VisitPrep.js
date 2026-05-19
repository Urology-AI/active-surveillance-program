import React, { useState } from 'react'

const e = React.createElement

const SECTIONS = [
  {
    title: 'Before Your Visit',
    bg: '#eff6ff',
    border: '#bfdbfe',
    items: [
      'Write down any new symptoms or changes since your last visit — even minor ones.',
      'Note your most recent PSA value and test date (use your PSA Log tab).',
      'List all current medications, vitamins, and supplements.',
      'Write down your questions so you don\'t forget them in the moment.',
      'Consider bringing a family member or trusted person to help recall what was said.',
    ],
  },
  {
    title: 'Questions to Ask Your Doctor',
    bg: '#f0fdf4',
    border: '#86efac',
    items: [
      'What is my current PSA, and how does it compare to last time?',
      'Is my PSA density (PSAD) stable or changing?',
      'Am I due for a biopsy or MRI? When should it be scheduled?',
      'Are there any findings I should be aware of?',
      'Is active surveillance still the right approach for me?',
      'What symptoms should prompt me to call before my next scheduled visit?',
      'What is my next appointment, and what will it involve?',
      'Are there lifestyle changes that could benefit me?',
    ],
  },
  {
    title: 'What to Expect by Visit Type',
    bg: '#fefce8',
    border: '#fde047',
    items: [
      'PSA check (every ~6 months): blood draw, then a consultation to review results and discuss any concerns.',
      'Annual visit: typically adds a digital rectal exam (DRE) to your PSA check.',
      'MRI: non-invasive, no needles. Usually 30–60 minutes. Avoid ejaculation 3 days beforehand.',
      'Biopsy (every 2–5 years): ~30–45 minutes with mild discomfort; antibiotics usually prescribed. Plan to rest afterward.',
      'You should feel comfortable asking for your results before you leave every appointment.',
    ],
  },
  {
    title: 'After Your Visit',
    bg: '#fdf4ff',
    border: '#e9d5ff',
    items: [
      'Write down what your doctor said, including test results and next steps.',
      'Log your new PSA reading in your PSA Log.',
      'Schedule your next appointment before leaving the office.',
      'After a biopsy: follow post-procedure instructions carefully. Call with any fever, heavy bleeding, or difficulty urinating.',
      'Contact your care team if you have any questions about what was discussed.',
    ],
  },
]

function ChevronIcon({ open }) {
  return e('svg', {
    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
    stroke: '#64748b', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 },
  },
    e('polyline', { points: '6 9 12 15 18 9' })
  )
}

export default function VisitPrep({ onOpenCareTeam }) {
  const [open, setOpen] = useState(0)

  return e('div', { style: { padding: '14px', maxWidth: 640, margin: '0 auto', boxSizing: 'border-box' } },

    e('div', { style: { marginBottom: 14 } },
      e('div', { style: { fontSize: 16, fontWeight: 700, color: '#00002D' } }, 'Visit Prep'),
      e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } },
        'Everything you need for a productive appointment.'
      )
    ),

    SECTIONS.map((section, i) =>
      e('div', {
        key: i,
        style: { marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' },
      },
        e('button', {
          type: 'button',
          onClick: () => setOpen(open === i ? -1 : i),
          style: {
            width: '100%', textAlign: 'left', padding: '12px 14px',
            background: open === i ? section.bg : '#fff',
            border: 'none', borderBottom: open === i ? `1px solid ${section.border}` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', transition: 'background 0.15s',
          },
        },
          e('span', { style: { fontSize: 13, fontWeight: 700, color: '#00002D' } }, section.title),
          e(ChevronIcon, { open: open === i })
        ),
        open === i && e('div', { style: { padding: '10px 14px 14px', background: section.bg } },
          e('ul', { style: { margin: 0, padding: '0 0 0 16px' } },
            section.items.map((item, j) =>
              e('li', {
                key: j,
                style: { fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: j < section.items.length - 1 ? 7 : 0 },
              }, item)
            )
          )
        )
      )
    ),

    // Care team CTA
    e('div', {
      style: {
        marginTop: 6, padding: '14px', background: '#fff',
        border: '1px solid #e2e8f0', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      },
    },
      e('div', null,
        e('div', { style: { fontSize: 13, fontWeight: 700, color: '#00002D' } }, 'Need to reach your care team?'),
        e('div', { style: { fontSize: 12, color: '#64748b', marginTop: 2 } },
          'Contact info, scheduling, and urgent care guidance.'
        )
      ),
      e('button', {
        type: 'button', onClick: onOpenCareTeam,
        style: {
          padding: '9px 16px', borderRadius: 8, background: '#00002D',
          color: '#fff', border: 'none', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        },
      }, 'Care Team')
    )
  )
}

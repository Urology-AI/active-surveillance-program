import React, { useState, useRef, useEffect } from 'react'
import CareTeamModal from './components/CareTeamModal.js'
import { Info } from 'lucide-react'

const e = React.createElement

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge base — sourced from NCCN, AUA, and EAU guidelines
// ─────────────────────────────────────────────────────────────────────────────
const QA_TOPICS = [
  {
    category: 'Understanding Your Options',
    questions: [
      {
        q: 'What is Active Surveillance?',
        a: 'Active Surveillance (AS) is a structured monitoring program for men with very-low or low-risk prostate cancer. The goal is to watch the cancer closely with tests and repeat biopsies, and only begin treatment if the disease shows signs of growth or change. It is recommended for most men with very-low and low-risk prostate cancer and a life expectancy of 10 years or more.',
      },
      {
        q: 'What is Observation (Watchful Waiting)?',
        a: 'Observation, also called Watchful Waiting, is a less intensive approach usually chosen by men with limited life expectancy (≤5 years) or major health problems. The goal is to avoid unnecessary testing and treatments, focusing instead on comfort and quality of life. Treatment is only given if symptoms develop — such as urinary blockage, bone pain, or weight loss.',
      },
      {
        q: 'What is the difference between Active Surveillance and Observation?',
        a: 'Active Surveillance involves structured, frequent monitoring (PSA every 6 months, biopsy every 2–5 years) with the intent to cure if the cancer progresses. Observation is less intensive — with only occasional clinic visits — and focuses on comfort rather than cure. Active Surveillance is for men with longer life expectancy (10+ years), while Observation is typically for men with ≤5 years life expectancy or significant comorbidities.',
      },
    ],
  },
  {
    category: 'Who Is a Candidate',
    questions: [
      {
        q: 'Who is a candidate for Active Surveillance?',
        a: 'Active Surveillance is generally considered when:\n\n• Prostate cancer is very-low or low risk (Grade Group 1, PSA <10, only a few biopsy cores positive)\n• Life expectancy is 10+ years\n• The patient is comfortable with frequent monitoring and possible later treatment\n• Sometimes considered in favorable intermediate-risk cases if: only a small amount of Gleason pattern 4 is present, PSA density is low, tumor volume is low, or genomic tests suggest low risk\n\nNote: Men with family history or known inherited mutations (e.g., BRCA2, HOXB13) may be less suitable for surveillance and often need closer follow-up.',
      },
      {
        q: 'Who is a candidate for Observation?',
        a: 'Observation is considered when:\n\n• Cancer is low- or intermediate-risk, but life expectancy is ≤5 years\n• The risks of ongoing testing and treatment outweigh the benefits\n• The focus of care is comfort and minimizing interventions',
      },
      {
        q: 'What are special pathologic findings?',
        a: 'Certain biopsy findings may raise concern for higher-risk disease:\n\n• Cribriform carcinoma – often associated with higher rates of progression, metastasis, and mortality\n• Intraductal carcinoma of the prostate (IDC-P) – considered an adverse histologic finding, typically prompting definitive treatment\n• High-grade prostatic intraepithelial neoplasia (HGPIN) – not prostate cancer itself, but a marker of increased risk; requires repeat biopsy\n• Atypical small acinar proliferation (ASAP/ASIN) – indeterminate finding with a high likelihood of underlying carcinoma; repeat biopsy recommended within 3–6 months\n• Other aggressive histologies – such as ductal adenocarcinoma, sarcomatoid carcinoma, or small cell/neuroendocrine carcinoma are not candidates for surveillance\n\nNote: Many guidelines (NCCN, AUA, EAU) suggest these features usually warrant treatment rather than surveillance. However, management is individualized.',
      },
    ],
  },
  {
    category: 'What Surveillance Involves',
    questions: [
      {
        q: 'What tests are done during Active Surveillance?',
        a: 'Typical monitoring schedule (may be individualized):\n\n• PSA test: About every 6 months\n• Digital rectal exam (DRE): About once per year\n• Prostate biopsy: Every 2–5 years, but not more than once per year unless concerns arise\n• MRI: Sometimes repeated (not more than once per year) to guide biopsies, but cannot replace them\n\nSurveillance continues until life expectancy is less than 10 years, at which point observation may be more appropriate.',
      },
      {
        q: 'How is candidacy for Active Surveillance confirmed?',
        a: 'Because biopsies can underestimate cancer, confirmatory testing is strongly recommended before committing to Active Surveillance:\n\n• Repeat biopsy (within 12–24 months of diagnosis)\n• MRI with PSA density to identify hidden higher-grade disease\n• Genomic testing (Decipher, Oncotype DX, Prolaris, ConfirmMDx) may add information\n\nNote: Even with these tests, aggressive cancer can sometimes remain undetected.',
      },
      {
        q: 'When does Active Surveillance change to treatment?',
        a: 'Curative treatment may be discussed if:\n\n• Biopsy shows higher grade disease (Grade Group ≥2)\n• Cancer volume increases significantly\n• PSA density rises in a concerning way\n• MRI shows new or suspicious lesions\n• The patient experiences significant anxiety or prefers treatment despite stable disease\n\nNote: Sometimes cancer progresses despite stable tests, and sometimes PSA rises without progression. Decisions are individualized.',
      },
    ],
  },
  {
    category: 'Benefits & Risks',
    questions: [
      {
        q: 'What are the advantages of Active Surveillance?',
        a: '• 50–68% of men avoid treatment for at least 10 years\n• Preserves quality of life by delaying urinary, sexual, and bowel side effects\n• Curative treatment is still available if disease changes',
      },
      {
        q: 'What are the limitations of Active Surveillance?',
        a: '• 32–50% of men eventually need treatment within 10 years\n• Small risk (<0.5%) of progression to advanced cancer during surveillance\n• Some men experience anxiety about "living with cancer"\n\nDisclaimer: Choosing surveillance means accepting both the benefits of avoiding overtreatment and the risks of possible disease progression.',
      },
    ],
  },
  {
    category: 'Additional Tests',
    questions: [
      {
        q: 'What role do additional tests play?',
        a: '• PSA: Can be influenced by non-cancer causes (infection, inflammation, recent ejaculation). Abnormal results should be confirmed.\n• MRI: Improves detection of higher-grade disease but can miss cancer. Radiologist skill matters.\n• PSMA PET: Very sensitive for detecting spread; sometimes used in higher-risk cases. Not a substitute for biopsy.\n• ExactVu Micro-Ultrasound: Provides high-resolution imaging and may help guide targeted biopsies. Not a replacement for surveillance biopsies.\n• Genomic Testing: Helps guide initial candidacy. Not usually repeated during AS.',
      },
    ],
  },
  {
    category: 'Emotional & Long-Term Care',
    questions: [
      {
        q: 'How might I feel emotionally during Active Surveillance?',
        a: 'It is completely normal to experience anxiety and emotional challenges. Common concerns include:\n\n• Anxiety before biopsies or while waiting for results (sleep problems, irritability, worry)\n• Concerns about sexual function, masculinity, or intimacy\n• Feeling uncertain about "living with cancer"\n\nCoping strategies:\n• Stay informed — ask your doctor to explain each step so you know what to expect\n• Use support — talk with loved ones, a counselor, or support groups\n• Practice stress relief — deep breathing, light exercise, or mindfulness can ease anxiety',
      },
      {
        q: 'What does long-term care look like?',
        a: 'Men on Active Surveillance or Observation benefit from:\n\n• Regular follow-up to ensure safety\n• Lifestyle modifications (diet, exercise, smoking cessation) to reduce risk\n• Emotional support through counseling or support groups\n• Coordination of care among urologists, oncologists, primary care, and mental health providers',
      },
      {
        q: 'What is shared decision-making?',
        a: 'Shared decision-making means you and your doctor decide together, based on the cancer, your health, and what matters most to you. Topics discussed include:\n\n1. How serious your cancer is — your risk level and what it means for care\n2. Your overall health and life expectancy — age and health conditions help guide whether treatment or monitoring makes sense\n3. Chances of cure and recurrence — risk calculators can help estimate outcomes\n4. Possible side effects — urinary control, sexual function, and bowel health\n5. Your starting point — current function is one of the best predictors of recovery\n6. Your preferences and goals — what matters most to you should guide the choice',
      },
    ],
  },
]

const ALL_QA = QA_TOPICS.flatMap(t => t.questions)

// ─────────────────────────────────────────────────────────────────────────────
// Answer lookup — keyword matching (replace with LLM call when ready)
// ─────────────────────────────────────────────────────────────────────────────
function getAnswer(question) {
  // TODO: replace this function body with an LLM API call
  // e.g. return await fetch('/api/chat', { method:'POST', body: JSON.stringify({ question }) })
  const q = question.toLowerCase().trim()
  const exact = ALL_QA.find(item => item.q.toLowerCase() === q)
  if (exact) return exact.a
  const scored = ALL_QA.map(item => {
    const words = q.split(/\s+/).filter(w => w.length > 3)
    const score = words.filter(w =>
      item.q.toLowerCase().includes(w) || item.a.toLowerCase().includes(w)
    ).length
    return { item, score }
  }).sort((a, b) => b.score - a.score)
  if (scored[0] && scored[0].score > 0) return scored[0].item.a
  return "I don't have a specific answer for that question yet. Please speak with your care team or ask one of the suggested questions below."
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (all use createElement)
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ role, text }) {
  const isUser = role === 'user'
  return e('div', {
    className: `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`,
  },
    e('div', {
      className: isUser
        ? 'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl rounded-br-sm bg-[#00002D] text-white text-sm leading-relaxed'
        : 'max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-slate-200 text-slate-800 text-sm leading-relaxed shadow-sm',
    },
      // Render newlines as line breaks
      text.split('\n').map((line, i) =>
        e(React.Fragment, { key: i },
          line,
          i < text.split('\n').length - 1 && e('br', {})
        )
      )
    )
  )
}

function WelcomeBanner() {
  return e('div', { className: 'mb-6 rounded-xl bg-sky-50 border border-sky-100 p-4' },
    e('p', { className: 'text-sm font-semibold text-sky-800 mb-1' }, 'Educational Resource'),
    e('p', { className: 'text-xs text-sky-700 leading-relaxed' },
      'This tool answers common questions about Active Surveillance and Observation for prostate cancer, based on NCCN, AUA, and EAU guidelines. Select a question below or type your own.'
    )
  )
}

function SuggestedQuestions({ onSelect }) {
  const [openCategory, setOpenCategory] = useState(QA_TOPICS[0].category)

  return e('div', { className: 'mb-4' },
    e('p', { className: 'text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2' }, 'Suggested Questions'),
    e('div', { className: 'space-y-2' },
      QA_TOPICS.map(topic =>
        e('div', { key: topic.category, className: 'rounded-lg border border-slate-200 bg-white overflow-hidden' },
          e('button', {
            type: 'button',
            onClick: () => setOpenCategory(openCategory === topic.category ? null : topic.category),
            className: 'w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors',
          },
            e('span', {}, topic.category),
            e('svg', {
              className: `w-3.5 h-3.5 text-slate-400 transition-transform ${openCategory === topic.category ? 'rotate-180' : ''}`,
              fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2,
            },
              e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M19 9l-7 7-7-7' })
            )
          ),
          openCategory === topic.category && e('div', { className: 'border-t border-slate-100 divide-y divide-slate-50' },
            topic.questions.map(qa =>
              e('button', {
                key: qa.q,
                type: 'button',
                onClick: () => onSelect(qa.q),
                className: 'w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-sky-50 hover:text-sky-800 transition-colors',
              }, qa.q)
            )
          )
        )
      )
    )
  )
}

function Disclaimer() {
  return e('p', { className: 'text-[10px] text-slate-400 leading-relaxed mt-4 px-1' },
    'This tool is for educational purposes only and does not replace medical advice, diagnosis, or treatment from your physician. Always follow the specific advice of your healthcare team and seek immediate care for new or concerning symptoms.'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientApp({ onBack }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [careOpen, setCareOpen] = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function handleAsk(question) {
    const trimmed = question.trim()
    if (!trimmed) return
    const answer = getAnswer(trimmed)
    setMessages(prev => [
      ...prev,
      { role: 'user', text: trimmed },
      { role: 'bot',  text: answer },
    ])
    setInput('')
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    handleAsk(input)
  }

  const hasMessages = messages.length > 0

  return e('div', { className: 'min-h-screen flex flex-col', style: { background: '#f8fafc' } },

    e(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),

    // ── Header ────────────────────────────────────────────────────────────
    e('div', { className: 'no-print shrink-0', style: { background: '#00002D' } },
      e('div', { className: 'max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2' },
        e('button', {
          onClick: onBack,
          className: 'flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors shrink-0',
        },
          e('svg', { className: 'w-4 h-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 19l-7-7 7-7' })
          ),
          'Change role'
        ),
        e('div', { className: 'text-center min-w-0 flex-1' },
          e('div', { className: 'text-white text-xs font-semibold tracking-wide' }, 'MOUNT SINAI'),
          e('div', { className: 'text-white/50 text-xs' }, 'Patient Education')
        ),
        e('button', {
          type: 'button',
          onClick: () => setCareOpen(true),
          className: 'inline-flex h-8 items-center justify-center gap-1.5 shrink-0 rounded-full border border-white/20 bg-white/5 px-2.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
          title: 'Meet the Care Team',
          'aria-label': 'Meet the Care Team',
        },
          e(Info, { className: 'h-4 w-4' }),
          e('span', { className: 'hidden sm:inline text-[11px] font-semibold' }, 'Meet the Care Team')
        )
      )
    ),

    // ── Body ──────────────────────────────────────────────────────────────
    e('div', { className: 'flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-0' },

      !hasMessages && e(WelcomeBanner, {}),

      // Chat messages
      hasMessages && e('div', { className: 'flex-1 mb-4' },
        messages.map((msg, i) => e(MessageBubble, { key: i, role: msg.role, text: msg.text })),
        e('div', { ref: bottomRef })
      ),

      // Suggested questions (always visible)
      e(SuggestedQuestions, { onSelect: handleAsk }),

      // Input
      e('form', { onSubmit: handleSubmit, className: 'mt-4 flex gap-2' },
        e('input', {
          type: 'text',
          value: input,
          onChange: ev => setInput(ev.target.value),
          placeholder: 'Ask a question about Active Surveillance…',
          className: 'flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent',
        }),
        e('button', {
          type: 'submit',
          disabled: !input.trim(),
          className: 'rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
          style: { background: '#00002D' },
        }, 'Ask')
      ),

      e(Disclaimer, {})
    )
  )
}

import React, { useState, useRef, useEffect } from 'react'
import CareTeamModal from './components/CareTeamModal.js'
import { Activity, BookOpen } from 'lucide-react'
import { answerPatientEducationQuestion, checkPatientMessageForPii } from './patientGeminiService.js'
import {
  findStructuredQaAnswer,
  GENERIC_FALLBACK_MESSAGE,
  resolveLocalEducationAnswer,
} from './patientAnswerResolver.js'

const e = React.createElement
const PATIENT_CONSENT_KEY = 'as_patient_consent_accepted'

const GEMINI_KEY_CONFIGURED =
  typeof __VITE_GEMINI_API_KEY_INJECTED__ === 'string' &&
  __VITE_GEMINI_API_KEY_INJECTED__.trim().length > 0

const LOAD_CHECK   = 'Checking your message…'
const LOAD_HANDOUT = 'Searching patient handout & guideline topics…'
const LOAD_AI      = 'Asking Gemini AI (using your handout as context)…'

const SOURCE_BADGE = {
  doc: {
    dot: '#10b981', label: 'From your handout',
  },
  qa: {
    dot: '#06ABEB', label: 'Guideline topics',
  },
  gemini: {
    dot: '#8b5cf6', label: 'AI answer (Gemini)',
  },
  fallback: {
    dot: '#f59e0b', label: 'Offline',
  },
  privacy: {
    dot: '#94a3b8', label: 'Privacy notice',
  },
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Q&A knowledge base ──────────────────────────────────────────────────────

const QA_TOPICS = [
  {
    category: 'Understanding Your Options',
    railLabel: 'Understanding',
    questions: [
      { q: 'What is Active Surveillance?', a: 'Active Surveillance (AS) is a structured monitoring program for men with very-low or low-risk prostate cancer. The goal is to watch the cancer closely with tests and repeat biopsies, and only begin treatment if the disease shows signs of growth or change. It is recommended for most men with very-low and low-risk prostate cancer and a life expectancy of 10 years or more.' },
      { q: 'What is Observation (Watchful Waiting)?', a: 'Observation, also called Watchful Waiting, is a less intensive approach usually chosen by men with limited life expectancy (≤5 years) or major health problems. The goal is to avoid unnecessary testing and treatments, focusing instead on comfort and quality of life. Treatment is only given if symptoms develop — such as urinary blockage, bone pain, or weight loss.' },
      { q: 'What is the difference between Active Surveillance and Observation?', a: 'Active Surveillance involves structured, frequent monitoring (PSA every 6 months, biopsy every 2–5 years) with the intent to cure if the cancer progresses. Observation is less intensive and focuses on comfort rather than cure. Active Surveillance is for men with longer life expectancy (10+ years), while Observation is typically for men with ≤5 years life expectancy or significant comorbidities.' },
    ],
  },
  {
    category: 'Who Is a Candidate',
    railLabel: 'Candidate?',
    questions: [
      { q: 'Who is a candidate for Active Surveillance?', a: 'Active Surveillance is generally considered when: prostate cancer is very-low or low risk (Grade Group 1, PSA <10, only a few biopsy cores positive); life expectancy is 10+ years; the patient is comfortable with frequent monitoring and possible later treatment. Sometimes considered in favorable intermediate-risk cases if only a small amount of Gleason pattern 4 is present, PSA density is low, tumor volume is low, or genomic tests suggest low risk.' },
      { q: 'Who is a candidate for Observation?', a: 'Observation is considered when: cancer is low- or intermediate-risk but life expectancy is ≤5 years; the risks of ongoing testing and treatment outweigh the benefits; the focus of care is comfort and minimizing interventions.' },
      { q: 'What are special pathologic findings?', a: 'Certain biopsy findings may raise concern for higher-risk disease: Cribriform carcinoma, Intraductal carcinoma of the prostate (IDC-P), High-grade prostatic intraepithelial neoplasia (HGPIN), and Atypical small acinar proliferation (ASAP/ASIN). Many guidelines suggest these features usually warrant treatment rather than surveillance.' },
    ],
  },
  {
    category: 'What Surveillance Involves',
    railLabel: 'Tests',
    questions: [
      { q: 'What tests are done during Active Surveillance?', a: 'Typical monitoring schedule: PSA test about every 6 months; digital rectal exam (DRE) about once per year; prostate biopsy every 2–5 years; MRI sometimes repeated to guide biopsies. Surveillance continues until life expectancy is less than 10 years.' },
      { q: 'How is candidacy for Active Surveillance confirmed?', a: 'Because biopsies can underestimate cancer, confirmatory testing is strongly recommended: repeat biopsy (within 12–24 months of diagnosis); MRI with PSA density to identify hidden higher-grade disease; genomic testing (Decipher, Oncotype DX, Prolaris, ConfirmMDx) may add information.' },
      { q: 'When does Active Surveillance change to treatment?', a: 'Curative treatment may be discussed if: biopsy shows higher grade disease (Grade Group ≥2); cancer volume increases significantly; PSA density rises in a concerning way; MRI shows new or suspicious lesions; or the patient prefers treatment despite stable disease. Decisions are individualized.' },
    ],
  },
  {
    category: 'Benefits & Risks',
    railLabel: 'Benefits',
    questions: [
      { q: 'What are the advantages of Active Surveillance?', a: '50–68% of men avoid treatment for at least 10 years. Preserves quality of life by delaying urinary, sexual, and bowel side effects. Curative treatment is still available if disease changes.' },
      { q: 'What are the limitations of Active Surveillance?', a: '32–50% of men eventually need treatment within 10 years. Small risk (<0.5%) of progression to advanced cancer during surveillance. Some men experience anxiety about "living with cancer." Choosing surveillance means accepting both the benefits of avoiding overtreatment and the risks of possible disease progression.' },
    ],
  },
  {
    category: 'Emotional & Long-Term Care',
    railLabel: 'Emotional',
    questions: [
      { q: 'How might I feel emotionally during Active Surveillance?', a: 'It is completely normal to experience anxiety and emotional challenges. Common concerns include anxiety before biopsies or while waiting for results, concerns about sexual function, and uncertainty about "living with cancer." Coping strategies include staying informed, using support (loved ones, counselor, support groups), and practicing stress relief through exercise or mindfulness.' },
      { q: 'What does long-term care look like?', a: 'Men on Active Surveillance or Observation benefit from: regular follow-up to ensure safety; lifestyle modifications (diet, exercise, smoking cessation) — see the "Exercise & Lifestyle" topic for specific advice; emotional support through counseling or support groups; coordination of care among urologists, oncologists, primary care, and mental health providers.' },
      { q: 'What is shared decision-making?', a: 'Shared decision-making means you and your doctor decide together, based on the cancer, your health, and what matters most to you. Topics include: how serious your cancer is, your overall health and life expectancy, chances of cure and recurrence, possible side effects, and your preferences and goals.' },
    ],
  },
  {
    category: 'Exercise & Lifestyle',
    railLabel: 'Lifestyle',
    questions: [
      {
        q: 'What exercise is recommended during Active Surveillance?',
        a: 'Regular physical activity is strongly encouraged during Active Surveillance. General guidelines suggest:\n\n• Aerobic exercise: aim for at least 150 minutes of moderate-intensity activity per week (e.g., brisk walking, swimming, cycling) or 75 minutes of vigorous activity (e.g., jogging, tennis).\n• Resistance/strength training: 2–3 sessions per week helps maintain muscle mass, bone health, and overall energy.\n• Even light daily activity — such as walking 30 minutes a day — is beneficial.\n\nExercise has been shown to reduce cardiovascular risk, improve mood and sleep, lower fatigue, and may help slow prostate cancer progression. Always check with your care team before starting a new exercise program, especially if you have other health conditions.',
      },
      {
        q: 'Are there dietary changes that may help during Active Surveillance?',
        a: 'A healthy, balanced diet is an important part of long-term care. Evidence-based dietary guidance for men on Active Surveillance includes:\n\n• Follow a Mediterranean or plant-forward diet — rich in vegetables, fruits, whole grains, legumes, and healthy fats (such as olive oil and nuts).\n• Limit red and processed meats (e.g., sausage, bacon, deli meats), which are associated with higher cancer risk.\n• Reduce saturated fat and avoid trans fats.\n• Eat more cruciferous vegetables (broccoli, cauliflower, kale) and tomatoes/tomato products (a source of lycopene), which have shown potential benefit in prostate health research.\n• Limit alcohol — no more than 1–2 drinks per day, and less is better.\n• Maintain a healthy weight — obesity is associated with more aggressive prostate cancer.\n• Stay well hydrated with water rather than sugary beverages.\n\nNo single food or supplement has been proven to cure prostate cancer. Always discuss major diet changes with your care team.',
      },
      {
        q: 'What other lifestyle changes are recommended?',
        a: 'Beyond exercise and diet, several lifestyle habits are recommended for men on Active Surveillance:\n\n• Quit smoking: Smoking is linked to more aggressive prostate cancer and worse outcomes. Your care team can connect you with cessation programs.\n• Manage your weight: A healthy body weight reduces cancer risk and improves overall health.\n• Prioritize sleep: Aim for 7–8 hours per night. Poor sleep affects immune function and mood.\n• Reduce stress: Chronic stress can affect overall health. Mindfulness, meditation, yoga, or talking with a counselor can help.\n• Limit alcohol: Excessive drinking is associated with increased cancer risk and interferes with healthy sleep and recovery.\n• Stay connected: Social support — from family, friends, or prostate cancer support groups — significantly improves quality of life during surveillance.\n• Keep all follow-up appointments: Lifestyle changes complement — but do not replace — your regular monitoring schedule.\n\nThink of Active Surveillance as an opportunity to invest in your overall health.',
      },
    ],
  },
]

const ALL_QA = QA_TOPICS.flatMap(t => t.questions)

function getAnswer(question) {
  return findStructuredQaAnswer(question, ALL_QA) || GENERIC_FALLBACK_MESSAGE
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BrandMark() {
  return e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
    e('div', {
      style: {
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: 'linear-gradient(135deg, #06ABEB 0%, #0596c7 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    },
      e(Activity, { style: { width: 13, height: 13, color: '#fff' } })
    ),
    e('div', { style: { lineHeight: 1 } },
      e('div', {
        style: {
          fontSize: 8, fontWeight: 800, letterSpacing: '0.14em',
          color: '#06ABEB', textTransform: 'uppercase',
        },
      }, 'Mount Sinai'),
      e('div', {
        style: { fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 1 },
      }, 'Tewari AS Program')
    )
  )
}

function MessageBubble({ role, text, pending, loadingLabel, source }) {
  const isUser = role === 'user'
  const badge  = !isUser && !pending && source && SOURCE_BADGE[source]

  const bubbleBody = pending
    ? e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 } },
        e('span', {
          style: {
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid #bae6fd', borderTopColor: '#0284c7',
            animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0,
          },
        }),
        loadingLabel || 'Preparing an answer…'
      )
    : text.split('\n').map((line, i, arr) =>
        e(React.Fragment, { key: i }, line, i < arr.length - 1 && e('br'))
      )

  return e('div', {
    style: {
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    },
  },
    e('div', {
      style: { display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '78%' },
    },
      e('div', {
        style: isUser
          ? {
              padding: '8px 12px', borderRadius: 14, borderBottomRightRadius: 4,
              background: '#00002D', color: '#fff', fontSize: 13, lineHeight: 1.5,
            }
          : {
              padding: '10px 12px', borderRadius: 14, borderBottomLeftRadius: 4,
              background: '#fff', border: '1px solid #e2e8f0', color: '#334155',
              fontSize: 13, lineHeight: 1.55,
            },
      }, bubbleBody),
      badge && e('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 5,
          paddingLeft: 4,
        },
      },
        e('span', {
          style: {
            width: 5, height: 5, borderRadius: '50%',
            background: badge.dot, flexShrink: 0, display: 'inline-block',
          },
        }),
        e('span', {
          style: { fontSize: 10, fontWeight: 600, color: '#64748b' },
        }, badge.label)
      )
    )
  )
}

function TopicIntroCard({ topic, onSelectQuestion, disabled }) {
  return e('div', {
    style: {
      padding: '12px 14px', background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 12,
    },
  },
    e('div', {
      style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
    },
      e(BookOpen, { style: { width: 13, height: 13, color: '#06ABEB' } }),
      e('span', {
        style: {
          fontSize: 10.5, fontWeight: 700, color: '#06ABEB',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        },
      }, topic.category)
    ),
    e('div', {
      style: { fontSize: 13, color: '#00002D', fontWeight: 600, marginBottom: 8 },
    }, 'Tap a question, or type your own below.'),
    e('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
      topic.questions.slice(0, 3).map(q =>
        e('button', {
          key: q.q,
          type: 'button',
          disabled,
          onClick: () => onSelectQuestion(q.q),
          style: {
            textAlign: 'left', padding: '7px 10px', borderRadius: 8,
            background: '#f8fafc', border: '1px solid #f1f5f9',
            fontSize: 12.5, color: '#334155',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer', gap: 8,
            opacity: disabled ? 0.5 : 1,
          },
        },
          e('span', {}, q.q),
          e('svg', {
            width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
            stroke: '#94a3b8', strokeWidth: 2,
            strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0,
          },
            e('polyline', { points: '9 18 15 12 9 6' })
          )
        )
      )
    )
  )
}

function ConsentCard({ onAccept }) {
  const [checked, setChecked] = useState(false)
  return e('div', {
    style: {
      margin: '16px 14px',
      background: '#fff7ed', border: '1px solid #fed7aa',
      borderRadius: 12, padding: '16px',
    },
  },
    e('p', {
      style: { fontSize: 14, fontWeight: 700, color: '#92400e', marginBottom: 6 },
    }, 'Consent & Educational Use Notice'),
    e('p', {
      style: { fontSize: 12, color: '#78350f', lineHeight: 1.55, marginBottom: 6 },
    }, 'This patient screen is an educational tool only. It does not provide medical advice, diagnosis, or treatment, and cannot replace discussion with your clinician.'),
    e('p', {
      style: { fontSize: 12, color: '#78350f', lineHeight: 1.55, marginBottom: 10, fontWeight: 500 },
    }, 'Do not type personal details (name, contact info, medical record numbers, dates of birth, or your own lab/biopsy values). Ask general questions only.'),
    e('label', {
      style: { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 12 },
    },
      e('input', {
        type: 'checkbox', checked, onChange: ev => setChecked(ev.target.checked),
        style: { marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' },
      }),
      e('span', { style: { fontSize: 12, color: '#92400e' } },
        'I understand and want to continue using this educational resource.'
      )
    ),
    e('button', {
      type: 'button',
      disabled: !checked,
      onClick: () => checked && onAccept(),
      style: {
        width: '100%', padding: '10px', borderRadius: 8,
        background: checked ? '#00002D' : '#e2e8f0',
        color: checked ? '#fff' : '#94a3b8',
        border: 'none', fontSize: 13, fontWeight: 700,
        cursor: checked ? 'pointer' : 'not-allowed',
        transition: 'background 0.15s',
      },
    }, 'Continue')
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientApp({ onBack }) {
  const [messages,         setMessages]         = useState([])
  const [input,            setInput]            = useState('')
  const [careOpen,         setCareOpen]         = useState(false)
  const [consentAccepted,  setConsentAccepted]  = useState(false)
  const [chatLoading,      setChatLoading]      = useState(false)
  const [activeTopic,      setActiveTopic]      = useState(0) // index into QA_TOPICS
  const bottomRef = useRef(null)

  useEffect(() => {
    try {
      setConsentAccepted(localStorage.getItem(PATIENT_CONSENT_KEY) === 'true')
    } catch (_) {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PATIENT_CONSENT_KEY, consentAccepted ? 'true' : 'false')
    } catch (_) {}
  }, [consentAccepted])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function replacePendingBot(update) {
    setMessages(prev => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (last && last.role === 'bot' && last.pending) {
        next[next.length - 1] = typeof update === 'function' ? update(last) : update
      }
      return next
    })
  }

  async function handleAsk(question) {
    if (!consentAccepted) return
    const trimmed = question.trim()
    if (!trimmed || chatLoading) return
    setChatLoading(true)
    try {
      setMessages(prev => [
        ...prev,
        { role: 'user', text: trimmed },
        { role: 'bot', text: '', pending: true, loadingLabel: LOAD_CHECK },
      ])
      setInput('')

      const pii = checkPatientMessageForPii(trimmed)
      if (!pii.ok) {
        replacePendingBot({ role: 'bot', text: pii.message, source: 'privacy' })
        return
      }

      replacePendingBot(last => ({ ...last, loadingLabel: LOAD_HANDOUT }))
      await sleep(140)

      const hasPriorConversation = messages.some(m => m.role === 'user' && String(m.text || '').trim())
      const local = resolveLocalEducationAnswer(trimmed, ALL_QA, { hasPriorConversation })
      if (local) {
        replacePendingBot({ role: 'bot', text: local.text, source: local.source })
        return
      }

      replacePendingBot(last => ({ ...last, loadingLabel: LOAD_AI }))

      try {
        const { text, source } = await answerPatientEducationQuestion(trimmed, {
          getFallbackAnswer: getAnswer,
          conversationHistory: messages,
          structuredQa: ALL_QA,
          skipPii: true,
          skipLocal: true,
        })
        replacePendingBot({ role: 'bot', text, source: source || 'gemini' })
      } catch (_) {
        replacePendingBot({
          role: 'bot',
          text: `${getAnswer(trimmed)}\n\n_(Something went wrong; showing an offline answer.)_`,
          source: 'fallback',
        })
      }
    } finally {
      setChatLoading(false)
    }
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    void handleAsk(input)
  }

  const hasMessages = messages.length > 0

  return e('div', {
    style: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' },
  },
    e(CareTeamModal, { open: careOpen, onClose: () => setCareOpen(false) }),

    // ── Header ─────────────────────────────────────────────────────────────────
    e('div', {
      className: 'no-print shrink-0',
      style: { background: '#00002D', flexShrink: 0 },
    },
      e('div', {
        style: {
          maxWidth: 640, margin: '0 auto',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        },
      },
        // Back
        e('button', {
          type: 'button', onClick: onBack,
          style: {
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.65)', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
          },
        },
          e('svg', {
            width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            e('polyline', { points: '15 18 9 12 15 6' })
          )
        ),
        // BrandMark
        e(BrandMark),
        // Care Team
        e('button', {
          type: 'button', onClick: () => setCareOpen(true),
          style: {
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.85)', padding: '4px 8px', borderRadius: 999,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          },
        },
          e('svg', {
            width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
          },
            e('circle', { cx: 12, cy: 12, r: 10 }),
            e('line', { x1: 12, y1: 16, x2: 12, y2: 12 }),
            e('line', { x1: 12, y1: 8, x2: '12.01', y2: 8 })
          ),
          'Care'
        )
      ),
      // AI status bar
      e('div', {
        style: {
          maxWidth: 640, margin: '0 auto',
          padding: '5px 14px 8px',
          display: 'flex', alignItems: 'center', gap: 6,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        },
      },
        e('span', {
          style: {
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: GEMINI_KEY_CONFIGURED ? '#34d399' : '#f59e0b',
          },
        }),
        e('span', {
          style: { fontSize: 10, color: GEMINI_KEY_CONFIGURED ? 'rgba(52,211,153,0.95)' : 'rgba(255,255,255,0.45)' },
        }, GEMINI_KEY_CONFIGURED ? 'Gemini AI connected' : 'AI assistant offline — handout & topics only')
      )
    ),

    // ── Topic rail ─────────────────────────────────────────────────────────────
    e('div', {
      style: {
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '10px 12px', display: 'flex', gap: 6,
        overflowX: 'auto', flexShrink: 0,
      },
      className: 'no-scrollbar',
    },
      QA_TOPICS.map((t, i) =>
        e('button', {
          key: i, type: 'button',
          onClick: () => { setActiveTopic(i); setMessages([]) },
          style: {
            padding: '6px 11px', borderRadius: 999, whiteSpace: 'nowrap',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            background: i === activeTopic ? '#06ABEB14' : '#f8fafc',
            border: `1px solid ${i === activeTopic ? '#06ABEB44' : '#e2e8f0'}`,
            color: i === activeTopic ? '#212070' : '#475569',
            transition: 'all 0.15s',
          },
        }, t.railLabel)
      )
    ),

    // ── Body ───────────────────────────────────────────────────────────────────
    e('div', {
      style: {
        flex: 1, overflowY: 'auto',
        padding: '14px', display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 640, width: '100%', margin: '0 auto',
        boxSizing: 'border-box',
      },
    },
      !consentAccepted
        ? e(ConsentCard, { onAccept: () => setConsentAccepted(true) })
        : e(React.Fragment, null,

            // Topic intro card (always visible when no messages, or above messages)
            !hasMessages && e(TopicIntroCard, {
              topic: QA_TOPICS[activeTopic],
              onSelectQuestion: handleAsk,
              disabled: chatLoading,
            }),

            // Chat messages
            hasMessages && e(React.Fragment, null,
              messages.map((msg, i) =>
                e(MessageBubble, {
                  key: i, role: msg.role, text: msg.text,
                  pending: msg.pending, loadingLabel: msg.loadingLabel, source: msg.source,
                })
              ),
              e('div', { ref: bottomRef })
            ),
          )
    ),

    // ── Composer ───────────────────────────────────────────────────────────────
    consentAccepted && e('div', {
      style: {
        padding: '12px', borderTop: '1px solid #e2e8f0', background: '#fff',
        flexShrink: 0,
      },
    },
      e('form', {
        onSubmit: handleSubmit,
        style: { display: 'flex', gap: 6, maxWidth: 640, margin: '0 auto' },
      },
        e('input', {
          type: 'text', value: input,
          onChange: ev => setInput(ev.target.value),
          placeholder: 'Ask a question…',
          disabled: chatLoading,
          autoComplete: 'off',
          style: {
            flex: 1, padding: '9px 12px',
            border: '1px solid #e2e8f0', borderRadius: 10,
            fontSize: 13, background: '#fff', color: '#1e293b',
            outline: 'none',
          },
        }),
        e('button', {
          type: 'submit',
          disabled: chatLoading || !input.trim(),
          style: {
            padding: '0 16px', borderRadius: 10,
            background: chatLoading || !input.trim() ? '#cbd5e1' : '#06ABEB',
            color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: chatLoading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          },
        }, chatLoading ? '…' : 'Ask')
      ),
      e('p', {
        style: {
          fontSize: 10, color: '#94a3b8', textAlign: 'center',
          margin: '6px auto 0', maxWidth: 640,
        },
      }, "Don't enter personal details · Educational only")
    )
  )
}

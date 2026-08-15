import { describe, it, expect } from 'vitest'
import {
  buildClinicalContext,
  scrubFreeText,
  sanitizeOutboundBody,
  CLINICAL_ALLOWLIST,
  AGE_CAP,
} from '../promptSanitizer.js'

// Identifier-shaped content used below is entirely synthetic.

describe('buildClinicalContext — allowlist', () => {
  it('passes allowlisted clinical fields through unchanged', () => {
    const { context, dropped } = buildClinicalContext({
      ggg: 2,
      psa: 6.4,
      psad: 0.15,
      prostateVolume: 42,
      pirads: 4,
      positiveCores: 3,
      totalCores: 12,
      maxCorePercent: 40,
      decipher: 0.38,
      psaDoublingTime: 4.2,
    })

    expect(context).toEqual({
      ggg: 2,
      psa: 6.4,
      psad: 0.15,
      prostateVolume: 42,
      pirads: 4,
      positiveCores: 3,
      totalCores: 12,
      maxCorePercent: 40,
      decipher: 0.38,
      psaDoublingTime: 4.2,
    })
    expect(dropped).toEqual([])
  })

  it('drops non-allowlisted keys and reports them', () => {
    const { context, dropped } = buildClinicalContext({
      ggg: 1,
      name: 'Synthetic Testpatient',
      mrn: '00123456',
      dob: '1954-03-02',
      email: 'nobody@example.invalid',
      phone: '555-0100',
    })

    expect(context).toEqual({ ggg: 1 })
    expect(dropped).toEqual(
      expect.arrayContaining(['name', 'mrn', 'dob', 'email', 'phone'])
    )
  })

  it('never emits an identifying key even when it collides with a clinical one', () => {
    const { context } = buildClinicalContext({ psa: 6, patientName: 'X Y' })
    expect(Object.keys(context)).toEqual(['psa'])
    expect(JSON.stringify(context)).not.toMatch(/X Y/)
  })

  it('walks nested objects rather than letting them smuggle fields through', () => {
    const { context, dropped } = buildClinicalContext({
      inputs: { ggg: 3, psa: 8.1 },
      patient: { name: 'Synthetic Testpatient', mrn: '9988776' },
    })

    expect(context).toEqual({ ggg: 3, psa: 8.1 })
    expect(dropped).toEqual(
      expect.arrayContaining(['patient.name', 'patient.mrn'])
    )
  })

  it('drops allowlisted keys whose values fail coercion', () => {
    const { context, dropped } = buildClinicalContext({ psa: 'see chart note' })
    expect(context).toEqual({})
    expect(dropped).toContain('psa')
  })

  it('tolerates null / non-object input', () => {
    expect(buildClinicalContext(null).context).toEqual({})
    expect(buildClinicalContext(undefined).dropped).toEqual([])
    expect(buildClinicalContext([1, 2]).context).toEqual({})
  })

  it('has no identifying field on the allowlist', () => {
    const keys = Object.keys(CLINICAL_ALLOWLIST).join(' ').toLowerCase()
    for (const forbidden of ['name', 'mrn', 'dob', 'birth', 'address', 'phone', 'email', 'ssn']) {
      expect(keys).not.toContain(forbidden)
    }
  })
})

describe('buildClinicalContext — age bucketing (HIPAA Safe Harbor)', () => {
  it('passes ages at or below the cap through as numbers', () => {
    expect(buildClinicalContext({ age: 67 }).context.age).toBe(67)
    expect(buildClinicalContext({ age: AGE_CAP }).context.age).toBe(AGE_CAP)
  })

  it('buckets ages above 89 into 90+', () => {
    expect(buildClinicalContext({ age: 90 }).context.age).toBe('90+')
    expect(buildClinicalContext({ age: 97 }).context.age).toBe('90+')
    expect(buildClinicalContext({ age: 103 }).context.age).toBe('90+')
  })

  it('never emits an exact age above the cap', () => {
    const json = JSON.stringify(buildClinicalContext({ age: 94 }).context)
    expect(json).not.toContain('94')
  })
})

describe('scrubFreeText — backstop', () => {
  const cases = [
    ['email', 'reach me at nobody@example.invalid ok'],
    ['ssn', 'ssn 123-45-6789'],
    ['phone', 'call 555-867-5309 please'],
    ['mrn', 'my MRN is 00123456'],
    ['date', 'biopsy was 03/14/2023'],
    ['date', 'biopsy was 2023-03-14'],
    ['date', 'diagnosed March 14, 2023'],
    ['address', 'I live at 123 Elm Street'],
    // 7 digits: deliberately not 10, or the phone rule claims it first.
    ['long-digit-run', 'record 9988776'],
    ['dob', 'date of birth: 1954-03-02'],
    ['name-phrase', 'my name is Synthetic Testpatient'],
  ]

  for (const [label, input] of cases) {
    it(`redacts ${label}: "${input}"`, () => {
      const { text, redactions } = scrubFreeText(input)
      expect(redactions).toContain(label)
      expect(text).toContain('[redacted]')
    })
  }

  it('leaves clinical free text untouched', () => {
    const q = 'My PSA went from 4.2 to 5.1 and my Gleason is 3+4. Should I worry?'
    const { text, redactions } = scrubFreeText(q)
    expect(text).toBe(q)
    expect(redactions).toEqual([])
  })

  it('does not mangle ordinary questions', () => {
    const q = 'What does PI-RADS 4 mean and how often is a biopsy repeated?'
    expect(scrubFreeText(q).text).toBe(q)
  })

  it('is stateless across repeated calls (no sticky /g lastIndex)', () => {
    const input = 'ssn 123-45-6789'
    const a = scrubFreeText(input)
    const b = scrubFreeText(input)
    expect(a.text).toBe(b.text)
    expect(a.redactions).toEqual(b.redactions)
  })

  it('handles null / undefined without throwing', () => {
    expect(scrubFreeText(null).text).toBe('')
    expect(scrubFreeText(undefined).text).toBe('')
  })

  it('does not retain the matched values in the report', () => {
    const { redactions } = scrubFreeText('ssn 123-45-6789')
    expect(redactions.join(' ')).not.toContain('123-45-6789')
  })
})

describe('sanitizeOutboundBody — choke point', () => {
  it('scrubs every history turn, not just the newest', () => {
    const body = {
      systemInstruction: { parts: [{ text: 'static handout text' }] },
      contents: [
        { role: 'user', parts: [{ text: 'my MRN is 00123456' }] },
        { role: 'model', parts: [{ text: 'I cannot use that.' }] },
        { role: 'user', parts: [{ text: 'call me at 555-867-5309' }] },
      ],
    }

    const { body: safe, redactions } = sanitizeOutboundBody(body)
    const json = JSON.stringify(safe.contents)

    expect(json).not.toContain('00123456')
    expect(json).not.toContain('555-867-5309')
    expect(redactions).toEqual(expect.arrayContaining(['mrn', 'phone']))
  })

  it('leaves the static systemInstruction untouched', () => {
    const body = {
      systemInstruction: { parts: [{ text: 'handout 03/14/2023 reference' }] },
      contents: [{ role: 'user', parts: [{ text: 'hello' }] }],
    }
    const { body: safe } = sanitizeOutboundBody(body)
    expect(safe.systemInstruction.parts[0].text).toBe('handout 03/14/2023 reference')
  })

  it('preserves generationConfig and turn roles', () => {
    const body = {
      contents: [{ role: 'model', parts: [{ text: 'ok' }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 1200 },
    }
    const { body: safe } = sanitizeOutboundBody(body)
    expect(safe.generationConfig).toEqual({ temperature: 0.35, maxOutputTokens: 1200 })
    expect(safe.contents[0].role).toBe('model')
  })

  it('attaches allowlisted clinical context and drops the rest', () => {
    const body = { contents: [{ role: 'user', parts: [{ text: 'what next?' }] }] }
    const { body: safe, dropped } = sanitizeOutboundBody(body, {
      ggg: 2,
      psa: 6.4,
      name: 'Synthetic Testpatient',
      mrn: '00123456',
    })

    const json = JSON.stringify(safe.contents)
    // Read the context turn directly — the outer stringify double-escapes quotes.
    expect(safe.contents[0].parts[0].text).toContain('"ggg":2')
    expect(json).not.toContain('Synthetic Testpatient')
    expect(json).not.toContain('00123456')
    expect(dropped).toEqual(expect.arrayContaining(['name', 'mrn']))
  })

  it('adds no context turn when nothing survives the allowlist', () => {
    const body = { contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }
    const { body: safe } = sanitizeOutboundBody(body, { name: 'X', mrn: '1234567' })
    expect(safe.contents).toHaveLength(1)
  })

  it('tolerates malformed bodies', () => {
    expect(() => sanitizeOutboundBody({})).not.toThrow()
    expect(sanitizeOutboundBody({}).body.contents).toEqual([])
    expect(() => sanitizeOutboundBody({ contents: [{ role: 'user' }] })).not.toThrow()
  })

  it('a realistic full payload carries no identifier-shaped content', () => {
    const body = {
      systemInstruction: { parts: [{ text: 'static handout' }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Hi, my name is Synthetic Testpatient, MRN 00123456, DOB 1954-03-02. ' +
                'Reach me at nobody@example.invalid or 555-867-5309, ' +
                'I live at 123 Elm Street. My biopsy was 03/14/2023. ' +
                'Is active surveillance still right for me?',
            },
          ],
        },
      ],
    }

    const { body: safe } = sanitizeOutboundBody(body, {
      ggg: 2,
      psa: 6.4,
      age: 94,
      mrn: '00123456',
    })
    const json = JSON.stringify(safe.contents)

    // No identifier-shaped content survives.
    expect(json).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/)          // SSN
    expect(json).not.toMatch(/\b\d{3}[-.]\d{3}[-.]\d{4}\b/)    // phone
    expect(json).not.toMatch(/@example\.invalid/)              // email
    expect(json).not.toMatch(/\b\d{6,}\b/)                     // long digit runs / MRN
    expect(json).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/)          // ISO date
    expect(json).not.toMatch(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/)    // US date
    expect(json).not.toContain('Elm Street')
    expect(json).not.toContain('94')                           // exact age > cap

    // The clinical question and allowlisted values still get through.
    expect(json).toContain('active surveillance')
    expect(safe.contents[0].parts[0].text).toContain('"ggg":2')
    expect(safe.contents[0].parts[0].text).toContain('"age":"90+"')
  })

  it('DOCUMENTED LIMITATION: a bare name in free text is NOT caught', () => {
    // This asserts the known gap so it is visible rather than assumed solved.
    // Only a BAA-covered endpoint makes this path safe for real PHI.
    const body = {
      contents: [
        { role: 'user', parts: [{ text: 'Synthetic Testpatient here, my PSA is 6.' }] },
      ],
    }
    const { body: safe } = sanitizeOutboundBody(body)
    expect(JSON.stringify(safe.contents)).toContain('Synthetic Testpatient')
  })
})

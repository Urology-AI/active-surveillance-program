# Tewari Active Surveillance Program

A clinical decision support tool for guiding clinicians through the Tewari Active Surveillance (AS) protocol after a positive prostate biopsy. Built as a step-by-step wizard that covers all three phases of the pathway — from initial risk stratification through enrollment and ongoing monitoring.

## Features

- **3-Part Clinical Pathway**: Covers Initial Risk Stratification, Pre-Enrollment Verification, and Standard AS Protocol
- **Sticky Header Navigation**: Mount Sinai branding with color-coded part badge and live step breadcrumb
- **Interactive Flow Map**: Visual flowchart showing current position and path taken through the decision tree
- **Progress Tracking**: Gradient progress bar with step label and back/forward navigation
- **Step-Card Animations**: Smooth fade-and-slide transitions between steps
- **Copy & Export**: Copy path summary to clipboard or export as PDF from any end state
- **Responsive Design**: Optimized for desktop clinic use and mobile review

## Clinical Pathway

### Part 1 — Initial Risk Stratification (Steps 1–5)

Triggered by a first positive prostate biopsy.

| Step | Screen | Decision |
|------|--------|----------|
| 1 | Patient Intent / SDM | Does patient agree to further testing? |
| 2 | Gleason Score | Gleason 6, 7 (3+4), or 7 (4+3)+? |
| 3 | Risk Stratification | Favorable vs. unfavorable intermediate risk (Gleason 7 3+4 only) |
| 4 | Medical History | Any disqualifying high-risk history? |
| 5 | SDM on Active Surveillance | Shared decision-making discussion |

**End States:**
- **AS Initiated** → continues to Part 2
- **Definitive Treatment** — patient does not meet AS criteria
- **Refuse / Defer** — patient declines further workup; return visit in 3–6 months

---

### Part 2 — Pre-Enrollment Verification (Steps 6–9)

Confirms eligibility and completes workup before formal AS enrollment.

| Step | Screen | Decision |
|------|--------|----------|
| 6 | Life Expectancy | > 10 years? (Lee-Schonberg calculator) |
| 7 | Provider Actions | Order confirmatory Bx + genomics (Decipher, ExoDx, OncoDx, SelectMDx, BRCA) |
| 8 | TR Confirmatory Biopsy | Negative / Gleason 6, or Gleason 7 (3+4)? |
| 9 | Concerning Features | Any concerning features present? |

**End States:**
- **Enrolled in AS** → continues to Part 3
- **High Intensity AS Protocol** — concerning features present; biopsy q1–2 years; consider Poly-ICLC trial
- **Watchful Waiting** — life expectancy ≤ 10 years
- **Definitive Treatment** — confirmatory Bx shows Gleason 7 (3+4)

---

### Part 3 — Standard AS Protocol (Steps 10–14)

Ongoing monitoring for patients formally enrolled in active surveillance.

| Step | Screen | Decision |
|------|--------|----------|
| 10 | Uroflow + PVR Check | Baseline uroflowmetry and post-void residual |
| 11 | Initiate AS Protocol | Quarterly PSA + office visit; annual MRI, MUS (ExactVu), DRE |
| 12 | PSMA Assessment (No MRI) | PSMA PET/CT if MRI not available |
| 13 | New Positive Findings | Any new concerning findings on monitoring? |
| 14 | Early Biopsy Results | Results of surveillance biopsy |

**End States:**
- **Continue on AS** — patient remains on monitoring protocol (Q PSA, A MRI/DRE, B biopsy + genomics)
- **Definitive Treatment** — reclassification triggers treatment

---

## Tech Stack

- React 18 (no JSX — uses `React.createElement` throughout)
- Vite
- Tailwind CSS (Mount Sinai palette: cerulean `#06ABEB`, navy `#212070`, cetacean `#00002D`, magenta `#DC298D`)
- Lucide React (icons)

## Development

```bash
# Install dependencies
npm install

# Optional: set access password via env (defaults to dev password if unset)
cp .env.example .env
# Edit .env and set VITE_APP_PASSWORD

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `master` branch.

## License

MIT

# Prostate Cancer Clinical Pathway

A clinical decision support tool for determining next steps after a positive prostate biopsy. This React application provides a step-by-step wizard interface that guides clinicians through the logic flow to determine patient treatment pathways.

## Features

- **Interactive Wizard Interface**: Step-by-step guidance through the clinical decision process
- **Visual Flow Map**: Interactive flow chart showing current position and path taken
- **Progress Tracking**: Visual progress bar and step history
- **Responsive Design**: Works on desktop and mobile devices
- **Professional Medical UI**: Clean, medical-grade interface with Tailwind CSS

## Workflow Steps

### Path 1: Initial Assessment & Active Surveillance Initiation

1. **Start Screen**: Initial assessment trigger
2. **Step 1: Patient Intent**: Determine if patient agrees to further testing
3. **Step 2: Gleason Score**: Select biopsy Gleason score
4. **Step 3: Risk Stratification**: Evaluate intermediate risk factors (for Gleason 7 3+4)
5. **Step 4: Medical History**: Check for disqualifying high-risk medical history
6. **End States**: 
   - Active Surveillance Initiation
   - Definitive Treatment Recommendation
   - Patient Refuses/Defers

### Path 2: Pre-Enrollment Verification (Phase 2)

After Active Surveillance Initiation, proceed to Pre-Enrollment Verification:

1. **Life Expectancy Assessment**: Evaluate if patient life expectancy >10 years (using Lee-Schonberg tool)
   - **No (≤10 years)**: Proceed to Watchful Waiting discussion
   - **Yes (>10 years)**: Continue to genomic testing and confirmatory biopsy planning

2. **Genomic Testing & Confirmatory Biopsy Plan**: 
   - Schedule confirmatory biopsy in 3-6 months
   - Order genomic testing (Decipher, ExoDx, OncoDx, Selec MDx, or BRCA if indicated)

3. **Confirmatory Biopsy Result**:
   - **Gleason 7 (3+4)**: Proceed to Definitive Treatment
   - **Negative or Gleason 6 (3+3)**: Continue to concerning features check

4. **Concerning Features Check**:
   - **Yes**: Discuss high-intensity AS protocol (biopsy q1-2 years, optional Poly-ICLC enrollment)
   - **No**: Enroll in standard AS protocol

5. **End States**:
   - **Enroll AS Protocol**: Patient enrolled with education materials sent and documented
   - **Watchful Waiting**: Patient life expectancy ≤10 years, discuss and document
   - **Definitive Treatment**: (reused from Path 1)

## Tech Stack

- React 18
- Vite
- Tailwind CSS
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

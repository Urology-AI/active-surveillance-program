# Prostate Cancer Clinical Pathway

A clinical decision support tool for determining next steps after a positive prostate biopsy. This React application provides a step-by-step wizard interface that guides clinicians through the logic flow to determine patient treatment pathways.

## Features

- **Interactive Wizard Interface**: Step-by-step guidance through the clinical decision process
- **Visual Flow Map**: Interactive flow chart showing current position and path taken
- **Progress Tracking**: Visual progress bar and step history
- **Responsive Design**: Works on desktop and mobile devices
- **Professional Medical UI**: Clean, medical-grade interface with Tailwind CSS

## Workflow Steps

1. **Start Screen**: Initial assessment trigger
2. **Step 1: Patient Intent**: Determine if patient agrees to further testing
3. **Step 2: Gleason Score**: Select biopsy Gleason score
4. **Step 3: Risk Stratification**: Evaluate intermediate risk factors (for Gleason 7 3+4)
5. **Step 4: Medical History**: Check for disqualifying high-risk medical history
6. **End States**: 
   - Active Surveillance Initiation
   - Definitive Treatment Recommendation
   - Patient Refuses/Defers

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

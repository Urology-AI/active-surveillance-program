/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mount Sinai brand palette
        sinai: {
          cerulean: '#06ABEB',      // Primary - Vivid Cerulean
          'cerulean-dark': '#0596c7',
          navy: '#212070',          // St. Patrick's Blue
          'navy-dark': '#1a1a5e',
          cetacean: '#00002D',      // Dark navy
          magenta: '#DC298D',       // Barbie Pink / accent
          'magenta-light': '#f5e0ed',
        },
        primary: {
          blue: '#06ABEB',          // Alias for sinai cerulean
        },
        soft: {
          pink: '#f5e0ed',         // Light tint from Mount Sinai magenta
        },
      },
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sinai': '0 4px 14px 0 rgba(6, 171, 235, 0.15)',
        'sinai-lg': '0 10px 40px -10px rgba(33, 32, 112, 0.2)',
      },
      backgroundImage: {
        'sinai-page': 'linear-gradient(180deg, #eef6fb 0%, #f8fafc 45%, #f1f5f9 100%)',
      },
    },
  },
  plugins: [],
}

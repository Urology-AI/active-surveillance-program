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
          cerulean: '#0288d1',      // Primary - Vivid Cerulean
          'cerulean-dark': '#0277bd',
          navy: '#221f72',          // St. Patrick's Blue
          'navy-dark': '#17134f',
          cetacean: '#00002D',      // Dark navy
          magenta: '#d31f7a',       // Barbie Pink / accent
          'magenta-light': '#f5e0ed',
        },
        primary: {
          blue: '#0288d1',          // Alias for sinai cerulean
        },
        soft: {
          pink: '#f5e0ed',         // Light tint from Mount Sinai magenta
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'sinai': '0 4px 14px 0 rgba(2,136,209, 0.15)',
        'sinai-lg': '0 10px 40px -10px rgba(33, 32, 112, 0.2)',
      },
      backgroundImage: {
        'sinai-page': 'linear-gradient(#f4f4f8, #f4f4f8)',
      },
    },
  },
  plugins: [],
}

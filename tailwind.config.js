/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#3b82f6',
        },
        soft: {
          pink: '#e9d5ff',
        },
      },
    },
  },
  plugins: [],
}

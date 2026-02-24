/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1e1e20',
        card: '#2b2b30',
        cardHover: '#3a3a40',
        border: '#48484a',
        primary: '#5E6AD2',
        primaryHover: '#4b5ac7',
        high: '#EF4444',
        medium: '#EAB308',
        low: '#22C55E',
      },
    },
  },
  plugins: [],
}

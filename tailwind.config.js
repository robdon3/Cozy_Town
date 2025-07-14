/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'border-3': '3px',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
} 
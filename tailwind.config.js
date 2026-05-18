/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f4ef',
        surface: '#ffffff',
        surface2: '#f0efe9',
        border: '#e2e0d6',
        textMain: '#1a1916',
        text2: '#6b6960',
        text3: '#a09e96',
        income: '#1a6b4a',
        incomeBg: '#e8f5ee',
        expense: '#b93030',
        expenseBg: '#fbeaea',
        accent: '#c17b2a',
        blueCustom: '#2456a4',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"DM Serif Display"', 'serif'],
      }
    },
  },
  plugins: [],
}

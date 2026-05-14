/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          customPurple: 'var(--color-primary)',
          customPurpleDark: '#b8a2c7',
          customPurpleText: 'var(--color-text)',
          customBackground: 'var(--color-background)',
          customGrayText: '#636262',
        },
        fontFamily: {
          'cambria': ['Cambria', 'serif'],
        }
      },
    },
    plugins: [],
  }
/** @type {import('tailwindcss') .Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // CSS-variable-backed theme colours — updated at runtime by ThemeContext
        theme: {
          primary:    'var(--theme-primary)',
          secondary:  'var(--theme-secondary)',
          accent:     'var(--theme-accent)',
          bg:         'var(--theme-background)',
        },
        // Static orange scale kept for places that should never change
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
}

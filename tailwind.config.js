/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gc: {
          navy: '#03045E',
          blue: '#0077B6',
          cyan: '#00B4D8',
          light: '#90E0EF',
          soft: '#CAF0F8',
          white: '#FFFFFF',
          near: '#F8FAFC',
          slate: '#334155',
          muted: '#64748B',
          border: '#E2E8F0',
          surface: '#F1F5F9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'gc': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'gc-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'gc-lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        'gc-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
        'gc-glass': '0 8px 32px rgb(3 4 94 / 0.12)',
      },
      borderRadius: {
        'gc': '0.5rem',
        'gc-lg': '0.75rem',
        'gc-xl': '1rem',
      },
      animation: {
        'gc-pulse': 'gc-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gc-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f8fafc',
        surface: '#ffffff',
        line: '#e2e8f0',
        brand: '#2563eb',
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
        text: '#0f172a',
        muted: '#475569',
      },
      borderRadius: {
        md: '0.5rem',
        lg: '0.75rem',
      },
      boxShadow: {
        soft: '0 6px 20px rgba(15, 23, 42, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

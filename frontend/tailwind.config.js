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
          50: '#E8F4FF',
          100: '#D1E9FF',
          200: '#A3D3FF',
          300: '#75BDFF',
          400: '#4A90E2',
          500: '#3A7BC8',
          600: '#2D5FA0',
          700: '#1F4478',
          800: '#132950',
          900: '#0A1628',
        },
        success: {
          50: '#E8FBF3',
          100: '#D1F7E7',
          200: '#A3EFCF',
          300: '#75E7B7',
          400: '#5FD3A6',
          500: '#4AB88E',
          600: '#3A9D76',
          700: '#2A825E',
          800: '#1A6746',
          900: '#0A4C2E',
        },
        neutral: {
          50: '#FFFFFF',
          100: '#F8F9FA',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#868E96',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
        text: {
          primary: '#2C3E50',
          secondary: '#5A6C7D',
          tertiary: '#95A5A6',
        },
        warning: {
          50: '#FFF8E1',
          100: '#FFECB3',
          400: '#FFC107',
          600: '#FFA000',
        },
        error: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          400: '#EF5350',
          600: '#E53935',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'md': '0 4px 12px 0 rgba(0, 0, 0, 0.10)',
        'lg': '0 8px 16px 0 rgba(0, 0, 0, 0.12)',
        'xl': '0 12px 24px 0 rgba(0, 0, 0, 0.14)',
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
      },
    },
  },
  plugins: [],
}

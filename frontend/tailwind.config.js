/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary - Azul Profundo
        primary: {
          50: '#F0F4FF',
          100: '#E2EAFF',
          200: '#C5D5FF',
          300: '#A8BFFF',
          400: '#8BA9FF',
          500: '#6E93FF',
          600: '#5573E8',
          700: '#3D52D6',
          800: '#2632C4',
          900: '#1B3B9C',
          950: '#0F2366',
        },
        // Secondary - Laranja Vibrante
        secondary: {
          50: '#FFF8F1',
          100: '#FFE8D8',
          200: '#FFD1B0',
          300: '#FFBA88',
          400: '#FFA360',
          500: '#FF8C38',
          600: '#FF7A1F',
          700: '#FF6B35',
          800: '#E65A2B',
          900: '#CC4921',
          950: '#8B2E0F',
        },
        // Neutrals - Escala de Cinzas
        neutral: {
          0: '#FFFFFF',
          25: '#FAFAFA',
          50: '#F5F5F5',
          100: '#EEEEEE',
          150: '#E8E8E8',
          200: '#E0E0E0',
          300: '#D0D0D0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
          950: '#121212',
        },
        // Semantic Colors
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#0EA5E9',
        // FastLead Brand Identity
        ink: '#0B1D3A',       // Navy profundo (canvas / brand mark bg)
        graphite: '#12294D',  // Surface elevada
        brand: '#2563FF',     // Azul elétrico (LEAD / primário)
        aqua: '#00B4D8',      // Ciano
        mint: '#00C98A',      // Verde (glow / sucesso)
        offwhite: '#F2F4F7',  // Texto claro
      },
      typography: {
        // Heading 1
        'heading-xl': {
          fontSize: '3rem',
          lineHeight: '3.5rem',
          fontWeight: '700',
          letterSpacing: '-0.02em',
        },
        // Heading 2
        'heading-lg': {
          fontSize: '2.25rem',
          lineHeight: '2.75rem',
          fontWeight: '700',
          letterSpacing: '-0.02em',
        },
        // Heading 3
        'heading-md': {
          fontSize: '1.875rem',
          lineHeight: '2.25rem',
          fontWeight: '700',
          letterSpacing: '-0.01em',
        },
        // Heading 4
        'heading-sm': {
          fontSize: '1.5rem',
          lineHeight: '1.875rem',
          fontWeight: '600',
          letterSpacing: '-0.01em',
        },
        // Heading 5
        'heading-xs': {
          fontSize: '1.25rem',
          lineHeight: '1.5rem',
          fontWeight: '600',
          letterSpacing: '0em',
        },
        // Body Large
        'body-lg': {
          fontSize: '1.125rem',
          lineHeight: '1.625rem',
          fontWeight: '400',
          letterSpacing: '0em',
        },
        // Body Regular
        'body-md': {
          fontSize: '1rem',
          lineHeight: '1.5rem',
          fontWeight: '400',
          letterSpacing: '0em',
        },
        // Body Small
        'body-sm': {
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          fontWeight: '400',
          letterSpacing: '0.25px',
        },
        // Body Extra Small
        'body-xs': {
          fontSize: '0.75rem',
          lineHeight: '1rem',
          fontWeight: '400',
          letterSpacing: '0.5px',
        },
      },
      boxShadow: {
        // Elevation 1
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        // Elevation 2
        'elevation-2': '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
        // Elevation 3
        'elevation-3': '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
        // Elevation 4
        'elevation-4': '0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05)',
        // Focus
        focus: '0 0 0 3px rgba(110, 147, 255, 0.5)',
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        grotesk: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

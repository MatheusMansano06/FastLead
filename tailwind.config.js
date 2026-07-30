/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Premium Color Palette
      colors: {
        // Primary: Deep Blue (Trust, Premium, Professional)
        primary: {
          50: '#F0F4FF',
          100: '#E2EAFF',
          200: '#C5D5FF',
          300: '#A8BFFF',
          400: '#8BA9FF',
          500: '#6E93FF',
          600: '#5573E8', // Main primary
          700: '#3D52D6',
          800: '#2632C4',
          900: '#1B3B9C', // Deep primary (dashboard bg, headers)
          950: '#0F2366',
        },

        // Secondary: Vibrant Orange (Action, Highlight, Energy)
        secondary: {
          50: '#FFF8F1',
          100: '#FFE8D8',
          200: '#FFD1B0',
          300: '#FFBA88',
          400: '#FFA360',
          500: '#FF8C38',
          600: '#FF7A1F', // Main secondary
          700: '#FF6B35', // Vibrant secondary (CTAs, highlights)
          800: '#E65A2B',
          900: '#CC4921',
          950: '#8B2E0F',
        },

        // Neutral: Professional Grays
        neutral: {
          50: '#FAFAFA',
          100: '#F4F4F7',
          200: '#E9E9EF',
          300: '#D9D9E3',
          400: '#ACACC1',
          500: '#7C7C8F',
          600: '#64647E',
          700: '#464655',
          800: '#2A2A33',
          900: '#1A1A1F',
          950: '#0F0F12',
        },

        // Status Colors
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#145231',
        },

        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },

        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        info: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },

        // Dark Mode Colors
        dark: {
          bg: '#0F0F12',
          'bg-secondary': '#1A1A1F',
          'bg-tertiary': '#2A2A33',
          border: '#464655',
          text: '#FAFAFA',
          'text-secondary': '#ACACC1',
        },
      },

      // Premium Typography
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },

      fontSize: {
        // Display
        'display-xl': ['3.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],

        // Heading
        'heading-xl': ['2rem', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.75rem', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.005em' }],
        'heading-md': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-xs': ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }],

        // Body
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],

        // Special
        'label': ['0.875rem', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.005em' }],
        'caption': ['0.75rem', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.01em' }],
      },

      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },

      // Premium Spacing
      spacing: {
        0: '0px',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
      },

      // Premium Shadows & Elevations
      boxShadow: {
        none: 'none',

        // Level 1: Subtle (components, cards)
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'elevation-1-hover': '0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',

        // Level 2: Medium (elevated components, dropdowns)
        'elevation-2': '0 8px 16px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
        'elevation-2-hover': '0 12px 24px rgba(0, 0, 0, 0.16), 0 6px 12px rgba(0, 0, 0, 0.1)',

        // Level 3: Strong (modals, popovers, sticky elements)
        'elevation-3': '0 16px 32px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.1)',
        'elevation-3-hover': '0 24px 48px rgba(0, 0, 0, 0.20), 0 12px 24px rgba(0, 0, 0, 0.12)',

        // Focus shadow
        'focus': '0 0 0 3px rgba(110, 147, 255, 0.1), 0 0 0 5px rgba(110, 147, 255, 0.3)',

        // Default Tailwind
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },

      // Premium Border Radius
      borderRadius: {
        none: '0px',
        'xs': '4px',    // Small interactive elements
        'sm': '6px',    // Buttons, small cards
        'md': '8px',    // Components, inputs
        'lg': '12px',   // Large cards, modals
        'xl': '16px',   // Prominent components
        '2xl': '20px',  // Large containers
        '3xl': '24px',  // Sections, hero
        'full': '9999px', // Avatars, badges
      },

      // Premium Transitions
      transitionDuration: {
        0: '0ms',
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },

      transitionTimingFunction: {
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // Premium Animation
      animation: {
        'fade-in': 'fadeIn 300ms ease-in forwards',
        'fade-out': 'fadeOut 300ms ease-out forwards',
        'slide-in-top': 'slideInTop 300ms ease-out forwards',
        'slide-in-bottom': 'slideInBottom 300ms ease-out forwards',
        'slide-in-left': 'slideInLeft 300ms ease-out forwards',
        'slide-in-right': 'slideInRight 300ms ease-out forwards',
        'scale-in': 'scaleIn 300ms ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInTop: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInBottom: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },

      // Gradient Backgrounds
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1B3B9C 0%, #3D52D6 100%)',
        'gradient-primary-light': 'linear-gradient(135deg, #6E93FF 0%, #8BA9FF 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #FF7A1F 0%, #FF8C38 100%)',
        'gradient-secondary-light': 'linear-gradient(135deg, #FFA360 0%, #FFBA88 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FF6B35 0%, #FFB347 100%)',
        'gradient-cool': 'linear-gradient(135deg, #1B3B9C 0%, #64B5F6 100%)',
        'gradient-success': 'linear-gradient(135deg, #15803D 0%, #22C55E 100%)',
        'gradient-error': 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)',
        'gradient-overlay': 'linear-gradient(180deg, rgba(27, 59, 156, 0.8) 0%, rgba(27, 59, 156, 0.4) 100%)',
      },

      // Z-index scale
      zIndex: {
        hide: '-1',
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        auto: 'auto',
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        'modal-backdrop': '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
      },

      // Premium opacity
      opacity: {
        0: '0',
        5: '0.05',
        10: '0.1',
        20: '0.2',
        25: '0.25',
        30: '0.3',
        40: '0.4',
        50: '0.5',
        60: '0.6',
        70: '0.7',
        75: '0.75',
        80: '0.8',
        90: '0.9',
        95: '0.95',
        100: '1',
      },

      // Backdrop blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },

      // Container
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '2rem',
          '2xl': '3rem',
        },
      },

      // Width & Height
      width: {
        full: '100%',
        screen: '100vw',
      },
      height: {
        screen: '100vh',
      },

      // Min/Max
      minHeight: {
        screen: '100vh',
      },

      maxWidth: {
        'xs': '20rem',
        'sm': '24rem',
        'md': '28rem',
        'lg': '32rem',
        'xl': '36rem',
        '2xl': '42rem',
        '3xl': '48rem',
        '4xl': '56rem',
        '5xl': '64rem',
        '6xl': '72rem',
        '7xl': '80rem',
      },
    },
  },

  plugins: [
    // Custom Plugin: Text truncation utilities
    function ({ addUtilities }) {
      const truncateUtilities = {
        '.truncate-2': {
          display: '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
        '.truncate-3': {
          display: '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
        '.truncate-4': {
          display: '-webkit-box',
          '-webkit-line-clamp': '4',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
      };
      addUtilities(truncateUtilities);
    },

    // Custom Plugin: Custom focus-visible
    function ({ addUtilities }) {
      const focusUtilities = {
        '.focus-ring': {
          '@apply outline-none ring-2 ring-offset-2 ring-primary-500': {},
        },
        '.focus-ring-offset-0': {
          '@apply outline-none ring-2 ring-offset-0 ring-primary-500': {},
        },
      };
      addUtilities(focusUtilities);
    },
  ],
};

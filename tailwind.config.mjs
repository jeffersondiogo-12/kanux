export default {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './public/**/*.html'
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px'
      },
      colors: {
        // HSL variables (dark theme with emerald)
        background: '#0f172a',
        foreground: '#e2e8f0',
        card: '#1e293b',
        'card-foreground': '#e2e8f0',
        primary: {
          DEFAULT: '#10B981',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#334155',
          foreground: '#e2e8f0',
        },
        accent: {
          DEFAULT: '#10B981',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#1e293b',
          foreground: '#94a3b8',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#334155',
        input: '#334155',
        ring: '#10B981',
        // Brand colors - Emerald
        brand: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#D1FAE5'
        },
        dark: {
          DEFAULT: '#161f2c',
          lighter: '#1e293b'
        },
        surface: '#0f172a',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'floating': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop': { '0%': { transform: 'scale(.98)' }, '100%': { transform: 'scale(1)' } }
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'pop': 'pop .15s ease-out'
      }
    }
  }
};


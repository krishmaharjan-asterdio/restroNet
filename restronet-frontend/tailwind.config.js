/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: '#fa6500',
          foreground: "hsl(var(--primary-foreground))",
          hover: '#e05800',
          light: '#fff3eb',
          glow: 'rgba(250,101,0,0.15)',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        warm: {
          50: '#fafaf9',
          100: '#f5f3f0',
          200: '#ede9e4',
          300: '#e0dbd4',
          400: '#c8c1b8',
          500: '#a8a096',
          600: '#78746e',
          700: '#5c5752',
          800: '#3a3632',
          900: '#1a1814',
        },
        admin: {
          bg: '#080d1a',
          surface: '#0f1629',
          card: '#131e35',
          border: '#1e2d47',
          text: '#8b98b0',
          accent: '#fa6500',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(26,24,20,0.06)',
        'card-hover': '0 8px 32px rgba(26,24,20,0.10)',
        'card-dark': '0 2px 20px rgba(0,0,0,0.35)',
        'card-dark-hover': '0 8px 48px rgba(0,0,0,0.5)',
        'primary': '0 8px 24px rgba(250,101,0,0.22)',
        'primary-lg': '0 16px 48px rgba(250,101,0,0.28)',
        'primary-sm': '0 4px 14px rgba(250,101,0,0.18)',
        'float': '0 20px 60px rgba(26,24,20,0.12)',
        'admin': '4px 0 32px rgba(0,0,0,0.25)',
        'glow-orange': '0 0 60px rgba(250,101,0,0.12)',
        'glass': '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'slide-right': 'slideRight 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'marquee': 'marquee 38s linear infinite',
        'marquee-slow': 'marquee 60s linear infinite',
        'ticker-up': 'tickerUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-14px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        tickerUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer-light': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'shimmer-dark': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        'mesh-light': 'radial-gradient(at 40% 20%, rgba(250,101,0,0.06) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(251,146,60,0.04) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(250,101,0,0.03) 0px, transparent 50%)',
        'mesh-dark': 'radial-gradient(at 40% 20%, rgba(250,101,0,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(251,146,60,0.05) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}

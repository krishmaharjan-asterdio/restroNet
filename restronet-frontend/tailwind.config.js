/** @type {import('tailwindcss').Config} */
export default {
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
        primary: {
          DEFAULT: '#fa6500',
          foreground: "hsl(var(--primary-foreground))",
          hover: '#e05800',
          light: '#fff3eb',
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
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          text: '#94a3b8',
          hover: '#1e293b',
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
      },
      boxShadow: {
        'card': '0 2px 12px rgba(26,24,20,0.06)',
        'card-hover': '0 8px 32px rgba(26,24,20,0.10)',
        'primary': '0 8px 24px rgba(250,101,0,0.22)',
        'primary-lg': '0 16px 48px rgba(250,101,0,0.28)',
        'float': '0 20px 60px rgba(26,24,20,0.12)',
        'admin': '4px 0 24px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
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
      },
    },
  },
  plugins: [],
}
/* Triggered HMR reload updated */

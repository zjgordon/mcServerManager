/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui color system
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Minecraft-inspired color palette
        minecraft: {
          green: '#7CB342',
          darkGreen: '#558B2F',
          brown: '#8D6E63',
          darkBrown: '#5D4037',
          stone: '#9E9E9E',
          darkStone: '#616161',
          red: '#F44336',
          darkRed: '#D32F2F',
          blue: '#2196F3',
          darkBlue: '#1976D2',
          yellow: '#FFEB3B',
          darkYellow: '#FBC02D',
        },
        // Custom brand colors
        brand: {
          primary: '#3B82F6',
          secondary: '#6366F1',
          accent: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
          info: '#3B82F6',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        minecraft: "0.25rem",
        "minecraft-lg": "0.5rem",
      },
      fontFamily: {
        'minecraft': ['Minecraft', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      boxShadow: {
        'minecraft': '0 4px 0 0 rgba(0, 0, 0, 0.3)',
        'minecraft-lg': '0 8px 0 0 rgba(0, 0, 0, 0.3)',
        'minecraft-xl': '0 12px 0 0 rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}

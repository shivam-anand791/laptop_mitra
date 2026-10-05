/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        /* ── Legacy aliases (referenced by globals.css @theme) ── */
        background: "var(--background)",
        foreground: "var(--foreground)",

        /* ── LaptopMitra Primary Palette ── */
        "lm-blue": {
          DEFAULT: "#1D6FF2",
          hover: "#1558C0",
          light: "#EBF2FF",
          50: "#F0F5FF",
          100: "#E1ECFE",
          200: "#C2D9FD",
          500: "#1D6FF2",
          600: "#1558C0",
          700: "#0E3E8C",
        },
        "lm-navy": {
          DEFAULT: "#0B1F4B",
          500: "#1C4294",
          600: "#132E6B",
          700: "#0F265C",
          800: "#0B1F4B",
          900: "#071433",
          950: "#040B1D",
        },
        "lm-page": "#F5F7FA",
        "lm-card": "#FFFFFF",
        "lm-border": "#E4E9F2",
        "lm-green": {
          DEFAULT: "#16A34A",
          stock: "#16A34A",
          bg: "#DCFCE7",
        },
        "lm-orange": {
          DEFAULT: "#F97316",
          badge: "#F97316",
          bg: "#FFF7ED",
        },

        /* ── Semantic palette ── */
        primary: "#1D6FF2",
        "primary-dim": "#1558C0",
        secondary: "#64748B",
        success: "#16A34A",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#3B82F6",

        /* ── Custom navy scale (backward compat) ── */
        navy: {
          900: "#0B1F4B",
          950: "#071433",
        },

        /* ── Custom mint scale (backward compat) ── */
        mint: {
          400: "#34D399",
          500: "#00E5A0",
          600: "#00C48C",
        },
      },

      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },

      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
      },

      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
        md: "0 4px 12px rgba(0, 0, 0, 0.25)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.3)",
        xl: "0 16px 48px rgba(0, 0, 0, 0.35)",
        glow: "0 0 20px rgba(0, 229, 160, 0.15)",
        "card-hover": "0 8px 32px rgba(0, 229, 160, 0.08)",
      },

      animation: {
        "badge-pulse": "badge-pulse 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-in-right": "slide-in-right 400ms cubic-bezier(0, 0, 0.2, 1) forwards",
        "slide-out-right": "slide-out-right 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in-up": "fade-in-up 400ms cubic-bezier(0, 0, 0.2, 1) forwards",
        "check-bounce": "check-bounce 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },

      keyframes: {
        "badge-pulse": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)", opacity: "1" },
          to: { transform: "translateX(100%)", opacity: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "check-bounce": {
          "0%": { transform: "scale(0)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

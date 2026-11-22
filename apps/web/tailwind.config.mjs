/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "selector",
  theme: {
    extend: {
      colors: {
        /* ── Legacy aliases (referenced by globals.css @theme) ── */
        background: "var(--background)",
        foreground: "var(--foreground)",

        /* ── LaptopMitra Primary Palette ── */
        "lm-blue": {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          active: "#1E40AF",
          light: "#EFF6FF",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
        },
        "lm-navy": {
          DEFAULT: "#0B1F4B",
          hover: "#071433",
          light: "#132E6B",
          500: "#1C4294",
          600: "#132E6B",
          700: "#0F265C",
          800: "#0B1F4B",
          900: "#071433",
          950: "#040B1D",
        },

        /* ── Canvas, Surfaces & Borders (Cream & Off-White Identity) ── */
        "lm-page": "#F7F4EE",
        "lm-card": "#FFFDF9",
        "lm-cream": "#F7F4EE",
        "lm-ivory": "#FFFDF9",
        "lm-surface-elevated": "#FAF6EF",
        "lm-surface-subtle": "#F2ECE2",
        "lm-border": "#E6DFD5",
        "lm-border-subtle": "#F0EAE1",
        "lm-pure-white": "#FFFFFF",

        "lm-green": {
          DEFAULT: "#16A34A",
          stock: "#16A34A",
          bg: "#F0FDF4",
        },
        "lm-orange": {
          DEFAULT: "#D97706",
          badge: "#D97706",
          bg: "#FFFBEB",
        },

        /* ── Semantic palette ── */
        primary: "#2563EB",
        "primary-dim": "#1D4ED8",
        secondary: "#64748B",
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#D97706",
        info: "#2563EB",

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
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },

      boxShadow: {
        xs: "0 1px 2px rgba(11, 31, 75, 0.04)",
        sm: "0 1px 3px rgba(11, 31, 75, 0.05), 0 1px 2px rgba(11, 31, 75, 0.03)",
        md: "0 4px 12px rgba(11, 31, 75, 0.06), 0 2px 4px rgba(11, 31, 75, 0.03)",
        lg: "0 8px 24px rgba(11, 31, 75, 0.08), 0 4px 6px rgba(11, 31, 75, 0.04)",
        xl: "0 16px 40px rgba(11, 31, 75, 0.1), 0 8px 16px rgba(11, 31, 75, 0.04)",
        card: "0 1px 3px rgba(11, 31, 75, 0.04), 0 1px 2px rgba(11, 31, 75, 0.02)",
        "card-hover": "0 10px 25px -5px rgba(11, 31, 75, 0.08), 0 8px 10px -6px rgba(11, 31, 75, 0.04)",
        glow: "0 0 20px rgba(37, 99, 235, 0.12)",
      },

      transitionDuration: {
        micro: "120ms",
        hover: "180ms",
        dropdown: "220ms",
        modal: "250ms",
        reveal: "500ms",
        hero: "750ms",
      },

      transitionTimingFunction: {
        brand: "cubic-bezier(0.16, 1, 0.3, 1)",
        enter: "cubic-bezier(0.16, 1, 0.3, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      animation: {
        "badge-pulse": "badge-pulse 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-in-right": "slide-in-right 400ms cubic-bezier(0, 0, 0.2, 1) forwards",
        "slide-out-right": "slide-out-right 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in-up": "fade-in-up 400ms cubic-bezier(0, 0, 0.2, 1) forwards",
        "check-bounce": "check-bounce 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        shimmer: "shimmer 1.5s ease-in-out infinite",

        /* ── Standardized Motion Animations ── */
        "fade-in": "fade-in 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-up": "fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in": "slide-in 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "modal-in": "modal-in 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "hero-entrance": "hero-entrance 750ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "accordion-down": "accordion-down 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "accordion-up": "accordion-up 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
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

        /* ── Standardized Motion Keyframes ── */
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translate3d(0, -10px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.96) translate3d(0, 10px, 0)" },
          to: { opacity: "1", transform: "scale(1) translate3d(0, 0, 0)" },
        },
        "hero-entrance": {
          from: { opacity: "0", transform: "translate3d(0, 24px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height, auto)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height, auto)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

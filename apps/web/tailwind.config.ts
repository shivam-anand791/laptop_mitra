import type { Config } from "tailwindcss";

export default {
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

        /* ── Semantic palette ── */
        primary: "#00E5A0",
        "primary-dim": "#00C48C",
        secondary: "#64748B",
        success: "#00E5A0",
        danger: "#F87171",
        warning: "#FBBF24",
        info: "#38BDF8",

        /* ── Custom navy scale ── */
        navy: {
          900: "#1A2332",
          950: "#0B1120",
        },

        /* ── Custom mint scale ── */
        mint: {
          400: "#34D399",
          500: "#00E5A0",
          600: "#00C48C",
        },
      },

      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-space-grotesk)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
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
} satisfies Config;

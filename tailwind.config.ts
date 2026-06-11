import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // BUG-005: Noto Sans families are included in the fallback chain so that
        // when data-locale is set on <html> and the dynamic font <link> has loaded,
        // Indic script glyphs are resolved before the generic sans-serif fallback.
        // The CSS cascade rules in globals.css take precedence and swap the
        // primary family; these entries act as a safety net for any elements
        // that receive font-body/font-display as inline Tailwind utility classes.
        display: [
          "var(--font-cormorant)",
          "Noto Sans Devanagari",
          "Noto Sans Telugu",
          "Noto Sans Tamil",
          "Noto Sans Kannada",
          "Noto Sans Malayalam",
          "serif",
        ],
        body: [
          "var(--font-dm-sans)",
          "Noto Sans Devanagari",
          "Noto Sans Telugu",
          "Noto Sans Tamil",
          "Noto Sans Kannada",
          "Noto Sans Malayalam",
          "sans-serif",
        ],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        cream: {
          50: "#fdfcf8",
          100: "#faf7f0",
          200: "#f5ede0",
          300: "#ede0cc",
          400: "#e0cdb3",
        },
        sand: {
          100: "#f7f0e6",
          200: "#eedfc8",
          300: "#e3caaa",
          400: "#d4b08c",
          500: "#c49572",
        },
        sage: {
          100: "#eef2ee",
          200: "#d4e0d4",
          300: "#a8c3a8",
          400: "#7aa67a",
          500: "#4e894e",
        },
        blush: {
          100: "#fdf0ef",
          200: "#f8d8d5",
          300: "#f0b3ad",
          400: "#e68880",
          500: "#d95f54",
        },
        ink: {
          900: "#1a1612",
          800: "#2d2720",
          700: "#433d35",
          600: "#5c544a",
          500: "#786e62",
          400: "#958b7d",
          300: "#b3ab9e",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        card: "0 2px 20px rgba(26,22,18,0.06), 0 1px 4px rgba(26,22,18,0.04)",
        "card-hover": "0 8px 40px rgba(26,22,18,0.10), 0 2px 8px rgba(26,22,18,0.06)",
        soft: "0 1px 12px rgba(26,22,18,0.08)",
        glow: "0 0 40px rgba(196,149,114,0.20)",
      },
      backgroundImage: {
        "gradient-warm": "linear-gradient(135deg, #fdfcf8 0%, #faf7f0 50%, #f5ede0 100%)",
        "gradient-card": "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(250,247,240,0.6))",
        "gradient-hero": "radial-gradient(ellipse at 30% 20%, rgba(237,224,204,0.6) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(234,215,195,0.4) 0%, transparent 60%)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        shimmer: "shimmer 2s infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

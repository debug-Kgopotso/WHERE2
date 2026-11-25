import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: {
    relative: true,
    files: [
      "./app/**/*.{ts,tsx}",
      "./components/**/*.{ts,tsx}",
      "./lib/**/*.{ts,tsx}",
    ],
  },
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        ember: "var(--ember)",
        "ember-soft": "var(--ember-soft)",
        sage: "var(--sage)",
        "sage-soft": "var(--sage-soft)",
        line: "var(--line)",
        success: "var(--success)",
        error: "var(--error)",
        bone: "#F4F1EA",
        "near-black": "#0E0E0C",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "var(--shadow-tight), var(--shadow-ambient)",
        ember: "var(--glow-ember)",
      },
      borderRadius: {
        card: "22px",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-130%)" },
          "100%": { transform: "translateX(130%)" },
        },
      },
      animation: {
        shimmer: "shimmer 0.85s ease",
      },
      maxWidth: {
        page: "1600px",
      },
    },
  },
  plugins: [],
};

export default config;

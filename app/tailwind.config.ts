import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090d",
        panel: "#0e1218",
        edge: "#1c2430",
        acid: "#c8ff2e",
        ember: "#ff5b2e",
        muted: "#8b97a7",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(200,255,46,.45)",
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { rise: "rise .35s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;

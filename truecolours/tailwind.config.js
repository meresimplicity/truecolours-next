/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171A1D", // near-black, deliberately not #0B0B0B/#111 — see frontend-design notes in README
        paper: "#F1F0EC", // cool light neutral background, not the cream/terracotta default
        steel: {
          DEFAULT: "#5D6670",
          light: "#8A929B",
          dark: "#3E454D",
        },
        signal: {
          DEFAULT: "#2A5CAD", // primary action colour — used sparingly
          dark: "#1E4380",
        },
        rust: {
          DEFAULT: "#B8461F", // conflict / warning states only
          light: "#F2E2DA",
        },
        line: "#DAD8D2",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        code: ["var(--font-space-grotesk)", "monospace"], // paint codes only — a content-driven choice, not decoration
      },
      borderRadius: {
        card: "6px", // one deliberate radius, used consistently — not zero everywhere, not rounded-everything
      },
    },
  },
  plugins: [],
};

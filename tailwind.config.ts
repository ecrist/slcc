import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-roboto-condensed)", "Arial Narrow", "sans-serif"],
        body: ["var(--font-merriweather)", "Georgia", "serif"],
      },
      colors: {
        swan: {
          green: "#1a5632",
          "green-light": "#2d7a4a",
          gold: "#c9a84c",
          "gold-light": "#dbbe6e",
          cream: "#f5f0e8",
          dark: "#1a1a2e",
        },
      },
    },
  },
  plugins: [],
};

export default config;

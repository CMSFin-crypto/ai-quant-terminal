import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#07110f",
          panel: "#0c1916",
          edge: "#1a342e",
          text: "#eefcf7",
          muted: "#8eb2a8",
          green: "#36f29b",
          amber: "#ffcf5f",
          red: "#ff5d73",
          cyan: "#5ee5ff"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(54, 242, 155, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

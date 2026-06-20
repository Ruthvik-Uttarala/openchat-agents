import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101010",
        mist: "#f6f6f3",
        line: "#e8e5df",
        agent: "#2155ff",
        signal: "#0f8f67"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(16, 16, 16, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Barlow Condensed'", "system-ui", "sans-serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          red: "#C0392B",
          redDark: "#9b2c1f",
          dark: "#1B1B1B",
          darker: "#111111",
          warm: "#F0EDE8",
          page: "#F7F7F5",
          ink: "#1B1B1B",
          body: "#3D3D3D",
          muted: "#6B7280",
          border: "#E5E1DA",
          amber: "#D4A054",
        },
        action: {
          approve: "#16A34A",
          approveDark: "#15803D",
          skip: "#6B7280",
          edit: "#D4A054",
          danger: "#EF4444",
          warning: "#F59E0B",
        },
      },
      maxWidth: {
        rep: "640px",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15, 15, 15, 0.08), 0 1px 2px rgba(15, 15, 15, 0.04)",
        softLg: "0 8px 24px rgba(15, 15, 15, 0.08), 0 2px 8px rgba(15, 15, 15, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;

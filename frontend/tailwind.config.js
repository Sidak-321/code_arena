/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: "#020617",
          panel: "#0f172a",
          accent: "#f59e0b",
          muted: "#94a3b8"
        }
      }
    }
  },
  plugins: []
};

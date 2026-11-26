/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6", // Cor principal (botões, links, abas)
          600: "#7c3aed", // Hover
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        accent: {
          100: "#ffe4e6",
          500: "#f43f5e", // Cor de destaque (botão deletar)
          600: "#e11d48",
        },
      },
    },
  },
  plugins: [],
};

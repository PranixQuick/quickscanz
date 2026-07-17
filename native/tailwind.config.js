/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#1a1612",
          700: "#1f2937",
          500: "#4b5563",
          300: "#9ca3af",
        },
        cream: {
          50: "#fdfcf8",
          100: "#faf7f2",
          200: "#f0ebe1",
          300: "#e4dccb",
        },
        brand: {
          50: "#EAF7F2",
          500: "#0B6E4F",
          600: "#08553D",
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          700: "#1f2937",
          500: "#4b5563",
          300: "#9ca3af",
        },
        cream: {
          100: "#faf7f2",
          200: "#f0ebe1",
          300: "#e4dccb",
        },
        brand: {
          500: "#0B6E4F",
          600: "#08553D",
        },
      },
    },
  },
  plugins: [],
};

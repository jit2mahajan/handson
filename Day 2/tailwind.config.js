/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'eli-blue': '#003366',
        'eli-gold': '#FFB81C',
        'eli-light': '#E8EEF7',
      },
    },
  },
  plugins: [],
}

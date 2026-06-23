/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#252526',
        'panel-alt': '#2d2d30',
        edge: '#3c3c3c',
        accent: '#0e639c',
        'accent-hover': '#1177bb',
      },
    },
  },
  plugins: [],
};

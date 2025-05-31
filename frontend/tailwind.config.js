/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scans these files for Tailwind classes
  ],
  theme: {
    extend: {
      colors: {
        'warm-off-white': '#FAF7F2',
        'card-bg': '#FFFFFF', // Or use '#F8F5F0' for a slightly off-white card
        'main-text': '#4A4A4A',
        'heading-text': '#8D6E63', // Muted Brown/Terracotta
        'accent-teal': '#0D9488', // Deep Teal (Primary Accent)
        'light-brown-beige': '#EFEBE9',
        'brown-text': '#795548', // For less emphasized text, like footer
      },
      // --- START: Added Animation Configuration ---
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          // We translate by -50% because we duplicate the list of topics
          // in the component, creating a seamless loop.
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      // --- END: Added Animation Configuration ---
    },
  },
  plugins: [],
}
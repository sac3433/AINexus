import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // Add this server configuration block
    watch: {
      ignored: [
        '**/node_modules/**', // Ignore everything within node_modules
        '**/.git/**',         // Ignore everything within .git
        '**/dist/**',         // Ignore your build output directory
        // You can add other specific large directories or file types here
        // if they are part of your project root but not needed for HMR
        // e.g., '**/coverage/**' if you have a test coverage output folder
      ],
    }
  },
})

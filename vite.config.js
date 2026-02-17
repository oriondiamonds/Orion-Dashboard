import 'dotenv/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiPlugin } from './server/vite-plugin.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
})

import { fileURLToPath, URL } from 'node:url'

import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: {
      // Alias `@` menunjuk ke folder src agar import tidak memakai `../../`.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

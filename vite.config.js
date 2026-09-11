import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // A GitHub Pages project site is served from /<repo>/, so the deploy workflow
  // sets VITE_BASE=/menu/. Defaults to "/" for local dev and custom domains.
  base: process.env.VITE_BASE || "/",

  server: {
    port: 5173,
  },
})

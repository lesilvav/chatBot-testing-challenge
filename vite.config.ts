import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend dev server. /api is proxied to the Express backend so the browser
// can talk to a single origin during local development.
export default defineConfig({
  root: "src/frontend",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Regex (leading ^) so ONLY real API routes (/api/chat, /api/health) are
      // proxied. A plain "/api" prefix would also capture the frontend module
      // /api.ts and break the app — match /api/ with the trailing slash.
      "^/api/": "http://localhost:3001",
    },
  },
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
  },
});

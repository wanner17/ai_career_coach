import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// MVP frontend only. Backend API base configurable later via VITE_API_BASE.
export default defineConfig({
  plugins: [react()],
  // Subpath deployments (a university reverse-proxying e.g. /career/** to this
  // app instead of hosting it at their own root — see Dockerfile's
  // VITE_BASE_PATH) need every built asset reference prefixed, or the browser
  // resolves them against the host's root and 404s. Defaults to root, so a
  // normal deployment is unaffected.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
  },
});

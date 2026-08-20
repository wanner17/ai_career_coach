import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// MVP frontend only. Backend API base configurable later via VITE_API_BASE.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});

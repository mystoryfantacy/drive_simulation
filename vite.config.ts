import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // REPLACE '<YOUR_REPO_NAME>' WITH THE ACTUAL NAME OF YOUR GITHUB REPOSITORY
  // For example, if your repo is 'my-parking-game', this should be '/my-parking-game/'
  base: '/<YOUR_REPO_NAME>/',
  define: {
    // This allows the app to not crash when accessing process.env, 
    // though you need to configure .env files for actual keys to work in Vite.
    'process.env': process.env
  }
});
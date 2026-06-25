import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: 'https://taigours-e-sports.onrender.com' || 'https://taigouresports.onrender.com',
        proxy: {
          '/api': {
            target: 'http://localhost:10000 ' || 'https://taigours-e-sports.onrender.com' || 'https://taigouresports.onrender.com',
            changeOrigin: true,
            secure: false,
          }
        }
      }
    }
  })

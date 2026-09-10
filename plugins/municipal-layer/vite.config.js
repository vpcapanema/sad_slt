import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode}) => ({
  plugins: [react()],
  server: {proxy: {'/api': 'http://127.0.0.1:18765'}},
  build: mode === 'library' ? {
    outDir: 'dist', lib: {entry: 'src/index.js', formats: ['es'], fileName: 'municipal-layer', cssFileName: 'municipal-layer'},
    rollupOptions: {external: ['react', 'react-dom', 'react/jsx-runtime']}
  } : {outDir: 'demo-dist'}
}));

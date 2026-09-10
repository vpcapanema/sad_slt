import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],define:{'process.env.NODE_ENV':'"production"'},build:{
  outDir:'../../geoespacial/extracao-atributos/municipal-plugin',emptyOutDir:true,
  lib:{entry:'sicard/main.jsx',formats:['es'],fileName:'municipal-plugin',cssFileName:'municipal-plugin'}
}});

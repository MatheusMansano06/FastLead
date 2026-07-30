import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // React Three Fiber requires a single shared copy of React / the reconciler.
  resolve: {
    dedupe: ['react', 'react-dom', '@react-three/fiber', 'three'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@react-three/fiber', '@react-three/drei', 'three'],
  },
})

/**
 * Vitest Configuration for BiNx React App
 * Purpose: Configure testing environment with React Testing Library and JSDOM
 * Author: ML
 * Date: August 8, 2025
 */

 import { defineConfig } from 'vitest/config'
 import react from '@vitejs/plugin-react'
 
 export default defineConfig({
   plugins: [react()],
   test: {
     // Use JSDOM environment for React component testing
     environment: 'jsdom',
     
     // Setup files to run before tests
     setupFiles: ['./src/__tests__/setup.js'],
     
     // Global test configuration
     globals: true,
     
     // Coverage configuration
     coverage: {
       reporter: ['text', 'json', 'html'],
       exclude: [
         'node_modules/',
         'src/__tests__/',
         '**/*.{test,spec}.{js,jsx}',
         'src/main.jsx',
         'vite.config.js',
         'vitest.config.js'
       ]
     },
     
     // Test file patterns
     include: [
       'src/**/*.{test,spec}.{js,jsx}'
     ],
     
     // Exclude patterns
     exclude: [
       'node_modules',
       'dist',
       '.idea',
       '.git',
       '.cache'
     ]
   },
   
   // Resolve configuration for testing
   resolve: {
     alias: {
       '@': '/src'
     }
   }
 })
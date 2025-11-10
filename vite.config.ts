import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      threshold: 1024,
      deleteOriginalAssets: false,
    }),
    compression({
      algorithm: 'brotliCompress',
      threshold: 1024,
      deleteOriginalAssets: false,
    }),
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react',
    ],
    exclude: ['jspdf', 'jspdf-autotable'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react-router-dom')) {
              return 'vendor-router';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@stripe')) {
              return 'vendor-stripe';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('zod') || id.includes('signature_pad') || id.includes('qrcode')) {
              return 'vendor-utils';
            }
            if (id.includes('xlsx') || id.includes('shepherd')) {
              return 'vendor-excel-tour';
            }
            if (id.includes('pdf-lib')) {
              return 'vendor-pdf-lib';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            return 'vendor-other';
          }

          if (id.includes('src/components')) {
            if (id.includes('Dashboard') || id.includes('Login') || id.includes('Franchisee')) {
              return 'core-components';
            }
            if (id.includes('Admin') || id.includes('Billing') || id.includes('Analytics')) {
              return 'admin-components';
            }
            if (id.includes('Warranty') || id.includes('Claim')) {
              return 'warranty-components';
            }
            if (id.includes('Organizations') || id.includes('Settings')) {
              return 'settings-components';
            }
            if (id.includes('Customer') || id.includes('Dealer')) {
              return 'business-components';
            }
            return 'common-components';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
        pure_funcs: [],
      },
      format: {
        comments: false,
      },
    },
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    assetsInlineLimit: 4096,
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const PORT = 3000;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  if (!env.OPENROUTER_API_KEY) {
    console.warn('⚠️  OPENROUTER_API_KEY not set. The app will run in mock-data mode. See .env.example.');
  }

  return {
    base: '/',

    server: {
      port: PORT,
      host: 'localhost',
      cors: true,
      hmr: { host: 'localhost', port: PORT, protocol: 'ws' },
    },

    preview: {
      port: PORT,
      host: 'localhost',
      cors: true,
    },

    plugins: [react()],

    build: {
      outDir: 'dist',
      sourcemap: isDev ? 'inline' : 'hidden',
      minify: 'terser',
      terserOptions: {
        compress: { drop_console: isProd },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            icons: ['lucide-react'],
          },
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: ({ name }) => {
            if (!name) return 'assets/[hash][extname]';
            if (/\.(gif|jpe?g|png|svg)$/.test(name)) return 'images/[name]-[hash][extname]';
            if (/\.css$/.test(name)) return 'css/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
    },

    logLevel: isDev ? 'info' : 'warn',
  };
});

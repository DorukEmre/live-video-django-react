import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the mode
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      'process.env': env
    },
    // Add 'static/' prefix to the base URL in production
    base: mode === 'production' ? '/static/' : '/',
    server: mode === 'production'
      ? {}
      : {
        https: {
          key: fs.readFileSync(path.resolve(__dirname, 'certs', 'key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'certs', 'cert.pem')),
        },
      },
  }
})


// export default defineConfig({
//   plugins: [react()],
//   base: '/static/', // For prod
//   server: {
//     host: '0.0.0.0',
//     port: 3000,
//   },
// })

// To use hot reload, so the changes actually get reflected:

// export default (conf: any) => {
//   return defineConfig({
//     server: {
//       host: "0.0.0.0",
//       hmr: {
//         clientPort: ENV_VARIABLES.OUTER_PORT_FRONTEND,
//       },
//       port: ENV_VARIABLES.INNER_PORT_FRONTEND_DEV,
//       watch: {
//         usePolling: true,
//       },
//     },
//   });
// };


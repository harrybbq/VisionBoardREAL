import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 51414,
    },
    build: {
        rollupOptions: {
            // Native-only Capacitor plugins that we dynamic-import with
            // a try/catch fallback. Marking them external keeps Rollup
            // from failing the build when they aren't installed yet —
            // the dynamic import resolves to a runtime error which our
            // wrapper catches and treats as "feature unavailable".
            external: [
                // Optional Capacitor plugins we dynamic-import. Listed
                // here so Rollup doesn't fail the build when they
                // aren't installed yet — the wrapper's try/catch turns
                // the runtime resolution failure into a graceful
                // "feature unavailable". RC packages used to be in
                // this list; now installed so they bundle normally.
                '@capacitor/browser',
            ],
        },
    },
})
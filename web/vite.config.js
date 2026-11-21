import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built files work from any folder, e.g. galeanoworks.com/maps/coast-commuter/
export default defineConfig({ plugins: [react()], base: './' });

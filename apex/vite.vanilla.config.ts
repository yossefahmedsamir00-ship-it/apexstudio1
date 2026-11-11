import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(projectRoot, 'vanilla');

export default defineConfig({
  root: siteRoot,
  base: '/apexstudio1/',
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(siteRoot, 'index.html'),
        about: resolve(siteRoot, 'about.html'),
        services: resolve(siteRoot, 'services.html'),
        work: resolve(siteRoot, 'work.html'),
        project: resolve(siteRoot, 'project.html'),
        service: resolve(siteRoot, 'service.html'),
      },
    },
  },
});

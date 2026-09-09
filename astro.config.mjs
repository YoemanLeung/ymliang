import { defineConfig } from 'astro/config';

// Set these in the Pages workflow for either a user site or a project subpath.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || undefined,
  base: process.env.SITE_BASE || '/',
  trailingSlash: 'always',
});

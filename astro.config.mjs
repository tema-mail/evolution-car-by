import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Боевой домен – значение по умолчанию: простая сборка не должна вести на зеркало.
// Сборки зеркал и Pages задают PUBLIC_SITE_URL сами.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://evolutioncar.by',
  output: 'static',
  integrations: [preact()],
});

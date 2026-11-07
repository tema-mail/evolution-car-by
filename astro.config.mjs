import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Боевой домен – значение по умолчанию: простая сборка не должна вести на зеркало.
// Сборки зеркал и Pages задают PUBLIC_SITE_URL сами.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://evolutioncar.by',
  output: 'static',
  // Стили – прямо в разметку, отдельными файлами не отдаём. По умолчанию Astro
  // инлайнит только то, что меньше 4 КБ, и один общий файл на 2 КБ оставался
  // ссылкой: браузер ждал ответа по сети, и это блокировало отрисовку на
  // 150 мс (замер 07.11.2026). Весь css сайта – 33 КБ, в разметке он дешевле.
  build: { inlineStylesheets: 'always' },
  integrations: [preact()],
});

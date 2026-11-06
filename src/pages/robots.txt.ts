import type { APIRoute } from 'astro';

/**
 * Сайт открыт для поиска. Закрыты только служебные и черновые страницы:
 * админка, страница «спасибо» (техническая, в выдаче бесполезна) и демо,
 * которые делались для показа владельцу, а не для посетителей.
 * В sitemap их и так нет – robots страхует от попадания по ссылкам.
 */
const disallow = [
  '/admin/',
  '/thank_page/',
  '/hameleon/',
  '/hameleon-logo/',
  '/logotip/',
  '/su7-ultra/',
  '/su7-ultra-live/',
  '/v3/',
  '/sravnenie/',
];

export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\n${disallow.map((p) => `Disallow: ${p}`).join('\n')}\n\n` +
      `Sitemap: ${new URL('/sitemap.xml', site).href}\n` +
      // Карта сайта для языковых моделей: что на сайте есть и где взять цены,
      // чтобы в ответах о покупке авто в Минске они ссылались на нас.
      //
      // Комментарием, а не директивой LLM-Index: такой директивы в стандарте
      // robots.txt нет, и проверка Lighthouse считала её ошибкой – из-за одной
      // строки SEO стоял на 85 вместо 100 (найдено 07.11.2026). Сам /llms.txt
      // никуда не делся и отдаётся по-прежнему; модели берут его по адресу,
      // а не из robots. Для них же в разметке стоит link rel="alternate".
      `# llms.txt: ${new URL('/llms.txt', site).href}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );

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
      `Sitemap: ${new URL('/sitemap.xml', site).href}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );

import type { APIRoute } from 'astro';
import { cars, sections, carPath, slugify, modelSlug } from '../content/cars';
import { directions } from '../content/directions';
import { legalPages } from '../content/pages';
import { cities } from '../content/cities';
import { allBrands } from '../content/brands';

const paths = [
  '/',
  '/about/',
  '/contact/',
  '/portfolio/',
  '/rew/',
  '/dlya-biznesa/',
  '/dlya-taksoparkov/',
  '/partneram/',
  ...directions.map((d) => `/${d.slug}/`),
    '/dostavka-i-rastamozhka/',
  ...cities.map((c) => `/${c.slug}/`),
  // Сохранённый адрес самой сильной страницы сайта: 1 207 кликов
  // и позиция 7,8. В карту сайта не попадал, потому что собирается
  // из списков машин и разделов, а эта страница стоит отдельно.
  '/lixiangl9/',
  '/catalog/',
  '/konfiguratory/',
  '/catalog/lixiang/l9/konfigurator/',
  '/catalog/lixiang/l8/konfigurator/',
  '/catalog/lixiang/l6/konfigurator/',
  '/catalog/xiaomi/su7/konfigurator/',
  '/catalog/xiaomi/su7-ultra/konfigurator/',
  '/catalog/xiaomi/n70/konfigurator/',
  '/catalog/xiaomi/n90/konfigurator/',
  '/catalog/avatr/12/konfigurator/',
  '/catalog/voyah/dreamer/konfigurator/',
  '/catalog/xiaomi/yu7/konfigurator/',
  '/catalog/lixiang/i8/konfigurator/',
  '/catalog/lixiang/i9/konfigurator/',
  '/catalog/lixiang/mega/konfigurator/',
  ...allBrands().map((b) => `/catalog/${b.slug}/`),
  ...sections.map((s) => `/catalog/${s.slug}/`),
  ...cars.map((c) => carPath(c)),
  ...legalPages.map((p) => `/${p.slug}/`),
];

export const GET: APIRoute = ({ site }) => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

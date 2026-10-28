import type { APIRoute } from 'astro';
import {
  cars, sections, carPath, countries, powertrains, availabilities, formatUsd,
} from '../content/cars';
import { allBrands } from '../content/brands';
import { site } from '../content/site';

/**
 * llms-full.txt — полные сведения о каждой машине одним файлом.
 * Нужен, чтобы языковая модель отвечала на вопрос «сколько стоит Lixiang L9
 * в Минске» нашей ценой и характеристиками, а не выдумывала их.
 *
 * Для каждой машины: цена в двух валютах, наличие, страна, двигатель, год,
 * характеристики и адрес страницы. Короткая карта сайта — в /llms.txt.
 */
export const GET: APIRoute = ({ site: base }) => {
  const abs = (p: string) => new URL(p, base).href;
  const out: string[] = [
    `# ${site.brand} — полный каталог`,
    '',
    `> ${cars.length} моделей ${allBrands().length} марок с ценами и характеристиками. ` +
      `Автосалон в Минске, ${site.company}, УНП ${site.unp}, телефон ${site.phone}.`,
    '',
    'Цены ориентировочные «под ключ» — с доставкой, таможенным оформлением и документами.',
    'Не являются публичной офертой: итог зависит от курса, комплектации, состояния автомобиля',
    'и обязательных платежей на дату сделки. Актуальную цену подтверждает менеджер.',
    `Обновлено: ${new Date().toISOString().slice(0, 10)}.`,
    '',
  ];

  for (const section of sections) {
    const list = cars.filter(section.match);
    if (!list.length) continue;
    out.push(`## ${section.title} (${list.length})`, '');
    for (const c of list) {
      const price = c.priceUsd
        ? `${formatUsd(c.priceUsd)}${c.priceByn ? ` (≈ ${c.priceByn.toLocaleString('ru-RU')} BYN)` : ''}`
        : 'по запросу';
      out.push(`### ${c.title}`);
      out.push(`- Адрес: ${abs(carPath(c))}`);
      out.push(`- Марка: ${c.brand}`);
      out.push(`- Цена под ключ: от ${price}`);
      out.push(`- Наличие: ${availabilities[c.availability]}`);
      out.push(`- Откуда: ${countries[c.country].label}`);
      out.push(`- Двигатель: ${powertrains[c.powertrain]}`);
      if (c.year) out.push(`- Год: ${c.year}`);
      for (const s of c.specs) out.push(`- ${s.label}: ${s.value}`);
      if (c.description) out.push(`- Коротко: ${c.description}`);
      out.push('');
    }
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

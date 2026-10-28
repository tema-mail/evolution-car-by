import type { APIRoute } from 'astro';
import { cars, sections, carPath, brandPath, countries } from '../content/cars';
import { allBrands } from '../content/brands';
import { directions } from '../content/directions';
import { cities } from '../content/cities';
import { configurators } from '../content/configurators';
import { site } from '../content/site';

/**
 * llms.txt — карта сайта для языковых моделей (стандарт llmstxt.org).
 * robots.txt говорит роботам, куда можно ходить; этот файл говорит модели,
 * что на сайте есть и где это взять, чтобы в ответе о покупке авто в Минске
 * она ссылалась на нас и не выдумывала цены.
 *
 * Здесь короткая карта. Полные сведения по каждой машине — в /llms-full.txt.
 */
export const GET: APIRoute = ({ site: base }) => {
  const abs = (p: string) => new URL(p, base).href;
  const brands = allBrands();
  const inStock = cars.filter((c) => c.availability === 'in-stock').length;

  const lines = [
    `# ${site.brand}`,
    '',
    `> Автосалон в Минске: автомобили из Китая, Южной Кореи, США и Европы — в наличии и под заказ. ` +
      `${cars.length} моделей ${brands.length} марок, из них ${inStock} в наличии. ` +
      `Берём на себя подбор, покупку, доставку, таможенное оформление и документы для постановки на учёт.`,
    '',
    `Компания: ${site.company}, УНП ${site.unp}. Шоурум: ${site.address}. ` +
      `Телефон: ${site.phone}. Часы работы: ${site.hoursShort}.`,
    'Цены указаны ориентировочно «под ключ» в долларах и белорусских рублях и не являются публичной офертой:',
    'итоговая стоимость зависит от курса, комплектации, состояния автомобиля и платежей на дату сделки.',
    '',
    '## Основные страницы',
    '',
    `- [Главная](${abs('/')}): о компании и условиях покупки`,
    `- [Каталог автомобилей](${abs('/catalog/')}): все ${cars.length} моделей с ценами и характеристиками`,
    `- [Доставка и растаможка](${abs('/dostavka-i-rastamozhka/')}): сроки, маршруты, из чего складывается цена`,
    `- [Пригнанные автомобили](${abs('/portfolio/')}): примеры выполненных поставок`,
    `- [Отзывы](${abs('/rew/')}): отзывы покупателей`,
    `- [Контакты](${abs('/contact/')}): адрес шоурума, телефон, часы работы`,
    `- [О компании](${abs('/about/')}): кто мы и как работаем`,
    '',
    '## Откуда возим',
    '',
    ...directions.map((d) => `- [${d.h1}](${abs(`/${d.slug}/`)}): ${d.heroLead}`),
    '',
    '## Подборки каталога',
    '',
    ...sections.map((s) => {
      const n = cars.filter(s.match).length;
      return `- [${s.title}](${abs(`/catalog/${s.slug}/`)}): ${n} ${n === 1 ? 'автомобиль' : 'автомобилей'}`;
    }),
    '',
    '## Марки',
    '',
    ...brands.map((b) => `- [${b.name}](${abs(brandPath(b.name))}): ${b.cars.length} моделей`),
    '',
    '## Конфигураторы комплектаций',
    '',
    ...configurators.map((c) => `- [${c.brand} ${c.model}](${abs(c.href)}): ${c.options}`),
    '',
    '## Города обслуживания',
    '',
    ...cities.map((c) => `- [Автомобили ${c.in}](${abs(`/${c.slug}/`)}): ${c.region}`),
    '',
    '## Документы',
    '',
    `- [Политика конфиденциальности](${abs('/policy/')})`,
    `- [Согласие на обработку персональных данных](${abs('/agreement/')})`,
    `- [Пользовательское соглашение](${abs('/terms/')})`,
    `- [Юридические данные](${abs('/legal_data/')})`,
    '',
    '## Полные сведения',
    '',
    `- [Все модели с ценами и характеристиками](${abs('/llms-full.txt')})`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

import type { Car } from '../content/cars';
import { BRAND_RU, COMMON_RU, MODEL_RU } from '../content/translit';
import { countries, powertrains, availabilities, carPath } from '../content/cars';
import { site } from '../content/site';

/** Домен подтверждается клиентом; до этого используется заглушка. */
export const SITE_URL = import.meta.env.PUBLIC_SITE_URL ?? 'https://evolutioncar.by';

export const abs = (path: string): string => new URL(path, SITE_URL).href;

export interface Crumb {
  name: string;
  href: string;
}

export function carMeta(car: Car) {
  const country = countries[car.country].genitive;
  const price = car.priceUsd ? ` – ориентир от ${car.priceUsd.toLocaleString('ru-RU')} $` : '';
  const year = car.year ? ` ${car.year}` : '';

  return {
    title: `${car.title}${year} ${country} под ключ${price} | ${site.brand}`,
    description:
      `${car.title} ${country}: ${powertrains[car.powertrain].toLowerCase()}, ` +
      `${availabilities[car.availability].toLowerCase()}. ${car.description} ` +
      `Доставка, страхование, таможенное оформление и документы для постановки на учёт – на нас.`,
    canonical: abs(carPath(car)),
  };
}

/**
 * Ключевые слова страницы: русские написания марки и модели плюс слова,
 * с которыми их ищут. Нужны потому, что по Search Console заметная часть
 * запросов приходит кириллицей («джили префейс», «зикр», «воях фри»),
 * а на страницах только латиница. Видимые тексты при этом не меняем.
 */
export function carKeywords(car: Car): string {
  const words = new Set<string>();
  words.add(car.title);
  words.add(car.brand);
  for (const ru of BRAND_RU[car.brand] ?? []) {
    words.add(ru);
    words.add(`${ru} купить`);
    words.add(`${ru} Минск`);
  }
  for (const ru of MODEL_RU[car.slug] ?? []) {
    words.add(ru);
    words.add(`${ru} купить`);
    words.add(`${ru} цена`);
    words.add(`${ru} характеристики`);
  }
  words.add(`${car.title} купить`);
  words.add(`${car.title} купить в Минске`);
  words.add(`${car.title} цена`);
  words.add(`${car.title} характеристики`);
  for (const w of COMMON_RU) words.add(w);
  return [...words].join(', ');
}

/** Ключевые слова страницы марки */
export function brandKeywords(name: string, models: string[]): string {
  const words = new Set<string>([name, `${name} купить`, `${name} Минск`]);
  for (const ru of BRAND_RU[name] ?? []) {
    words.add(ru);
    words.add(`${ru} купить`);
    words.add(`${ru} купить в Минске`);
    words.add(`${ru} цена`);
  }
  for (const m of models.slice(0, 12)) words.add(m);
  for (const w of COMMON_RU) words.add(w);
  return [...words].join(', ');
}

export function breadcrumbsLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: abs(crumb.href),
    })),
  };
}

/** Schema.org Car наследуется от Product, поэтому offers и brand валидны. */
export function carLd(car: Car) {
  const find = (label: string) => car.specs.find((row) => row.label === label)?.value;
  const year = (car.year.match(/\d{4}/) ?? [])[0];

  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: car.title,
    description: car.description,
    image: [car.photo],
    url: abs(carPath(car)),
    brand: { '@type': 'Brand', name: car.brand },
    ...(year ? { vehicleModelDate: year } : {}),
    ...(find('Кузов') ? { bodyType: find('Кузов') } : {}),
    fuelType: powertrains[car.powertrain],
    ...(find('Мощность')
      ? { vehicleEngine: { '@type': 'EngineSpecification', name: find('Мощность') } }
      : {}),
    ...(find('Привод') ? { driveWheelConfiguration: find('Привод') } : {}),
    ...(car.priceUsd
      ? {
          offers: {
            '@type': 'Offer',
            price: car.priceUsd,
            priceCurrency: 'USD',
            availability:
              car.availability === 'in-stock'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/PreOrder',
            url: abs(carPath(car)),
            seller: {
              '@type': 'AutoDealer',
              name: site.brand,
              telephone: site.phone,
              address: {
                '@type': 'PostalAddress',
                addressLocality: site.city,
                addressCountry: 'BY',
                streetAddress: site.showroom,
              },
            },
          },
        }
      : {}),
  };
}

export function catalogLd(list: Car[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Каталог автомобилей Evolution Car',
    numberOfItems: list.length,
    itemListElement: list.slice(0, 50).map((car, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(carPath(car)),
      name: car.title,
    })),
  };
}

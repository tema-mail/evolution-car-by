// Проверка веса картинок перед выкладкой.
//
// Зачем: 07.11.2026 PageSpeed показал 31 балл на телефоне, и причина была в
// картинках, которые при переносе с Тильды приехали в PNG в полном размере –
// 4,5 МБ на одной главной. Ошибка повторилась на двух сайтах подряд, значит
// дело не в сайте, а в том, что её нечем было поймать. Теперь ловит этот шаг.
//
// Считаем только то, что реально встречается в разметке: неиспользуемый файл
// в public браузер не грузит, и падать из-за него незачем.
//
// Запуск: node scripts/proverka-kartinok.mjs [каталог]   (по умолчанию dist)
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] || 'dist';
const LIMIT_KB = 300;        // одна картинка
const PAGE_LIMIT_KB = 1800;  // все картинки одной страницы вместе
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif']);

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(ROOT);
const html = files.filter((f) => f.endsWith('.html'));
const kb = (p) => { try { return Math.round(statSync(p).size / 1024); } catch { return 0; } };

const heavy = new Map();   // путь -> КБ
const fatPages = [];

for (const page of html) {
  const text = readFileSync(page, 'utf8');
  const used = new Set();
  for (const m of text.matchAll(/(?:src|href|content)="(\/[^"]+?)"/g)) {
    if (EXT.has(extname(m[1]).toLowerCase())) used.add(m[1].split('?')[0]);
  }
  for (const m of text.matchAll(/url\((&#39;|'|")?(\/[^)'"]+?)\1?\)/g)) {
    if (EXT.has(extname(m[2]).toLowerCase())) used.add(m[2].split('?')[0]);
  }
  // В сумму страницы идёт только то, что грузится сразу. Картинка с
  // loading="lazy" (каталог, галереи) весит столько же, но первую отрисовку
  // не задерживает, поэтому её проверяем лимитом одного файла.
  const lazy = new Set();
  for (const m of text.matchAll(/<img\b[^>]*>/g)) {
    if (!/loading="lazy"/.test(m[0])) continue;
    const src = /src="(\/[^"]+?)"/.exec(m[0]);
    if (src) lazy.add(src[1].split('?')[0]);
  }
  let total = 0;
  for (const u of used) {
    const size = kb(join(ROOT, u));
    if (!lazy.has(u)) total += size;
    if (size > LIMIT_KB) heavy.set(u, size);
  }
  if (total > PAGE_LIMIT_KB) fatPages.push([page.replace(ROOT, '') || '/', total]);
}

if (heavy.size === 0 && fatPages.length === 0) {
  console.log(`   картинки в порядке: ни одной тяжелее ${LIMIT_KB} КБ, страниц тяжелее ${PAGE_LIMIT_KB} КБ нет`);
  process.exit(0);
}

console.error('НЕ ЗАЛИВАЮ: картинки слишком тяжёлые.');
if (heavy.size) {
  console.error(`\nТяжелее ${LIMIT_KB} КБ (${heavy.size}):`);
  for (const [p, s] of [...heavy].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.error(`   ${String(s).padStart(5)} КБ  ${p}`);
  }
}
if (fatPages.length) {
  console.error(`\nСтраницы, где картинок больше ${PAGE_LIMIT_KB} КБ (${fatPages.length}):`);
  for (const [p, s] of fatPages.sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.error(`   ${String(s).padStart(5)} КБ  ${p}`);
  }
}
console.error('\nЛечится так: node scripts/v-webp.mjs <файл…> – переведёт в webp нужного размера,');
console.error('затем поменять расширение в том месте, где картинка подключена.');
process.exit(1);

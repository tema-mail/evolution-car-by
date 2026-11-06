// Шрифты к себе на домен. Найдено 07.11.2026: внешний css Google Fonts
// блокировал отрисовку 849 мс и держал главный кадр – это был последний
// крупный тормоз после отложенных сторонних скриптов.
//
// Берём только те подмножества, которые сайту реально нужны: cyrillic и latin.
// Остальные пятнадцать (греческий, вьетнамский и прочие) не скачиваем.
//
// Запуск: node scripts/shrifty-lokalno.mjs
// Результат: public/fonts/*.woff2 и src/styles/fonts.css с локальными путями.
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const QUERY = 'family=Inter:wght@500..700&family=Golos+Text:wght@400;500;600&display=swap';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const KEEP = ['cyrillic', 'latin'];       // подмножества, которые забираем
const OUT_DIR = 'public/fonts';

const css = await (await fetch(`https://fonts.googleapis.com/css2?${QUERY}`, { headers: { 'User-Agent': UA } })).text();
mkdirSync(OUT_DIR, { recursive: true });

// Google помечает каждый блок комментарием вида /* cyrillic */
const blocks = css.split('/*').slice(1).map((chunk) => {
  const subset = chunk.slice(0, chunk.indexOf('*/')).trim();
  return { subset, body: chunk.slice(chunk.indexOf('*/') + 2) };
});

const out = [];
let saved = 0;
for (const { subset, body } of blocks) {
  if (!KEEP.includes(subset)) continue;
  const family = /font-family: '([^']+)'/.exec(body)?.[1];
  const weight = /font-weight: ([^;]+);/.exec(body)?.[1].trim();
  const url = /src: url\(([^)]+)\)/.exec(body)?.[1];
  const range = /unicode-range: ([^;]+);/.exec(body)?.[1];
  if (!family || !url) continue;
  const name = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight.replace(/\s+/g, '')}-${subset}.woff2`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(join(OUT_DIR, name), buf);
  saved += buf.length;
  console.log(`  ${name.padEnd(42)} ${(buf.length / 1024).toFixed(1)} КБ`);
  out.push(
    `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${weight};\n` +
    `  font-display: swap;\n  src: url('/fonts/${name}') format('woff2');\n` +
    (range ? `  unicode-range: ${range};\n` : '') + `}`
  );
}

const head = `/* Сгенерировано scripts/shrifty-lokalno.mjs – руками не править.\n` +
  `   Шрифты лежат на своём домене: внешний css Google Fonts блокировал\n` +
  `   отрисовку 849 мс (замер 07.11.2026). Подмножества только cyrillic и latin. */\n`;
writeFileSync('src/styles/fonts.css', head + out.join('\n\n') + '\n');
console.log(`всего ${out.length} начертаний, ${(saved / 1024).toFixed(0)} КБ, файл src/styles/fonts.css`);

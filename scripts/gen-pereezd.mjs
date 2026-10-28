// Обновляет данные на странице кабинета «Переезд» (public/admin/pereezd/)
// из карты миграции. Карта – единственный источник: раньше страница держала
// свою копию данных от 12.10 и показывала /garanty2 и /avto-iz-yaponii как
// несозданные уже после того, как страницы появились.
//
//   node scripts/gen-pereezd.mjs
//
// Меняется только строка `const DATA = [...]` и дата в подвале; вёрстка
// и скрипты страницы остаются как есть.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const CSV = 'docs/seo-migration/karta-migracii.csv';
const PAGE = 'public/admin/pereezd/index.html';

/** Разбор строки CSV с кавычками: в полях карты есть запятые. */
function parseLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out;
}

const csv = await readFile(CSV, 'utf8');
const lines = csv.split('\n').filter((l) => l.trim() !== '');
const col = Object.fromEntries(parseLine(lines[0]).map((name, i) => [name, i]));

const rows = lines.slice(1).map((line) => {
  const r = parseLine(line);
  const num = (v) => {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    old: r[col.old] ?? '',
    status: r[col.status] ?? '',
    clicks: num(r[col.clicks]),
    impressions: num(r[col.impressions]),
    position: r[col.position] ?? '',
    action: r[col.action] ?? '',
    target: r[col.target] ?? '',
    why: r[col.why] ?? '',
    top_queries: r[col.top_queries] ?? '',
  };
});

// Часть старых адресов сохранена своими страницами – например /lixiangl9,
// самая сильная страница сайта. Редиректа у них нет (gen-redirects.mjs их
// пропускает), и показывать их как 301 означало бы врать владельцу.
let own = 0;
for (const r of rows) {
  const path = r.old.replace(/^\/|\/$/g, '');
  if (path && existsSync(`dist/${path}/index.html`)) {
    r.action = 'своя страница';
    r.target = r.old.endsWith('/') ? r.old : `${r.old}/`;
    own += 1;
  }
}

// Сильные адреса сверху: страница нужна, чтобы решать по трафику.
rows.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

const page = await readFile(PAGE, 'utf8');
const today = new Date().toISOString().slice(0, 10).split('-').reverse().join('.');

// Проверяем именно совпадение, а не изменился ли текст: если данные уже
// актуальны, замена даёт тот же файл – это не ошибка.
const dataRe = /const DATA = \[.*?\];/s;
if (!dataRe.test(page)) throw new Error('не нашёл строку const DATA в ' + PAGE);
const footerRe = /<footer>Источник:.*?<\/footer>/s;
if (!footerRe.test(page)) throw new Error('не нашёл подвал с источником в ' + PAGE);

let out = page.replace(dataRe, `const DATA = ${JSON.stringify(rows)};`);

out = out.replace(
  footerRe,
  `<footer>Источник: карта миграции docs/seo-migration/karta-migracii.csv – ` +
    `в ней ${rows.length} старых адресов. Клики и показы – Google Search Console; ` +
    `адреса, добавленные из индекса Яндекса, идут с нулевым трафиком. ` +
    `«Своя страница» – адрес сохранён как есть, редиректа у него нет. ` +
    `Страница собрана ${today} скриптом scripts/gen-pereezd.mjs – руками не править.</footer>`,
);

await writeFile(PAGE, out);
const byAction = rows.reduce((acc, r) => ({ ...acc, [r.action]: (acc[r.action] ?? 0) + 1 }), {});
console.log(`адресов: ${rows.length}, из них сохранены своими страницами: ${own}`);
if (!existsSync('dist')) console.log('внимание: dist/ нет – «свои страницы» не отмечены, сначала npm run build');
for (const [action, n] of Object.entries(byAction)) console.log(`  ${action}: ${n}`);

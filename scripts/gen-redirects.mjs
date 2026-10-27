// Делает из карты миграции (docs/seo-migration/karta-migracii.csv) готовые
// правила 301 для веб-сервера. Карта – единственный источник: правим её,
// перегенерируем конфиг, руками адреса нигде не дублируются.
//
//   node scripts/gen-redirects.mjs nginx  > deploy/redirects.conf
//   node scripts/gen-redirects.mjs apache > public/.htaccess
//
// Старые адреса Тильды идут без слеша в конце (/lixiangl9), новые – со слешем.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const format = process.argv[2];
if (!['nginx', 'apache'].includes(format)) {
  console.error('Использование: node scripts/gen-redirects.mjs nginx|apache');
  process.exit(1);
}

const csv = await readFile('docs/seo-migration/karta-migracii.csv', 'utf8');

/** Разбор строки CSV с кавычками: поля карты содержат запятые внутри запросов. */
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

const lines = csv.split('\n').filter((l) => l.trim() !== '');
const head = parseLine(lines[0]);
const col = Object.fromEntries(head.map((name, i) => [name, i]));

const rules = [];
const skipped = [];
const kept = [];
for (const line of lines.slice(1)) {
  const row = parseLine(line);
  const from = (row[col.old] ?? '').trim();
  const to = (row[col.target] ?? '').trim();
  const action = (row[col.action] ?? '').trim();
  if (!from.startsWith('/')) continue;
  // «создать» без готовой страницы вести некуда – такие адреса пропускаем,
  // иначе отправим посетителя и робота на ещё не существующий адрес.
  if (!to.startsWith('/') || action === 'создать') { skipped.push(`${from} (${action})`); continue; }
  if (from === to) continue;
  // Часть старых адресов сохранена своими страницами – например /lixiangl9,
  // самая сильная страница сайта. Редирект убил бы её, поэтому если страница
  // есть в собранном сайте, правило не создаём.
  const own = `dist/${from.replace(/^\/|\/$/g, '')}/index.html`;
  if (existsSync(own)) { kept.push(from); continue; }
  rules.push([from.replace(/\/$/, '') || '/', to]);
}

// Длинные адреса первыми: /byd_han_l_ev не должен перехватываться коротким правилом.
rules.sort((a, b) => b[0].length - a[0].length);

const stamp = new Date().toISOString().slice(0, 10);
const head1 = `# Сгенерировано scripts/gen-redirects.mjs из docs/seo-migration/karta-migracii.csv (${stamp}).\n# Правил: ${rules.length}. Руками не править – правь карту и перегенерируй.\n`;

if (format === 'nginx') {
  const body = rules
    .map(([from, to]) => `  ~^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$  ${to};`)
    .join('\n');
  process.stdout.write(`${head1}map $uri $redirect_target {\n  default "";\n${body}\n}\n`);
} else {
  const body = rules
    .map(([from, to]) => `RedirectMatch 301 ^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$ ${to}`)
    .join('\n');
  process.stdout.write(`${head1}<IfModule mod_alias.c>\n${body}\n</IfModule>\n`);
}

console.error(`правил: ${rules.length}; пропущено (нет целевой страницы): ${skipped.length}; оставлено своей страницей: ${kept.length}`);
for (const k of kept) console.error(`  оставлен как есть: ${k}`);
for (const s of skipped) console.error(`  ${s}`);

// Делает из карты миграции (docs/seo-migration/karta-migracii.csv) готовые
// правила 301 для веб-сервера. Карта – единственный источник: правим её,
// перегенерируем конфиг, руками адреса нигде не дублируются.
//
//   node scripts/gen-redirects.mjs nginx     > deploy/redirects.conf
//   node scripts/gen-redirects.mjs htaccess  > deploy/htaccess
//
// Два формата под два хостинга. nginx – для VPS, где сайт жил до ноября 2026.
// htaccess – для виртуального хостинга hoster.by (Apache + CloudLinux), куда
// переезжаем: там своего конфига веб-сервера нет, всё задаётся .htaccess, и
// кроме редиректов он должен повторить остальное из deploy/nginx.conf –
// чистые адреса, 404, кэш и сжатие. Файл в public/ класть нельзя: Astro
// скопирует его в сборку, и карта редиректов утечёт наружу как /.htaccess.
// Поэтому генерируем в deploy/ и кладём на хостинг отдельно.
//
// Старые адреса Тильды идут без слеша в конце (/lixiangl9), новые – со слешем.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const format = process.argv[2];
if (!['nginx', 'htaccess'].includes(format)) {
  console.error('Использование: node scripts/gen-redirects.mjs nginx|htaccess');
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
    // ~* вместо ~ – шаблон без учёта регистра. Со старого сайта в индексе
    // Яндекса остались адреса в разном написании (/BYD и /byd, /Xiaomi и
    // /xiaomi), и регистрозависимые правила ловили только то написание, что
    // попало в карту: 01.11.2026 /BYD, /VOYAH, /Xiaomi, /XiaomiSU7, /LYNK,
    // /YangwangU8 и ещё пять адресов отдавали 404 вместо 301. Безопасно:
    // в карте 12 пар различаются только регистром, и все ведут на один и
    // тот же адрес – расхождений в целях нет.
    .map(([from, to]) => `  ~*^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$  ${to};`)
    .join('\n');
  process.stdout.write(`${head1}map $uri $redirect_target {\n  default "";\n${body}\n}\n`);
} else {
  // Правила через mod_rewrite, а не RedirectMatch: цель задаём абсолютным
  // адресом со схемой https. Проверено на хостинге 02.11.2026 – RedirectMatch
  // строит адрес по схеме запроса, а Apache за терминацией SSL видит http,
  // и /byd уводил на http://evolutioncar.by/catalog/byd/, то есть добавлял
  // лишний переход http → https на каждом старом адресе.
  // NC – без учёта регистра: в индексе Яндекса остались адреса старого сайта
  // в разном написании (/BYD и /byd), и 01.11.2026 одиннадцать таких адресов
  // отдавали 404 вместо 301, пока правила были регистрозависимыми.
  const body = rules
    .map(([from, to]) => {
      const path = from.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `  RewriteRule ^${path}/?$ https://evolutioncar.by${to} [R=301,L,NC]`;
    })
    .join('\n');

  // Остальное – перенос deploy/nginx.conf на Apache. На виртуальном хостинге
  // своего конфига веб-сервера нет, поэтому всё живёт здесь.
  process.stdout.write(`${head1}# Повторяет deploy/nginx.conf: зеркала, редиректы, чистые адреса, 404,
# кэш и сжатие. Генерируется – руками не править.

Options -Indexes
DirectoryIndex index.html

# Сам этот файл наружу не отдаём. Проверено 02.11.2026 на Apache 2.4: без
# этого правила /.htaccess открывается кодом 200, то есть карта всех старых
# адресов сайта и адрес кабинета доступны любому. Хостинг закрывает это в
# своём конфиге, но полагаться на чужую настройку нельзя.
<FilesMatch "^\\.ht">
  Require all denied
</FilesMatch>

<IfModule mod_rewrite.c>
  RewriteEngine On

  # http → https кодом 301, и www → без www: canonical у всех страниц без www.
  # Именно 301, не 308: Caddy на прежнем VPS отдавал 308, и Яндекс не склеивал
  # зеркала – проверено на 19 сайтах 30.10.2026. На хостинге за прокси сам
  # запрос приходит по http, поэтому смотрим ещё и X-Forwarded-Proto.
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !https
  RewriteRule ^ https://evolutioncar.by%{REQUEST_URI} [R=301,L]
  RewriteCond %{HTTP_HOST} ^www\\. [NC]
  RewriteRule ^ https://evolutioncar.by%{REQUEST_URI} [R=301,L]

  # Кабинет переехал на свой поддомен (правило владельца 28.10.2026).
  # Запрос с самого поддомена не трогаем – там этот же каталог, иначе петля.
  RewriteCond %{HTTP_HOST} !^admin\\. [NC]
  RewriteRule ^admin(/.*)?$ https://admin.evolutioncar.by$1 [R=301,L]

  # …/index.html → чистый адрес: иначе в индексе два адреса одной страницы.
  # Смотрим исходный запрос, а не текущий путь: DirectoryIndex сам подставляет
  # index.html внутри сервера, и по пути правило зациклилось бы.
  RewriteCond %{THE_REQUEST} \\s/+(.*/)?index\\.html[\\s?] [NC]
  RewriteRule ^ https://evolutioncar.by/%1 [R=301,L]

  # Старые адреса Тильды – 301 на новый. Длинные правила раньше коротких:
  # /byd_han_l_ev не должен перехватываться коротким /byd.
${body}

  # Каталог без слеша на конце – 301 на адрес со слешем, как в canonical.
  # Своим правилом, а не встроенным DirectorySlash: тот строит адрес по схеме
  # запроса, и за терминацией SSL /lixiangl9 уводил на http. Стоит последним:
  # сначала должны отработать правила старых адресов выше.
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteCond %{REQUEST_URI} !/$
  RewriteRule ^(.+)$ https://evolutioncar.by/$1/ [R=301,L]
</IfModule>

ErrorDocument 404 /404.html

# Сборка Astro: css и js лежат только в /_astro/ и содержат хеш в имени,
# поэтому кэшируются навсегда. Проверено: вне /_astro/ их в сборке нет.
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css               "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType font/woff2             "access plus 1 year"
  ExpiresByType image/jpeg             "access plus 30 days"
  ExpiresByType image/png              "access plus 30 days"
  ExpiresByType image/webp             "access plus 30 days"
  ExpiresByType image/avif             "access plus 30 days"
  ExpiresByType image/svg+xml          "access plus 30 days"
  ExpiresByType image/x-icon           "access plus 30 days"
  ExpiresByType text/html              "access plus 0 seconds"
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain application/javascript application/json image/svg+xml application/xml
</IfModule>
`);
}

console.error(`правил: ${rules.length}; пропущено (нет целевой страницы): ${skipped.length}; оставлено своей страницей: ${kept.length}`);
for (const k of kept) console.error(`  оставлен как есть: ${k}`);
for (const s of skipped) console.error(`  ${s}`);

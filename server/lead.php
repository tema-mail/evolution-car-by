<?php
/**
 * Приём заявок evolutioncar.by на виртуальном хостинге hoster.by.
 *
 * Зачем версия на PHP, когда есть server/lead.mjs: на Бегете приёмник работал
 * отдельным сервисом на Node в докере, а на этом тарифе Node в системе нет
 * (/opt/alt без alt-nodejs, nvm пуст, панель раздела Node.js не даёт). PHP тут
 * штатный, поэтому приём заявок переписан на него. Логика и формат сообщения
 * повторяют lead.mjs – менеджер в Телеграме не должен заметить разницы.
 *
 * Чего здесь намеренно нет по сравнению с lead.mjs: вкладки «Заявки» кабинета
 * и разделов аналитики. Это отдельная задача; сначала должны работать заявки.
 *
 * Маршруты (переписаны в .htaccess):
 *   POST /api/lead   – заявка с форм сайта
 *   POST /api/ev     – свой счётчик целевых действий (src/lib/counter.ts)
 *   GET  /api/health – состояние, без персональных данных
 *
 * Настройки читаются из <домашний каталог>/lead.env (вне каталога сайта):
 *   TG_TOKEN, TG_CHAT (через запятую), ORIGIN
 *   B24_HOOK – входящий вебхук Битрикс24 (необязательно; пока пуст,
 *              заявки в CRM не уходят и ошибок это не вызывает)
 * Заявки пишутся в ~/data/leads.jsonl – тоже вне каталога сайта: это
 * персональные данные, по закону № 99-З их нельзя отдавать по прямой ссылке.
 */

declare(strict_types=1);

const MAX_BODY = 16 * 1024;
const MAX_FIELD = 2000;
// Не больше 5 заявок с адреса за 10 минут – от ботов и случайных повторов.
const WINDOW = 600;
const LIMIT = 5;
// Виды событий своего счётчика – те же, что в src/lib/counter.ts и lead.mjs.
const EVENT_KINDS = ['in', 'pv', 'phone', 'msg', 'open', 'quiz', 'form', 'b24'];
// Порядок полей в сообщении: сначала контакты, потом заказ, потом остальное.
const LABELS = [
    'Name' => 'Имя', 'Phone' => 'Телефон', 'Email' => 'E-mail',
    'Order' => 'Заказ', 'Total' => 'Итого', 'Comment' => 'Комментарий', 'Page' => 'Страница',
];

/**
 * Домашний каталог услуги. Считаем от файла, а не из HOME: у PHP на этом
 * хостинге HOME пустой (проверено 03.11.2026), и путь получался «/lead.env».
 * Скрипт лежит в <домашний>/www/<сайт>/api/, поэтому вверх на три уровня.
 */
function home(): string
{
    $byFile = dirname(__DIR__, 3);
    if (is_dir($byFile . '/www')) {
        return $byFile;
    }
    return getenv('HOME') ?: $byFile;
}

function conf(string $name, string $default = ''): string
{
    static $env = null;
    if ($env === null) {
        $env = [];
        $path = home() . '/lead.env';
        if (is_readable($path)) {
            foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                    continue;
                }
                [$k, $v] = explode('=', $line, 2);
                $env[trim($k)] = trim($v);
            }
        }
    }
    return $env[$name] ?? $default;
}

function dataDir(): string
{
    $dir = home() . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir;
}

function origins(): array
{
    return array_filter(array_map('trim', explode(',', conf('ORIGIN', 'https://evolutioncar.by'))));
}

function reply(int $code, array $body, string $origin = ''): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    if ($origin !== '' && in_array($origin, origins(), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Обрезка и чистка значения поля: управляющие символы в Телеграм не нужны. */
function clean($v): string
{
    $s = is_scalar($v) ? (string)$v : '';
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    return mb_substr(trim($s), 0, MAX_FIELD);
}

/** Телефон: минимум 9 цифр – белорусский номер без кода страны уже 9. */
function phoneOk(string $phone): bool
{
    return strlen(preg_replace('/\D/', '', $phone) ?? '') >= 9;
}

/** Номер заявки по минскому времени: его сверяет менеджер в Минске. */
function leadId(DateTimeImmutable $now): string
{
    $minsk = $now->setTimezone(new DateTimeZone('Europe/Minsk'));
    $seq = 0;
    $path = dataDir() . '/counter-' . $minsk->format('ymd');
    $fh = fopen($path, 'c+');
    if ($fh) {
        flock($fh, LOCK_EX);
        $seq = (int)trim((string)fread($fh, 16)) + 1;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, (string)$seq);
        flock($fh, LOCK_UN);
        fclose($fh);
    }
    return sprintf('EC-%s-%04d', $minsk->format('ymd'), $seq);
}

/** Частота обращений с одного адреса. Храним рядом с заявками, не в сессии. */
function limited(string $ip): bool
{
    $path = dataDir() . '/rate.json';
    $now = time();
    $all = is_readable($path) ? (json_decode((string)file_get_contents($path), true) ?: []) : [];
    foreach ($all as $k => $times) {
        $all[$k] = array_values(array_filter($times, fn($t) => $now - $t < WINDOW));
        if (!$all[$k]) {
            unset($all[$k]);
        }
    }
    $mine = $all[$ip] ?? [];
    $mine[] = $now;
    $all[$ip] = $mine;
    file_put_contents($path, json_encode($all), LOCK_EX);
    @chmod($path, 0600);
    return count($mine) > LIMIT;
}

function esc(string $s): string
{
    return htmlspecialchars($s, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function message(array $lead): string
{
    $f = $lead['fields'];
    $lines = ['<b>' . esc($lead['form']) . '</b> · № ' . $lead['id']];
    foreach (LABELS as $key => $label) {
        if (!empty($f[$key])) {
            $lines[] = '<b>' . $label . ':</b> ' . ($key === 'Order' ? "\n" : '') . esc((string)$f[$key]);
        }
    }
    foreach ($f as $key => $value) {
        if (!isset(LABELS[$key]) && $value !== '' && $value !== null) {
            $lines[] = '<b>' . esc((string)$key) . ':</b> ' . esc((string)$value);
        }
    }
    $minsk = (new DateTimeImmutable($lead['at']))->setTimezone(new DateTimeZone('Europe/Minsk'));
    $lines[] = '<i>' . $minsk->format('d.m.Y, H:i:s') . ' Минск</i>';
    return implode("\n", $lines);
}

/**
 * Лид в Битрикс24 через входящий вебхук.
 *
 * Вебхук – это секрет: он даёт доступ к CRM, поэтому лежит только в
 * lead.env на сервере (права 600) и никогда в репозитории. Пока
 * B24_HOOK пуст, функция молча ничего не делает – сайт работает как
 * прежде, и отсутствие вебхука не роняет приём заявок.
 *
 * Заявка уже записана на диск и отправлена в Телеграм до этого вызова,
 * поэтому даже отказ CRM её не теряет: в ответе придёт причина, и её
 * видно в логе.
 */
function bitrix(array $lead): string
{
    $hook = rtrim(conf('B24_HOOK'), '/');
    if ($hook === '') {
        return 'не настроен';
    }

    // Имя и телефон лежат среди полей формы под разными подписями –
    // забираем по смыслу, а не по жёсткому порядку.
    $name = $phone = $email = '';
    $rest = [];
    foreach ($lead['fields'] as $label => $value) {
        $low = mb_strtolower((string) $label);
        if ($name === '' && str_contains($low, 'им')) {
            $name = (string) $value;
        } elseif ($phone === '' && (str_contains($low, 'тел') || str_contains($low, 'phone'))) {
            $phone = (string) $value;
        } elseif ($email === '' && (str_contains($low, 'mail') || str_contains($low, 'почт'))) {
            $email = (string) $value;
        } else {
            $rest[] = $label . ': ' . $value;
        }
    }

    $fields = [
        'TITLE' => 'Сайт: ' . $lead['form'],
        'NAME' => $name !== '' ? $name : 'С сайта',
        'SOURCE_DESCRIPTION' => trim($lead['form'] . "\n" . implode("\n", $rest)),
        'COMMENTS' => 'Номер заявки ' . $lead['id'] . ', ' . $lead['at'],
        'OPENED' => 'Y',
        'ASSIGNED_BY_ID' => 1,
    ];
    if ($phone !== '') {
        $fields['PHONE'] = [['VALUE' => $phone, 'VALUE_TYPE' => 'WORK']];
    }
    if ($email !== '') {
        $fields['EMAIL'] = [['VALUE' => $email, 'VALUE_TYPE' => 'WORK']];
    }

    $ch = curl_init($hook . '/crm.lead.add.json');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['fields' => $fields, 'params' => ['REGISTER_SONET_EVENT' => 'Y']]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $out = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($out === false || $code !== 200) {
        return 'отказ CRM (код ' . $code . ')';
    }
    $data = json_decode((string) $out, true);
    if (isset($data['result'])) {
        return 'лид ' . $data['result'];
    }
    return 'ошибка CRM: ' . substr((string) ($data['error_description'] ?? $out), 0, 120);
}

function telegram(string $text): string
{
    $token = conf('TG_TOKEN');
    $chats = array_filter(array_map('trim', explode(',', conf('TG_CHAT'))));
    if ($token === '' || !$chats) {
        return 'не настроен';
    }
    $ok = true;
    foreach ($chats as $chat) {
        $payload = json_encode([
            'chat_id' => $chat, 'text' => $text,
            'parse_mode' => 'HTML', 'disable_web_page_preview' => true,
        ], JSON_UNESCAPED_UNICODE);
        $ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || !$body) {
            $ok = false;
        }
    }
    return $ok ? 'отправлено' : 'ошибка';
}

// --------------------------------------------------------------------- маршруты

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($method === 'OPTIONS') {
    reply(204, [], $origin);
}

// Свой счётчик целевых действий: обычный посетитель, пароля не нужно.
// Тело крошечное, персональных данных нет – только вид действия и страница.
// Источник правды по целям: Метрика считает лишь согласившихся на cookie.
if (str_ends_with($path, '/ev')) {
    if ($method !== 'POST') {
        reply(404, ['ok' => false]);
    }
    if ($origin !== '' && !in_array($origin, origins(), true)) {
        reply(403, ['ok' => false, 'error' => 'origin'], $origin);
    }
    $raw = file_get_contents('php://input', false, null, 0, 4096);
    $ev = json_decode((string)$raw, true);
    $kind = is_array($ev) ? clean($ev['k'] ?? '') : '';
    if (!in_array($kind, EVENT_KINDS, true)) {
        reply(200, ['ok' => false], $origin);
    }
    $row = [
        'at' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('c'),
        'k' => $kind,
        'p' => mb_substr(clean($ev['p'] ?? ''), 0, 300) ?: '/',
        'r' => mb_substr(clean($ev['r'] ?? ''), 0, 200),
    ];
    $file = dataDir() . '/events.jsonl';
    $ok = file_put_contents($file, json_encode($row, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
    reply(200, ['ok' => (bool)$ok], $origin);
}

if (str_ends_with($path, '/health')) {
    $chats = array_filter(array_map('trim', explode(',', conf('TG_CHAT'))));
    reply(200, [
        'ok' => true,
        'telegram' => conf('TG_TOKEN') !== '' && $chats ? true : false,
        'crm' => conf('B24_HOOK') !== '',
        'leads' => is_readable(dataDir() . '/leads.jsonl') ? count(file(dataDir() . '/leads.jsonl')) : 0,
        'server' => 'php ' . PHP_VERSION,
    ]);
}

if ($method !== 'POST') {
    reply(404, ['ok' => false]);
}
if ($origin !== '' && !in_array($origin, origins(), true)) {
    reply(403, ['ok' => false, 'error' => 'origin']);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($raw === false || strlen($raw) > MAX_BODY) {
    reply(413, ['ok' => false], $origin);
}
$body = json_decode((string)$raw, true);
if (!is_array($body)) {
    reply(400, ['ok' => false], $origin);
}

// Формы сайта шлют плоскую заявку {name, phone, page, utm…}, кабинет – {form, fields{}}.
// Принимаем оба вида, как и lead.mjs: сайт менять не нужно.
$flat = !isset($body['fields']);
if ($flat) {
    $utm = $body['utm'] ?? '';
    if (is_array($utm)) {
        $pairs = [];
        foreach ($utm as $k => $v) {
            $pairs[] = "$k=$v";
        }
        $utm = implode(' ', $pairs);
    }
    $incoming = [
        'Name' => $body['name'] ?? '', 'Phone' => $body['phone'] ?? '', 'Page' => $body['page'] ?? '',
        'Откуда' => $body['referrer'] ?? '', 'utm' => $utm, 'website' => $body['company'] ?? '',
    ];
} else {
    $incoming = is_array($body['fields']) ? $body['fields'] : [];
}

$fields = [];
foreach (array_slice($incoming, 0, 40, true) as $k => $v) {
    if ($v === null || $v === '' || is_array($v)) {
        continue;
    }
    $fields[clean($k)] = clean($v);
}

// Ловушка для ботов: скрытое поле люди не заполняют – отвечаем «ок», но не сохраняем.
if (!empty($fields['website'])) {
    reply(200, ['ok' => true], $origin);
}
unset($fields['website']);

if (!phoneOk($fields['Phone'] ?? '')) {
    reply(422, ['ok' => false, 'error' => 'phone'], $origin);
}
// Согласие проверяет и сервер: закон Республики Беларусь № 99-З, ст. 5.
if (($body['consent'] ?? null) !== true) {
    reply(422, ['ok' => false, 'error' => 'consent'], $origin);
}

$ip = trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? ''))[0]);
if (limited($ip)) {
    reply(429, ['ok' => false, 'error' => 'rate'], $origin);
}

// Автомобиль из карточки – позицией заявки, марка в категорию.
$items = [];
if (!empty($body['items']) && is_array($body['items'])) {
    foreach (array_slice($body['items'], 0, 40) as $i) {
        $title = clean($i['title'] ?? '');
        if ($title === '') {
            continue;
        }
        $items[] = [
            'uid' => clean($i['uid'] ?? ''), 'title' => $title,
            'variant' => clean($i['variant'] ?? ''), 'category' => clean($i['category'] ?? ''),
            'qty' => max(1, min(999, (int)($i['qty'] ?? 1))), 'price' => max(0, (int)round((float)($i['price'] ?? 0))),
        ];
    }
} elseif (!empty($body['car'])) {
    $car = clean($body['car']);
    $items[] = [
        'uid' => '', 'title' => $car, 'variant' => '',
        // Марку берём из данных карточки, а не первым словом названия: иначе
        // «Lynk & Co 08» и «Lynk&CO 900» разъезжаются на две категории.
        'category' => clean($body['brand'] ?? '') ?: explode(' ', $car)[0],
        'qty' => 1, 'price' => 0,
    ];
}

$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$lead = [
    'id' => leadId($now),
    'at' => $now->format('c'),
    'form' => clean($body['form'] ?? $body['source'] ?? 'Заявка с сайта'),
    'fields' => $fields,
    'items' => $items,
    'ip' => $ip,
];

// Копия на диск – всегда и до Телеграма: даже если он недоступен, заявка не теряется.
$file = dataDir() . '/leads.jsonl';
file_put_contents($file, json_encode($lead, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
@chmod($file, 0600);

$status = telegram(message($lead));
$crm = bitrix($lead);
error_log(sprintf('[lead] %s %s | telegram: %s | crm: %s', $lead['id'], $lead['form'], $status, $crm));

// Статус отправки возвращаем в ответе: по логам хостинга его не видно, а
// знать, дошло ли уведомление, нужно – на Бегете заявка от живого клиента
// уже один раз потерялась молча (30.10.2026).
reply(200, ['ok' => true, 'id' => $lead['id'], 'telegram' => $status, 'crm' => $crm], $origin);

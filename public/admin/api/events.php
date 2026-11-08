<?php
/**
 * Кабинет → цифры одной страницы (остров PageStats).
 *
 * Свой счётчик сайта (src/lib/counter.ts) шлёт события в /api/ev, приёмник
 * server/lead.php пишет их построчно в ~/data/events.jsonl. Читать их было
 * нечем: кабинет просил /api/admin/events у Node-сервера со старого хостинга,
 * и в карточке каждой страницы висело «Считаю…» (найдено 08.11.2026).
 *
 * Лежит внутри закрытого каталога кабинета – доступ проверяет Apache.
 *
 * GET /api/admin/events?days=30 → {days, total, actions, intents, cr, done, pages:[…]}
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const KINDS = ['in', 'pv', 'phone', 'msg', 'open', 'quiz', 'form', 'b24'];
/** Целевое действие: человек позвонил, написал или отправил заявку. */
const ACTIONS = ['phone', 'msg', 'form', 'b24'];
/** Намерение: нажал кнопку заявки или начал квиз. */
const INTENTS = ['open', 'quiz'];

function home(): string
{
    $byFile = dirname(__DIR__, 4);
    if (is_dir($byFile . '/www')) {
        return $byFile;
    }
    return getenv('HOME') ?: $byFile;
}

$days = (int) ($_GET['days'] ?? 30);
if ($days < 1 || $days > 1825) {
    $days = 30;
}
$since = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify("-{$days} days");

$file = home() . '/data/events.jsonl';
$empty = ['days' => $days, 'total' => array_fill_keys(KINDS, 0), 'actions' => 0,
          'intents' => 0, 'cr' => 0.0, 'done' => 0, 'pages' => []];
if (!is_readable($file)) {
    echo json_encode($empty + ['note' => 'событий ещё нет'], JSON_UNESCAPED_UNICODE);
    exit;
}

$total = array_fill_keys(KINDS, 0);
$pages = [];
$handle = fopen($file, 'rb');
if ($handle === false) {
    http_response_code(500);
    echo json_encode(['error' => 'не читается журнал событий'], JSON_UNESCAPED_UNICODE);
    exit;
}
// Построчно: журнал растёт и целиком в память его класть незачем.
while (($line = fgets($handle)) !== false) {
    $row = json_decode($line, true);
    if (!is_array($row)) { continue; }
    $kind = (string) ($row['k'] ?? '');
    if (!in_array($kind, KINDS, true)) { continue; }
    try {
        if (new DateTimeImmutable((string) ($row['at'] ?? '')) < $since) { continue; }
    } catch (Exception $e) {
        continue;                                  // строка без даты в счёт не идёт
    }
    $page = (string) ($row['p'] ?? '/');
    if (!isset($pages[$page])) {
        $pages[$page] = ['page' => $page] + array_fill_keys(KINDS, 0) + ['actions' => 0];
    }
    $pages[$page][$kind]++;
    $total[$kind]++;
    if (in_array($kind, ACTIONS, true)) {
        $pages[$page]['actions']++;
    }
}
fclose($handle);

$actions = array_sum(array_map(static fn(string $k): int => $total[$k], ACTIONS));
$intents = array_sum(array_map(static fn(string $k): int => $total[$k], INTENTS));
$done = $total['form'] + $total['b24'];

// Сверху страницы, где больше всего действий, при равенстве – где больше просмотров.
$list = array_values($pages);
usort($list, static fn(array $a, array $b): int => [$b['actions'], $b['pv']] <=> [$a['actions'], $a['pv']]);

echo json_encode([
    'days' => $days,
    'total' => $total,
    'actions' => $actions,
    'intents' => $intents,
    'cr' => $total['pv'] > 0 ? round($actions / $total['pv'] * 100, 2) : 0.0,
    'done' => $done,
    'pages' => $list,
], JSON_UNESCAPED_UNICODE);

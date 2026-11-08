<?php
/**
 * Кабинет → «Заявки»: чтение и смена этапа.
 *
 * Почему файл лежит здесь, а не в /api/ основного домена: кабинет открыт на
 * поддомене admin.evolutioncar.by, и относительный путь из него ведёт сюда же,
 * в закрытый паролем каталог. Значит доступ проверяет сам Apache – паролем или
 * меткой «запомнить меня», – а скрипту не нужно ни токенов, ни заголовков.
 * Прежний кабинет брал логин с паролем из хранилища браузера, которое
 * заполнял замок со старого хостинга; замка нет с 03.11.2026, и заголовок
 * уходил пустым – отсюда вечное «Загружаем заявки…» (найдено 08.11.2026).
 *
 * Данные: тот же ~/data/leads.jsonl, куда пишет приёмник server/lead.php.
 * Этапы доски лежат рядом, в stages.json: сами заявки не трогаем, чтобы
 * ничего не потерять при одновременной записи новой заявки.
 *
 * GET   /api/leads.php          – список, свежие сверху
 * PATCH /api/leads.php?id=<id>  – тело {"stage":"новая|в работе|выполнена|отказ"}
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const STAGES = ['новая', 'в работе', 'выполнена', 'отказ'];

/**
 * Домашний каталог и хранилище – ровно те же, что у приёмника server/lead.php:
 * заявки пишет он, читаем их мы, и расходиться им нельзя. Отсюда до дома на
 * один уровень дальше, чем от приёмника: тот лежит в api/, а мы в admin/api/.
 */
function home(): string
{
    $byFile = dirname(__DIR__, 4);
    if (is_dir($byFile . '/www')) {
        return $byFile;
    }
    return getenv('HOME') ?: $byFile;
}

function dataDir(): string
{
    return home() . '/data';
}

function stagesFile(): string { return dataDir() . '/stages.json'; }

function readStages(): array
{
    $raw = @file_get_contents(stagesFile());
    if ($raw === false) { return []; }
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : [];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'PATCH' || $method === 'POST') {
    $id = (string) ($_GET['id'] ?? '');
    $body = json_decode((string) file_get_contents('php://input'), true);
    $stage = is_array($body) ? (string) ($body['stage'] ?? '') : '';
    if ($id === '' || !in_array($stage, STAGES, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'нужен id и этап из списка'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $all = readStages();
    $all[$id] = ['stage' => $stage, 'at' => date('c')];
    $ok = @file_put_contents(stagesFile(), json_encode($all, JSON_UNESCAPED_UNICODE), LOCK_EX);
    if ($ok === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'не удалось записать этап'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(['ok' => true, 'id' => $id, 'stage' => $stage], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = dataDir() . '/leads.jsonl';
if (!is_readable($file)) {
    echo json_encode(['leads' => [], 'note' => 'файла заявок ещё нет'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stages = readStages();
$leads = [];
foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $row = json_decode($line, true);
    if (!is_array($row)) { continue; }          // битая строка не должна рушить весь список
    $id = (string) ($row['id'] ?? '');
    $row['stage'] = $stages[$id]['stage'] ?? 'новая';
    $leads[] = $row;
}
// Свежие сверху: в файле они дописываются в конец.
$leads = array_reverse($leads);

// Заодно отдаём состояние каналов: кабинет на поддомене, и запрос к
// /api/health основного домена из него упёрся бы в правила браузера о
// чужом домене. Читаем те же настройки, что и приёмник.
$env = @file_get_contents(home() . '/lead.env') ?: '';
$telegram = (bool) preg_match('/^TG_CHAT=\S+/m', (string) $env);
$crm = (bool) preg_match('/^B24_HOOK=\S+/m', (string) $env);

echo json_encode([
    'leads' => $leads,
    'count' => count($leads),
    'telegram' => $telegram,
    'crm' => $crm,
], JSON_UNESCAPED_UNICODE);

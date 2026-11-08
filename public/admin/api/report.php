<?php
/**
 * Кабинет → отчёты разделов «Метрика и каналы», «Позиции», «Рекомендации».
 *
 * Лежит внутри закрытого каталога кабинета: доступ проверяет Apache паролем
 * или меткой «запомнить меня», своей проверки здесь нет и не нужно.
 *
 * Отчёты собирает analytics/collect.py (Метрика 98499004 + Search Console,
 * позиции – из месяцев Search Console и снимков выдачи XMLRiver) и кладёт
 * готовыми файлами в ~/data/reports/. Сервер их только отдаёт: считать на
 * хостинге нечем, да и незачем – данные меняются раз в сутки.
 *
 * GET /api/report.php?name=metrika|positions|recommendations
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const ALLOWED = ['metrika', 'positions', 'recommendations'];

function home(): string
{
    $byFile = dirname(__DIR__, 4);
    if (is_dir($byFile . '/www')) {
        return $byFile;
    }
    return getenv('HOME') ?: $byFile;
}

$name = (string) ($_GET['name'] ?? '');
if (!in_array($name, ALLOWED, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'неизвестный отчёт', 'allowed' => ALLOWED], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = home() . '/data/reports/' . $name . '.json';
if (!is_readable($file)) {
    http_response_code(404);
    echo json_encode([
        'error' => 'отчёт ещё не собран',
        'hint' => 'собирает analytics/collect.py, выкладывает deploy/otchety.sh',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

header('Content-Length: ' . (string) filesize($file));
readfile($file);

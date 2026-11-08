<?php
/**
 * Забыть этот браузер: снимает метку, поставленную zapomnit.php.
 * Нужно, если компьютер чужой или метку надо отозвать.
 *
 * Пароль после этого спросят снова. Отозвать метку сразу на всех устройствах
 * можно только сменой ключа на сервере – файл admin-cookie-secret.
 */
declare(strict_types=1);

setcookie('ec_admin', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
?>
<!doctype html>
<meta charset="utf-8">
<title>Вышли</title>
<p>Этот браузер забыт, при следующем заходе спросят пароль. <a href="/">В кабинет</a></p>

<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'xper_u797209756_laptop');
define('DB_PASS', 'Anurag879@');
define('DB_NAME', 'xper_u797209756_laptop');

mysqli_report(MYSQLI_REPORT_OFF);

$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn && $conn->connect_error) {
    $conn = @new mysqli('localhost', 'root', '', 'xper_u797209756_laptop');
    if ($conn && $conn->connect_error) {
        $conn = null;
    }
}
?>
<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// 1. Static files (CSS, JS, images, font files)
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

// 2. Handle /laptop/{slug}
if (preg_match('#^/laptop/([a-zA-Z0-9_-]+)/?$#', $uri, $matches)) {
    $_GET['slug'] = $matches[1];
    require __DIR__ . '/laptop-details.php';
    return true;
}

// 3. Handle clean URLs without .php extension (e.g. /store, /about, /cart)
$cleanPhp = __DIR__ . $uri . '.php';
if (file_exists($cleanPhp)) {
    require $cleanPhp;
    return true;
}

// 4. Default root / or index.php
if ($uri === '/' || $uri === '/index.php') {
    require __DIR__ . '/index.php';
    return true;
}

return false;

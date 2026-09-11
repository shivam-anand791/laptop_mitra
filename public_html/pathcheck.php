<?php
// Increase memory limit just in case
ini_set('memory_limit', '256M');

$rootPath = __DIR__;

// --- Function to recursively scan directories ---
function scanDirTree($dir, $level = 0) {
    // Avoid scanning too deep or scanning git/vendor folders to keep output clean
    if ($level > 5) return; 
    
    $items = scandir($dir);
    if (!$items) return;

    $ignoreList = ['.', '..', '.git', '.vscode', '.idea', 'node_modules', 'images', 'assets', 'css', 'js', 'fonts'];

    echo '<ul class="tree">';
    
    // Sort directories first, then files
    $dirs = [];
    $files = [];
    
    foreach ($items as $item) {
        if (in_array($item, $ignoreList)) continue;
        if (is_dir($dir . DIRECTORY_SEPARATOR . $item)) {
            $dirs[] = $item;
        } else {
            $files[] = $item;
        }
    }
    
    // Print Directories
    foreach ($dirs as $d) {
        echo '<li><span class="folder">📁 ' . $d . '</span>';
        scanDirTree($dir . DIRECTORY_SEPARATOR . $d, $level + 1);
        echo '</li>';
    }
    
    // Print Files
    foreach ($files as $f) {
        $style = "";
        $extra = "";
        
        // HIGHLIGHT IMPORTANT FILES
        if (stripos($f, 'PHPMailer') !== false) {
            $style = "color: #d63384; font-weight: bold; background: #ffe6f2;";
            $extra = " <--- POTENTIAL PHPMAILER FILE";
        }
        if ($f == 'database.php') {
            $style = "color: #198754; font-weight: bold; background: #e6f9ee;";
            $extra = " <--- DATABASE CONFIG";
        }
        if ($f == 'autoload.php') {
            $style = "color: #fd7e14; font-weight: bold;";
            $extra = " <--- COMPOSER AUTOLOAD";
        }

        echo '<li><span class="file" style="' . $style . '">📄 ' . $f . $extra . '</span></li>';
    }
    
    echo '</ul>';
}

// --- Function to try and locate PHPMailer specifically ---
function findPHPMailer($baseDir) {
    $commonPaths = [
        'PHPMailer/src/PHPMailer.php',
        'phpmailer/src/PHPMailer.php',
        'vendor/phpmailer/phpmailer/src/PHPMailer.php',
        'lib/PHPMailer/src/PHPMailer.php',
        'includes/PHPMailer/src/PHPMailer.php',
        'src/PHPMailer.php'
    ];

    echo "<div class='status-box'>";
    echo "<h3>🕵️ Diagnostic Report</h3>";
    echo "<p><strong>Current Root Directory:</strong> " . $baseDir . "</p>";
    
    $found = false;
    foreach ($commonPaths as $path) {
        if (file_exists($baseDir . '/' . $path)) {
            echo "<p style='color:green; font-weight:bold;'>✅ Found PHPMailer at: " . $path . "</p>";
            echo "<p>Use this path in your code:</p>";
            echo "<code style='background:#333; color:#fff; padding:5px; display:block;'>require '" . $path . "';</code>";
            $found = true;
            break; 
        }
    }

    if (!$found) {
        echo "<p style='color:red; font-weight:bold;'>❌ PHPMailer standard path NOT found. Please check the File Tree below to see where folder is.</p>";
    }
    echo "</div>";
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Folder Structure Viewer</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f4f6f9; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { text-align: center; color: #333; }
        
        .status-box { background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #4f46e5; }
        
        ul.tree, ul.tree ul { list-style: none; margin: 0; padding: 0; }
        ul.tree ul { margin-left: 20px; border-left: 1px dashed #ccc; padding-left: 10px; }
        ul.tree li { margin: 5px 0; line-height: 1.5; }
        
        .folder { font-weight: bold; color: #4f46e5; }
        .file { color: #555; }
    </style>
</head>
<body>

<div class="container">
    <h1>📂 Project Folder Structure</h1>
    
    <?php findPHPMailer($rootPath); ?>

    <hr>
    <h3>File Tree:</h3>
    <?php scanDirTree($rootPath); ?>
</div>

</body>
</html>
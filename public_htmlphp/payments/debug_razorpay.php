<?php
// payments/debug_razorpay.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Razorpay Debugger Tool</h1>";
echo "<hr>";

// 1. Check current directory
$current_dir = __DIR__;
echo "<p><strong>Current Folder:</strong> $current_dir</p>";

// 2. Check logic for razorpay-php folder
$expected_path = $current_dir . '/razorpay-php/Razorpay.php';
echo "<p><strong>Looking for SDK file at:</strong> <br><code>$expected_path</code></p>";

if (file_exists($expected_path)) {
    echo "<h3 style='color:green'>✔ File Found! Path is correct.</h3>";
    
    // Try to load it
    try {
        require_once $expected_path;
        echo "<h3 style='color:green'>✔ SDK Loaded Successfully!</h3>";
        
        if (class_exists('Razorpay\Api\Api')) {
            echo "<h3 style='color:green'>✔ Razorpay Class Exists! Ready to use.</h3>";
        } else {
            echo "<h3 style='color:red'>✘ File loaded but Class not found. Check if 'src' folder exists inside 'razorpay-php'.</h3>";
        }
        
    } catch (Throwable $e) {
        echo "<h3 style='color:red'>✘ Critical Error while loading SDK:</h3>";
        echo "<pre>" . $e->getMessage() . "</pre>";
    }
    
} else {
    echo "<h3 style='color:red'>✘ File NOT Found!</h3>";
    echo "<p>Folder structure galat hai. Folder ka naam check karein.</p>";
    
    // Check kya folder actually exist karta hai kisi aur naam se?
    $files = scandir($current_dir);
    echo "<p><strong>Files found in 'payments' folder:</strong></p><ul>";
    foreach($files as $file) {
        if($file != '.' && $file != '..') {
            echo "<li>$file</li>";
        }
    }
    echo "</ul>";
}
?>
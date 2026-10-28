<?php
// payments/razorpay-config.php

// 1. Error Reporting ON
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 2. Path Define
$base_path = __DIR__;
$sdk_path_manual = $base_path . '/razorpay-php/Razorpay.php';
$sdk_path_composer = $base_path . '/../vendor/autoload.php';

// 3. Smart Include (Crash rokne ke liye)
if (file_exists($sdk_path_manual)) {
    require_once $sdk_path_manual;
} elseif (file_exists($sdk_path_composer)) {
    require_once $sdk_path_composer;
} else {
    // 500 Error ki jagah HTML Message dikhao
    echo "<div style='background:#fee2e2; border:1px solid #ef4444; color:#991b1b; padding:20px; font-family:sans-serif; margin:20px;'>";
    echo "<h2>❌ Razorpay SDK Missing</h2>";
    echo "<p>Server SDK file dhoond nahi pa raha hai.</p>";
    echo "<p><strong>Expected Path:</strong> $sdk_path_manual</p>";
    echo "<p>Please ensure you have extracted the 'razorpay-php' folder inside 'payments'.</p>";
    echo "</div>";
    exit; // Stop execution smoothly
}

use Razorpay\Api\Api;

// 4. Keys Configuration
$keyId = 'rzp_test_S3KeoVspM7qt2w';        
$keySecret = 'kdkr8H48xnnZxemy2Zuop5oT';

// 5. API Test
try {
    $api = new Api($keyId, $keySecret);
} catch (Exception $e) {
    die("<h3 style='color:red'>API Error: " . $e->getMessage() . "</h3>");
}
?>
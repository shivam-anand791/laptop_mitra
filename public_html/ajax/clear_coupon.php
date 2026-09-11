<?php
// ajax/clear_coupon.php
session_start();

// Clear specific session variables
unset($_SESSION['applied_coupon']);
unset($_SESSION['discount_amount']);
unset($_SESSION['referrer_id']);

header('Content-Type: application/json');
echo json_encode(['status' => 'success', 'message' => 'Coupon removed']);
?>
<?php
// payments/create-order.php
session_start();
require_once 'razorpay-config.php';

// Check if we have checkout data
if (!isset($_SESSION['checkout_data']) || !isset($_SESSION['total_amount'])) {
    header("Location: ../checkout.php?error=session_expired");
    exit;
}

$user_data = $_SESSION['checkout_data'];
$total_amount = $_SESSION['total_amount'];

// Razorpay accepts amount in paise (1 Rupee = 100 Paise)
$orderData = [
    'receipt'         => 'rcptid_' . time(),
    'amount'          => $total_amount * 100, 
    'currency'        => 'INR',
    'payment_capture' => 1 // Auto capture
];

try {
    $razorpayOrder = $api->order->create($orderData);
    $razorpayOrderId = $razorpayOrder['id'];
    
    $_SESSION['razorpay_order_id'] = $razorpayOrderId;

    // Prepare data for the checkout page view
    $data = [
        "key"               => $keyId,
        "amount"            => $orderData['amount'],
        "name"              => "XpertNote",
        "description"       => "Laptop Order Payment",
        "image"             => "https://xpertnote.com/assets/img/xpertnotelogo.png",
        "prefill"           => [
            "name"              => $user_data['name'],
            "email"             => $user_data['email'],
            "contact"           => $user_data['phone'],
        ],
        "notes"             => [
            "address"           => $user_data['address'],
            "merchant_order_id" => "ORD-" . time(),
        ],
        "theme"             => [
            "color"             => "#002c8c" // Your primary color
        ],
        "order_id"          => $razorpayOrderId,
    ];

    // Load the frontend view
    require 'checkout-page.php';

} catch (Exception $e) {
    die("Error creating Razorpay order: " . $e->getMessage());
}
?>
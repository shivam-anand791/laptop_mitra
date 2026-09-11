<?php
// payments/verify-payment.php
ob_start();
session_start();

require_once 'razorpay-config.php';
// Database path ensure karein
if(file_exists('../config/database.php')) {
    require_once '../config/database.php';
} else {
    die("Database file not found at ../config/database.php");
}

if (empty($_POST['razorpay_payment_id']) || empty($_SESSION['checkout_data'])) {
    die("Invalid Access or Session Expired");
}

$success = false;
$error = "Payment Verification Failed";

try {
    $attributes = [
        'razorpay_order_id' => $_POST['razorpay_order_id'],
        'razorpay_payment_id' => $_POST['razorpay_payment_id'],
        'razorpay_signature' => $_POST['razorpay_signature']
    ];
    $api->utility->verifyPaymentSignature($attributes);
    $success = true;
} catch(Exception $e) {
    $success = false;
    $error = $e->getMessage();
}

if ($success === true) {
    
    $checkout_data = $_SESSION['checkout_data'];
    $cart_items = $_SESSION['cart_items'];
    $payment_id = $_POST['razorpay_payment_id'];
    $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0;

    // 1. Booking Insert Query
    // Total 13 '?' placeholders hain
    $stmt = $conn->prepare("INSERT INTO bookings (laptop_id, laptop_name, customer_name, customer_email, customer_phone, purchase_type, quantity, address, city, state, pincode, price_per_unit, mode, status, payment_id, payment_status) VALUES (?, ?, ?, ?, ?, 'individual', ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, 'Paid')");
    
    // 2. Stock Update Query
    $update_stock = $conn->prepare("UPDATE laptops SET stock_quantity = stock_quantity - ?, sales_count = sales_count + ? WHERE id = ?");

    foreach ($cart_items as $item) {
        // CORRECTION HERE: 
        // String length ab 13 hai (issssissssdss) jo ki variables se match karta hai
        $stmt->bind_param("issssissssdss", 
            $item['laptop_id'],         // i
            $item['model'],             // s
            $checkout_data['name'],     // s
            $checkout_data['email'],    // s
            $checkout_data['phone'],    // s
            $item['quantity'],          // i
            $checkout_data['address'],  // s
            $checkout_data['city'],     // s
            $checkout_data['state'],    // s
            $checkout_data['pincode'],  // s
            $item['final_price'],       // d (decimal/double)
            $item['purchase_mode'],     // s
            $payment_id                 // s
        );
        $stmt->execute();

        // Update Stock
        $update_stock->bind_param("iii", $item['quantity'], $item['quantity'], $item['laptop_id']);
        $update_stock->execute();
    }

    // 3. Clear Cart & Session
    if (isset($checkout_data['order_source']) && $checkout_data['order_source'] === 'cart' && $user_id > 0) {
        $conn->query("DELETE FROM cart WHERE user_id = $user_id");
    }
    
    // Cleanup
    unset($_SESSION['checkout_data']);
    unset($_SESSION['cart_items']);
    unset($_SESSION['total_amount']);
    unset($_SESSION['razorpay_order_id']);
    
    $_SESSION['order_success'] = true;
    
    // 4. Redirect
    echo "<script>window.location.href='../order-success.php';</script>";
    exit;

} else {
    echo "<h3>Payment Failed</h3><p>$error</p>";
    echo "<a href='../checkout.php'>Try Again</a>";
}
ob_end_flush();
?>
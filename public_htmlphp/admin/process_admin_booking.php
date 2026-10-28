<?php
// process_admin_booking.php

// Note: In a real application, you should use a more secure API endpoint 
// and handle validation/error reporting robustly.
header('Content-Type: application/json');

// Include database connection (from your root directory)
require_once '../config/database.php'; 

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method.';
    echo json_encode($response);
    exit;
}

// 1. Get and Sanitize Form Data
$laptop_id     = isset($_POST['laptop_id']) ? (int)$_POST['laptop_id'] : 0;
$laptop_name   = isset($_POST['laptop_name']) ? trim($_POST['laptop_name']) : '';
$mode          = isset($_POST['mode']) && in_array($_POST['mode'], ['sell', 'lease']) ? $_POST['mode'] : '';
$customer_name = isset($_POST['name']) ? trim($_POST['name']) : '';
$customer_email= isset($_POST['email']) ? trim($_POST['email']) : '';
$customer_phone= isset($_POST['phone']) ? trim($_POST['phone']) : '';
$purchase_type = isset($_POST['purchase_type']) && in_array($_POST['purchase_type'], ['individual', 'bulk']) ? $_POST['purchase_type'] : '';
$quantity      = isset($_POST['quantity']) ? (int)$_POST['quantity'] : 1;
$address       = isset($_POST['address']) ? trim($_POST['address']) : '';
$notes         = isset($_POST['notes']) ? trim($_POST['notes']) : NULL;

// Basic validation
if (!$laptop_id || empty($laptop_name) || empty($mode) || empty($customer_name) || empty($customer_email) || empty($purchase_type) || $quantity < 1 || empty($address)) {
    $response['message'] = 'Missing or invalid required fields.';
    echo json_encode($response);
    exit;
}

// 2. Fetch Laptop Price to Calculate price_per_unit
$price_per_unit = 0;
$stmt = $conn->prepare("SELECT price_individual_sell, price_bulk_sell, price_individual_lease, price_bulk_lease FROM laptops WHERE id = ?");
$stmt->bind_param("i", $laptop_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $laptop = $result->fetch_assoc();
    
    // Determine the correct price field based on mode and purchase type
    if ($mode === 'sell') {
        $price_per_unit = ($purchase_type === 'bulk') ? $laptop['price_bulk_sell'] : $laptop['price_individual_sell'];
    } else { // 'lease'
        $price_per_unit = ($purchase_type === 'bulk') ? $laptop['price_bulk_lease'] : $laptop['price_individual_lease'];
    }
} else {
    $response['message'] = 'Laptop not found in the database.';
    echo json_encode($response);
    exit;
}
$stmt->close();

if ($price_per_unit <= 0) {
    $response['message'] = 'Invalid price for selected laptop.';
    echo json_encode($response);
    exit;
}


// 3. Insert Booking Data into the Database
$sql = "INSERT INTO bookings (
            laptop_id, laptop_name, customer_name, customer_email, customer_phone, 
            purchase_type, quantity, address, notes, price_per_unit, mode, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";
        
$stmt = $conn->prepare($sql);

$stmt->bind_param("isssssisdss", 
    $laptop_id, 
    $laptop_name, 
    $customer_name, 
    $customer_email, 
    $customer_phone, 
    $purchase_type, 
    $quantity, 
    $address, 
    $notes, 
    $price_per_unit, 
    $mode
);

if ($stmt->execute()) {
    $response['success'] = true;
    $response['message'] = 'Booking request successfully recorded!';
    // Optional: Send an email notification to admin here
} else {
    $response['message'] = 'Database error: ' . $stmt->error;
}

$stmt->close();
$conn->close();

echo json_encode($response);
?>
<?php
// ajax/cart_warranty_update.php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    exit;
}

// Get JSON Input
$data = json_decode(file_get_contents('php://input'), true);
$cart_id = isset($data['cart_id']) ? intval($data['cart_id']) : 0;
$has_warranty = isset($data['has_warranty']) ? intval($data['has_warranty']) : 0;

if ($cart_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid ID']);
    exit;
}

// Update Database
$stmt = $conn->prepare("UPDATE cart SET has_warranty = ? WHERE id = ? AND user_id = ?");
$user_id = $_SESSION['user_id'];
$stmt->bind_param("iii", $has_warranty, $cart_id, $user_id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'DB Error']);
}
$stmt->close();
?>
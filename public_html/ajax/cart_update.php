<?php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error']); exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$cart_id = $data['cart_id'];
$qty = $data['quantity'];
$user_id = $_SESSION['user_id'];

// Update DB
$stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?");
$stmt->bind_param("iii", $qty, $cart_id, $user_id);

if ($stmt->execute()) {
    // Return new total count for header badge
    $result = $conn->query("SELECT SUM(quantity) as total FROM cart WHERE user_id = $user_id");
    $row = $result->fetch_assoc();
    echo json_encode(['status' => 'success', 'total_items' => $row['total']]);
} else {
    echo json_encode(['status' => 'error']);
}
?>
<?php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please login first']);
    exit;
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

$action = $data['action'] ?? '';
$laptop_id = isset($data['laptop_id']) ? intval($data['laptop_id']) : (isset($data['id']) ? intval($data['id']) : 0);

if (!$laptop_id) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid ID']);
    exit;
}

// --- HELPER: Get Counts ---
function getCounts($conn, $uid) {
    $w = $conn->query("SELECT COUNT(*) as c FROM wishlist WHERE user_id = $uid")->fetch_assoc()['c'];
    $c = $conn->query("SELECT SUM(quantity) as c FROM cart WHERE user_id = $uid")->fetch_assoc()['c'];
    return ['wishlist_count' => (int)$w, 'cart_count' => (int)$c];
}

// 1. TOGGLE (Add/Remove based on existence)
if ($action == 'toggle') {
    $check = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND laptop_id = ?");
    $check->bind_param("ii", $user_id, $laptop_id);
    $check->execute();
    
    if ($check->get_result()->num_rows > 0) {
        // Remove
        $conn->query("DELETE FROM wishlist WHERE user_id = $user_id AND laptop_id = $laptop_id");
        $msg = 'Removed from Wishlist';
    } else {
        // Add
        $mode = $data['mode'] ?? 'sell';
        $ins = $conn->prepare("INSERT INTO wishlist (user_id, laptop_id, mode) VALUES (?, ?, ?)");
        $ins->bind_param("iis", $user_id, $laptop_id, $mode);
        $ins->execute();
        $msg = 'Added to Wishlist';
    }
    
    $counts = getCounts($conn, $user_id);
    echo json_encode(['status' => 'success', 'message' => $msg, 'wishlist_count' => $counts['wishlist_count']]);
}

// 2. REMOVE
elseif ($action == 'remove') {
    $stmt = $conn->prepare("DELETE FROM wishlist WHERE user_id = ? AND laptop_id = ?");
    $stmt->bind_param("ii", $user_id, $laptop_id);
    
    if ($stmt->execute()) {
        $counts = getCounts($conn, $user_id);
        echo json_encode(['status' => 'success', 'wishlist_count' => $counts['wishlist_count'], 'cart_count' => $counts['cart_count']]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'DB Error']);
    }
}

// 3. MOVE TO CART
elseif ($action == 'move_to_cart') {
    // Check cart
    $chk = $conn->prepare("SELECT id FROM cart WHERE user_id = ? AND laptop_id = ?");
    $chk->bind_param("ii", $user_id, $laptop_id);
    $chk->execute();
    
    if ($chk->get_result()->num_rows == 0) {
        $mode = $data['mode'] ?? 'sell';
        $ins = $conn->prepare("INSERT INTO cart (user_id, laptop_id, quantity, purchase_mode) VALUES (?, ?, 1, ?)");
        $ins->bind_param("iis", $user_id, $laptop_id, $mode);
        $ins->execute();
    }
    
    // Remove from wishlist
    $conn->query("DELETE FROM wishlist WHERE user_id = $user_id AND laptop_id = $laptop_id");
    
    $counts = getCounts($conn, $user_id);
    echo json_encode([
        'status' => 'success', 
        'message' => 'Moved to Cart', 
        'wishlist_count' => $counts['wishlist_count'], 
        'cart_count' => $counts['cart_count']
    ]);
} 
else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid Action']);
}
?>
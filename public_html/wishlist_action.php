<?php
// wishlist_action.php

require_once 'config/database.php'; 
session_start();

// Set JSON header
header('Content-Type: application/json');

// Check Login
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please login first']);
    exit;
}

$user_id = $_SESSION['user_id'];

// --- READ RAW JSON INPUT ---
$inputData = json_decode(file_get_contents('php://input'), true);

$action = $inputData['action'] ?? '';
$laptop_id = $inputData['laptop_id'] ?? 0;

// Fallback if JS sends 'id' instead of 'laptop_id'
if(!$laptop_id && isset($inputData['id'])) {
    $laptop_id = $inputData['id'];
}

// Validation
if (!$laptop_id) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid Product ID']);
    exit;
}

// --- HELPER FUNCTION TO GET UPDATED COUNTS ---
function getUserCounts($conn, $user_id) {
    $w_stmt = $conn->prepare("SELECT COUNT(*) as count FROM wishlist WHERE user_id = ?");
    $w_stmt->bind_param("i", $user_id);
    $w_stmt->execute();
    $wishlist_count = $w_stmt->get_result()->fetch_assoc()['count'];

    $c_stmt = $conn->prepare("SELECT COUNT(*) as count FROM cart WHERE user_id = ?");
    $c_stmt->bind_param("i", $user_id);
    $c_stmt->execute();
    $cart_count = $c_stmt->get_result()->fetch_assoc()['count'];

    return ['wishlist_count' => $wishlist_count, 'cart_count' => $cart_count];
}

// ================= ACTION: TOGGLE (Used in laptop-details.php) =================
if ($action == 'toggle') {
    // Check if exists
    $check = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND laptop_id = ?");
    $check->bind_param("ii", $user_id, $laptop_id);
    $check->execute();
    $result = $check->get_result();
    
    if ($result->num_rows > 0) {
        // DELETE (Remove from wishlist)
        $del = $conn->prepare("DELETE FROM wishlist WHERE user_id = ? AND laptop_id = ?");
        $del->bind_param("ii", $user_id, $laptop_id);
        if($del->execute()) {
            $counts = getUserCounts($conn, $user_id);
            echo json_encode([
                'status' => 'success', 
                'message' => 'Removed from Wishlist', 
                'type' => 'removed',
                'wishlist_count' => $counts['wishlist_count']
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'DB Error']);
        }
    } else {
        // INSERT (Add to wishlist)
        $mode = $inputData['mode'] ?? 'sell'; // Default to 'sell' (Buy) if not set
        $ins = $conn->prepare("INSERT INTO wishlist (user_id, laptop_id, mode) VALUES (?, ?, ?)");
        $ins->bind_param("iis", $user_id, $laptop_id, $mode);
        if($ins->execute()) {
            $counts = getUserCounts($conn, $user_id);
            echo json_encode([
                'status' => 'success', 
                'message' => 'Added to Wishlist', 
                'type' => 'added',
                'wishlist_count' => $counts['wishlist_count']
            ]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'DB Error']);
        }
    }
}

// ================= ACTION: REMOVE (Used in wishlist.php) =================
elseif ($action == 'remove') {
    $sql = "DELETE FROM wishlist WHERE user_id = ? AND laptop_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $user_id, $laptop_id);
    
    if ($stmt->execute()) {
        $counts = getUserCounts($conn, $user_id);
        
        echo json_encode([
            'status' => 'success', 
            'message' => 'Removed from wishlist',
            'wishlist_count' => $counts['wishlist_count'], 
            'cart_count' => $counts['cart_count']
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Database error']);
    }
} 

// ================= ACTION: MOVE TO CART (Used in wishlist.php) =================
elseif ($action == 'move_to_cart') {
    // 1. Check if already in cart
    $check = $conn->prepare("SELECT id FROM cart WHERE user_id = ? AND laptop_id = ?");
    $check->bind_param("ii", $user_id, $laptop_id);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows == 0) {
        // 2. Add to Cart
        $insert = $conn->prepare("INSERT INTO cart (user_id, laptop_id, quantity) VALUES (?, ?, 1)");
        $insert->bind_param("ii", $user_id, $laptop_id);
        if (!$insert->execute()) {
             echo json_encode(['status' => 'error', 'message' => 'Failed to add to cart']);
             exit;
        }
    } 
    
    // 3. Remove from Wishlist
    $delete = $conn->prepare("DELETE FROM wishlist WHERE user_id = ? AND laptop_id = ?");
    $delete->bind_param("ii", $user_id, $laptop_id);
    
    if ($delete->execute()) {
        $counts = getUserCounts($conn, $user_id);

        echo json_encode([
            'status' => 'success',
            'message' => 'Moved to cart successfully',
            'wishlist_count' => $counts['wishlist_count'],
            'cart_count' => $counts['cart_count']
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Could not remove from wishlist']);
    }
} 
else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid Action Request']);
}
?>
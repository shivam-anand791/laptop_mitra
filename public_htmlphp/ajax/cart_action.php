<?php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

// 1. Auth Check
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Please login']);
    exit;
}

$user_id = $_SESSION['user_id'];
$input = file_get_contents("php://input");
$data = json_decode($input, true);

// Action decide karo. Agar 'action' key nahi hai, toh assume karo ki ye "Add" request hai (store page se)
$action = isset($data['action']) ? $data['action'] : 'add_to_cart';

// --- LOGIC SWITCH ---

if ($action === 'remove_item') {
    // --- REMOVE ITEM LOGIC ---
    $cart_id = isset($data['cart_id']) ? intval($data['cart_id']) : 0;
    
    // Security: Sirf wahi item delete karo jo logged-in user ka ho
    $stmt = $conn->prepare("DELETE FROM cart WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $cart_id, $user_id);
    
    if ($stmt->execute()) {
        returnCartTotals($conn, $user_id, 'Item removed');
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to remove']);
    }

} elseif ($action === 'update_qty') {
    // --- UPDATE QUANTITY LOGIC ---
    $cart_id = intval($data['cart_id']);
    $qty = intval($data['quantity']);
    
    if ($qty < 1) {
        echo json_encode(['status' => 'error', 'message' => 'Quantity cannot be zero']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("iii", $qty, $cart_id, $user_id);
    
    if ($stmt->execute()) {
        returnCartTotals($conn, $user_id, 'Quantity updated');
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Update failed']);
    }

} elseif ($action === 'toggle_warranty_bulk') {
    // --- BULK WARRANTY TOGGLE ---
    $state = intval($data['state']); // 1 or 0
    
    // Sirf 'buy' items par warranty lag sakti hai (Logic based on your cart.php)
    $stmt = $conn->prepare("UPDATE cart SET has_warranty = ? WHERE user_id = ? AND purchase_mode = 'sell'");
    $stmt->bind_param("ii", $state, $user_id);
    
    if ($stmt->execute()) {
        returnCartTotals($conn, $user_id, 'Warranty updated');
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update warranty']);
    }

} else {
    // --- ADD TO CART LOGIC (Ye purana logic hai, but slightly improved) ---
    
    $laptop_id = isset($data['id']) ? intval($data['id']) : 0;
    $qty = isset($data['qty']) ? intval($data['qty']) : 1;
    $mode = isset($data['type']) ? $data['type'] : 'sell';
    $config = isset($data['config']) ? $data['config'] : '8GB';
    $has_warranty = (isset($data['warranty_addon']) && $data['warranty_addon'] == true) ? 1 : 0;
    $model_name = isset($data['model']) ? $data['model'] : '';
    $unit_price = isset($data['price']) ? floatval($data['price']) : 0;

    if ($laptop_id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Product']);
        exit;
    }

    // Check Duplicate
    $check = $conn->prepare("SELECT id, quantity FROM cart WHERE user_id=? AND laptop_id=? AND purchase_mode=? AND configuration=? AND has_warranty=?");
    $check->bind_param("iisss", $user_id, $laptop_id, $mode, $config, $has_warranty);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $new_qty = $row['quantity'] + $qty;
        $update = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
        $update->bind_param("ii", $new_qty, $row['id']);
        $update->execute();
    } else {
        $insert = $conn->prepare("INSERT INTO cart (user_id, laptop_id, quantity, purchase_mode, configuration, has_warranty, model_name, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $insert->bind_param("iiissssd", $user_id, $laptop_id, $qty, $mode, $config, $has_warranty, $model_name, $unit_price);
        $insert->execute();
    }
    
    returnCartTotals($conn, $user_id, 'Item added to cart');
}

// --- HELPER FUNCTION: Return Updated Totals to JS ---
function returnCartTotals($conn, $user_id, $msg) {
    // Re-calculate totals to update frontend instantly
    $sql = "SELECT c.id, c.quantity, c.purchase_mode, c.configuration, c.has_warranty, 
            l.price_individual_sell, l.price_individual_lease 
            FROM cart c 
            JOIN laptops l ON c.laptop_id = l.id 
            WHERE c.user_id = ?";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $grand_total = 0;
    $product_total = 0;
    $warranty_total = 0;
    $total_qty = 0;
    $item_totals = [];

    // Costs (Must match your PHP config)
    $warranty_cost = 1999;
    $upgrade_sell = 4000;
    $upgrade_lease = 500;

    while ($row = $res->fetch_assoc()) {
        $is_pro = (stripos($row['configuration'], '16GB') !== false);
        $is_lease = ($row['purchase_mode'] == 'lease');
        
        $base = $is_lease ? $row['price_individual_lease'] : $row['price_individual_sell'];
        $upgrade = $is_pro ? ($is_lease ? $upgrade_lease : $upgrade_sell) : 0;
        
        $item_price = ($base + $upgrade) * $row['quantity'];
        $item_warranty = 0;

        if ($row['has_warranty'] == 1 && !$is_lease) {
            $item_warranty = $warranty_cost * $row['quantity'];
        }

        $row_total = $item_price + $item_warranty;
        
        $product_total += $item_price;
        $warranty_total += $item_warranty;
        $grand_total += $row_total;
        $total_qty += $row['quantity'];
        
        // Return individual row total for UI update
        $item_totals[$row['id']] = $row_total;
    }

    echo json_encode([
        'status' => 'success',
        'message' => $msg,
        'cart_count' => $total_qty,
        'grand_total' => $grand_total,
        'product_total' => $product_total,
        'warranty_total' => $warranty_total,
        'item_totals' => $item_totals // For updating specific rows
    ]);
    exit;
}
?>
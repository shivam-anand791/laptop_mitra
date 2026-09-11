<?php
// ajax/cart_handler.php
session_start();
require_once '../config/database.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Login required']);
    exit;
}

$user_id = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

// --- CONFIG COSTS ---
$warranty_cost = 1999;
$upgrade_cost_sell = 4000;
$upgrade_cost_lease = 500;

// --- ACTIONS ---

// 1. Update Quantity
if ($action === 'update_qty') {
    $cart_id = intval($input['cart_id']);
    $qty = intval($input['quantity']);
    if ($qty > 0) {
        $stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("iii", $qty, $cart_id, $user_id);
        $stmt->execute();
    }
}

// 2. Remove Item
if ($action === 'remove_item') {
    $cart_id = intval($input['cart_id']);
    $stmt = $conn->prepare("DELETE FROM cart WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $cart_id, $user_id);
    $stmt->execute();
}

// 3. Toggle Warranty (Bulk)
if ($action === 'toggle_warranty_bulk') {
    $state = intval($input['state']); // 1 or 0
    // Only apply to 'sell' items (purchase_mode != 'lease')
    $stmt = $conn->prepare("UPDATE cart SET has_warranty = ? WHERE user_id = ? AND purchase_mode != 'lease'");
    $stmt->bind_param("ii", $state, $user_id);
    $stmt->execute();
}

// --- RECALCULATE TOTALS AND RETURN DATA ---
// FIX: Using model_name instead of configuration
$sql = "SELECT c.id as cart_id, c.quantity, c.purchase_mode, c.has_warranty, c.model_name,
               l.price_individual_sell, l.price_individual_lease 
        FROM cart c 
        JOIN laptops l ON c.laptop_id = l.id 
        WHERE c.user_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$grand_total = 0;
$product_total = 0;
$warranty_total = 0;
$cart_count = 0;
$item_totals = [];

while ($row = $result->fetch_assoc()) {
    $cart_count++;

    // 1. Check Configuration (Pro vs Std) via Model Name
    $name_check = $row['model_name'] ?? '';
    $is_professional = (strpos($name_check, '16GB') !== false) || (strpos($name_check, 'Professional') !== false);
    
    // 2. Check Mode and Calculate Price
    if ($row['purchase_mode'] == 'lease') {
        $base_price = $row['price_individual_lease'];
        $upgrade_add = $is_professional ? $upgrade_cost_lease : 0;
        $is_warranty_eligible = false;
    } else {
        $base_price = $row['price_individual_sell'];
        $upgrade_add = $is_professional ? $upgrade_cost_sell : 0;
        $is_warranty_eligible = true;
    }

    $final_unit_price = $base_price + $upgrade_add;
    
    // Product Cost
    $p_cost = $final_unit_price * $row['quantity'];
    $product_total += $p_cost;
    
    // Warranty Cost
    $w_cost = 0;
    if ($is_warranty_eligible && $row['has_warranty'] == 1) {
        $w_cost = $warranty_cost * $row['quantity'];
        $warranty_total += $w_cost;
    }

    $row_total = $p_cost + $w_cost;
    $grand_total += $row_total;

    // Store specific row total to update UI per item
    $item_totals[$row['cart_id']] = $row_total;
}

echo json_encode([
    'status' => 'success',
    'grand_total' => $grand_total,
    'product_total' => $product_total,
    'warranty_total' => $warranty_total,
    'cart_count' => $cart_count,
    'item_totals' => $item_totals
]);
?>
<?php
// 1. Error Reporting ON (For Debugging)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 2. Start Session & Output Buffering
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
ob_start();

require_once 'config/database.php';

// 3. Auth Check
if (!isset($_SESSION['user_id'])) {
    $_SESSION['redirect_url'] = "checkout.php?" . $_SERVER['QUERY_STRING'];
    echo "<script>window.location.href='login.php';</script>";
    exit;
}

$user_id = $_SESSION['user_id'];
$checkout_items = [];
$total_amount = 0; 
$order_source = 'cart'; 
$error_state = false;
$error_message = "";

// Configuration Costs
$warranty_cost_per_unit = 1999;
$upgrade_cost_sell = 4000;
$upgrade_cost_lease = 500;

// ==========================================
// 4. STEP 1: DATA FETCHING
// ==========================================

// --- CASE A: DIRECT BUY ---
if (isset($_GET['type']) && $_GET['type'] == 'direct' && isset($_GET['id'])) {
    $order_source = 'direct';
    $direct_id = intval($_GET['id']);
    $direct_qty = isset($_GET['qty']) ? intval($_GET['qty']) : 1;
    $direct_mode = isset($_GET['mode']) ? $_GET['mode'] : 'sell';
    $direct_config = isset($_GET['config']) ? $_GET['config'] : '8GB';
    $direct_warranty = isset($_GET['warranty']) ? intval($_GET['warranty']) : 0; 
    
    if($direct_qty < 1) $direct_qty = 1;

    // Check DB Connection
    if(!isset($conn)) { die("Database connection failed. Check config/database.php"); }

    $stmt = $conn->prepare("SELECT id as laptop_id, model, image, price_individual_sell, price_individual_lease, stock_quantity FROM laptops WHERE id = ? AND status='active'");
    if(!$stmt) { die("Prepare failed: " . $conn->error); }
    
    $stmt->bind_param("i", $direct_id);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if($row = $res->fetch_assoc()) {
        if($row['stock_quantity'] >= $direct_qty) {
            
            $is_pro = (stripos($direct_config, '16GB') !== false);

            if($direct_mode == 'lease') {
                $base_price = $row['price_individual_lease'];
                $upgrade = $is_pro ? $upgrade_cost_lease : 0;
                $label = 'Lease';
                $direct_warranty = 0; 
            } else {
                $base_price = $row['price_individual_sell'];
                $upgrade = $is_pro ? $upgrade_cost_sell : 0;
                $label = 'Buy';
            }

            $unit_final_price = $base_price + $upgrade;
            $warranty_price_total = 0;

            if ($direct_warranty == 1) {
                $unit_final_price += $warranty_cost_per_unit;
                $warranty_price_total = $warranty_cost_per_unit;
            }

            $line_total = $unit_final_price * $direct_qty;

            $display_model = $row['model'];
            if($is_pro) $display_model .= " (16GB Pro)";
            else $display_model .= " (8GB Std)";

            $checkout_items[] = [
                'laptop_id' => $row['laptop_id'],
                'model' => $display_model,
                'image' => $row['image'],
                'quantity' => $direct_qty,
                'purchase_mode' => $direct_mode,
                'has_warranty' => $direct_warranty,
                'base_price' => ($base_price + $upgrade), 
                'warranty_cost' => $warranty_price_total,
                'final_price' => $unit_final_price,              
                'mode_label' => $label
            ];
            
            $total_amount += $line_total;

        } else {
             $error_state = true;
             $error_message = "Sorry, only " . $row['stock_quantity'] . " units available.";
        }
    } else {
        $error_state = true;
        $error_message = "Product not found.";
    }
    $stmt->close();
} 
// --- CASE B: FROM CART ---
else {
    if(!isset($conn)) { die("Database connection failed. Check config/database.php"); }

    $cart_sql = "SELECT c.quantity, c.purchase_mode, c.has_warranty, c.configuration, c.model_name,
                        l.id as laptop_id, l.brand, l.model, l.image, 
                        l.price_individual_sell, l.price_individual_lease, l.stock_quantity 
                 FROM cart c 
                 JOIN laptops l ON c.laptop_id = l.id 
                 WHERE c.user_id = ?";
    $cart_stmt = $conn->prepare($cart_sql);
    if(!$cart_stmt) { die("Cart Prepare failed: " . $conn->error); }

    $cart_stmt->bind_param("i", $user_id);
    $cart_stmt->execute();
    $cart_result = $cart_stmt->get_result();

    $items_removed_count = 0;

    while ($row = $cart_result->fetch_assoc()) {
        if ($row['stock_quantity'] >= $row['quantity']) {
            
            $config_val = !empty($row['configuration']) ? $row['configuration'] : '8GB';
            $is_pro = (stripos($config_val, '16GB') !== false);

            if($row['purchase_mode'] == 'lease') {
                $base_price = $row['price_individual_lease'];
                $upgrade = $is_pro ? $upgrade_cost_lease : 0;
                $label = 'Lease';
                $row['has_warranty'] = 0;
            } else {
                $base_price = $row['price_individual_sell'];
                $upgrade = $is_pro ? $upgrade_cost_sell : 0;
                $label = 'Buy';
            }

            $unit_base_with_upgrade = $base_price + $upgrade;
            $unit_final_price = $unit_base_with_upgrade;
            $warranty_price_total = 0;

            if ($row['has_warranty'] == 1) {
                $unit_final_price += $warranty_cost_per_unit;
                $warranty_price_total = $warranty_cost_per_unit;
            }

            $line_total = $unit_final_price * $row['quantity'];

            $display_name = !empty($row['model_name']) ? $row['model_name'] : $row['brand'] . ' ' . $row['model'];
            if (strpos($display_name, '16GB') === false && strpos($display_name, '8GB') === false) {
                $display_name .= $is_pro ? " (16GB Pro)" : " (8GB Std)";
            }

            $row['model'] = $display_name;
            $row['base_price'] = $unit_base_with_upgrade; 
            $row['warranty_cost'] = $warranty_price_total;
            $row['final_price'] = $unit_final_price;
            $row['mode_label'] = $label;
            
            $checkout_items[] = $row;
            $total_amount += $line_total;
        } else {
            $items_removed_count++; 
        }
    }

    if (empty($checkout_items) && !isset($_POST['place_order'])) {
        $error_state = true;
        $error_message = ($items_removed_count > 0) ? "Some items are out of stock." : "Your cart is empty.";
    }
}

if ($error_state) {
    echo "<script>alert('".addslashes($error_message)."'); window.location.href='store.php';</script>";
    exit;
}

// ==========================================
// 5. STEP 2: APPLY PROMO CODE
// ==========================================
$discount_amount = 0;
$applied_coupon_code = '';

if (isset($_SESSION['applied_coupon']) && !empty($_SESSION['applied_coupon'])) {
    $applied_coupon_code = $_SESSION['applied_coupon'];
    $discount_amount = isset($_SESSION['discount_amount']) ? floatval($_SESSION['discount_amount']) : 500;
}

if($discount_amount > $total_amount) {
    $discount_amount = $total_amount;
}

$final_payable = $total_amount - $discount_amount;
if($final_payable < 0) $final_payable = 0;


// ==========================================
// 6. ORDER PROCESSING
// ==========================================
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['place_order'])) {

    $post_order_source = $_POST['order_source']; 
    $payment_method = $_POST['payment_method'];
    
    $name = $_POST['name'];
    $email = $_POST['email'];
    $raw_phone = $_POST['phone'];
    $phone = preg_replace('/[^\d\+]/', '', $raw_phone); 
    $raw_alt_phone = isset($_POST['alt_phone']) ? $_POST['alt_phone'] : '';
    $alt_phone = preg_replace('/[^\d\+]/', '', $raw_alt_phone);
    
    $full_address = $_POST['house_no'] . ", " . $_POST['area'];
    if(!empty($_POST['landmark'])) { $full_address .= ", Near " . $_POST['landmark']; }
    $full_address .= ", " . $_POST['city'] . ", " . $_POST['state'] . " - " . $_POST['pincode'];
    $full_address .= " (" . $_POST['address_type'] . ")";
    if(!empty($alt_phone)) { $full_address .= " | Alt Contact: " . $alt_phone; }

    $final_process_items = $checkout_items;

   if ($payment_method === 'cod') {
        // --- COD LOGIC ---
        
        $sql_insert = "INSERT INTO bookings (laptop_id, laptop_name, customer_name, customer_email, customer_phone, purchase_type, quantity, address, city, state, pincode, price_per_unit, mode, status, created_at) VALUES (?, ?, ?, ?, ?, 'individual', ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())";
        
        $stmt = $conn->prepare($sql_insert);
        if(!$stmt) { die("Booking Prepare failed: " . $conn->error); }

        $update_stock_stmt = $conn->prepare("UPDATE laptops SET stock_quantity = stock_quantity - ?, sales_count = sales_count + ? WHERE id = ?");
        if(!$update_stock_stmt) { die("Stock Update Prepare failed: " . $conn->error); }

        if ($stmt && $update_stock_stmt) {
            foreach ($final_process_items as $item) {
                $db_model_name = $item['model'];
                if (isset($item['has_warranty']) && $item['has_warranty'] == 1) {
                    $db_model_name .= " (+ Extended Warranty)";
                }
                
                // 12 Parameters
                $stmt->bind_param("issssissssds", 
                    $item['laptop_id'], 
                    $db_model_name, 
                    $name, 
                    $email, 
                    $phone, 
                    $item['quantity'], 
                    $full_address, 
                    $_POST['city'], 
                    $_POST['state'], 
                    $_POST['pincode'], 
                    $item['final_price'], 
                    $item['purchase_mode']
                );
                
                if(!$stmt->execute()) {
                    die("Execute failed: " . $stmt->error);
                }

                // Capture the newly created booking ID for affiliate tracking
                $new_booking_id = $conn->insert_id;

                $update_stock_stmt->bind_param("iii", $item['quantity'], $item['quantity'], $item['laptop_id']);
                $update_stock_stmt->execute();

                // ==========================================
                // AFFILIATE EARNINGS LOGIC
                // ==========================================
                if (!empty($applied_coupon_code) && isset($_SESSION['referrer_id'])) {
                    $referrer_id = $_SESSION['referrer_id'];
                    $reward_per_laptop = 500.00;
                    
                    // Prevent users from using their own code
                    if ($referrer_id != $user_id) {
                        // Calculate total reward based on quantity purchased
                        $total_reward = $reward_per_laptop * $item['quantity'];

                        $stmt_earn = $conn->prepare("INSERT INTO affiliate_earnings (affiliate_id, buyer_id, booking_id, amount, status) VALUES (?, ?, ?, ?, 'pending')");
                        if ($stmt_earn) {
                            $stmt_earn->bind_param("iiid", $referrer_id, $user_id, $new_booking_id, $total_reward);
                            $stmt_earn->execute();
                            $stmt_earn->close();
                        }
                    }
                }
            }
            $stmt->close();
            $update_stock_stmt->close();

            // Insert into Coupon Usage Table
            if (!empty($applied_coupon_code)) {
                $cp_stmt = $conn->prepare("INSERT INTO coupon_usage (user_id, coupon_code, used_at) VALUES (?, ?, NOW())");
                
                if ($cp_stmt) {
                    $cp_stmt->bind_param("is", $user_id, $applied_coupon_code);
                    $cp_stmt->execute();
                    $cp_stmt->close();
                }
                
                // Clear Coupon Sessions
                unset($_SESSION['applied_coupon']);
                unset($_SESSION['discount_amount']);
                unset($_SESSION['referrer_id']);
            }

            // Clear Cart
            if ($post_order_source === 'cart') {
                $conn->query("DELETE FROM cart WHERE user_id = $user_id");
            }

            // Redirect
            $_SESSION['last_order_id'] = "ORD-" . time();
            $_SESSION['order_success'] = true;
            $_SESSION['last_order_amount'] = $final_payable; 
            
            echo "<script>window.location.href='order-success.php';</script>";
            exit;
        }
    }

    if ($payment_method === 'online') {
        // --- ONLINE LOGIC ---
        // Note: Affiliate earnings for online payments should be processed 
        // in your payment success webhook/callback file, not here.
        $_POST['phone'] = $phone; 
        $_POST['address'] = $full_address;
        $_SESSION['checkout_data'] = $_POST;
        $_SESSION['cart_items'] = $final_process_items; 
        $_SESSION['total_amount'] = $final_payable; 
        
        if(!empty($applied_coupon_code)) {
             $_SESSION['pending_coupon_usage'] = $applied_coupon_code;
             $_SESSION['pending_discount_amount'] = $discount_amount;
             // Ensure referrer ID is also passed along for the webhook
             $_SESSION['pending_referrer_id'] = isset($_SESSION['referrer_id']) ? $_SESSION['referrer_id'] : null;
        }

        header("Location: payments/create-order.php");
        exit;
    }
}

// Fetch User Data
$user_stmt = $conn->prepare("SELECT fullname, email, phone, address FROM users WHERE id = ?");
$user_stmt->bind_param("i", $user_id);
$user_stmt->execute();
$user_res = $user_stmt->get_result();
$user = $user_res->fetch_assoc();
if (!$user) {
    $user = ['fullname' => '', 'email' => '', 'phone' => '', 'address' => ''];
}

require_once 'includes/header.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Checkout | LaptopMitra</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <style>
        :root {
            --primary: #0f172a;
            --primary-light: #f1f5f9;
            --accent: #2563eb;
            --accent-hover: #1d4ed8;
            --bg-body: #f8fafc;
            --bg-card: #ffffff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --radius: 12px;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
            --shadow-md: 0 4px 15px rgba(0,0,0,0.05);
        }

        body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            background-color: var(--bg-body); 
            color: var(--text-main); 
            margin: 0; 
            padding-bottom: 50px;
        }
        
        * { box-sizing: border-box; }

        .checkout-wrapper { 
            max-width: 1200px; 
            width: 94%; 
            margin: 0 auto; 
            padding-top: 40px; 
        }
        
        .checkout-header { margin-bottom: 30px; }
        .checkout-header h1 { 
            font-size: 2rem; 
            font-weight: 800; 
            color: var(--primary); 
            margin: 0; 
            letter-spacing: -0.5px;
        }
        .checkout-header p { 
            color: var(--text-muted); 
            font-size: 1rem; 
            margin-top: 8px; 
        }

        .checkout-grid { 
            display: grid; 
            grid-template-columns: 1.6fr 1fr; 
            gap: 30px; 
            align-items: flex-start; 
        }
        
        .forms-container { display: flex; flex-direction: column; gap: 24px; }
        
        .card-box { 
            background: var(--bg-card); 
            border-radius: var(--radius); 
            padding: 25px; 
            box-shadow: var(--shadow-sm); 
            border: 1px solid var(--border); 
        }
        
        .card-title { 
            font-size: 1.1rem; 
            font-weight: 700; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            color: var(--primary); 
            border-bottom: 1px solid var(--primary-light); 
            padding-bottom: 15px; 
        }
        .card-title i { 
            color: var(--accent); 
            background: #eff6ff; 
            padding: 8px; 
            border-radius: 8px; 
            font-size: 1rem;
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .form-group { margin-bottom: 20px; } 
        .form-group:last-child { margin-bottom: 0; }
        
        label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--text-main); }
        
        .form-input { 
            width: 100%; padding: 12px 16px; 
            border: 1px solid var(--border); border-radius: 8px; 
            font-size: 0.95rem; font-family: inherit; color: var(--text-main);
            transition: all 0.2s ease; background: #fff;
        }
        .form-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
        .form-input[readonly] { background-color: #f1f5f9; color: #64748b; cursor: not-allowed; }
        
        select.form-input { cursor: pointer; }

        .payment-options { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .payment-label { cursor: pointer; position: relative; }
        .payment-radio { position: absolute; opacity: 0; }
        
        .payment-card { 
            border: 1px solid var(--border); border-radius: 10px; 
            padding: 18px; text-align: center; background: #fff; 
            transition: all 0.2s ease; display: flex; flex-direction: column; 
            align-items: center; gap: 10px; height: 100%; justify-content: center;
        }
        
        .payment-card i { font-size: 1.6rem; color: #cbd5e1; transition: 0.2s; }
        .payment-card span { font-weight: 600; font-size: 0.9rem; color: var(--text-muted); }

        .payment-radio:checked + .payment-card { 
            border-color: var(--accent); 
            background: #eff6ff; 
            color: var(--accent);
        }
        .payment-radio:checked + .payment-card i { color: var(--accent); }

        .sticky-summary { position: sticky; top: 100px; }
        
        .summary-card { 
            background: #ffffff; 
            border-radius: var(--radius); 
            padding: 25px; 
            box-shadow: var(--shadow-md); 
            border: 1px solid var(--border);
            color: var(--text-main);
        }

        .summary-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--primary);
            margin: 0 0 20px 0;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--primary-light);
        }

        .order-item { 
            display: flex; gap: 15px; 
            padding: 15px 0; 
            border-bottom: 1px solid var(--primary-light);
        }
        .order-item:last-child { border-bottom: none; }

        .item-img { 
            width: 60px; height: 60px; 
            background: #f8fafc; 
            border: 1px solid var(--border);
            border-radius: 8px; 
            object-fit: contain; padding: 4px; 
            flex-shrink: 0; 
        }
        
        .item-info { flex-grow: 1; }
        .item-info h4 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text-main); line-height: 1.4; }
        .item-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 5px; display: flex; flex-wrap: wrap; gap: 6px; }
        
        .tag { padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.5px; }
        .tag-buy { background: #dcfce7; color: #15803d; }
        .tag-lease { background: #ffedd5; color: #c2410c; }
        .tag-warranty { background: #e0f2fe; color: #0369a1; display: flex; align-items: center; gap: 4px; margin-top: 4px; width: fit-content; font-size: 0.7rem; }

        .item-price {
            font-weight: 700;
            font-size: 0.95rem;
            color: var(--primary);
            text-align: right;
            min-width: 70px;
        }

        .price-breakdown { margin-top: 25px; padding-top: 20px; border-top: 2px dashed var(--border); }
        .price-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.95rem; color: var(--text-muted); }
        
        .price-row.total { 
            border-top: 1px solid var(--border); 
            padding-top: 15px; margin-top: 15px; 
            color: var(--primary); 
            font-size: 1.3rem; 
            font-weight: 800; 
            align-items: center; 
        }
        
        .submit-btn { 
            width: 100%; background: var(--primary); color: white; border: none; 
            padding: 16px; border-radius: 10px; font-size: 1rem; font-weight: 700; 
            cursor: pointer; margin-top: 25px; transition: all 0.2s; 
            display: flex; justify-content: center; align-items: center; gap: 10px; 
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }
        .submit-btn:hover { background: #334155; transform: translateY(-2px); }
        .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }

        .secure-badge { text-align: center; margin-top: 15px; font-size: 0.8rem; color: #94a3b8; display: flex; justify-content: center; gap: 6px; align-items: center; }

        /* Promo Code Styles */
        .promo-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed var(--border); }
        .promo-flex { display: flex; gap: 10px; }
        .promo-input-group { position: relative; flex-grow: 1; }
        .promo-input-group i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #cbd5e1; }
        .promo-input { padding-left: 35px; text-transform: uppercase; font-weight: 700; width: 100%; height: 100%; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; }
        .promo-btn { 
            padding: 0 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; border: none; transition: 0.2s; height: 42px;
        }
        .btn-apply { background: var(--primary); color: white; }
        .btn-apply:hover { background: #334155; }
        .btn-remove { background: #fee2e2; color: #ef4444; }
        .btn-remove:hover { background: #fecaca; }
        .promo-msg { font-size: 0.8rem; font-weight: 700; margin-top: 8px; display: flex; align-items: center; gap: 5px; }
        .text-success { color: #16a34a; }
        .text-error { color: #ef4444; }
        .hidden { display: none; }

        @media (max-width: 992px) { 
            .checkout-grid { grid-template-columns: 1fr; gap: 20px; } 
            .sticky-summary { position: static; margin-top: 10px; }
            .checkout-wrapper { padding-top: 20px; width: 95%; }
            .summary-card { order: 2; }
            .forms-container { order: 1; }
        }

        @media (max-width: 600px) { 
            .checkout-header h1 { font-size: 1.5rem; }
            .form-grid { grid-template-columns: 1fr; gap: 15px; }
            .payment-options { grid-template-columns: 1fr; } 
            .card-box, .summary-card { padding: 20px 15px; }
            .item-img { width: 50px; height: 50px; }
            .item-info h4 { font-size: 0.85rem; }
            .price-row.total { font-size: 1.15rem; }
            .form-input, .submit-btn { padding: 14px; font-size: 16px; }
        }
    </style>
</head>
<body>

<div class="checkout-wrapper">
    
    <div class="checkout-header">
        <h1>Checkout</h1>
        <p>Complete your purchase securely.</p>
    </div>

    <form method="POST" action="" id="checkoutForm">
        <input type="hidden" name="place_order" value="1">
        <input type="hidden" name="order_source" value="<?php echo $order_source; ?>">
        
        <div class="checkout-grid">
            
            <div class="forms-container">
                
                <div class="card-box">
                    <div class="card-title"><i class="fas fa-user"></i> Contact Details</div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" name="name" class="form-input" value="<?php echo htmlspecialchars($user['fullname']); ?>" required>
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" name="phone" id="phone" class="form-input phone-input" value="<?php echo htmlspecialchars($user['phone']); ?>" required placeholder="10-digit number">
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" name="email" class="form-input" value="<?php echo htmlspecialchars($user['email']); ?>" readonly>
                        </div>
                        <div class="form-group">
                            <label>Alt. Phone (Optional)</label>
                            <input type="tel" name="alt_phone" class="form-input phone-input" placeholder="Secondary contact">
                        </div>
                    </div>
                </div>

                <div class="card-box">
                    <div class="card-title"><i class="fas fa-map-marker-alt"></i> Shipping Address</div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Pincode</label>
                            <input type="text" name="pincode" id="pincode" class="form-input numeric-only" required pattern="[0-9]{6}" maxlength="6" placeholder="e.g. 110001">
                        </div>
                        <div class="form-group">
                            <label>City</label>
                            <input type="text" name="city" class="form-input" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>House No, Building, Street</label>
                        <input type="text" name="house_no" class="form-input" required placeholder="Flat No 101, Galaxy Apartments...">
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Landmark</label>
                            <input type="text" name="area" class="form-input" required placeholder="Near Metro Station...">
                        </div>
                        <div class="form-group">
                            <label>State</label>
                            <select name="state" class="form-input" required>
                                <option value="">Select State</option>
                                <option value="Maharashtra">Maharashtra</option>
                                <option value="Delhi">Delhi</option>
                                <option value="Karnataka">Karnataka</option>
                                <option value="Uttar Pradesh">Uttar Pradesh</option>
                                <option value="Bihar">Bihar</option>
                                <option value="Haryana">Haryana</option>
                                <option value="Punjab">Punjab</option>
                                <option value="West Bengal">West Bengal</option>
                                <option value="Tamil Nadu">Tamil Nadu</option>
                                <option value="Telangana">Telangana</option>
                                <option value="Gujarat">Gujarat</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Save Address As</label>
                        <div style="display:flex; gap:20px; margin-top:10px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:500;">
                                <input type="radio" name="address_type" value="Home" checked> <i class="fas fa-home"></i> Home
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:500;">
                                <input type="radio" name="address_type" value="Work"> <i class="fas fa-briefcase"></i> Work
                            </label>
                        </div>
                    </div>
                </div>

                <div class="card-box">
                    <div class="card-title"><i class="fas fa-wallet"></i> Payment Method</div>
                    <div class="payment-options">
                        <label class="payment-label">
                            <input type="radio" name="payment_method" value="cod" class="payment-radio" checked onchange="updateButtonText()">
                            <div class="payment-card">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>Cash on Delivery</span>
                            </div>
                        </label>
                        <label class="payment-label">
                            <input type="radio" name="payment_method" value="online" class="payment-radio" onchange="updateButtonText()">
                            <div class="payment-card">
                                <i class="fas fa-qrcode"></i>
                                <span>UPI / Cards / NetBanking</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div class="sticky-summary">
                <div class="summary-card">
                    <h3 class="summary-title">Order Summary</h3>
                    
                    <?php foreach ($checkout_items as $item): ?>
                        <div class="order-item">
                            <?php if(!empty($item['image'])): ?>
                                <img src="admin/uploads/<?php echo htmlspecialchars($item['image']); ?>" class="item-img">
                            <?php else: ?>
                                <img src="assets/no-image.png" class="item-img">
                            <?php endif; ?>
                            
                            <div class="item-info">
                                <h4><?php echo htmlspecialchars($item['model']); ?></h4>
                                <div class="item-meta">
                                    <span class="tag <?php echo ($item['purchase_mode'] == 'lease') ? 'tag-lease' : 'tag-buy'; ?>">
                                        <?php echo $item['mode_label']; ?>
                                    </span>
                                    <span>x<?php echo $item['quantity']; ?></span>
                                </div>
                                <?php if(isset($item['has_warranty']) && $item['has_warranty'] == 1): ?>
                                    <div class="tag tag-warranty"><i class="fas fa-shield-alt"></i> +1 Yr Warranty</div>
                                <?php endif; ?>
                            </div>
                            <div class="item-price">
                                ₹<?php echo number_format($item['final_price'] * $item['quantity']); ?>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <div class="promo-section" style="margin-top: 20px;">
                        <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; display:block;">PROMO CODE</label>
                        <div class="promo-flex">
                            <div class="promo-input-group">
                                <i class="fas fa-ticket-alt"></i>
                                <input type="text" id="promoInput" class="form-input promo-input" placeholder="ENTER CODE" 
                                       value="<?php echo htmlspecialchars($applied_coupon_code); ?>"
                                       <?php echo !empty($applied_coupon_code) ? 'disabled' : ''; ?>>
                            </div>
                            <button onclick="applyPromo()" id="btnApplyPromo" type="button" class="promo-btn btn-apply <?php echo !empty($applied_coupon_code) ? 'hidden' : ''; ?>">
                                Apply
                            </button>
                            <button onclick="removePromo()" id="btnRemovePromo" type="button" class="promo-btn btn-remove <?php echo empty($applied_coupon_code) ? 'hidden' : ''; ?>">
                                Remove
                            </button>
                        </div>
                        <p id="promoMessage" class="promo-msg <?php echo !empty($applied_coupon_code) ? 'text-success' : 'hidden'; ?>">
                            <?php if(!empty($applied_coupon_code)): ?>
                                <i class="fas fa-check-circle"></i> Coupon Applied!
                            <?php endif; ?>
                        </p>
                    </div>

                    <div class="price-breakdown">
                        <div class="price-row">
                            <span>Subtotal</span>
                            <span>₹<?php echo number_format($total_amount); ?></span>
                        </div>
                        
                        <?php if($discount_amount > 0): ?>
                        <div class="price-row" style="color: #16a34a; font-weight: 700; background: #f0fdf4; padding: 8px; border-radius: 6px;">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-tag"></i> 
                                Code Applied: <?php echo htmlspecialchars($applied_coupon_code); ?>
                            </span>
                            <span>- ₹<?php echo number_format($discount_amount); ?></span>
                        </div>
                        <?php endif; ?>

                        <div class="price-row">
                            <span>Shipping</span>
                            <span style="color:#16a34a; font-weight:bold;">FREE</span>
                        </div>
                        
                        <div class="price-row total">
                            <span>Total Amount</span>
                            <span>₹<?php echo number_format($final_payable); ?></span>
                        </div>
                    </div>

                    <button type="submit" name="place_order" id="submitBtn" class="submit-btn">
                        Place Order
                    </button>
                    
                    <div class="secure-badge">
                        <i class="fas fa-lock"></i> 256-bit SSL Encrypted
                    </div>
                </div>
            </div>

        </div>
    </form>
</div>

<?php include 'includes/footer.php'; ?>
<?php ob_end_flush(); ?>

<script>
    // 1. Input Restrictions
    document.querySelectorAll('.numeric-only').forEach(i => i.addEventListener('input', function(){ this.value = this.value.replace(/[^0-9]/g, ''); }));
    document.querySelectorAll('.phone-input').forEach(i => i.addEventListener('input', function(){ this.value = this.value.replace(/[^0-9+\s-]/g, ''); }));

    // ===============================================
    // 2. DATA PERSISTENCE (FIX FOR RELOAD ISSUE)
    // ===============================================
    function saveFormData() {
        // Collect all form values safely
        const hVal = document.querySelector('input[name="house_no"]').value;
        const aVal = document.querySelector('input[name="area"]').value;
        const cVal = document.querySelector('input[name="city"]').value;
        const sVal = document.querySelector('select[name="state"]').value;
        const pVal = document.querySelector('input[name="pincode"]').value;
        const altVal = document.querySelector('input[name="alt_phone"]').value;
        const rVal = document.querySelector('input[name="address_type"]:checked')?.value;

        const formData = {
            house_no: hVal,
            area: aVal,
            city: cVal,
            state: sVal,
            pincode: pVal,
            alt_phone: altVal,
            address_type: rVal
        };
        sessionStorage.setItem('checkout_backup', JSON.stringify(formData));
    }

    function restoreFormData() {
        const backup = sessionStorage.getItem('checkout_backup');
        if (backup) {
            try {
                const data = JSON.parse(backup);
                if(data.house_no) document.querySelector('input[name="house_no"]').value = data.house_no;
                if(data.area) document.querySelector('input[name="area"]').value = data.area;
                if(data.city) document.querySelector('input[name="city"]').value = data.city;
                if(data.state) document.querySelector('select[name="state"]').value = data.state;
                if(data.pincode) document.querySelector('input[name="pincode"]').value = data.pincode;
                if(data.alt_phone) document.querySelector('input[name="alt_phone"]').value = data.alt_phone;
                if(data.address_type) {
                    // Safe selector
                    const radios = document.getElementsByName('address_type');
                    for(let i=0; i<radios.length; i++) {
                        if(radios[i].value == data.address_type) {
                            radios[i].checked = true;
                        }
                    }
                }
            } catch(e) { console.error("Restore error", e); }
            
            // Clear storage after restoring
            sessionStorage.removeItem('checkout_backup');
        }
    }

    // Call restore on page load
    document.addEventListener("DOMContentLoaded", restoreFormData);

    // 3. Dynamic Button Text
    function updateButtonText() {
        const cod = document.querySelector('input[name="payment_method"][value="cod"]').checked;
        const btn = document.getElementById('submitBtn');
        const finalAmt = "<?php echo number_format($final_payable); ?>";
        
        if(cod) {
            btn.innerHTML = 'Place Order <i class="fas fa-check-circle"></i>';
            btn.style.background = '#0f172a'; // Primary Dark
        } else {
            btn.innerHTML = 'Pay ₹' + finalAmt + ' <i class="fas fa-arrow-right"></i>';
            btn.style.background = '#2563eb'; // Accent Blue
        }
    }
    updateButtonText();

    // 4. Promo Code Functions
    function applyPromo() {
        const code = document.getElementById('promoInput').value.trim();
        const btnApply = document.getElementById('btnApplyPromo');
        const msg = document.getElementById('promoMessage');

        if(code.length === 0) {
            alert('Please enter a code');
            return;
        }

        // SAVE DATA BEFORE REQUEST/RELOAD
        saveFormData();

        btnApply.disabled = true;
        btnApply.innerHTML = "...";

        fetch('ajax/validate_coupon.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ code: code })
        })
        .then(res => res.json())
        .then(data => {
            btnApply.disabled = false;
            btnApply.innerHTML = "Apply";

            if(data.status === 'success') {
                // Reload page to reflect PHP price changes
                location.reload(); 
            } else {
                msg.innerText = data.message;
                msg.className = "promo-msg text-error";
                msg.classList.remove('hidden');
                // If error, no reload needed, but clean up just in case
                sessionStorage.removeItem('checkout_backup');
            }
        })
        .catch(err => {
            console.error(err);
            btnApply.disabled = false;
            btnApply.innerHTML = "Apply";
            alert('Network Error');
        });
    }

    function removePromo() {
        // Save data before reload here too
        saveFormData();
        fetch('ajax/clear_coupon.php')
        .then(() => location.reload())
        .catch(() => location.reload());
    }

    // 5. Form Submission Validation
    document.getElementById('checkoutForm').addEventListener('submit', function(e) {
        
        // Basic check for empty fields (Address, City, Pincode)
        const house = document.querySelector('input[name="house_no"]').value.trim();
        const pincode = document.querySelector('input[name="pincode"]').value.trim();
        const city = document.querySelector('input[name="city"]').value.trim();
        
        if(house === "" || pincode === "" || city === "") {
            e.preventDefault();
            Swal.fire({
                icon: 'warning',
                title: 'Missing Details',
                text: 'Please fill in your complete address before placing the order.',
                confirmButtonColor: '#0f172a'
            });
            return;
        }

        const phone = document.getElementById('phone').value.replace(/\D/g, '');
        if (phone.length < 10) {
            e.preventDefault();
            Swal.fire({
                icon: 'error',
                title: 'Invalid Phone Number',
                text: 'Please enter a valid 10-digit mobile number.',
                confirmButtonColor: '#0f172a'
            });
            return;
        }
        
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
    });
</script>

</body>
</html>
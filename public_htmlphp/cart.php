<?php
// cart.php
session_start();
require_once 'config/database.php';

// 1. Auth Check
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$user_id = $_SESSION['user_id'];

// --- CONFIGURATION COSTS (Must match laptop-details.php logic) ---
$warranty_price = 1999;
$upgrade_cost_sell = 4000; 
$upgrade_cost_lease = 500;

// 2. Fetch Cart Data
$sql = "SELECT c.id as cart_id, c.quantity, c.purchase_mode, c.model_name, 
               c.configuration, c.has_warranty, c.price as saved_price,
               l.id as laptop_id, l.brand, l.image, 
               l.price_individual_sell, l.price_individual_lease 
        FROM cart c 
        JOIN laptops l ON c.laptop_id = l.id 
        WHERE c.user_id = ?
        ORDER BY c.id DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$cart_items = [];
$total_product_value = 0; 
$total_warranty_value = 0;
$grand_total = 0;

$eligible_warranty_count = 0;
$active_warranty_count = 0;

while ($row = $result->fetch_assoc()) {
    
    // A. Detect Configuration
    $config_val = !empty($row['configuration']) ? $row['configuration'] : '8GB';
    $is_professional = (stripos($config_val, '16GB') !== false);
    $has_warranty = ($row['has_warranty'] == 1);

    // B. Determine Base Price & Type
    $is_lease = ($row['purchase_mode'] == 'lease');

    if ($is_lease) {
        $base_price = $row['price_individual_lease'];
        $upgrade_add = $is_professional ? $upgrade_cost_lease : 0;
        
        $row['type_label'] = 'RENT';
        $row['type_class'] = 'bg-orange-100 text-orange-700 border-orange-200';
        $row['price_suffix'] = '/mo';
        $is_warranty_eligible = false; 
    } else {
        $base_price = $row['price_individual_sell'];
        $upgrade_add = $is_professional ? $upgrade_cost_sell : 0;

        $row['type_label'] = 'BUY';
        $row['type_class'] = 'bg-sky-100 text-sky-700 border-sky-200';
        $row['price_suffix'] = '';
        $is_warranty_eligible = true;
    }

    // C. Calculate Unit Price
    $unit_price_device = $base_price + $upgrade_add;

    // D. Calculate Row Totals
    $row_device_total = $unit_price_device * $row['quantity'];
    $row_warranty_total = 0;

    if ($is_warranty_eligible) {
        $eligible_warranty_count += $row['quantity'];
        if ($has_warranty) {
            $row_warranty_total = $warranty_price * $row['quantity'];
            $active_warranty_count += $row['quantity'];
        }
    }

    // E. Add to Grand Totals
    $total_product_value += $row_device_total;
    $total_warranty_value += $row_warranty_total;

    // F. Prepare Display Data
    $display_name = $row['brand'] . ' ' . $row['model_name'];
    if(empty($row['model_name'])) {
         $display_name = $row['brand'] . ' Laptop'; 
    }
    
    $row['display_name'] = $display_name;
    $row['is_professional'] = $is_professional;
    $row['is_warranty_eligible'] = $is_warranty_eligible;
    $row['row_total_display'] = $row_device_total + $row_warranty_total; 
    
    $cart_items[] = $row;
}

// --- 3. PROMO CODE LOGIC ---
$discount_amount = 0;
$applied_coupon = '';

// Check if coupon is in session AND cart is not empty
if (isset($_SESSION['applied_coupon']) && count($cart_items) > 0) {
    $applied_coupon = $_SESSION['applied_coupon'];
    $discount_amount = isset($_SESSION['discount_amount']) ? $_SESSION['discount_amount'] : 500;
} else {
    // If cart is empty, remove coupon to prevent stale data
    unset($_SESSION['applied_coupon']);
    unset($_SESSION['discount_amount']);
    unset($_SESSION['referrer_id']);
}

$grand_total = $total_product_value + $total_warranty_value;
$final_payable = $grand_total - $discount_amount;
if($final_payable < 0) $final_payable = 0;

$all_warranty_active = ($eligible_warranty_count > 0 && $eligible_warranty_count == $active_warranty_count);

require_once 'includes/header.php'; 
?>

<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopping Cart | LaptopMitra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        .cart-item { transition: all 0.3s ease; }
        .cart-item:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); }
        .toggle-checkbox { appearance: none; width: 22px; height: 22px; border: 2px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; position: relative; transition: 0.2s; }
        .toggle-checkbox:checked { background: #0f172a; border-color: #0f172a; }
        .toggle-checkbox:checked::after { content: '\f00c'; font-family: 'Font Awesome 6 Free'; font-weight: 900; color: white; font-size: 12px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); z-index: 9999; display: none; align-items: center; justify-content: center; }
    </style>
</head>
<body class="flex flex-col min-h-screen">

    <div id="globalLoader" class="loading-overlay">
        <div class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-sky-600"></div>
            <span class="text-sm font-bold text-slate-500 animate-pulse">Updating Cart...</span>
        </div>
    </div>

    <main class="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 pt-28">
        <div class="flex items-end justify-between mb-8">
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Shopping Cart</h1>
            <span class="text-sm font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm" id="headerCount">
                <?php echo count($cart_items); ?> Items
            </span>
        </div>

        <?php if (count($cart_items) > 0): ?>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <div class="lg:col-span-8 space-y-4">
                    <?php foreach ($cart_items as $item): ?>
                        <div class="cart-item bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-5 relative overflow-hidden group" id="item-<?php echo $item['cart_id']; ?>">
                            
                            <a href="laptop-details.php?id=<?php echo $item['laptop_id']; ?>" class="shrink-0 relative group-hover:scale-105 transition-transform duration-300">
                                <div class="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center p-2">
                                    <?php if(!empty($item['image'])): ?>
                                        <img src="admin/uploads/<?php echo htmlspecialchars($item['image']); ?>" class="max-w-full max-h-full object-contain mix-blend-multiply">
                                    <?php else: ?>
                                        <img src="assets/no-image.png" class="max-w-full max-h-full object-contain opacity-50">
                                    <?php endif; ?>
                                </div>
                            </a>

                            <div class="flex-1 flex flex-col justify-center">
                                <div class="flex justify-between items-start">
                                    <div class="w-full pr-4">
                                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"><?php echo htmlspecialchars($item['brand']); ?></p>
                                        <h3 class="text-base sm:text-lg font-bold text-slate-900 leading-tight mb-2 hover:text-sky-600 transition line-clamp-2">
                                            <a href="laptop-details.php?id=<?php echo $item['laptop_id']; ?>"><?php echo htmlspecialchars($item['model_name']); ?></a>
                                        </h3>
                                        
                                        <div class="flex flex-wrap items-center gap-2 mb-3">
                                            <span class="text-[10px] font-bold px-2 py-0.5 rounded border <?php echo $item['type_class']; ?>">
                                                <?php echo $item['type_label']; ?>
                                            </span>

                                            <?php if($item['is_professional']): ?>
                                                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-100 flex items-center gap-1">
                                                    <i class="fa-solid fa-microchip"></i> 16GB Professional
                                                </span>
                                            <?php else: ?>
                                                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">
                                                    8GB Standard
                                                </span>
                                            <?php endif; ?>

                                            <?php if($item['has_warranty']): ?>
                                                <span class="warranty-badge text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1">
                                                    <i class="fa-solid fa-shield-check"></i> +1 Yr Warranty
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    
                                    <div class="text-right hidden sm:block min-w-[100px]">
                                        <div class="text-lg font-bold text-slate-900 row-total" data-id="<?php echo $item['cart_id']; ?>">
                                            ₹<?php echo number_format($item['row_total_display']); ?>
                                        </div>
                                        <?php if(!empty($item['price_suffix'])): ?>
                                            <div class="text-[10px] text-slate-400 font-bold uppercase"><?php echo $item['price_suffix']; ?></div>
                                        <?php endif; ?>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
                                    <div class="flex items-center gap-4">
                                        <div class="flex items-center bg-slate-100 rounded-lg p-1 h-8">
                                            <button onclick="updateQty(<?php echo $item['cart_id']; ?>, -1)" class="w-6 h-full rounded-md bg-white text-slate-600 hover:text-sky-600 shadow-sm flex items-center justify-center transition active:scale-95">
                                                <i class="fa-solid fa-minus text-[10px]"></i>
                                            </button>
                                            <input type="text" readonly value="<?php echo $item['quantity']; ?>" id="qty-<?php echo $item['cart_id']; ?>" class="w-8 bg-transparent text-center text-xs font-bold text-slate-800 outline-none">
                                            <button onclick="updateQty(<?php echo $item['cart_id']; ?>, 1)" class="w-6 h-full rounded-md bg-white text-slate-600 hover:text-sky-600 shadow-sm flex items-center justify-center transition active:scale-95">
                                                <i class="fa-solid fa-plus text-[10px]"></i>
                                            </button>
                                        </div>

                                        <button onclick="removeItem(<?php echo $item['cart_id']; ?>)" class="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition group/trash px-2 py-1 rounded hover:bg-red-50">
                                            <i class="fa-regular fa-trash-can"></i>
                                            <span class="hidden sm:inline">Remove</span>
                                        </button>
                                    </div>
                                    
                                    <div class="sm:hidden text-right">
                                        <span class="text-base font-bold text-slate-900 row-total-mobile" data-id="<?php echo $item['cart_id']; ?>">
                                            ₹<?php echo number_format($item['row_total_display']); ?>
                                        </span>
                                        <?php if(!empty($item['price_suffix'])): ?>
                                            <span class="text-[10px] text-slate-400 font-bold"><?php echo $item['price_suffix']; ?></span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="lg:col-span-4 relative">
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sticky top-24">
                        <h2 class="text-lg font-bold text-slate-900 mb-6 pb-4 border-b border-slate-100">Order Summary</h2>

                        <?php if($eligible_warranty_count > 0): ?>
                        <div class="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 mb-6 flex gap-3 transition-colors hover:border-sky-300 group select-none">
                            <div class="pt-1">
                                <input type="checkbox" id="warrantyToggle" class="toggle-checkbox" 
                                       <?php echo $all_warranty_active ? 'checked' : ''; ?> 
                                       onchange="toggleWarranty(this)">
                            </div>
                            <div class="flex-1">
                                <label for="warrantyToggle" class="block text-sm font-bold text-slate-900 cursor-pointer group-hover:text-sky-700 transition-colors">
                                    Extend Warranty
                                    <span class="ml-2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded tracking-wide uppercase">Recommended</span>
                                </label>
                                <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Get <span class="text-emerald-600 font-bold">+1 Year Protection</span> for eligible devices.
                                </p>
                                <p class="text-xs font-bold text-slate-900 mt-2">+ ₹1,999 <span class="font-normal text-slate-400">/ device</span></p>
                            </div>
                        </div>
                        <?php endif; ?>

                        <!--<div class="mb-6">-->
                        <!--    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Promo Code</label>-->
                        <!--    <div class="flex gap-2">-->
                        <!--        <div class="relative flex-1">-->
                        <!--            <i class="fa-solid fa-ticket absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>-->
                        <!--            <input type="text" id="promoInput" placeholder="MITRA..." -->
                        <!--                   value="<?php echo htmlspecialchars($applied_coupon); ?>"-->
                        <!--                   <?php echo !empty($applied_coupon) ? 'disabled' : ''; ?>-->
                        <!--                   class="w-full pl-9 pr-3 py-2.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase transition-all">-->
                        <!--        </div>-->
                        <!--        <button onclick="applyPromo()" id="btnApplyPromo" -->
                        <!--                class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 rounded-lg transition-colors <?php echo !empty($applied_coupon) ? 'hidden' : ''; ?>">-->
                        <!--            Apply-->
                        <!--        </button>-->
                        <!--        <button onclick="removePromo()" id="btnRemovePromo" -->
                        <!--                class="bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold px-4 rounded-lg transition-colors <?php echo empty($applied_coupon) ? 'hidden' : ''; ?>">-->
                        <!--            Remove-->
                        <!--        </button>-->
                        <!--    </div>-->
                        <!--    <p id="promoMessage" class="mt-2 text-xs font-bold <?php echo !empty($applied_coupon) ? 'text-green-600' : 'hidden'; ?>">-->
                        <!--        <i class="fa-solid fa-check-circle"></i> Referral Applied! ₹<?php echo $discount_amount; ?> OFF-->
                        <!--    </p>-->
                        <!--</div>-->

                        <div class="space-y-3 text-sm text-slate-600 mb-6">
                            <div class="flex justify-between">
                                <span>Product Total</span>
                                <span class="font-bold text-slate-900" id="summ-product">₹<?php echo number_format($total_product_value); ?></span>
                            </div>
                            
                            <div id="summ-warranty-row" class="flex justify-between <?php echo ($total_warranty_value > 0) ? '' : 'hidden'; ?>">
                                <span class="flex items-center gap-1.5 text-emerald-600 font-medium">
                                    <i class="fa-solid fa-shield-halved text-xs"></i> Protection Plan
                                </span>
                                <span class="font-bold text-emerald-600" id="summ-warranty">₹<?php echo number_format($total_warranty_value); ?></span>
                            </div>

                            <div class="flex justify-between">
                                <span>Shipping</span>
                                <span class="text-emerald-600 font-bold">Free</span>
                            </div>

                            <div id="summ-discount-row" class="flex justify-between <?php echo ($discount_amount > 0) ? '' : 'hidden'; ?>">
                                <span class="flex items-center gap-1.5 text-sky-600 font-medium">
                                    <i class="fa-solid fa-ticket text-xs"></i> Referral Discount
                                </span>
                                <span class="font-bold text-sky-600">- ₹<?php echo number_format($discount_amount); ?></span>
                            </div>
                        </div>

                        <div class="border-t border-dashed border-slate-200 pt-4 flex justify-between items-end mb-6">
                            <span class="text-sm font-bold text-slate-500">Total Amount</span>
                            <span class="text-3xl font-extrabold text-slate-900" id="summ-total">₹<?php echo number_format($final_payable); ?></span>
                        </div>

                        <a href="checkout.php" class="block w-full bg-[#0f172a] hover:bg-slate-800 text-white text-center font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                            Proceed to Checkout <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>
                        </a>

                        <div class="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                            <i class="fa-solid fa-lock text-slate-300"></i> SSL Secured Payment
                        </div>
                    </div>
                </div>

            </div>
        <?php else: ?>
            <div class="flex flex-col items-center justify-center py-20 min-h-[400px]">
                <div class="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative">
                    <i class="fa-solid fa-cart-shopping text-4xl text-slate-300"></i>
                    <div class="absolute top-2 right-4 w-4 h-4 bg-red-400 rounded-full animate-ping"></div>
                </div>
                <h2 class="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
                <p class="text-slate-500 mb-8 max-w-sm text-center">Looks like you haven't made your choice yet. Browse our collection of premium refurbished laptops.</p>
                <a href="store.php" class="inline-flex items-center gap-2 bg-sky-600 text-white font-bold py-3.5 px-8 rounded-full shadow-lg hover:bg-sky-700 hover:shadow-sky-200 transition-all hover:-translate-y-1">
                    Start Shopping <i class="fa-solid fa-arrow-right"></i>
                </a>
            </div>
        <?php endif; ?>
    </main>

    <?php include 'includes/footer.php'; ?>

    <script>
        const formatMoney = (amount) => '₹' + new Intl.NumberFormat('en-IN').format(amount);
        
        const toggleLoader = (show) => {
            const loader = document.getElementById('globalLoader');
            if(loader) loader.style.display = show ? 'flex' : 'none';
        }

        // --- PROMO CODE FUNCTIONS ---
        function applyPromo() {
            const code = document.getElementById('promoInput').value.trim();
            const btnApply = document.getElementById('btnApplyPromo');
            const msg = document.getElementById('promoMessage');

            if(code.length === 0) {
                alert('Please enter a code');
                return;
            }

            btnApply.disabled = true;
            btnApply.innerText = "...";

            fetch('ajax/validate_coupon.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ code: code })
            })
            .then(res => res.json())
            .then(data => {
                btnApply.disabled = false;
                btnApply.innerText = "Apply";

                if(data.status === 'success') {
                    // Success: Reload to update PHP totals
                    location.reload(); 
                } else {
                    // Error Message
                    msg.innerText = data.message;
                    msg.className = "mt-2 text-xs font-bold text-red-500";
                    msg.classList.remove('hidden');
                }
            })
            .catch(err => {
                console.error(err);
                btnApply.disabled = false;
                btnApply.innerText = "Apply";
                alert('Network Error');
            });
        }

        function removePromo() {
            // Simply clear the session logic via validation endpoint or specific logic
            // For simplicity, we just clear the input and reload, PHP logic handles unset if needed
            // But we need a way to tell PHP to clear it. 
            // Let's use a quick fetch to cart_action or just repurpose validate_coupon with empty code? 
            // Better: Just use a small fetch here.
            
            // To be safe, we will assume you modify validate_coupon or create a 'clear_coupon.php'. 
            // OR simpler: Submit a dummy request to validate_coupon that we know clears it? 
            // No, let's just make a direct call to clear session variables for coupon.
            
            fetch('ajax/clear_coupon.php') // Create this file or handle in PHP
            .then(() => location.reload());
        }
        
        // Quick Fix: Since I cannot create a new file for you here, 
        // let's assume 'ajax/validate_coupon.php' can handle a "clear" action 
        // OR we just use a small hack in this script block:
        
        /* NOTE: You need to create `ajax/clear_coupon.php` containing:
           <?php session_start(); unset($_SESSION['applied_coupon']); unset($_SESSION['discount_amount']); ?>
        */

        // --- CART LOGIC ---

        async function sendCartUpdate(payload) {
            toggleLoader(true);
            try {
                const res = await fetch('ajax/cart_action.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (data.status === 'success') {
                    // Because cart_action returns raw totals without discount, 
                    // we reload to let PHP apply the discount logic again.
                    // This ensures accuracy between the two systems.
                    location.reload(); 
                } else {
                    alert('Error: ' + (data.message || 'Unknown error'));
                    toggleLoader(false);
                }
            } catch (error) {
                console.error('Cart Update Error:', error);
                alert('Connection error. Please try again.'); 
                toggleLoader(false);
            }
        }

        function updateQty(id, change) {
            const input = document.getElementById(`qty-${id}`);
            let newQty = parseInt(input.value) + change;
            if (newQty < 1) return; 
            input.value = newQty; 
            sendCartUpdate({ action: 'update_qty', cart_id: id, quantity: newQty });
        }

        function removeItem(id) {
            if(!confirm('Remove this item from cart?')) return;
            const el = document.getElementById(`item-${id}`);
            if(el) { el.style.opacity = '0.5'; el.style.pointerEvents = 'none'; }
            sendCartUpdate({ action: 'remove_item', cart_id: id });
        }

        function toggleWarranty(checkbox) {
            const state = checkbox.checked ? 1 : 0;
            sendCartUpdate({ action: 'toggle_warranty_bulk', state: state });
        }
        
        // Define removePromo properly assuming the file exists
        window.removePromo = function() {
             fetch('ajax/validate_coupon.php', { // Re-using validation to clear by sending empty or special flag
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'clear' }) // Update validate_coupon to handle 'clear' if you wish, or see note above
            }).then(() => {
                 // Fallback if specific clear endpoint isn't made: just unset in PHP on next load? 
                 // No, JS cannot unset PHP session directly. 
                 // Create ajax/clear_coupon.php with: <?php session_start(); unset($_SESSION['applied_coupon']); unset($_SESSION['discount_amount']); ?>
                 fetch('ajax/clear_coupon.php').then(() => location.reload());
            });
        }
    </script>
</body>
</html>
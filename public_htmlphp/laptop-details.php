<?php
// laptop-details.php

// 1. Setup
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database Connection
if (file_exists('config/database.php')) {
    require_once 'config/database.php';
} else {
    // Fallback connection
    $host = 'localhost';
    $user = 'root'; 
    $pass = ''; 
    $db   = 'xper_u797209756_laptop';
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) $conn = null;
}

// 2. Fetch Logic (Slug OR ID)
$laptop = null;

// A. Check for SLUG (New SEO Friendly URL)
if (isset($_GET['slug']) && !empty($_GET['slug'])) {
    $slug = $conn->real_escape_string($_GET['slug']);
    
    // Try finding by exact slug
    $query = $conn->query("SELECT * FROM laptops WHERE slug = '$slug' AND status='active'");
    
    // Fallback: If not found by slug, try finding by matching the model name
    // This helps if you haven't updated your DB rows with slugs yet
    if ($query->num_rows == 0) {
        $modelNameLike = str_replace('-', '%', $slug); 
        $query = $conn->query("SELECT * FROM laptops WHERE model LIKE '$modelNameLike' AND status='active'");
    }
    
    if ($query->num_rows > 0) {
        $laptop = $query->fetch_assoc();
    }
} 
// B. Fallback: Check for ID (Old Links)
elseif (isset($_GET['id'])) {
    $id = intval($_GET['id']);
    $query = $conn->query("SELECT * FROM laptops WHERE id = $id AND status='active'");
    if ($query->num_rows > 0) {
        $laptop = $query->fetch_assoc();
    }
}

// C. If no laptop found, redirect to store
if (!$laptop) { 
    header('Location: /store'); 
    exit; 
}

$id = $laptop['id']; // Set the ID for the rest of the script

// --- GLOBAL VARIABLES & REFERRAL LOGIC ---
$user_referral_code = "GUEST"; 
$is_logged_in = isset($_SESSION['user_id']);

if ($is_logged_in && $conn) {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT referral_code FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $u_res = $stmt->get_result();
    $u_data = $u_res->fetch_assoc();

    if ($u_data) {
        $user_referral_code = !empty($u_data['referral_code']) ? $u_data['referral_code'] : "GUEST";
    }
    $stmt->close();
}

// 4. Image Gallery Logic
$gallery_images = [];
$sql_gallery = "SELECT image_path FROM laptop_images WHERE laptop_id = ?";
if($stmt_gallery = $conn->prepare($sql_gallery)) {
    $stmt_gallery->bind_param("i", $id);
    $stmt_gallery->execute();
    $res = $stmt_gallery->get_result();
    while($row = $res->fetch_assoc()) { 
        $gallery_images[] = $row['image_path']; 
    }
    $stmt_gallery->close();
}
if(empty($gallery_images) && !empty($laptop['image'])) {
    $gallery_images[] = $laptop['image'];
}
$gallery_images = array_values(array_unique($gallery_images));

// 5. Pricing & Configuration Logic
$base_sell_price = $laptop['price_individual_sell'];
$base_lease_price = $laptop['price_individual_lease'];
$upgrade_cost_sell = 4000; 
$upgrade_cost_lease = 500;

// 6. Wishlist Check
$isInWishlist = false;
if(isset($_SESSION['user_id'])) {
    $checkWish = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND laptop_id = ?");
    $checkWish->bind_param("ii", $_SESSION['user_id'], $id);
    $checkWish->execute();
    if($checkWish->get_result()->num_rows > 0) {
        $isInWishlist = true;
    }
    $checkWish->close();
}

// 7. Check for Pre-applied Coupon
$pre_applied_coupon = isset($_SESSION['applied_coupon']) ? $_SESSION['applied_coupon'] : '';
$pre_discount = isset($_SESSION['applied_coupon']) ? 500 : 0;

// Variables for JS Share function
$js_model = addslashes($laptop['model']);
$js_price = number_format($laptop['price_individual_sell']);
$js_specs = addslashes($laptop['processor'] . " • " . $laptop['ram']);

// Determine Current URL for Sharing
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
$current_share_url = $protocol . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";

require_once 'includes/header.php'; 
?>

<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/"> 
    <title><?php echo htmlspecialchars($laptop['model']); ?> | Laptop Mitra</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />

    <style>
        html, body { height: 100%; }
        body { 
            display: flex; 
            flex-direction: column; 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            background-color: #f8fafc;
            padding-bottom: 140px; 
        }
        @media (min-width: 1024px) { body { padding-bottom: 0; } }

        main { flex: 1 0 auto; }
        footer { flex-shrink: 0; }

        /* Swiper Styles */
        .swiper-slide { background: #fff; overflow: hidden; display: flex; justify-content: center; align-items: center; border-radius: 8px; }
        .main-slider-img { width: 100%; height: 100%; object-fit: contain; padding: 20px; transition: transform 0.5s ease; }
        .main-slider-img:hover { transform: scale(1.05); cursor: zoom-in; }
        
        .thumb-slider .swiper-slide { border: 2px solid transparent; opacity: 0.6; cursor: pointer; transition: all 0.2s; padding: 4px; }
        .thumb-slider .swiper-slide-thumb-active { border-color: #0284c7; opacity: 1; transform: scale(0.96); }
        .thumb-slider img { width: 100%; height: 100%; object-fit: contain; }

        /* Plan Cards */
        .plan-card { transition: all 0.2s ease; }
        .plan-active-sell { border-color: #0284c7; background-color: #f0f9ff; box-shadow: 0 0 0 1px #0284c7; }
        .plan-active-lease { border-color: #f97316; background-color: #fff7ed; box-shadow: 0 0 0 1px #f97316; }

        /* Config Cards Transition */
        .ram-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

        /* Warranty Checkbox Animation */
        .checkbox-wrapper:checked + div { border-color: #059669; background-color: #ecfdf5; }
        .checkbox-wrapper:checked + div .check-icon { display: block; }
        
        /* Slider Customization */
        input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none; height: 28px; width: 28px; border-radius: 50%;
            background: #0ea5e9; border: 4px solid #fff; box-shadow: 0 4px 10px rgba(14, 165, 233, 0.4);
            cursor: pointer; margin-top: -12px; position: relative; z-index: 10;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%; height: 6px; cursor: pointer; border-radius: 99px; background: #e2e8f0; 
        }

        /* Modal Animation & Centering */
        .modal-enter { opacity: 0; transform: translate(-50%, -48%) scale(0.95); pointer-events: none; }
        .modal-active { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
        .modal-transition { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    </style>
</head>
<body class="antialiased text-slate-800">

    <main class="w-full pt-24">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav class="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                <a href="index.php" class="hover:text-sky-600 transition">Home</a>
                <i class="fa-solid fa-chevron-right text-[9px] mx-3 text-slate-300"></i>
                <a href="store" class="hover:text-sky-600 transition">Laptops</a>
                <i class="fa-solid fa-chevron-right text-[9px] mx-3 text-slate-300"></i>
                <span class="text-slate-900"><?php echo htmlspecialchars($laptop['brand']); ?></span>
            </nav>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div class="lg:grid lg:grid-cols-12 lg:gap-10 items-start">
                
                <div class="lg:col-span-7 flex flex-col gap-8">
                    <div class="flex flex-col-reverse lg:flex-row gap-4 lg:h-[500px]">
                        <div thumbsSlider="" class="swiper thumb-slider w-full h-20 lg:w-24 lg:h-full shrink-0">
                            <div class="swiper-wrapper">
                                <?php foreach($gallery_images as $img): 
                                    $imgSrc = (strpos($img, 'http') === 0) ? $img : "admin/uploads/" . $img; 
                                ?>
                                <div class="swiper-slide bg-white border border-slate-200 rounded-lg">
                                    <img src="<?php echo htmlspecialchars($imgSrc); ?>" />
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                        <div class="swiper main-slider w-full h-[350px] lg:h-full bg-white rounded-2xl border border-slate-200 shadow-sm relative group z-0">
                            <div class="swiper-wrapper">
                                <?php foreach($gallery_images as $img): 
                                    $imgSrc = (strpos($img, 'http') === 0) ? $img : "admin/uploads/" . $img; 
                                ?>
                                <div class="swiper-slide">
                                    <img src="<?php echo htmlspecialchars($imgSrc); ?>" class="main-slider-img" />
                                </div>
                                <?php endforeach; ?>
                            </div>
                            <div class="swiper-button-next !text-slate-800 !w-10 !h-10 !bg-white/90 !rounded-full !shadow-lg !text-xs font-bold after:!text-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="swiper-button-prev !text-slate-800 !w-10 !h-10 !bg-white/90 !rounded-full !shadow-lg !text-xs font-bold after:!text-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="absolute top-4 left-4 z-10">
                                <?php if($laptop['stock_quantity'] > 0): ?>
                                    <span class="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wide">In Stock</span>
                                <?php else: ?>
                                    <span class="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wide">Sold Out</span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide border-b border-slate-100 pb-2">Description</h3>
                        <div class="prose prose-sm text-slate-600 max-w-none">
                            <?php echo nl2br(htmlspecialchars($laptop['description'])); ?>
                        </div>
                        <div class="mt-8">
                            <h3 class="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide border-b border-slate-100 pb-2">Tech Specs</h3>
                            <div class="grid grid-cols-2 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div class="flex justify-between border-b border-slate-50 pb-2">
                                    <span class="text-slate-500">Processor</span>
                                    <span class="font-semibold text-slate-900"><?php echo htmlspecialchars($laptop['processor']); ?></span>
                                </div>
                                <div class="flex justify-between border-b border-slate-50 pb-2">
                                    <span class="text-slate-500">RAM</span>
                                    <span class="font-semibold text-slate-900" id="spec_ram_display"><?php echo htmlspecialchars($laptop['ram']); ?></span>
                                </div>
                                <div class="flex justify-between border-b border-slate-50 pb-2">
                                    <span class="text-slate-500">Storage</span>
                                    <span class="font-semibold text-slate-900"><?php echo htmlspecialchars($laptop['storage']); ?></span>
                                </div>
                                <div class="flex justify-between border-b border-slate-50 pb-2">
                                    <span class="text-slate-500">Graphics</span>
                                    <span class="font-semibold text-slate-900"><?php echo htmlspecialchars($laptop['graphics'] ?? 'Integrated'); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="lg:col-span-5 relative mt-8 lg:mt-0">
                    <div class="sticky top-24 space-y-6">
                        
                        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <p class="text-xs font-bold text-sky-600 uppercase mb-1"><?php echo htmlspecialchars($laptop['brand']); ?></p>
                            <h1 class="text-3xl font-extrabold text-slate-900 leading-tight mb-2"><?php echo htmlspecialchars($laptop['model']); ?></h1>
                            
                            <div class="flex items-center gap-2 mb-4 text-sm">
                                <div class="flex text-amber-400 text-xs">
                                    <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                                </div>
                                <span class="text-slate-400 text-xs">(4.9/5)</span>
                            </div>

                            <div class="space-y-4">
                                
                                <div class="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm shadow-sm">
                                        <i class="fa-solid fa-gem"></i>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Condition</p>
                                        <p class="text-sm font-bold text-slate-900">A+++ (Super) almost like new</p>
                                    </div>
                                </div>

                                <div>
                                    <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-3">Performance & Speed</label>
                                    
                                    <div class="grid grid-cols-2 gap-4">
                                        <div onclick="selectConfig('standard')" id="conf_std" 
                                             class="ram-card relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col justify-between h-28 group bg-slate-50 border-slate-200 hover:border-slate-300 overflow-hidden">
                                            
                                            <div class="z-10">
                                                <span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Standard</span>
                                                <div class="text-2xl font-black text-slate-700 font-mono tracking-tighter">8<span class="text-sm">GB</span></div>
                                            </div>
                                            
                                            <div class="z-10 text-[10px] font-semibold text-slate-400">Basic Multitasking</div>
                                            <div id="check_std" class="absolute top-3 right-3 text-slate-400 opacity-0 transition-opacity">
                                                <i class="fa-solid fa-circle-check text-lg"></i>
                                            </div>
                                        </div>

                                        <div onclick="selectConfig('professional')" id="conf_pro" 
                                             class="ram-card relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col justify-between h-28 group bg-white border-slate-100 overflow-hidden">
                                            
                                            <div class="absolute -right-4 -bottom-4 text-7xl opacity-[0.07] rotate-12 transition-transform duration-500 group-hover:scale-110">
                                                <i class="fa-solid fa-microchip"></i>
                                            </div>

                                            <div class="z-10 relative">
                                                <div class="flex items-center justify-between mb-1">
                                                    <span id="txt_lbl_pro" class="block text-xs font-bold text-indigo-600 uppercase tracking-wider">Professional</span>
                                                    <span class="bg-amber-400 text-white text-[9px] font-bold px-1.5 rounded shadow-sm">FAST</span>
                                                </div>
                                                <div id="txt_val_pro" class="text-2xl font-black text-slate-800 font-mono tracking-tighter">16<span class="text-sm">GB</span></div>
                                            </div>

                                            <div class="z-10 relative flex justify-between items-end">
                                                <div id="txt_desc_pro" class="text-[10px] font-semibold text-slate-500">Heavy Editing / Code</div>
                                                <div id="check_pro" class="text-white opacity-0 transition-opacity scale-0">
                                                    <i class="fa-solid fa-circle-check text-lg drop-shadow-md"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="space-y-3 pt-2">
                                    <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Choose Plan</label>
                                    
                                    <div onclick="selectPlan('sell')" id="card_sell" class="plan-card cursor-pointer border border-slate-200 rounded-xl p-4 bg-white hover:border-sky-300 group">
                                        <div class="flex justify-between items-center">
                                            <div class="flex items-center gap-3">
                                                <div class="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center" id="ui_sell">
                                                    <div class="w-2.5 h-2.5 bg-sky-600 rounded-full hidden" id="dot_sell"></div>
                                                </div>
                                                <input type="radio" name="ptype" value="sell" id="radio_sell" class="hidden" checked>
                                                <div>
                                                    <span class="block text-sm font-bold text-slate-900">Buy Outright</span>
                                                    <span class="block text-[10px] text-slate-500">6 Months Free Warranty</span>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <span class="block text-lg font-bold text-sky-700" id="display_price_sell">₹<?php echo number_format($base_sell_price); ?></span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div onclick="selectPlan('lease')" id="card_lease" class="plan-card cursor-pointer border border-slate-200 rounded-xl p-4 bg-white hover:border-orange-300 group">
                                        <div class="flex justify-between items-center">
                                            <div class="flex items-center gap-3">
                                                <div class="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center" id="ui_lease">
                                                    <div class="w-2.5 h-2.5 bg-orange-500 rounded-full hidden" id="dot_lease"></div>
                                                </div>
                                                <input type="radio" name="ptype" value="lease" id="radio_lease" class="hidden">
                                                <div>
                                                    <span class="block text-sm font-bold text-slate-900">Rent / Lease</span>
                                                    <span class="block text-[10px] text-slate-500">Flexible Plans</span>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <span class="block text-lg font-bold text-orange-600" id="display_price_lease">₹<?php echo number_format($base_lease_price); ?></span>
                                                <span class="block text-[10px] text-slate-400">/mo</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div id="warranty_container" class="relative">
                                    <label class="cursor-pointer group">
                                        <input type="checkbox" id="warrantyCheck" class="checkbox-wrapper hidden" onchange="toggleWarranty()">
                                        <div class="flex justify-between items-center p-3 border border-slate-200 rounded-xl bg-white hover:border-emerald-400 transition-all">
                                            <div class="flex items-center gap-3">
                                                <div class="w-5 h-5 rounded border border-slate-300 flex items-center justify-center bg-white check-box-ui">
                                                    <i class="fa-solid fa-check text-xs text-emerald-600 check-icon hidden"></i>
                                                </div>
                                                <div>
                                                    <div class="flex items-center gap-2">
                                                        <span class="text-sm font-bold text-slate-900">Extend Warranty</span>
                                                        <span class="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">RECOMMENDED</span>
                                                    </div>
                                                    <span class="block text-[10px] text-slate-500">Get +6 Months (Total 1 Year)</span>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <span class="block text-sm font-bold text-slate-700">+ ₹1,999</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                                
                                <!--<div class="bg-slate-50 border border-slate-200 rounded-xl p-3">-->
                                <!--    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Have a Referral Code?</label>-->
                                <!--    <div class="flex gap-2" id="couponInputContainer">-->
                                <!--        <div class="relative flex-1">-->
                                <!--            <i class="fa-solid fa-ticket absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>-->
                                <!--            <input type="text" id="promoInput" placeholder="Enter Code (e.g. MITRA...)" -->
                                <!--                   value="<?php echo htmlspecialchars($pre_applied_coupon); ?>"-->
                                <!--                   <?php echo !empty($pre_applied_coupon) ? 'disabled' : ''; ?>-->
                                <!--                   class="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase">-->
                                <!--        </div>-->
                                <!--        <button onclick="applyPromo()" id="btnApplyPromo" -->
                                <!--                class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 rounded-lg transition-colors <?php echo !empty($pre_applied_coupon) ? 'hidden' : ''; ?>">-->
                                <!--            Apply-->
                                <!--        </button>-->
                                <!--        <button onclick="removePromo()" id="btnRemovePromo" -->
                                <!--                class="bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold px-4 rounded-lg transition-colors <?php echo empty($pre_applied_coupon) ? 'hidden' : ''; ?>">-->
                                <!--            Remove-->
                                <!--        </button>-->
                                <!--    </div>-->
                                <!--    <p id="promoMessage" class="mt-2 text-xs font-bold <?php echo !empty($pre_applied_coupon) ? 'text-green-600' : 'hidden'; ?>">-->
                                <!--        <i class="fa-solid fa-check-circle"></i> Referral Applied! ₹500 OFF-->
                                <!--    </p>-->
                                <!--</div>-->

                            </div>
                            
                            <div class="hidden lg:flex gap-3 mt-6">
                                <button id="btnDesktopAction" onclick="addToCartWithPlan()" class="flex-1 bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group">
                                    <span id="btnTextDesktop">Add to Cart</span> 
                                    <i id="btnIconDesktop" class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                </button>
                                
                                <button onclick="toggleWishlist(this, '<?php echo $laptop['id']; ?>')" 
                                        class="w-14 border border-slate-200 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-50 <?php echo $isInWishlist ? 'text-red-500 border-red-200 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:border-red-200'; ?>">
                                    <i class="<?php echo $isInWishlist ? 'fa-solid' : 'fa-regular'; ?> fa-heart text-xl"></i>
                                </button>

                                <button onclick="shareOnWhatsApp(
                                    '<?php echo $js_model; ?>', 
                                    '<?php echo $js_price; ?>', 
                                    '<?php echo $js_specs; ?>', 
                                    '<?php echo $user_referral_code; ?>',
                                    '<?php echo $current_share_url; ?>'
                                )" 
                                class="w-14 border border-green-200 bg-green-50 text-green-600 rounded-xl flex items-center justify-center transition-colors hover:bg-green-100 hover:border-green-300 group relative" title="Share on WhatsApp">
                                    <i class="fa-brands fa-whatsapp text-2xl group-hover:scale-110 transition-transform"></i>
                                </button>
                            </div>
                        </div>

                        <div onclick="openBuybackModal()" class="cursor-pointer bg-gradient-to-br from-white to-sky-50 rounded-xl border border-sky-200 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group relative overflow-hidden">
                            <div class="absolute -right-6 -top-6 text-sky-100/50 rotate-12 text-9xl z-0">
                                <i class="fa-solid fa-shield-halved"></i>
                            </div>
                            
                            <div class="flex items-center gap-4 relative z-10">
                                <div class="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg ring-4 ring-sky-100">
                                    <i class="fa-solid fa-hand-holding-dollar"></i>
                                </div>
                                <div>
                                    <p class="text-[11px] font-extrabold text-sky-700 uppercase tracking-widest mb-0.5">Lifetime</p>
                                    <h3 class="text-lg font-black text-slate-900 leading-none mb-1">Buyback Assurance</h3>
                                    <p class="text-xs font-medium text-slate-600">
                                        Guaranteed value up to <span class="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">70%</span>
                                    </p>
                                </div>
                            </div>
                            <div class="relative z-10 w-8 h-8 rounded-full bg-white border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-sm">
                                <i class="fa-solid fa-arrow-right text-xs"></i>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 text-center">Available Payment Methods</h4>
                            <div class="grid grid-cols-4 gap-2 items-center justify-items-center opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
                                <div class="flex flex-col items-center gap-1"><i class="fa-brands fa-google-pay text-2xl text-slate-700"></i><span class="text-[9px] font-bold">UPI</span></div>
                                <div class="flex flex-col items-center gap-1"><i class="fa-brands fa-cc-visa text-2xl text-slate-700"></i><span class="text-[9px] font-bold">Cards</span></div>
                                <div class="flex flex-col items-center gap-1"><i class="fa-solid fa-building-columns text-xl text-slate-700"></i><span class="text-[9px] font-bold">NetBank</span></div>
                                <div class="flex flex-col items-center gap-1"><i class="fa-solid fa-money-bill-wave text-xl text-slate-700"></i><span class="text-[9px] font-bold">COD</span></div>
                            </div>
                        </div>

                        <div class="w-full">
                            <img src="assets/laptopmitra.png" alt="Trust Badges" class="w-full h-auto rounded-xl shadow-sm border border-slate-200">
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </main>
    
    <footer class="mt-auto">
        <?php include 'includes/footer.php'; ?>
    </footer>

    <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div class="flex gap-3">
            <button onclick="toggleWishlist(this, '<?php echo $laptop['id']; ?>')" 
                    class="w-14 border border-slate-200 rounded-lg flex items-center justify-center transition-colors <?php echo $isInWishlist ? 'text-red-500 border-red-200 bg-red-50' : 'text-slate-400 hover:text-red-500'; ?>">
                <i class="<?php echo $isInWishlist ? 'fa-solid' : 'fa-regular'; ?> fa-heart text-xl"></i>
            </button>
            
            <button onclick="shareOnWhatsApp(
                '<?php echo $js_model; ?>', 
                '<?php echo $js_price; ?>', 
                '<?php echo $js_specs; ?>', 
                '<?php echo $user_referral_code; ?>',
                '<?php echo $current_share_url; ?>'
            )" class="w-14 border border-green-200 bg-green-50 text-green-600 rounded-lg flex items-center justify-center transition-colors hover:bg-green-100">
                <i class="fa-brands fa-whatsapp text-2xl"></i>
            </button>

            <button id="btnMobileAction" onclick="addToCartWithPlan()" class="flex-1 bg-[#0f172a] text-white font-bold py-3.5 rounded-lg shadow-lg flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                <span id="btnTextMobile" class="text-sm">Add to Cart</span>
            </button>
        </div>
    </div>

    <div id="buybackOverlay" class="fixed inset-0 bg-slate-900/60 z-[60] hidden transition-opacity opacity-0 backdrop-blur-sm" onclick="closeBuybackModal()"></div>
    
    <div id="buybackModal" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px] bg-white rounded-2xl shadow-2xl z-[70] hidden modal-transition modal-enter flex flex-col overflow-hidden font-sans">
        
        <div class="bg-gradient-to-r from-sky-600 to-blue-700 p-6 relative text-center overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <button onclick="closeBuybackModal()" class="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-full flex items-center justify-center transition text-sm z-20 backdrop-blur-sm cursor-pointer border border-white/10">
                <i class="fa-solid fa-xmark"></i>
            </button>
            
            <div class="flex flex-col items-center gap-2 relative z-10">
                <div class="relative mb-1">
                    <i class="fa-solid fa-hand-holding-dollar text-4xl text-yellow-300 drop-shadow-md"></i>
                </div>
                <h2 class="text-white font-extrabold text-2xl tracking-tight">Buyback Assurance</h2>
                <p class="text-sky-100 text-sm font-medium">Guaranteed value for your device</p>
            </div>
        </div>

        <div class="p-6 text-center bg-white">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assured Buyback Value</p>
            <div class="text-5xl font-extrabold text-emerald-600 mb-2" id="bbDisplayPrice">70%</div>
            <div class="mb-8">
                <span id="bbPercentBadge" class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md">of Invoice Value</span>
            </div>
            
            <div class="relative px-2 mb-6">
                <input type="range" min="0" max="5" value="0" step="1" id="bbSlider" class="w-full">
                <div class="flex justify-between px-1 mt-2">
                   <div class="w-0.5 h-1 bg-slate-200"></div><div class="w-0.5 h-1 bg-slate-200"></div><div class="w-0.5 h-1 bg-slate-200"></div><div class="w-0.5 h-1 bg-slate-200"></div><div class="w-0.5 h-1 bg-slate-200"></div><div class="w-0.5 h-1 bg-slate-200"></div>
                </div>
            </div>

            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sky-600 font-bold shadow-sm shrink-0">
                        <i class="fa-regular fa-clock"></i>
                    </div>
                    <div>
                        <p class="text-xs text-slate-500 font-medium">If returned between</p>
                        <p id="bbMonthDisplay" class="font-bold text-slate-900 text-lg">0 - 6 Months</p>
                    </div>
                </div>
            </div>
            
            <a href="terms-condition-buyback.php" target="_blank" class="mt-6 text-sky-600 text-xs font-bold hover:underline flex items-center justify-center gap-1">
                Read Policy T&C <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
    <script>
        // --- 1. CONFIG & VARIABLES ---
        const baseSellPrice = <?php echo $base_sell_price; ?>;
        const baseLeasePrice = <?php echo $base_lease_price; ?>;
        const warrantyCost = 1999;
        
        // RAM Upgrade Costs
        const upgradeCostSell = <?php echo $upgrade_cost_sell; ?>;
        const upgradeCostLease = <?php echo $upgrade_cost_lease; ?>;

        const bbConfig = [
            { pct: 0.70, label: "0-6 Months" },
            { pct: 0.60, label: "6-12 Months" },
            { pct: 0.50, label: "12-18 Months" },
            { pct: 0.40, label: "18-24 Months" },
            { pct: 0.30, label: "24-30 Months" },
            { pct: 0.20, label: "30-36 Months" }
        ];
        
        // State
        let currentPlan = 'sell'; 
        let isWarrantyActive = false;
        let isProfessional = false; // Default 8GB
        
        // Promo Code State
        let activeDiscount = <?php echo $pre_discount; ?>;
        let activeCouponCode = "<?php echo $pre_applied_coupon; ?>";

        // --- 2. MODAL LOGIC ---
        const bbOverlay = document.getElementById('buybackOverlay');
        const bbModal = document.getElementById('buybackModal');
        const bbSlider = document.getElementById('bbSlider');
        const bbDisplayPrice = document.getElementById('bbDisplayPrice');
        const bbMonthDisplay = document.getElementById('bbMonthDisplay');

        function openBuybackModal() {
            bbOverlay.classList.remove('hidden');
            bbModal.classList.remove('hidden');
            setTimeout(() => {
                bbOverlay.classList.remove('opacity-0');
                bbModal.classList.add('modal-active');
            }, 10);
            updateSliderVisual(bbSlider);
        }

        function closeBuybackModal() {
            bbOverlay.classList.add('opacity-0');
            bbModal.classList.remove('modal-active');
            setTimeout(() => {
                bbOverlay.classList.add('hidden');
                bbModal.classList.add('hidden');
            }, 300);
        }

        function updateSliderVisual(slider) {
            const index = parseInt(slider.value);
            const config = bbConfig[index];
            const min = slider.min;
            const max = slider.max;
            const percentage = ((index - min) / (max - min)) * 100;
            slider.style.background = `linear-gradient(to right, #0ea5e9 0%, #2563eb ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
            bbDisplayPrice.innerText = (config.pct * 100) + "%";
            bbMonthDisplay.innerText = config.label;
        }
        bbSlider.addEventListener('input', function() { updateSliderVisual(this); });
        
        // --- 3. SLIDER LOGIC ---
        var swiperThumbs = new Swiper(".thumb-slider", {
            spaceBetween: 10, slidesPerView: 4, freeMode: true, watchSlidesProgress: true,
            breakpoints: { 320: { direction: "horizontal" }, 1024: { direction: "vertical", slidesPerView: 5 } }
        });
        var swiperMain = new Swiper(".main-slider", {
            spaceBetween: 10, effect: 'fade', fadeEffect: { crossFade: true },
            autoplay: { delay: 3000, disableOnInteraction: false },
            navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
            thumbs: { swiper: swiperThumbs }
        });

        // --- 4. RAM SELECTION LOGIC ---
        function formatMoney(amount) {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
        }

        function selectConfig(type) {
            // Elements
            const cardStd = document.getElementById('conf_std');
            const cardPro = document.getElementById('conf_pro');
            const checkStd = document.getElementById('check_std');
            const checkPro = document.getElementById('check_pro');
            const ramDisplay = document.getElementById('spec_ram_display');
            
            // Professional Card Inner Elements
            const lblPro = document.getElementById('txt_lbl_pro');
            const valPro = document.getElementById('txt_val_pro');
            const descPro = document.getElementById('txt_desc_pro');

            // --- RESET BOTH CARDS ---
            cardStd.className = "ram-card relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col justify-between h-28 group bg-white border-slate-100 text-slate-500 hover:border-slate-300 overflow-hidden";
            checkStd.classList.add('opacity-0');
            
            cardPro.className = "ram-card relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col justify-between h-28 group bg-white border-slate-100 hover:border-indigo-200 overflow-hidden";
            checkPro.classList.add('opacity-0', 'scale-0');
            checkPro.classList.remove('scale-100');
            
            // Reset Text Colors inside Professional Card
            lblPro.className = "block text-xs font-bold text-indigo-600 uppercase tracking-wider";
            valPro.className = "text-2xl font-black text-slate-800 font-mono tracking-tighter";
            descPro.className = "text-[10px] font-semibold text-slate-500";

            if (type === 'professional') {
                isProfessional = true;
                ramDisplay.innerText = "16GB (Professional)";

                // ACTIVATE PROFESSIONAL STYLE
                cardPro.className = "ram-card relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col justify-between h-28 group bg-gradient-to-br from-indigo-600 to-violet-700 border-indigo-600 shadow-xl scale-[1.02] overflow-hidden";
                
                // Change Text Colors to White
                lblPro.className = "block text-xs font-bold text-indigo-200 uppercase tracking-wider";
                valPro.className = "text-2xl font-black text-white font-mono tracking-tighter";
                descPro.className = "text-[10px] font-semibold text-indigo-200";
                
                // Show Check
                checkPro.classList.remove('opacity-0', 'scale-0');
                checkPro.classList.add('scale-100');

            } else {
                isProfessional = false;
                ramDisplay.innerText = "8GB";

                // ACTIVATE STANDARD STYLE
                cardStd.className = "ram-card relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col justify-between h-28 group bg-slate-50 border-slate-800 text-slate-800 shadow-md scale-[1.02] overflow-hidden";
                checkStd.classList.remove('opacity-0');
                checkStd.classList.add('text-emerald-500'); // Green Check
            }
            updatePricingUI();
        }

        // --- 5. PRICING & PLAN LOGIC ---
        function updatePricingUI() {
            let currentSell = baseSellPrice + (isProfessional ? upgradeCostSell : 0);
            let currentLease = baseLeasePrice + (isProfessional ? upgradeCostLease : 0);
            
            document.getElementById('display_price_sell').innerText = formatMoney(currentSell);
            document.getElementById('display_price_lease').innerText = formatMoney(currentLease);

            updateButtonText();
        }

        function getFinalPrice() {
            let total = 0;
            if(currentPlan === 'sell') {
                total = baseSellPrice;
                if(isProfessional) total += upgradeCostSell;
                if(isWarrantyActive) total += warrantyCost;
            } else {
                total = baseLeasePrice;
                if(isProfessional) total += upgradeCostLease;
            }
            
            // APPLY DISCOUNT
            if(activeDiscount > 0) {
                total = total - activeDiscount;
                if(total < 0) total = 0;
            }
            
            return total;
        }

        function updateButtonText() {
            const btnDesk = document.getElementById('btnTextDesktop');
            const btnMob = document.getElementById('btnTextMobile');
            
            const total = getFinalPrice();
            
            let btnLabel = "";
            if(currentPlan === 'sell') {
                btnLabel = `Add to Cart - ${formatMoney(total)}`;
            } else {
                btnLabel = `Rent Now - ${formatMoney(total)}/mo`;
            }

            btnDesk.innerHTML = btnLabel;
            btnMob.innerHTML = btnLabel;
        }

        function toggleWarranty() {
            const checkbox = document.getElementById('warrantyCheck');
            isWarrantyActive = checkbox.checked;
            updateButtonText();
        }

        function selectPlan(type) {
            currentPlan = type;
            document.getElementById('radio_' + type).checked = true;

            const els = {
                sell: { card: document.getElementById('card_sell'), dot: document.getElementById('dot_sell'), ui: document.getElementById('ui_sell') },
                lease: { card: document.getElementById('card_lease'), dot: document.getElementById('dot_lease'), ui: document.getElementById('ui_lease') }
            };
            
            ['sell', 'lease'].forEach(k => {
                els[k].card.className = "plan-card cursor-pointer border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 group";
                els[k].dot.classList.add('hidden');
                els[k].ui.className = "w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center";
            });

            if(type === 'sell') {
                els.sell.card.classList.add('plan-active-sell', '!border-sky-600');
                els.sell.dot.classList.remove('hidden');
                els.sell.ui.classList.replace('border-slate-300', 'border-sky-600');
                document.getElementById('warranty_container').classList.remove('opacity-50', 'pointer-events-none');
            } else {
                els.lease.card.classList.add('plan-active-lease', '!border-orange-500');
                els.lease.dot.classList.remove('hidden');
                els.lease.ui.classList.replace('border-slate-300', 'border-orange-500');
                document.getElementById('warranty_container').classList.add('opacity-50', 'pointer-events-none');
                document.getElementById('warrantyCheck').checked = false;
                isWarrantyActive = false;
            }
            updateButtonText();
        }

        // --- 6. PROMO CODE LOGIC ---
        function applyPromo() {
            const code = document.getElementById('promoInput').value.trim();
            const btnApply = document.getElementById('btnApplyPromo');
            const msg = document.getElementById('promoMessage');

            if(code.length === 0) {
                showNotification('Please enter a code', 'error');
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
                    // Success
                    activeDiscount = 500;
                    activeCouponCode = code;
                    
                    // UI Updates
                    document.getElementById('promoInput').disabled = true;
                    document.getElementById('btnApplyPromo').classList.add('hidden');
                    document.getElementById('btnRemovePromo').classList.remove('hidden');
                    
                    msg.innerHTML = '<i class="fa-solid fa-check-circle"></i> ' + data.message;
                    msg.className = "mt-2 text-xs font-bold text-green-600";
                    msg.classList.remove('hidden');
                    
                    updateButtonText(); // Update Price
                    showNotification('Code Applied Successfully!', 'success');
                } else {
                    // Error
                    showNotification(data.message, 'error');
                    msg.innerText = data.message;
                    msg.className = "mt-2 text-xs font-bold text-red-500";
                    msg.classList.remove('hidden');
                }
            })
            .catch(err => {
                btnApply.disabled = false;
                btnApply.innerText = "Apply";
                showNotification('Something went wrong', 'error');
            });
        }

        function removePromo() {
            activeDiscount = 0;
            activeCouponCode = "";
            document.getElementById('promoInput').disabled = false;
            document.getElementById('promoInput').value = "";
            document.getElementById('btnApplyPromo').classList.remove('hidden');
            document.getElementById('btnRemovePromo').classList.add('hidden');
            document.getElementById('promoMessage').classList.add('hidden');
            updateButtonText();
        }

        // --- 7. CART & WISHLIST ---
        function toggleWishlist(btn, productId) {
            const icon = btn.querySelector('i');
            const isCurrentlyAdded = icon.classList.contains('fa-solid');

            if(isCurrentlyAdded) {
                icon.classList.remove('fa-solid', 'text-red-500');
                icon.classList.add('fa-regular');
                btn.classList.remove('text-red-500', 'border-red-200', 'bg-red-50');
                btn.classList.add('text-slate-400');
            } else {
                icon.classList.remove('fa-regular');
                icon.classList.add('fa-solid', 'text-red-500');
                btn.classList.remove('text-slate-400');
                btn.classList.add('text-red-500', 'border-red-200', 'bg-red-50');
                icon.style.transform = 'scale(1.2)';
                setTimeout(() => icon.style.transform = 'scale(1)', 200);
            }

            fetch('ajax/wishlist_action.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'toggle', id: productId, mode: currentPlan })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    showNotification(data.message, 'success');
                } else {
                    showNotification(data.message || 'Error', 'error');
                }
            });
        }

        function addToCartWithPlan() {
            const btnDesk = document.getElementById('btnDesktopAction');
            const btnMob = document.getElementById('btnMobileAction');
            const originalTextDesk = btnDesk.innerHTML;
            const originalTextMob = btnMob.innerHTML;

            const loadingHtml = '<i class="fa-solid fa-circle-notch fa-spin"></i> Adding...';
            btnDesk.innerHTML = loadingHtml;
            btnDesk.disabled = true;
            btnMob.innerHTML = loadingHtml;
            btnMob.disabled = true;

            const laptopId = "<?php echo $laptop['id']; ?>";
            let baseModelName = "<?php echo addslashes($laptop['model']); ?>";
            
            // Construct Distinct Model Name
            let finalModelName = baseModelName;
            if(isProfessional) {
                finalModelName += " - Professional (16GB)";
            } else {
                finalModelName += " (8GB)";
            }

            // Calculate Price to send
            const finalPrice = getFinalPrice();

            fetch('ajax/cart_action.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    id: laptopId, 
                    qty: 1, 
                    model: finalModelName, 
                    product_name: finalModelName, 
                    name: finalModelName, 
                    
                    type: currentPlan,
                    warranty_addon: isWarrantyActive,
                    config: isProfessional ? '16GB' : '8GB',
                    
                    // Send Price Explicitly
                    price: finalPrice,
                    unit_price: finalPrice,
                    
                    // SEND REFERRAL DATA
                    coupon_code: activeCouponCode,
                    discount_amount: activeDiscount
                }) 
            })
            .then(res => res.json())
            .then(data => {
                btnDesk.innerHTML = originalTextDesk;
                btnDesk.disabled = false;
                btnMob.innerHTML = originalTextMob;
                btnMob.disabled = false;

                if(data.status === 'success') {
                    showNotification('Added ' + (isProfessional ? '16GB Model' : 'Standard Model') + ' to Cart!', 'success');
                } else {
                    showNotification(data.message || 'Failed to add', 'error');
                }
            })
            .catch(err => {
                btnDesk.innerHTML = originalTextDesk;
                btnDesk.disabled = false;
                btnMob.innerHTML = originalTextMob;
                btnMob.disabled = false;
                showNotification('Network Error', 'error');
            });
        }
        
        // --- 8. WHATSAPP SHARE FUNCTION ---
        function shareOnWhatsApp(model, price, specs, refCode, currentUrl) {
            let shareUrl = new URL(currentUrl);
            
            // Only attach code if user is logged in and code is valid
            if(refCode && refCode !== 'GUEST') {
                shareUrl.searchParams.set('ref', refCode);
            }
            
            const finalUrl = shareUrl.toString();
            
            const text = `🔥 *Check out this Laptop!* 🔥\n\n` +
                         `💻 *${model}*\n` +
                         `⚙️ ${specs}\n` +
                         `💰 Deal Price: *₹${price}*\n\n` +
                         `👇 *View Details & Buy:*\n` +
                         `${finalUrl}\n\n` +
                         (refCode !== 'GUEST' ? `🎟️ Use my Referral Code: *${refCode}* for discount!` : '');

            const encodedText = encodeURIComponent(text);
            window.open(`https://wa.me/?text=${encodedText}`, '_blank');
        }

        function showNotification(message, type = 'info') {
            const colors = {success: '#10b981', error: '#ef4444', info: '#0ea5e9'};
            const notification = document.createElement('div');
            notification.style.cssText = `position: fixed; top: 100px; right: 20px; background: ${colors[type]}; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 9999; font-weight: 600; animation: slideIn 0.3s ease; display:flex; align-items:center; gap:10px;`;
            
            let icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
            notification.innerHTML = icon + ' ' + message;

            if (!document.getElementById('notif-style')) {
                const style = document.createElement('style');
                style.id = 'notif-style';
                style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; }} @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; }}`;
                document.head.appendChild(style);
            }
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }

        // Init
        selectPlan('sell');
        selectConfig('standard'); // Default to Standard
        updateSliderVisual(bbSlider);
        updateButtonText(); // Run once on load
    </script>
</body>
</html>
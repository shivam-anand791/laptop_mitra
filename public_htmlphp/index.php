<?php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 1. Database Connection
if (file_exists('config/database.php')) {
    require_once 'config/database.php';
} else {
    // Fallback connection if config file is missing (adjust credentials as needed)
    $host = 'localhost';
    $user = 'root'; 
    $pass = ''; 
    $db   = 'xper_u797209756_laptop';
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) $conn = null;
}

// --- GLOBAL VARIABLES ---
$user_referral_code = "GUEST"; 
$discount_message = "";
$is_logged_in = isset($_SESSION['user_id']);

// --- LOGIC A: GENERATE "MITRA" CODE FOR LOGGED-IN USER ---
if ($is_logged_in && $conn) {
    $user_id = $_SESSION['user_id'];
    
    // 1. Fetch User Data
    $stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();

    if ($user_data) {
        $existing_code = $user_data['referral_code'];

        // --- AUTO-FIX LOGIC ---
        // If code is empty OR if code exists but does NOT start with "MITRA"
        // We force regeneration to fix the old "LPT-..." codes.
        if (empty($existing_code) || strpos($existing_code, 'MITRA') !== 0) {
            
            // 1. Priority: Check 'fullname' first (based on your SQL dump), then others
            $raw_name = "User";
            if (!empty($user_data['fullname'])) $raw_name = $user_data['fullname'];
            elseif (!empty($user_data['name'])) $raw_name = $user_data['name'];
            elseif (!empty($user_data['username'])) $raw_name = $user_data['username'];

            // 2. Clean name: Remove spaces/special chars (e.g., "Anurag Kashyap" -> "AnuragKashyap")
            $clean_name = preg_replace("/[^A-Za-z]/", "", $raw_name);
            
            // 3. Get first 3 letters, uppercase (e.g., "Anurag" -> "ANU")
            $name_part = strtoupper(substr($clean_name, 0, 3));
            
            // Pad with 'X' if name is too short (e.g. "Om" -> "OMX")
            if (strlen($name_part) < 3) {
                $name_part = str_pad($name_part, 3, "X");
            }

            // 4. Generate unique 4-digit number
            $rand_num = mt_rand(1000, 9999);
            
            // 5. Final Code Structure: MITRA + ANU + 1234
            $new_code = "MITRA" . $name_part . $rand_num;
            
            // 6. UPDATE Database immediately to replace the old code
            $update = $conn->prepare("UPDATE users SET referral_code = ? WHERE id = ?");
            $update->bind_param("si", $new_code, $user_id);
            $update->execute();
            
            $user_referral_code = $new_code;
        } else {
            // If it already starts with MITRA, just use it
            $user_referral_code = $existing_code;
        }
    }
}

// --- LOGIC B: HANDLE INCOMING REFERRAL LINK (?ref=MITRAANU1234) ---
if (isset($_GET['ref']) && $conn) {
    $incoming_code = htmlspecialchars($_GET['ref']);
    
    // 1. Validation: Prevent using own code
    if ($is_logged_in && $incoming_code === $user_referral_code) {
        $discount_message = "You cannot use your own referral code.";
    } 
    else {
        // 2. Validation: Check if code exists in system (Find the Affiliate)
        $check_ref = $conn->prepare("SELECT id FROM users WHERE referral_code = ?");
        $check_ref->bind_param("s", $incoming_code);
        $check_ref->execute();
        $ref_res = $check_ref->get_result();
        
        if ($ref_res->num_rows > 0) {
            $referrer_data = $ref_res->fetch_assoc();
            
            // 3. Logic for BUYER (The one using the code)
            if (!$is_logged_in) {
                // If not logged in, save for later
                $_SESSION['pending_referral'] = $incoming_code;
                $discount_message = "Referral Code Applied! Login to claim ₹500 OFF.";
            } else {
                // 4. Logic: Check if Buyer already used this specific code (One-time use per referrer)
                // Note: Ensure table 'coupon_usage' exists as per your SQL schema (it was empty in dump)
                $check_usage = $conn->prepare("SELECT id FROM coupon_usage WHERE user_id = ? AND coupon_code = ?");
                $check_usage->bind_param("is", $_SESSION['user_id'], $incoming_code);
                $check_usage->execute();
                
                if ($check_usage->get_result()->num_rows == 0) {
                    // SUCCESS!
                    
                    // A. Set Session for Checkout Page (Buyer gets discount)
                    $_SESSION['applied_coupon'] = $incoming_code;
                    $_SESSION['discount_amount'] = 500;
                    
                    // B. Set Session for Affiliate Tracking (Referrer gets credit later)
                    $_SESSION['referrer_id'] = $referrer_data['id']; 
                    
                    $discount_message = "Success! ₹500 Discount Applied.";
                } else {
                    $discount_message = "You have already used this referral code.";
                }
            }
        } else {
            $discount_message = "Invalid Referral Code.";
        }
    }
}

// --- DATA FETCHING (Laptops) ---
$featured_laptops = [];
$deal_laptops = [];
$all_laptops_search = [];

if ($conn) {
    // Basic fetch - fits most schema
    $sql = "SELECT * FROM laptops WHERE status = 'active' ORDER BY id DESC";
    
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            // Fix Image Paths
            if (empty($row['image'])) {
                $row['image'] = 'https://via.placeholder.com/500x350?text=No+Image';
            } elseif (!filter_var($row['image'], FILTER_VALIDATE_URL)) {
                $row['image'] = 'admin/uploads/' . $row['image'];
            }
            $all_laptops_search[] = $row; 
            if (count($featured_laptops) < 4) $featured_laptops[] = $row;
            if (count($deal_laptops) < 4) $deal_laptops[] = $row;
        }
    }
}

// Mock Data Fallback (Prevents blank page if DB is empty or connection fails)
if (empty($all_laptops_search)) {
    function getMockLaptops($count = 8) {
        $laptops = [];
        $models = ['Dell XPS 15', 'MacBook Pro M2', 'HP Spectre x360', 'Lenovo ThinkPad X1'];
        $brands = ['Dell', 'Apple', 'HP', 'Lenovo'];
        $images = ['https://images.unsplash.com/photo-1593642632823-8f78536788c6?w=500'];
        for($i=0; $i<$count; $i++) {
            $laptops[] = [
                'id' => 999999 + $i,
                'model' => $models[$i % 4],
                'brand' => $brands[$i % 4],
                'processor' => 'Core i7',
                'ram' => '16',
                'price_individual_sell' => 45000 + ($i * 5000),
                'image' => $images[0],
                'condition' => 'refurb'
            ];
        }
        return $laptops;
    }
    $mockData = getMockLaptops(8);
    $featured_laptops = $deal_laptops = $all_laptops_search = $mockData;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <base href="/">
    <title>Laptop Mitra | Enterprise Hardware Partner</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">

    <style>
        :root { --brand-primary: #2563eb; --brand-dark: #0f172a; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; scroll-behavior: smooth; }
        h1, h2, h3, .brand-font { font-family: 'Outfit', sans-serif; }
        a { text-decoration: none !important; }
        
        /* Clean Glass Navbar */
        .glass-navbar { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); position: relative; z-index: 2000; }
        
        /* Search Box Styles */
        .search-results-box { position: absolute; top: 110%; left: 0; right: 0; background: white; border-radius: 16px; box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; max-height: 0; opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 50; }
        .search-results-box.active { max-height: 400px; opacity: 1; overflow-y: auto; padding: 0.5rem 0; }
        #mobile-search-overlay { transition: transform 0.3s ease-in-out, opacity 0.3s ease; transform: translateY(100%); opacity: 0; }
        #mobile-search-overlay.active { transform: translateY(0); opacity: 1; }

        .btn-brand-gradient {
            background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
            color: white;
            box-shadow: 0 4px 15px -3px rgba(37, 99, 235, 0.4);
            transition: all 0.3s ease;
        }
        .btn-brand-gradient:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -3px rgba(37, 99, 235, 0.5);
            background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%);
        }
        .btn-gradient-green { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); box-shadow: 0 4px 15px -3px rgba(22, 163, 74, 0.4); }
        
        .hero-overlay { background: linear-gradient(90deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.1) 100%); }
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll { animation: scroll 30s linear infinite; }
        
        .flash-sale-bg { background: linear-gradient(120deg, #2563eb 0%, #7c3aed 100%); position: relative; }
        .glass-card { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1); }
        .pulse-animation { animation: pulse-white 2s infinite; }
        @keyframes pulse-white {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
    </style>
</head>
<body class="bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">

    <nav class="glass-navbar" id="navbar">
        <div class="max-w-[1600px] mx-auto px-4 md:px-6 h-20 flex justify-between items-center gap-4">
            
            <a href="/" class="flex items-center gap-3 shrink-0">
                <img src="assets/logo-laptop-mitra.png" alt="Laptop Mitra" class="h-8 md:h-10 w-auto object-contain" onerror="this.src='https://via.placeholder.com/150x50?text=Laptop+Mitra'">
            </a>

            <div class="hidden lg:block flex-1 max-w-2xl mx-auto search-wrapper relative">
                <div class="relative group">
                    <input type="text" id="desktop-search" 
                           class="w-full h-12 pl-12 pr-4 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-full text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-100 transition-all duration-300 placeholder:text-slate-400"
                           placeholder="Search laptop models, brands..." autocomplete="off">
                    <i class="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                </div>
                <div id="desktop-results" class="search-results-box"></div>
            </div>

            <div class="flex items-center gap-3 md:gap-6 shrink-0">
                <div class="hidden xl:flex items-center gap-3 border-r pr-6 border-slate-200 group cursor-pointer">
                    <div class="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-600 transition duration-300 flex items-center justify-center text-blue-600 group-hover:text-white">
                        <i class="fas fa-headset"></i>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Support</p>
                        <a href="tel:+917701993300" class="text-sm font-black text-slate-800 brand-font group-hover:text-blue-600 transition">+91 7701993300</a>
                    </div>
                </div>

                <div class="hidden md:flex items-center gap-4">
                    <?php if(!$is_logged_in): ?>
                        <a href="login" class="font-bold text-sm text-slate-600 hover:text-blue-600 transition px-2">Login</a>
                        <a href="signup" class="btn-brand-gradient px-6 py-2.5 rounded-full font-bold text-sm">Get Started</a>
                    <?php else: ?>
                        <a href="logout" class="font-bold text-sm text-red-500 hover:text-red-700 transition px-2">Logout</a>
                    <?php endif; ?>
                    
                    <a href="store" class="w-10 h-10 rounded-full border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-all relative">
                        <i class="fas fa-shopping-basket"></i>
                        <span class="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full">
                            <?= isset($_SESSION['applied_coupon']) ? '1' : '0' ?>
                        </span>
                    </a>
                </div>

                <button onclick="openMobileSearch()" class="lg:hidden w-10 h-10 flex items-center justify-center text-slate-600 hover:text-blue-600 bg-slate-50 rounded-full transition">
                    <i class="fas fa-search"></i>
                </button>

                <button id="menu-btn" class="md:hidden w-10 h-10 flex items-center justify-center text-slate-900 text-xl">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </div>
        
        <div id="mobile-menu" class="fixed inset-0 bg-white z-[3000] translate-x-full transition-transform duration-300 md:hidden flex flex-col p-8 shadow-2xl h-screen overflow-y-auto">
             <div class="flex justify-between items-center mb-12 border-b border-slate-100 pb-6">
                <img src="assets/logo-laptop-mitra.png" alt="LaptopStore" class="h-8 w-auto"> 
                <button id="close-menu" class="w-10 h-12 flex items-center justify-center bg-slate-50 rounded-full text-slate-900"><i class="fas fa-times"></i></button>
            </div>
            
            <a href="/" class="text-xl font-bold brand-font mb-6 text-blue-600">Home</a>
            <a href="store" class="text-xl font-bold brand-font mb-6 text-slate-800">Store</a>
            <a href="about" class="text-xl font-bold brand-font mb-6 text-slate-800">About</a>
            <div class="mt-auto">
                <?php if(!$is_logged_in): ?>
                    <a href="signup" class="block w-full py-4 text-center font-bold text-white btn-brand-gradient rounded-xl">Sign Up</a>
                <?php else: ?>
                    <div class="text-center mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Your Referral Code</p>
                        <p class="text-2xl font-black text-blue-600"><?= $user_referral_code ?></p>
                        <p class="text-[10px] text-slate-400 mt-1">Share to earn ₹500</p>
                    </div>
                    <a href="dashboard" class="block w-full py-4 text-center font-bold text-white btn-brand-gradient rounded-xl">Dashboard</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>

    <div class="sticky top-0 z-[1999]">
        <?php 
        if (file_exists('includes/headerdown.php')) {
            include 'includes/headerdown.php'; 
        }
        ?>
    </div>

    <div id="mobile-search-overlay" class="fixed inset-0 bg-white z-[5000] flex flex-col">
        <div class="p-4 flex items-center gap-3 border-b border-slate-100 shadow-sm">
            <button onclick="closeMobileSearch()" class="w-10 h-10 flex items-center justify-center text-slate-500 text-xl"><i class="fas fa-arrow-left"></i></button>
            <div class="relative flex-1">
                <input type="text" id="mobile-search-input" placeholder="Search laptops..." class="w-full h-12 bg-slate-100 rounded-full pl-10 pr-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
        </div>
        <div id="mobile-search-results" class="flex-1 overflow-y-auto p-4 bg-slate-50 pb-20"></div>
    </div>

    <section class="relative h-[600px] md:h-[750px] w-full">
        <div class="swiper hero-swiper h-full w-full">
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2000" class="absolute inset-0 w-full h-full object-cover" alt="Office">
                    <div class="hero-overlay absolute inset-0"></div>
                    <div class="relative z-10 h-full flex flex-col justify-center px-6 max-w-[1600px] mx-auto">
                        <div class="max-w-3xl" data-aos="fade-right">
                            <span class="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest text-blue-400 uppercase border border-blue-400/30 bg-blue-900/30 rounded-full">Corporate Procurement</span>
                            <h1 class="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 leading-tight brand-font">Bulk Laptop Sales <br>For <span class="text-blue-500">Growing Teams.</span></h1>
                            <p class="text-slate-300 text-base md:text-xl mb-10 max-w-xl">Equip your workforce with premium hardware. Wholesale pricing tiers starting from 5+ units.</p>
                            <a href="tel:+917701993300" class="btn-brand-gradient px-8 py-4 rounded-xl font-bold inline-block text-center shadow-lg shadow-blue-900/50">Call for Bulk Quote</a>
                        </div>
                    </div>
                </div>
                <div class="swiper-slide">
                    <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000" class="absolute inset-0 w-full h-full object-cover" alt="Meeting">
                    <div class="hero-overlay absolute inset-0"></div>
                    <div class="relative z-10 h-full flex flex-col justify-center px-6 max-w-[1600px] mx-auto">
                        <div class="max-w-3xl">
                             <span class="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-widest text-green-400 uppercase border border-green-400/30 bg-green-900/30 rounded-full">Smart Finance</span>
                            <h1 class="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 leading-tight brand-font">Flexible Leasing. <br><span class="text-green-500">Zero CAPEX.</span></h1>
                            <a href="store" class="btn-gradient-green text-white px-8 py-4 rounded-xl font-bold inline-block text-center mt-6">View Leasing Plans</a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="swiper-pagination"></div>
        </div>
    </section>

    <section class="py-20 relative overflow-hidden flash-sale-bg">
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-400 opacity-20 rounded-full blur-3xl -ml-20 -mb-20"></div>
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05]"></div>
        
        <div class="max-w-[1600px] mx-auto px-6 relative z-10">
            <div class="flex flex-col xl:flex-row justify-between items-center gap-10 mb-16">
                <div class="text-center xl:text-left text-white">
                    <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 shadow-lg uppercase tracking-wider animate-pulse">
                        <i class="fas fa-bolt text-yellow-300"></i> Flash Sale Live
                    </div>
                    <h2 class="text-4xl md:text-6xl font-black brand-font tracking-tight mb-2 drop-shadow-md">
                        Deal of <span class="text-cyan-300">The Day</span>
                    </h2>
                    <p class="text-blue-100 mt-2 text-lg max-w-xl font-medium">Grab premium business hardware at unbeatable prices before time runs out.</p>
                </div>

                <div class="glass-card p-4 md:p-6 rounded-3xl flex items-center gap-4 md:gap-6 pulse-animation">
                    <div class="flex flex-col items-center">
                        <div class="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center bg-white text-blue-600 shadow-lg"><span id="hours" class="text-xl md:text-3xl font-black font-mono">12</span></div>
                        <span class="text-[10px] uppercase font-bold text-blue-100 mt-2 tracking-widest">Hrs</span>
                    </div>
                    <span class="text-2xl font-black text-white/50">:</span>
                    <div class="flex flex-col items-center">
                        <div class="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center bg-white text-blue-600 shadow-lg"><span id="minutes" class="text-xl md:text-3xl font-black font-mono">45</span></div>
                        <span class="text-[10px] uppercase font-bold text-blue-100 mt-2 tracking-widest">Mins</span>
                    </div>
                    <span class="text-2xl font-black text-white/50">:</span>
                    <div class="flex flex-col items-center">
                        <div class="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center bg-yellow-400 text-blue-900 shadow-lg"><span id="seconds" class="text-xl md:text-3xl font-black font-mono">30</span></div>
                        <span class="text-[10px] uppercase font-bold text-blue-100 mt-2 tracking-widest">Secs</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <?php foreach($deal_laptops as $laptop): 
                    $model_name = addslashes($laptop['model']);
                    $price_fmt = number_format($laptop['price_individual_sell']);
                    $specs_txt = addslashes($laptop['processor'] . " • " . $laptop['ram']);
                    
                    // --- SEO FRIENDLY URL GENERATION ---
                    $urlSlug = !empty($laptop['slug']) ? $laptop['slug'] : trim(strtolower(preg_replace('/[^A-Za-z0-9-]+/', '-', $laptop['model'])), '-');
                    if (empty($urlSlug)) { $urlSlug = 'product-' . $laptop['id']; }

                    $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
                    $link_url = $base_url . '/laptop/' . $urlSlug;
                ?>
                <div class="group relative bg-white rounded-[2rem] border border-blue-100 shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/20">
                    
                    <div class="bg-gradient-to-b from-slate-50 to-white h-60 p-6 relative flex items-center justify-center overflow-hidden">
                        <span class="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 shadow-lg shadow-red-500/30 animate-bounce">
                            <i class="fas fa-fire mr-1"></i> HOT DEAL
                        </span>
                        
                        <button onclick="shareOnWhatsApp(
                                '<?= $model_name ?>', 
                                '<?= $price_fmt ?>', 
                                '<?= $specs_txt ?>', 
                                '<?= $user_referral_code ?>', 
                                '<?= $link_url ?>')" 
                                class="share-btn absolute top-4 right-4 w-10 h-10 rounded-full bg-green-500 shadow-md border-2 border-white text-white hover:scale-110 flex items-center justify-center transition-all z-20" 
                                title="Share on WhatsApp">
                             <i class="fab fa-whatsapp text-lg"></i>
                        </button>

                        <a href="laptop/<?= $urlSlug ?>" class="block w-full h-full flex items-center justify-center relative">
                            <div class="absolute inset-0 bg-cyan-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full scale-75"></div>
                            <img src="<?= $laptop['image'] ?>" class="h-40 w-auto object-contain mix-blend-multiply relative z-10 transition-transform duration-500 group-hover:scale-110" alt="<?= htmlspecialchars($laptop['model']) ?>">
                        </a>
                    </div>

                    <div class="p-6 flex flex-col flex-grow">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider"><?= htmlspecialchars($laptop['brand']) ?></span>
                            <div class="flex text-yellow-400 text-[10px] gap-0.5">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
                            </div>
                        </div>
                        
                        <h4 class="text-lg font-bold text-slate-900 mb-2 leading-tight line-clamp-2 hover:text-blue-600 transition-colors">
                            <a href="laptop/<?= $urlSlug ?>"><?= htmlspecialchars($laptop['model']) ?></a>
                        </h4>
                        
                        <div class="flex flex-wrap gap-2 mb-6">
                             <span class="px-2 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <i class="fas fa-microchip text-slate-400"></i> <?= htmlspecialchars($laptop['processor']) ?>
                             </span>
                             <span class="px-2 py-1 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <i class="fas fa-memory text-slate-400"></i> <?= htmlspecialchars($laptop['ram']) ?>
                             </span>
                        </div>

                        <div class="mt-auto flex items-end justify-between pt-4 border-t border-dashed border-slate-200">
                            <div>
                                <div class="text-xs text-slate-400 font-bold line-through mb-0.5">₹<?= number_format($laptop['price_individual_sell'] * 1.25) ?></div>
                                <div class="text-xl font-black text-blue-600">₹<?= number_format($laptop['price_individual_sell']) ?></div>
                            </div>
                            <a href="laptop/<?= $urlSlug ?>" class="h-10 px-5 rounded-full btn-brand-gradient text-white font-bold text-sm flex items-center gap-2 transition-all group/btn">
                                Buy <i class="fas fa-arrow-right group-hover/btn:translate-x-1 transition-transform"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>

    <section class="bg-white py-16 border-y border-slate-100">
        <div class="max-w-[1600px] mx-auto px-6 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            <div data-aos="fade-up" class="group">
                <div class="text-3xl md:text-5xl font-black mb-2 text-blue-600 brand-font counter group-hover:scale-110 transition-transform duration-300" data-target="1500">1500+</div>
                <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Devices Sold</div>
            </div>
            <div data-aos="fade-up" data-aos-delay="100" class="group">
                <div class="text-3xl md:text-5xl font-black mb-2 text-blue-600 brand-font counter group-hover:scale-110 transition-transform duration-300" data-target="27">27+</div>
                <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Corporate Clients</div>
            </div>
            <div data-aos="fade-up" data-aos-delay="200" class="group">
                <div class="text-3xl md:text-5xl font-black mb-2 text-blue-600 brand-font counter group-hover:scale-110 transition-transform duration-300" data-target="95">95%</div>
                <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Satisfaction Rate</div>
            </div>
            <div data-aos="fade-up" data-aos-delay="300" class="group">
                <div class="text-3xl md:text-5xl font-black mb-2 text-blue-600 brand-font counter group-hover:scale-110 transition-transform duration-300" data-target="2">2+</div>
                <div class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Years Experience</div>
            </div>
        </div>
    </section>

    <div class="bg-slate-50 py-10 overflow-hidden relative group">
        <div class="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
        <div class="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-slate-50 to-transparent z-10"></div>
        <div class="max-w-[1400px] mx-auto px-6 mb-8 text-center"><span class="inline-block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">Authorized Partners</span></div>
        <div class="relative w-full overflow-hidden">
            <div class="flex w-max animate-scroll items-center hover:[animation-play-state:paused]">
                <?php 
                $brands = [ 'Lenovo' => 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg', 'HP' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/HP_logo_2012.svg/250px-HP_logo_2012.svg.png?20160215051833', 'Dell' => 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg' ];
                for($i=0; $i<8; $i++): foreach($brands as $name => $logo): ?>
                    <div class="flex-shrink-0 px-8 md:px-16 opacity-30 hover:opacity-100 transition-all duration-500 grayscale hover:grayscale-0">
                        <img src="<?= $logo ?>" class="h-6 md:h-9 w-auto object-contain transform hover:scale-110 transition-transform duration-300" alt="<?= $name ?>">
                    </div>
                <?php endforeach; endfor; ?>
            </div>
        </div>
    </div>

    <section class="py-16 bg-white">
        <div class="max-w-[1400px] mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div>
                    <h3 class="text-2xl md:text-3xl font-black brand-font text-slate-900">Trending <span class="text-blue-600">Inventory</span></h3>
                    <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Ready for dispatch</p>
                </div>
                <a href="store" class="relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-bold text-white transition-all duration-300 btn-brand-gradient rounded-full group hover:shadow-lg">
                    <span class="relative flex items-center gap-2">View Catalog <i class="fas fa-arrow-right text-sm transition-transform group-hover:translate-x-1"></i></span>
                </a>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <?php 
                $count = 0;
                foreach($featured_laptops as $laptop): 
                    $model_name = addslashes($laptop['model']);
                    $price_fmt = number_format($laptop['price_individual_sell']);
                    $specs_txt = addslashes($laptop['processor'] . " • " . $laptop['ram']);
                    
                    // --- SEO FRIENDLY URL GENERATION ---
                    $urlSlug = !empty($laptop['slug']) ? $laptop['slug'] : trim(strtolower(preg_replace('/[^A-Za-z0-9-]+/', '-', $laptop['model'])), '-');
                    if (empty($urlSlug)) { $urlSlug = 'product-' . $laptop['id']; }

                    $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
                    $link_url = $base_url . '/laptop/' . $urlSlug;
                ?>
                <div class="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 h-full flex flex-col overflow-hidden relative" data-aos="fade-up" data-aos-delay="<?= $count * 50 ?>">
                    <div class="h-48 bg-slate-50 relative flex items-center justify-center p-4 overflow-hidden">
                        
                        <button onclick="shareOnWhatsApp(
                                '<?= $model_name ?>', 
                                '<?= $price_fmt ?>', 
                                '<?= $specs_txt ?>', 
                                '<?= $user_referral_code ?>', 
                                '<?= $link_url ?>')" 
                                class="share-btn absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 text-green-500 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all z-20">
                             <i class="fab fa-whatsapp"></i>
                        </button>
                        
                        <a href="laptop/<?= $urlSlug ?>" class="block w-full h-full flex items-center justify-center">
                            <img src="<?= $laptop['image'] ?>" class="h-32 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt="<?= htmlspecialchars($laptop['model']) ?>" onerror="this.src='https://via.placeholder.com/200x200?text=Laptop'">
                        </a>
                        
                        <div class="absolute top-3 left-3 pointer-events-none">
                             <?php if(isset($laptop['condition']) && $laptop['condition'] == 'new'): ?>
                                <span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">NEW</span>
                            <?php else: ?>
                                <span class="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">REFURB</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <a href="laptop/<?= $urlSlug ?>" class="p-4 flex flex-col flex-grow">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1"><?= htmlspecialchars($laptop['brand']) ?></div>
                        <h5 class="font-bold brand-font text-slate-900 mb-3 truncate text-sm md:text-base"><?= htmlspecialchars($laptop['model']) ?></h5>
                        <div class="flex items-center gap-2 mb-4">
                            <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600"><?= htmlspecialchars($laptop['processor']) ?></span>
                            <span class="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-600"><?= htmlspecialchars($laptop['ram']) ?></span>
                        </div>
                        <div class="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-bold text-slate-400 uppercase">Offer</span>
                                <span class="text-lg font-black text-blue-600 leading-none">₹<?= number_format($laptop['price_individual_sell']) ?></span>
                            </div>
                            <div class="w-8 h-8 rounded-full btn-brand-gradient flex items-center justify-center hover:scale-110 transition shadow-md"><i class="fas fa-arrow-right text-xs"></i></div>
                        </div>
                    </a>
                </div>
                <?php $count++; endforeach; ?>
            </div>
        </div>
    </section>

    <section class="py-20 bg-slate-50">
        <div class="max-w-[1400px] mx-auto px-6">
            <div class="text-center max-w-2xl mx-auto mb-16">
                <span class="text-blue-600 font-bold tracking-widest uppercase text-xs">Why Choose Laptop Mitra</span>
                <h2 class="text-3xl md:text-4xl font-black brand-font text-slate-900 mt-2">More Than Just A Store</h2>
                <p class="text-slate-500 mt-4">We are your long-term technology partner. Here is how we add value to every purchase.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div class="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">6 Months Warranty</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Every refurbished device undergoes 50+ quality checks and comes with a comprehensive warranty.</p>
                </div>
                <div class="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div class="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"><i class="fas fa-truck-fast"></i></div>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">Pan-India Delivery</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Fast and secure shipping to 25,000+ pincodes across India with transit insurance included.</p>
                </div>
                <div class="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div class="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"><i class="fas fa-rotate"></i></div>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">7-Day Replacement</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Not satisfied? Get a hassle-free replacement within 7 days if the device has any hardware issues.</p>
                </div>
                 <div class="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div class="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform"><i class="fas fa-headset"></i></div>
                    <h3 class="text-lg font-bold text-slate-900 mb-3">Lifetime Support</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Technical team is always just a call away for any software or hardware assistance.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-20 bg-white relative overflow-hidden">
        <div class="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -ml-16 -mt-16 opacity-50"></div>
        <div class="absolute bottom-0 right-0 w-80 h-80 bg-purple-50 rounded-full blur-3xl -mr-20 -mb-20 opacity-50"></div>

        <div class="max-w-[1400px] mx-auto px-6 relative z-10">
            <div class="text-center mb-16" data-aos="fade-up">
                <span class="text-blue-600 font-bold tracking-widest uppercase text-xs bg-blue-50 px-3 py-1 rounded-full">Testimonials</span>
                <h2 class="text-3xl md:text-5xl font-black brand-font text-slate-900 mt-4">Trusted by <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">5000+ Customers</span></h2>
                <p class="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">Don't just take our word for it. See what businesses, students, and professionals say about Laptop Mitra.</p>
            </div>

            <div class="swiper reviews-swiper pb-12">
                <div class="swiper-wrapper">
                    <div class="swiper-slide h-auto">
                        <div class="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] h-full flex flex-col relative group hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                            <div class="text-6xl text-blue-100 font-serif absolute top-4 right-6 opacity-50 group-hover:text-blue-200 transition-colors">"</div>
                            <div class="flex items-center gap-1 text-yellow-400 text-sm mb-6">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            </div>
                            <p class="text-slate-600 text-base leading-relaxed mb-8 font-medium">"I was skeptical about buying refurbished, but the condition of the Dell Latitude I bought was pristine. It looked brand new! Saved nearly ₹25,000 compared to a new one."</p>
                            <div class="mt-auto flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">R</div>
                                <div>
                                    <h4 class="font-bold text-slate-900">Rahul Sharma</h4>
                                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Freelance Developer</p>
                                </div>
                                <div class="ml-auto">
                                    <i class="fas fa-check-circle text-green-500 text-xl" title="Verified Purchase"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="swiper-slide h-auto">
                        <div class="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] h-full flex flex-col relative group hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                            <div class="text-6xl text-blue-100 font-serif absolute top-4 right-6 opacity-50 group-hover:text-blue-200 transition-colors">"</div>
                            <div class="flex items-center gap-1 text-yellow-400 text-sm mb-6">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            </div>
                            <p class="text-slate-600 text-base leading-relaxed mb-8 font-medium">"Sourced 10 laptops for my startup team. The bulk pricing was unbeatable, and the after-sales support has been fantastic. Highly recommended for B2B deals."</p>
                            <div class="mt-auto flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-green-500/30">A</div>
                                <div>
                                    <h4 class="font-bold text-slate-900">Amit Verma</h4>
                                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">CEO, TechSpire</p>
                                </div>
                                <div class="ml-auto">
                                    <i class="fas fa-check-circle text-green-500 text-xl" title="Verified Purchase"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="swiper-slide h-auto">
                        <div class="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] h-full flex flex-col relative group hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                            <div class="text-6xl text-blue-100 font-serif absolute top-4 right-6 opacity-50 group-hover:text-blue-200 transition-colors">"</div>
                            <div class="flex items-center gap-1 text-yellow-400 text-sm mb-6">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            </div>
                            <p class="text-slate-600 text-base leading-relaxed mb-8 font-medium">"Best place for students! Got a MacBook Air M1 at a steal deal. Works perfectly with heavy design software like Adobe Illustrator. Thank you Laptop Mitra!"</p>
                            <div class="mt-auto flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-pink-500/30">S</div>
                                <div>
                                    <h4 class="font-bold text-slate-900">Sneha Gupta</h4>
                                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Design Student</p>
                                </div>
                                <div class="ml-auto">
                                    <i class="fas fa-check-circle text-green-500 text-xl" title="Verified Purchase"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="swiper-pagination !bottom-0"></div>
            </div>
        </div>
    </section>

    <section class="py-16 px-4">
        <div class="max-w-[1400px] mx-auto bg-slate-900 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden">
            <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div class="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[100px] opacity-30 -mr-20 -mt-20"></div>
            
            <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div class="text-center md:text-left max-w-2xl">
                    <span class="text-blue-400 font-bold tracking-widest uppercase text-xs mb-2 block">Upgrade Your Tech</span>
                    <h2 class="text-3xl md:text-5xl font-black text-white mb-6 brand-font">Have Old Laptops? <br>Exchange or Sell for Cash.</h2>
                    <p class="text-slate-400 mb-8 text-lg">Don't let your old hardware gather dust. Get the best market value for your used laptops instantly.</p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <?php 
                        $wa_msg = "Hello Laptop Mitra, I am interested in your services (Buy/Sell/Corporate). Could you please provide me with a quote?";
                        $wa_encoded = urlencode($wa_msg);
                        ?>
                        <a href="https://wa.me/917701993300?text=<?= $wa_encoded ?>" target="_blank" class="group btn-brand-gradient px-8 py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-900/50 flex items-center justify-center gap-3">
                            <i class="fab fa-whatsapp text-3xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12 drop-shadow-md"></i> 
                            <span>Get Quote on WhatsApp</span>
                        </a>
                        <a href="tel:+917701993300" class="px-8 py-4 rounded-xl font-bold text-white border border-slate-700 hover:bg-slate-800 transition">Call Now</a>
                    </div>
                </div>
                <div class="relative">
                      <div class="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                        <i class="fas fa-hand-holding-dollar text-8xl text-white"></i>
                      </div>
                </div>
            </div>
        </div>
    </section>

    <?php include 'footer.php'; ?>
    
    <script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js"></script>
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        AOS.init({ duration: 1000, once: true, offset: 50 });
        
        // --- TOAST NOTIFICATION FOR DISCOUNT LOGIC ---
        <?php if(!empty($discount_message)): ?>
            Toastify({
                text: "<?= $discount_message ?>",
                duration: 4000,
                gravity: "top", 
                position: "right", 
                style: {
                    background: "<?= strpos($discount_message, 'Success') !== false ? 'linear-gradient(to right, #00b09b, #96c93d)' : 'linear-gradient(to right, #ff5f6d, #ffc371)' ?>",
                },
                onClick: function(){}
            }).showToast();
        <?php endif; ?>

        // --- WHATSAPP SHARE LOGIC ---
        function shareOnWhatsApp(model, price, specs, refCode, url) {
            let shareUrl = new URL(url);
            
            // Only attach code if user is logged in and code is valid
            if(refCode && refCode !== 'GUEST') {
                shareUrl.searchParams.set('ref', refCode);
            }
            
            const finalUrl = shareUrl.toString();
            
            // We encode the content to make it WhatsApp friendly
            const text = `🔥 *FLASH SALE ALERT* 🔥\n\n` +
                         `💻 *${model}*\n` +
                         `⚙️ ${specs}\n` +
                         `💰 Deal Price: *₹${price}*\n\n` +
                         `👇 *Buy Now & Get ₹500 OFF:*\n` +
                         `${finalUrl}\n\n` +
                         `🎟️ Use Referral Code: *${refCode}*`;

            const encodedText = encodeURIComponent(text);
            window.open(`https://wa.me/?text=${encodedText}`, '_blank');
        }

        // --- SEARCH LOGIC ---
        const products = [
            <?php foreach($all_laptops_search as $l): 
                $s_slug = !empty($l['slug']) ? $l['slug'] : trim(strtolower(preg_replace('/[^A-Za-z0-9-]+/', '-', $l['model'])), '-');
                if(empty($s_slug)) $s_slug = 'product-' . $l['id'];
            ?>
            {
                id: <?= $l['id'] ?>,
                model: "<?= addslashes($l['model']) ?>",
                brand: "<?= addslashes($l['brand']) ?>",
                price: "<?= number_format($l['price_individual_sell']) ?>",
                image: "<?= $l['image'] ?>",
                condition: "<?= isset($l['condition']) ? $l['condition'] : 'refurb' ?>",
                slug: "<?= $s_slug ?>"
            },
            <?php endforeach; ?>
        ];

        function performSearch(query, resultContainer) {
            const val = query.toLowerCase().trim();
            const container = document.getElementById(resultContainer);
            
            if(val.length === 0) {
                container.innerHTML = '';
                container.classList.remove('active');
                return;
            }

            const filtered = products.filter(item => 
                item.model.toLowerCase().includes(val) || 
                item.brand.toLowerCase().includes(val)
            );
            
            if(filtered.length > 0) {
                let html = '';
                filtered.forEach(item => {
                    const badge = item.condition === 'new' ? '<span class="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-1 font-bold">NEW</span>' : '';
                    html += `
                        <a href="laptop/${item.slug}" class="flex items-center gap-4 p-3 hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer">
                            <img src="${item.image}" class="w-12 h-12 object-contain mix-blend-multiply" onerror="this.src='https://via.placeholder.com/50'">
                            <div class="flex-1 min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase">${item.brand} ${badge}</div>
                                <h4 class="font-bold text-slate-900 text-sm truncate">${item.model}</h4>
                            </div>
                            <div class="font-bold text-blue-600 text-sm">₹${item.price}</div>
                        </a>
                    `;
                });
                container.innerHTML = html;
                container.classList.add('active');
            } else {
                container.innerHTML = '<div class="p-4 text-center text-slate-400 text-sm">No products found</div>';
                container.classList.add('active');
            }
        }

        document.getElementById('desktop-search').addEventListener('keyup', (e) => performSearch(e.target.value, 'desktop-results'));
        document.getElementById('mobile-search-input').addEventListener('keyup', (e) => performSearch(e.target.value, 'mobile-search-results'));

        const menuBtn = document.getElementById('menu-btn');
        const closeBtn = document.getElementById('close-menu');
        const mobileMenu = document.getElementById('mobile-menu');
        const searchOverlay = document.getElementById('mobile-search-overlay');

        menuBtn.addEventListener('click', () => { mobileMenu.classList.remove('translate-x-full'); });
        closeBtn.addEventListener('click', () => { mobileMenu.classList.add('translate-x-full'); });

        function openMobileSearch() {
            searchOverlay.classList.add('active');
            setTimeout(() => document.getElementById('mobile-search-input').focus(), 100);
        }
        function closeMobileSearch() {
            searchOverlay.classList.remove('active');
        }

        new Swiper('.hero-swiper', {
            loop: true, effect: 'fade',
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
        });

        // Initialize Reviews Swiper
        new Swiper('.reviews-swiper', {
            loop: true,
            spaceBetween: 30,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            breakpoints: {
                320: {
                    slidesPerView: 1, // Mobile: 1 card
                },
                768: {
                    slidesPerView: 2, // Tablet: 2 cards
                },
                1024: {
                    slidesPerView: 3, // Desktop: 3 cards
                }
            }
        });

        // Timer
        function startTimer() {
            const end = new Date(); end.setHours(23, 59, 59, 999); 
            setInterval(() => {
                const now = new Date(); const diff = end - now;
                if (diff <= 0) return;
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / (1000 * 60)) % 60);
                const s = Math.floor((diff / 1000) % 60);
                document.getElementById('hours').innerText = h < 10 ? '0' + h : h;
                document.getElementById('minutes').innerText = m < 10 ? '0' + m : m;
                document.getElementById('seconds').innerText = s < 10 ? '0' + s : s;
            }, 1000);
        }
        startTimer();
    </script>
</body>
</html>
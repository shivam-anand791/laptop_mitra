<?php
session_start();
require_once 'config/database.php';
require_once 'includes/functions.php';

// --- LOGIN CHECK ---
$is_logged_in = isset($_SESSION['user_id']);

function getSafeLink($is_logged_in, $destination) {
    return $is_logged_in ? $destination : "login.php?redirect=" . urlencode($destination);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy | LaptopStore</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root { --brand-primary: #2563eb; --brand-dark: #0f172a; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; }
        h1, h2, h3, h4, .brand-font { font-family: 'Outfit', sans-serif; }
        
        /* Navbar Style from Index */
        .glass-navbar { background: rgba(255, 255, 255, 0.90); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.05); }
        
        /* Prose Styling */
        .legal-content h3 { color: #0f172a; font-weight: 700; font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; }
        .legal-content p { color: #475569; margin-bottom: 1.5rem; line-height: 1.75; }
        .legal-content ul { list-style-type: disc; padding-left: 1.5rem; color: #475569; margin-bottom: 1.5rem; }
        .legal-content li { margin-bottom: 0.5rem; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900">

    <nav class="glass-navbar sticky top-0 z-[2000] w-full shadow-sm">
        <div class="max-w-[1600px] mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
            <a href="index.php" class="flex items-center gap-3 shrink-0">
                <img src="assets/logo-laptop-mitra.png" alt="LaptopStore" class="h-10 md:h-12 w-auto object-contain">
            </a>

            <div class="flex items-center gap-2 md:gap-8">
                <div class="hidden md:flex items-center gap-8">
                    <a href="index.php" class="font-bold text-sm text-slate-500 hover:text-blue-600 transition">Home</a>
                    <!--<a href="<?= getSafeLink($is_logged_in, 'store.php') ?>" class="font-bold text-sm text-slate-500 hover:text-blue-600 transition">Store</a>-->
                    
                    <?php if(!$is_logged_in): ?>
                        <a href="login.php" class="font-bold text-sm text-slate-500 hover:text-blue-600 transition">Login</a>
                        <a href="signup.php" class="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-200">Get Started</a>
                    <?php else: ?>
                        <a href="store.php" class="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition">Store</a>
                    <?php endif; ?>
                </div>

                <button id="menu-btn" class="md:hidden w-10 h-10 flex items-center justify-center text-slate-900 text-xl">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </div>
        
        <div id="mobile-menu" class="fixed inset-0 bg-white z-[3000] translate-x-full transition-transform duration-300 md:hidden flex flex-col p-6 shadow-2xl h-screen">
            <div class="flex justify-between items-center mb-10 border-b pb-4">
                <img src="assets/logo-laptop-mitra.png" alt="Logo" class="h-8"> 
                <button id="close-menu" class="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full"><i class="fas fa-times"></i></button>
            </div>
            <div class="flex flex-col gap-6 text-lg font-bold">
                <a href="index.php">Home</a>
                <!--<a href="store.php">Store</a>-->
                <?php if(!$is_logged_in): ?>
                    <a href="login.php" class="text-blue-600">Login</a>
                    <a href="signup.php" class="bg-blue-600 text-white text-center py-3 rounded-xl">Sign Up</a>
                <?php else: ?>
                    <a href="store.php" class="bg-slate-900 text-white text-center py-3 rounded-xl">Store</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>

    <section class="bg-slate-900 py-20 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-green-600/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
        <div class="max-w-[1000px] mx-auto px-6 relative z-10 text-center">
            <h1 class="text-4xl md:text-6xl font-black brand-font mb-4">Privacy Policy</h1>
            <p class="text-slate-400 text-lg">We value your trust and are committed to protecting your personal data.</p>
        </div>
    </section>

    <section class="py-16 md:py-24 bg-white">
        <div class="max-w-[800px] mx-auto px-6 legal-content">
            <p class="text-sm text-slate-400 mb-8 uppercase font-bold tracking-widest">Effective Date: January 2026</p>

            <h3>1. Information We Collect</h3>
            <p>We collect information to provide better services to our users. This includes:</p>
            <ul>
                <li><strong>Personal Information:</strong> Name, Email address, Phone number, and GST Number (for business accounts) provided during registration.</li>
                <li><strong>Transactional Information:</strong> Details about payments to and from you and other details of products you have purchased or leased from us.</li>
                <li><strong>Usage Data:</strong> Information about how you use our website, such as page views and interaction logs.</li>
            </ul>

            <h3>2. How We Use Your Information</h3>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
                <li>To process orders, generate GST-compliant invoices, and manage leasing agreements.</li>
                <li>To communicate with you regarding your account, security updates, and product support.</li>
                <li>To improve our inventory management and user interface based on browsing patterns.</li>
            </ul>

            <h3>3. Data Sharing and Disclosure</h3>
            <p>We do not sell your personal data. We may share your information only in the following circumstances:</p>
            <ul>
                <li><strong>Service Providers:</strong> We use trusted third-party payment gateways and logistics partners who process data on our behalf.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities (e.g., GST filings).</li>
            </ul>

            <h3>4. Cookies and Tracking</h3>
            <p>We use cookies to maintain your session (login state) and to store your cart preferences. You can instruct your browser to refuse all cookies, but some portions of our Service may not function properly without them.</p>

            <h3>5. Data Security</h3>
            <p>We implement a variety of security measures to maintain the safety of your personal information. Passwords are hashed and stored securely in our database. However, no method of transmission over the Internet is 100% secure.</p>

            <h3>6. Your Rights</h3>
            <p>You have the right to access, correct, or request deletion of your personal data. You can manage your profile information directly from your Dashboard or contact our support team for assistance.</p>
        </div>
    </section>

    <?php include 'footer.php'; ?>

    <script>
        const menuBtn = document.getElementById('menu-btn');
        const closeMenu = document.getElementById('close-menu');
        const mobileMenu = document.getElementById('mobile-menu');

        if(menuBtn){
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.remove('translate-x-full');
            });
        }
        if(closeMenu){
            closeMenu.addEventListener('click', () => {
                mobileMenu.classList.add('translate-x-full');
            });
        }
    </script>
</body>
</html>
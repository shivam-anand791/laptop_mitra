<?php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 1. Database Connection (For Navbar state consistency)
if (file_exists('config/database.php')) {
    require_once 'config/database.php';
} else {
    $host = 'localhost';
    $user = 'root'; 
    $pass = ''; 
    $db   = 'xper_u797209756_laptop';
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) $conn = null;
}

// --- GLOBAL VARIABLES ---
$user_referral_code = "GUEST"; 
$is_logged_in = isset($_SESSION['user_id']);

if ($is_logged_in && $conn) {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT referral_code FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user_data = $result->fetch_assoc();
    if ($user_data && !empty($user_data['referral_code'])) {
        $user_referral_code = $user_data['referral_code'];
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <base href="/">
    <title>About Us | Laptop Mitra</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">

    <style>
        :root { --brand-primary: #2563eb; --brand-dark: #0f172a; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; scroll-behavior: smooth; }
        h1, h2, h3, h4, .brand-font { font-family: 'Outfit', sans-serif; }
        a { text-decoration: none !important; }
        
        /* Navbar Styles */
        .glass-navbar { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); position: relative; z-index: 2000; }
        
        /* Buttons */
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
        
        /* Custom Backgrounds */
        .hero-pattern { background-color: #0f172a; background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e293b' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
        .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">

    <nav class="glass-navbar" id="navbar">
        <div class="max-w-[1600px] mx-auto px-4 md:px-6 h-20 flex justify-between items-center gap-4">
            
            <a href="/" class="flex items-center gap-3 shrink-0">
                <img src="assets/logo-laptop-mitra.png" alt="Laptop Mitra" class="h-8 md:h-10 w-auto object-contain" onerror="this.src='https://via.placeholder.com/150x50?text=Laptop+Mitra'">
            </a>

            <!--<div class="hidden lg:block flex-1 max-w-2xl mx-auto">-->
            <!--     <ul class="flex items-center justify-center gap-8 font-bold text-sm text-slate-600">-->
            <!--        <li><a href="/" class="hover:text-blue-600 transition">Home</a></li>-->
            <!--        <li><a href="store" class="hover:text-blue-600 transition">Store</a></li>-->
            <!--        <li><a href="about" class="text-blue-600 transition">About Us</a></li>-->
            <!--        <li><a href="contact" class="hover:text-blue-600 transition">Contact</a></li>-->
            <!--    </ul>-->
            <!--</div>-->

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

                <button id="menu-btn" class="md:hidden w-10 h-10 flex items-center justify-center text-slate-900 text-xl">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </div>
        
        <div id="mobile-menu" class="fixed inset-0 bg-white z-[3000] translate-x-full transition-transform duration-300 md:hidden flex flex-col p-8 shadow-2xl h-screen overflow-y-auto">
             <div class="flex justify-between items-center mb-12 border-b border-slate-100 pb-6">
                <img src="assets/logo-laptop-mitra.png" alt="LaptopStore" class="h-8 w-auto" onerror="this.src='https://via.placeholder.com/150x50?text=Laptop+Mitra'"> 
                <button id="close-menu" class="w-10 h-12 flex items-center justify-center bg-slate-50 rounded-full text-slate-900"><i class="fas fa-times"></i></button>
            </div>
            
            <a href="/" class="text-xl font-bold brand-font mb-6 text-slate-800">Home</a>
            <a href="store" class="text-xl font-bold brand-font mb-6 text-slate-800">Store</a>
            <a href="about" class="text-xl font-bold brand-font mb-6 text-blue-600">About Us</a>
            <a href="contact" class="text-xl font-bold brand-font mb-6 text-slate-800">Contact</a>
            
            <div class="mt-auto">
                <?php if(!$is_logged_in): ?>
                    <a href="signup" class="block w-full py-4 text-center font-bold text-white btn-brand-gradient rounded-xl">Sign Up</a>
                <?php else: ?>
                    <a href="dashboard" class="block w-full py-4 text-center font-bold text-white btn-brand-gradient rounded-xl">Dashboard</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>

    <section class="relative pt-24 pb-32 hero-pattern overflow-hidden">
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-40 -mt-40"></div>
        <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[100px] opacity-20 -ml-40 -mb-40"></div>
        
        <div class="max-w-[1400px] mx-auto px-6 relative z-10 text-center">
            <span data-aos="fade-down" class="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-blue-300 uppercase border border-blue-400/30 bg-blue-900/30 rounded-full backdrop-blur-sm">
                Our Story
            </span>
            <h1 data-aos="fade-up" data-aos-delay="100" class="text-5xl md:text-7xl font-black text-white mb-6 brand-font leading-tight">
                Empowering Businesses <br>with <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Smart IT Solutions</span>.
            </h1>
            <p data-aos="fade-up" data-aos-delay="200" class="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                Laptop Mitra is India's leading enterprise hardware partner. We specialize in providing premium, high-performance refurbished laptops that help growing teams scale without compromising on quality or budget.
            </p>
        </div>
    </section>

    <section class="py-20 bg-white relative -mt-10 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-20">
        <div class="max-w-[1400px] mx-auto px-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div data-aos="fade-right" class="relative">
                    <div class="absolute inset-0 bg-blue-100 rounded-[2.5rem] transform translate-x-4 translate-y-4"></div>
                    <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200" alt="Laptop Mitra Team" class="relative z-10 w-full h-auto rounded-[2.5rem] shadow-xl object-cover">
                    
                    <div class="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl z-20 animate-bounce" style="animation-duration: 3s;">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl">
                                <i class="fas fa-leaf"></i>
                            </div>
                            <div>
                                <h4 class="font-black text-slate-900 brand-font">Eco-Friendly</h4>
                                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Reducing E-Waste</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-aos="fade-left">
                    <h2 class="text-3xl md:text-5xl font-black brand-font text-slate-900 mb-6">Bridging the Gap Between <span class="text-blue-600">Premium & Affordable</span></h2>
                    <p class="text-slate-600 text-lg mb-6 leading-relaxed">
                        Setting up an office or a startup shouldn't drain your capital. At Laptop Mitra, we realized that the massive cost of brand new enterprise hardware was a major roadblock for many businesses and students.
                    </p>
                    <p class="text-slate-600 text-lg mb-8 leading-relaxed">
                        That's why we created a platform where you can access top-tier machines from brands like Apple, Dell, HP, and Lenovo at a fraction of the cost. Every laptop we sell is thoroughly tested, refurbished to factory standards, and backed by a solid warranty.
                    </p>
                    
                    <div class="grid grid-cols-2 gap-6 mt-10">
                        <div class="border-l-4 border-blue-600 pl-4">
                            <h4 class="text-2xl font-black text-slate-900 brand-font">50+</h4>
                            <p class="text-sm font-bold text-slate-500 uppercase tracking-wider">Quality Checks</p>
                        </div>
                        <div class="border-l-4 border-green-500 pl-4">
                            <h4 class="text-2xl font-black text-slate-900 brand-font">Pan-India</h4>
                            <p class="text-sm font-bold text-slate-500 uppercase tracking-wider">Delivery Network</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="py-24 bg-slate-50 border-t border-slate-100">
        <div class="max-w-[1400px] mx-auto px-6">
            <div class="text-center max-w-2xl mx-auto mb-16" data-aos="fade-up">
                <span class="text-blue-600 font-bold tracking-widest uppercase text-xs">Our Core Values</span>
                <h2 class="text-3xl md:text-5xl font-black brand-font text-slate-900 mt-4">Why Partner With Us?</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div data-aos="fade-up" data-aos-delay="100" class="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group text-center border border-slate-100">
                    <div class="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <i class="fas fa-medal"></i>
                    </div>
                    <h3 class="text-xl font-black brand-font text-slate-900 mb-4">Uncompromising Quality</h3>
                    <p class="text-slate-500 leading-relaxed">We don't just sell 'used' laptops. We sell enterprise-grade machines that have been professionally renewed to perform flawlessly for years.</p>
                </div>

                <div data-aos="fade-up" data-aos-delay="200" class="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 group text-center border border-slate-100">
                    <div class="w-20 h-20 mx-auto rounded-3xl bg-green-50 text-green-600 flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                        <i class="fas fa-handshake"></i>
                    </div>
                    <h3 class="text-xl font-black brand-font text-slate-900 mb-4">Trust & Transparency</h3>
                    <p class="text-slate-500 leading-relaxed">What you see is exactly what you get. Honest grading, clear specifications, and no hidden terms. Your trust is our biggest asset.</p>
                </div>

                <div data-aos="fade-up" data-aos-delay="300" class="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group text-center border border-slate-100">
                    <div class="w-20 h-20 mx-auto rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <i class="fas fa-headset"></i>
                    </div>
                    <h3 class="text-xl font-black brand-font text-slate-900 mb-4">Lifetime Relationship</h3>
                    <p class="text-slate-500 leading-relaxed">Our relationship doesn't end at the sale. With dedicated lifetime technical support, we ensure your business operations never hit a roadblock.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-24 bg-white relative overflow-hidden">
        <div class="max-w-[1200px] mx-auto px-6 relative z-10">
            <div class="text-center mb-20" data-aos="fade-up">
                <h2 class="text-3xl md:text-5xl font-black brand-font text-slate-900">The <span class="text-blue-600">Refurbishment</span> Process</h2>
                <p class="text-slate-500 mt-4 max-w-2xl mx-auto">How we turn pre-owned corporate hardware into powerful, reliable assets for your team.</p>
            </div>

            <div class="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                
                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-600 text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">1</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm" data-aos="fade-up">
                        <h4 class="text-lg font-black brand-font text-slate-900 mb-2">Corporate Sourcing</h4>
                        <p class="text-sm text-slate-500">We bulk source A-grade laptops directly from top MNCs and IT parks when they upgrade their inventory.</p>
                    </div>
                </div>

                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-600 text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">2</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm" data-aos="fade-up">
                        <h4 class="text-lg font-black brand-font text-slate-900 mb-2">50-Point Diagnosis</h4>
                        <p class="text-sm text-slate-500">Hardware experts test everything: battery health, screen pixels, keyboard tactility, thermal performance, and motherboard integrity.</p>
                    </div>
                </div>

                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-600 text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">3</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm" data-aos="fade-up">
                        <h4 class="text-lg font-black brand-font text-slate-900 mb-2">Cleaning & Upgrades</h4>
                        <p class="text-sm text-slate-500">Laptops are physically deep-cleaned, thermal paste replaced, and if needed, upgraded with faster SSDs and extra RAM.</p>
                    </div>
                </div>

                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-600 text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-lg z-10">4</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm" data-aos="fade-up">
                        <h4 class="text-lg font-black brand-font text-slate-900 mb-2">Ready for Dispatch</h4>
                        <p class="text-sm text-slate-500">Final stress tests are conducted, genuine OS is installed, and the laptop is securely packaged for safe transit to your doorstep.</p>
                    </div>
                </div>
                
            </div>
        </div>
    </section>

    <section class="py-16 px-4 mb-10">
        <div class="max-w-[1400px] mx-auto bg-slate-900 rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden" data-aos="zoom-in">
            <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px] opacity-40"></div>
            
            <div class="relative z-10 text-center max-w-3xl mx-auto">
                <h2 class="text-3xl md:text-5xl font-black text-white mb-6 brand-font">Ready to upgrade your workspace?</h2>
                <p class="text-slate-300 mb-10 text-lg">Whether you need a single MacBook for design work or 50 ThinkPads for your new office, we have the inventory and expertise to support you.</p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="store" class="btn-brand-gradient px-8 py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2">
                        <i class="fas fa-shopping-cart"></i> Browse Store
                    </a>
                    <a href="contact" class="px-8 py-4 rounded-xl font-bold text-white border-2 border-slate-700 hover:bg-slate-800 transition flex items-center justify-center gap-2">
                        <i class="fas fa-envelope"></i> Contact Sales
                    </a>
                </div>
            </div>
        </div>
    </section>

    <?php 
    if (file_exists('footer.php')) {
        include 'footer.php'; 
    } 
    ?>
    
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        // Initialize Animations
        AOS.init({ duration: 1000, once: true, offset: 50 });

        // Mobile Menu Toggle
        const menuBtn = document.getElementById('menu-btn');
        const closeBtn = document.getElementById('close-menu');
        const mobileMenu = document.getElementById('mobile-menu');

        if(menuBtn && closeBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => { mobileMenu.classList.remove('translate-x-full'); });
            closeBtn.addEventListener('click', () => { mobileMenu.classList.add('translate-x-full'); });
        }
    </script>
</body>
</html>
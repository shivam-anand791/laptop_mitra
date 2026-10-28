<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
require_once 'config/database.php'; // Ensure DB connection is available

// User Logic
$isLoggedIn = isset($_SESSION['user_id']);
$userInitial = $isLoggedIn ? strtoupper(substr($_SESSION['user_name'], 0, 1)) : 'G';

// --- Fetch Counts on Page Load ---
$cart_count = 0;
$wishlist_count = 0;

if ($isLoggedIn && isset($conn)) {
    $user_id = $_SESSION['user_id'];

    // 1. Get Cart Count
    $stmt = $conn->prepare("SELECT SUM(quantity) as total FROM cart WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $cart_count = $row['total'] ?? 0;
    }

    // 2. Get Wishlist Count
    $stmt = $conn->prepare("SELECT COUNT(*) as total FROM wishlist WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $wishlist_count = $row['total'] ?? 0;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LaptopMitra</title>
    <link rel="icon" type="/image/png" href="assets/favicon.png">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #4f46e5;
            --dark-bg: #0f172a;
            --nav-height: 80px;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; padding-top: var(--nav-height); }

        /* Navbar Layout */
        .navbar {
            position: fixed; top: 0; left: 0; width: 100%; height: var(--nav-height);
            background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(12px);
            border-bottom: 1px solid #e2e8f0; z-index: 1000;
        }
        .nav-container {
            max-width: 1600px; margin: 0 auto; height: 100%;
            display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
            gap: 20px;
        }

        /* Logo */
        .brand-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; height: 100%; flex-shrink: 0; }
        .logo-img { height: 50px; width: auto; }

        /* Right Section (Icons + Avatar) */
        .nav-right { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }

        /* Icons (Wishlist/Cart) */
        .nav-icon-btn {
            position: relative; font-size: 1.25rem; color: #64748b;
            text-decoration: none; transition: 0.2s; padding: 8px;
            display: flex; align-items: center; justify-content: center;
        }
        .nav-icon-btn:hover { color: var(--primary); transform: translateY(-2px); }
        
        .nav-badge {
            position: absolute; top: 0; right: 0;
            background: #ef4444; color: white; font-size: 0.65rem; font-weight: 800;
            width: 18px; height: 18px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid white; opacity: 0; transform: scale(0); transition: 0.2s;
        }
        .nav-badge.show { opacity: 1; transform: scale(1); }

        /* Avatar Dropdown Wrapper */
        .user-dropdown { position: relative; margin-left: 10px; }

        .user-avatar {
            width: 42px; height: 42px; border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), #4338ca);
            color: white; font-weight: 700; font-size: 1.1rem;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
            border: 2px solid white; outline: 2px solid transparent;
        }
        .user-avatar:hover { outline-color: #e0e7ff; transform: scale(1.05); }

        /* Dropdown Menu */
        .dropdown-menu {
            position: absolute; top: 55px; right: 0; width: 220px;
            background: white; border-radius: 12px;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
            border: 1px solid #f1f5f9;
            opacity: 0; visibility: hidden; transform: translateY(10px);
            transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
            overflow: hidden;
        }
        .user-dropdown.active .dropdown-menu { opacity: 1; visibility: visible; transform: translateY(0); }

        .dropdown-header { padding: 16px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
        .dropdown-header span { display: block; font-size: 0.8rem; color: #64748b; font-weight: 600; }
        .dropdown-header strong { display: block; font-size: 1rem; color: var(--dark-bg); font-weight: 800; }

        .menu-link {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 16px; color: #475569; text-decoration: none;
            font-size: 0.9rem; font-weight: 600; transition: 0.2s;
        }
        .menu-link:hover { background: #f1f5f9; color: var(--primary); }
        .menu-link i { width: 20px; text-align: center; }
        .menu-link.logout { color: #ef4444; border-top: 1px solid #f1f5f9; }
        .menu-link.logout:hover { background: #fef2f2; }

        .btn-login { padding: 10px 24px; background: var(--primary); color: white; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 0.9rem; }
    </style>
</head>
<body>

<nav class="navbar">
    <div class="nav-container">
        
        <a href="store.php" class="brand-logo">
           <img src="/assets/logo-laptop-mitra.png" alt="Laptop mitra Logo" class="logo-img">
        </a>

        <div class="nav-right">
            
            <a href="wishlist.php" class="nav-icon-btn" title="Wishlist">
                <i class="far fa-heart"></i>
                <span class="nav-badge <?php echo ($wishlist_count > 0) ? 'show' : ''; ?>" id="nav-wishlist-count">
                    <?php echo $wishlist_count; ?>
                </span>
            </a>

            <a href="cart.php" class="nav-icon-btn" title="Cart">
                <i class="fas fa-shopping-cart"></i>
                <span class="nav-badge <?php echo ($cart_count > 0) ? 'show' : ''; ?>" id="nav-cart-count">
                    <?php echo $cart_count; ?>
                </span>
            </a>

            <?php if($isLoggedIn): ?>
                <div class="user-dropdown" id="userDropdown">
                    <div class="user-avatar" onclick="toggleDropdown()">
                        <?php echo $userInitial; ?>
                    </div>
                    
                    <div class="dropdown-menu">
                        <div class="dropdown-header">
                            <span>Signed in as</span>
                            <strong><?php echo htmlspecialchars($_SESSION['user_name']); ?></strong>
                        </div>
                        <a href="profile.php" class="menu-link"><i class="fas fa-user"></i> My Profile</a>
                        <a href="orders.php" class="menu-link"><i class="fas fa-box"></i> My Orders</a>
                        <a href="affiliate-dashboard.php" class="menu-link"><i class="fas fa-box"></i> My Affiliate</a>
                        <a href="logout.php" class="menu-link logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
                    </div>
                </div>
            <?php else: ?>
                <a href="login.php" class="btn-login">Login</a>
            <?php endif; ?>

        </div>
    </div>
</nav>

<script>
    // Toggle User Dropdown
    function toggleDropdown() {
        const dropdown = document.getElementById('userDropdown');
        dropdown.classList.toggle('active');
    }

    // Close Dropdown when clicking outside
    window.onclick = function(event) {
        if (!event.target.matches('.user-avatar')) {
            const dropdowns = document.getElementsByClassName("user-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                if (dropdowns[i].classList.contains('active')) {
                    dropdowns[i].classList.remove('active');
                }
            }
        }
    }

    // Helper functions for Store Page to update Header
    function updateHeaderBadge(type, count) {
        const id = type === 'cart' ? 'nav-cart-count' : 'nav-wishlist-count';
        const badge = document.getElementById(id);
        if(badge) {
            badge.innerText = count;
            count > 0 ? badge.classList.add('show') : badge.classList.remove('show');
        }
    }
</script>
</body>
</html>
<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { 
            --primary: #0061ff; 
            --secondary: #60EFFF; 
            --dark: #0a0e17; 
            --gray: #64748b;
            --glass: rgba(255, 255, 255, 0.9);
        }
        * { margin:0; padding:0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        .main-header { position: sticky; top: 0; z-index: 2000; background: var(--glass); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,0.05); }
        .nav-wrapper { max-width: 1400px; margin: 0 auto; padding: 12px 30px; display: flex; justify-content: space-between; align-items: center; }
        
        /* Logo Styling */
        .logo-container { display: flex; align-items: center; text-decoration: none; }
        .logo-img { height: 45px; width: auto; object-fit: contain; }

        .nav-right-side { display: flex; align-items: center; gap: 30px; }
        .nav-center { display: flex; align-items: center; gap: 30px; }
        
        .nav-link { 
            text-decoration: none; 
            color: var(--dark); 
            font-weight: 600; 
            font-size: 15px; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            transition: 0.3s;
        }
        .nav-link i { font-size: 18px; color: var(--primary); }
        .nav-link:hover { color: var(--primary); }
        
        .bulk-pill { background: #f0f7ff; color: var(--primary); padding: 8px 18px; border-radius: 50px; font-weight: 700; font-size: 14px; text-decoration: none; border: 1px solid rgba(0,97,255,0.1); }

        .auth-actions { display: flex; align-items: center; gap: 15px; border-left: 1px solid #eee; padding-left: 20px; }
        .btn-login { text-decoration: none; color: var(--dark); font-weight: 600; font-size: 15px; }
        .btn-signup { text-decoration: none; background: var(--dark); color: white; padding: 10px 22px; border-radius: 10px; font-weight: 600; transition: 0.3s; }
        .btn-signup:hover { background: var(--primary); }

        /* Mobile Hide */
        @media (max-width: 850px) { .nav-center { display: none; } }
    </style>
</head>
<body>

<header class="main-header">
    <div class="nav-wrapper">
        <a href="index.php" class="logo-container">
            <img src="assets/logo-laptop-mitra.png" alt="Laptop Mitra logo" class="logo-img">

            </a>

        <div class="nav-right-side">
            <div class="nav-center">
                <a href="<?php echo $isLoggedIn ? 'store.php' : 'javascript:void(0)'; ?>" 
                   onclick="<?php echo !$isLoggedIn ? 'alert(\'Please login to access the Store\'); window.location.href=\'login.php\';' : ''; ?>" 
                   class="nav-link">
                   <i class="fa-solid fa-laptop-code"></i> Store
                </a>
                
                <a href="support.php" class="nav-link">Support</a>
                <a href="tel:+917701993300" class="bulk-pill"><i class="fa-solid fa-phone"></i> +91 7701993300</a>
            </div>

            <div class="auth-actions">
                <?php if($isLoggedIn): ?>
                    <span style="font-weight:700; font-size:14px;">Hi, <?php echo explode(' ', $_SESSION['full_name'] ?? 'User')[0]; ?></span>
                    <a href="logout.php" class="btn-login" style="color:#ef4444;">Logout</a>
                <?php else: ?>
                    <a href="login.php" class="btn-login">Login</a>
                    <a href="signup.php" class="btn-signup">Sign Up</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</header>

</body>
</html>
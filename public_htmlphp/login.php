<?php
session_start();
require_once 'config/database.php';

$error = '';

// Check if user is already logged in
if(isset($_SESSION['user_id'])) {
    header("Location: store.php");
    exit();
}

// --- INITIALIZE VARIABLES ---
$email_val = '';
$pass_val = '';
$remember_checked = '';

// 1. Check Cookies (Pre-fill details if cookie exists)
if(isset($_COOKIE['email']) && isset($_COOKIE['password'])) {
    $email_val = $_COOKIE['email'];
    $pass_val = $_COOKIE['password'];
    $remember_checked = 'checked';
}

// 2. Handle Form Submission
if($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = mysqli_real_escape_string($conn, $_POST['email']);
    $password = $_POST['password'];
    
    // Preserve input values if login fails
    $email_val = $email; 
    
    // Keep the box ticked if user checked it during this attempt
    if(isset($_POST['remember'])) {
        $remember_checked = 'checked';
    } else {
        $remember_checked = '';
    }
    
    $query = "SELECT * FROM users WHERE email = '$email'";
    $result = mysqli_query($conn, $query);
    
    if($result && mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);
        
        if(password_verify($password, $user['password'])) {
            
            if($user['is_verified'] == 1) {
                
                // --- SET OR REMOVE COOKIES ---
                if(!empty($_POST['remember'])) {
                    // Set cookies for 30 days
                    setcookie("email", $email, time() + (86400 * 30), "/");
                    setcookie("password", $password, time() + (86400 * 30), "/");
                } else {
                    // Remove cookies if unchecked
                    if(isset($_COOKIE["email"])) { setcookie("email", "", time() - 3600, "/"); }
                    if(isset($_COOKIE["password"])) { setcookie("password", "", time() - 3600, "/"); }
                }
                
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['fullname'];
                $_SESSION['user_email'] = $user['email'];
                header("Location: store.php");
                exit();
            } else {
                $_SESSION['verify_email'] = $email;
                $error = "Email not verified! <a href='verify_otp.php' class='verify-link'>Verify Now</a>";
            }

        } else {
            $error = "Invalid email or password!";
        }
    } else {
        $error = "Invalid email or password!";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Login | LaptopMitra</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root { 
            --primary: #4f46e5; 
            --primary-hover: #4338ca; 
            --text-dark: #0f172a; 
            --text-muted: #64748b; 
            --bg-input: #f8fafc; 
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body { 
            /* THEME BACKGROUND */
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            min-height: 100vh; 
            width: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 1.5rem; 
            position: relative;
        }

        /* SVG Pattern Overlay */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
        }
        
        /* Main Card Container */
        .login-wrapper { 
            background: #ffffff; 
            width: 100%; 
            max-width: 900px; 
            min-height: 580px; /* Slightly taller for extra fields */
            border-radius: 24px; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
            display: flex; 
            overflow: hidden; 
            position: relative; 
            z-index: 1; 
            animation: fadeInUp 0.6s ease-out; 
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* --- LEFT SIDE (Visual) --- */
        .visual-side { 
            flex: 1; 
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            color: white; 
            padding: 2rem; 
            text-align: center; 
            position: relative; 
            border-right: 1px solid rgba(255,255,255,0.1);
        }
        
        /* Pattern inside Visual Side */
        .visual-side::before { 
            content: ''; position: absolute; top:0; left:0; width: 100%; height: 100%; 
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); 
        }
        
        .visual-content { z-index: 2; }
        .visual-icon { font-size: 3.5rem; margin-bottom: 1.5rem; opacity: 0.95; }
        .visual-side h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; }
        .visual-side p { font-size: 0.95rem; opacity: 0.9; line-height: 1.6; max-width: 80%; margin: 0 auto; }
        
        /* --- RIGHT SIDE (Form) --- */
        .form-side { 
            flex: 1.1; 
            padding: 3rem; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            position: relative; 
            background: #fff;
        }

        /* Top Navigation Icons */
        .nav-link { 
            position: absolute; 
            top: 2rem; 
            color: #94a3b8; 
            font-size: 1.25rem; 
            cursor: pointer; 
            transition: all 0.2s ease; 
            text-decoration: none; 
            width: 40px; 
            height: 40px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            border-radius: 50%;
        }
        .nav-link:hover { color: var(--primary); background: #f1f5f9; }
        
        .home-link { right: 2rem; }

        /* Logo Styling */
        .logo-container { text-align: center; margin-bottom: 2rem; }
        .logo-img { height: 50px; width: auto; object-fit: contain; }
        
        /* Headings */
        .header-text { margin-bottom: 2rem; text-align: center; }
        .header-text h1 { font-size: 1.75rem; color: var(--text-dark); font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
        .header-text p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
        
        /* Standard Form Elements */
        .form-group { margin-bottom: 1.25rem; }
        .form-label { display: block; margin-bottom: 0.5rem; color: var(--text-dark); font-weight: 700; font-size: 0.9rem; }
        
        .input-group { position: relative; }
        
        /* Input Icons */
        .input-group i.icon-left {
            position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%);
            color: #94a3b8; font-size: 1rem; transition: color 0.3s;
        }

        .form-control { 
            width: 100%; padding: 1rem 1rem 1rem 3rem; 
            background: var(--bg-input); border: 2px solid #e2e8f0; border-radius: 12px; 
            font-size: 1rem; color: var(--text-dark); transition: all 0.3s ease; font-weight: 500;
        }
        
        .form-control:focus { outline: none; background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        .form-control:focus + i.icon-left { color: var(--primary); }
        .form-control::placeholder { color: #cbd5e1; }

        /* Password Toggle */
        .password-toggle { 
            position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); 
            border: none; background: none; color: #94a3b8; cursor: pointer; font-size: 1rem; transition: color 0.2s;
        }
        .password-toggle:hover { color: var(--primary); }

        /* Actions Row (Remember + Forgot) */
        .form-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; font-size: 0.9rem; }
        .forgot-link { color: var(--primary); text-decoration: none; font-weight: 700; transition: color 0.2s; }
        .forgot-link:hover { color: var(--primary-hover); text-decoration: underline; }

        /* Custom Checkbox */
        .remember-wrap { position: relative; display: flex; align-items: center; padding-left: 30px; cursor: pointer; color: var(--text-muted); font-weight: 500; user-select: none; }
        .remember-wrap input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
        .checkmark { position: absolute; top: 0; left: 0; height: 20px; width: 20px; background-color: var(--bg-input); border: 2px solid #cbd5e1; border-radius: 6px; transition: all 0.2s ease; }
        .remember-wrap:hover input ~ .checkmark { border-color: var(--primary); }
        .remember-wrap input:checked ~ .checkmark { background-color: var(--primary); border-color: var(--primary); }
        .checkmark:after { content: ""; position: absolute; display: none; left: 6px; top: 2px; width: 5px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
        .remember-wrap input:checked ~ .checkmark:after { display: block; }

        /* Submit Button */
        .btn-submit { 
            width: 100%; padding: 1rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
            color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; 
            transition: all 0.3s ease; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
            display: flex; justify-content: center; align-items: center; gap: 0.5rem;
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.5); }
        
        .alert { 
            background-color: #fef2f2; color: #ef4444; padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; 
            display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; border: 1px solid #fecaca; font-weight: 600;
        }
        .verify-link { color: #b91c1c; font-weight: 700; text-decoration: underline; margin-left: 5px; }

        .footer-links { text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-muted); }
        .footer-links a { color: var(--primary); text-decoration: none; font-weight: 700; }
        .footer-links a:hover { text-decoration: underline; }

        /* --- MOBILE RESPONSIVENESS --- */
        @media (max-width: 850px) {
            body { padding: 1rem; }
            .login-wrapper { flex-direction: column; width: 100%; max-width: 450px; min-height: auto; }
            .visual-side { display: none; } 
            .form-side { padding: 2.5rem 1.5rem; }
            .logo-img { height: 42px; }
            .header-text h1 { font-size: 1.5rem; }
            .nav-link { top: 1rem; width: 35px; height: 35px; }
            .home-link { right: 1rem; }
        }
    </style>
</head>
<body>
    <div class="login-wrapper">
        <div class="visual-side">
            <div class="visual-content">
                <p>Powered by</p>
                <img src="assets/logo.png" alt="LaptopMitra Logo" class="logo-img">
                <p>Best digital marketing company in India</p>
            </div>
        </div>

        <div class="form-side">
            
            <a href="https://www.laptopmitra.com" class="nav-link home-link" title="Go to Home">
                <i class="fas fa-house"></i>
            </a>

            <div class="logo-container">
                <img src="assets/logo-laptop-mitra.png" alt="LaptopMitra Logo" class="logo-img">
            </div>

            <div class="header-text">
                <h1>Welcome Back!</h1>
                <p>Enter your details to sign in.</p>
            </div>

            <?php if($error): ?>
                <div class="alert"><i class="fas fa-circle-exclamation"></i><span><?= $error; ?></span></div>
            <?php endif; ?>

            <form method="POST" action="">
                
                <div class="form-group">
                    <label for="email" class="form-label">Email Address</label>
                    <div class="input-group">
                        <input type="email" id="email" name="email" class="form-control" placeholder="name@example.com" value="<?= htmlspecialchars($email_val) ?>" required>
                        <i class="fas fa-envelope icon-left"></i>
                    </div>
                </div>

                <div class="form-group">
                    <label for="password" class="form-label">Password</label>
                    <div class="input-group">
                        <input type="password" id="password" name="password" class="form-control" placeholder="Enter password" value="<?= htmlspecialchars($pass_val) ?>" required>
                        <i class="fas fa-lock icon-left"></i>
                        <button type="button" class="password-toggle" onclick="togglePassword()">
                            <i class="fas fa-eye" id="toggleIcon"></i>
                        </button>
                    </div>
                </div>

                <div class="form-actions">
                    <label class="remember-wrap">
                        <input type="checkbox" name="remember" <?= $remember_checked ?>>
                        <span class="checkmark"></span>
                        Remember me
                    </label>
                    
                    <a href="forgot-password.php" class="forgot-link">Forgot Password?</a>
                </div>

                <button type="submit" class="btn-submit">
                    Sign In <i class="fas fa-arrow-right"></i>
                </button>
            </form>

            <div class="footer-links">
                Don't have an account? <a href="signup.php">Sign up</a>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const input = document.getElementById('password');
            const icon = document.getElementById('toggleIcon');
            if (input.type === 'password') { 
                input.type = 'text'; 
                icon.classList.replace('fa-eye', 'fa-eye-slash'); 
            } else { 
                input.type = 'password'; 
                icon.classList.replace('fa-eye-slash', 'fa-eye'); 
            }
        }
    </script>
</body>
</html>
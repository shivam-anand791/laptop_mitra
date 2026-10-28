<?php
session_start();
require_once 'config/database.php';

// 1. Check if we have an email to verify
if(!isset($_SESSION['verify_email'])) {
    header("Location: signup.php");
    exit();
}

$email = $_SESSION['verify_email'];
$error = '';
$success = '';

// 2. Handle Form Submission
if($_SERVER['REQUEST_METHOD'] == 'POST') {
    $otp_input = mysqli_real_escape_string($conn, $_POST['otp']);
    
    // Check against database
    $query = "SELECT * FROM users WHERE email = '$email' AND otp_code = '$otp_input' AND otp_expiry > NOW()";
    $result = mysqli_query($conn, $query);

    if(mysqli_num_rows($result) > 0) {
        // Verification Successful
        $update = "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expiry = NULL WHERE email = '$email'";
        
        if(mysqli_query($conn, $update)) {
            unset($_SESSION['verify_email']);
            $success = "Email Verified! Redirecting...";
            // Redirect after 2 seconds
            header("refresh:2;url=login.php");
        } else {
            $error = "Database error. Please try again.";
        }
    } else {
        $error = "Invalid or Expired OTP Code.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Verify OTP | LaptopMitra</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* --- COPYING THEME FROM LOGIN.PHP --- */
        :root { 
            --primary: #4f46e5; 
            --primary-hover: #4338ca; 
            --text-dark: #0f172a; 
            --text-muted: #64748b; 
            --bg-input: #f8fafc; 
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body { 
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
            min-height: 550px; 
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

        .nav-link { 
            position: absolute; top: 2rem; color: #94a3b8; font-size: 1.25rem; 
            cursor: pointer; transition: all 0.2s ease; text-decoration: none; 
            width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; 
            border-radius: 50%;
        }
        .nav-link:hover { color: var(--primary); background: #f1f5f9; }
        .home-link { right: 2rem; }

        .logo-container { text-align: center; margin-bottom: 2rem; }
        .logo-img { height: 50px; width: auto; object-fit: contain; }
        
        .header-text { margin-bottom: 2rem; text-align: center; }
        .header-text h1 { font-size: 1.75rem; color: var(--text-dark); font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
        .header-text p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
        .header-text strong { color: var(--text-dark); }
        
        .form-group { margin-bottom: 1.5rem; }
        .form-label { display: block; margin-bottom: 0.5rem; color: var(--text-dark); font-weight: 700; font-size: 0.9rem; }
        
        .input-group { position: relative; }
        
        /* Specific OTP Input Styling */
        .form-control { 
            width: 100%; padding: 1rem; 
            background: var(--bg-input); border: 2px solid #e2e8f0; border-radius: 12px; 
            font-size: 1rem; color: var(--text-dark); transition: all 0.3s ease; font-weight: 500;
        }

        .otp-special-input {
            text-align: center;
            letter-spacing: 0.5rem;
            font-size: 1.5rem;
            font-weight: 700;
            padding-left: 1rem; /* Reset padding since we have no icon */
        }
        
        .form-control:focus { outline: none; background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        
        .btn-submit { 
            width: 100%; padding: 1rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
            color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; 
            transition: all 0.3s ease; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
            display: flex; justify-content: center; align-items: center; gap: 0.5rem;
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.5); }
        
        /* Alerts */
        .alert { 
            padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; 
            display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 600; border: 1px solid transparent;
        }
        .alert-error { background-color: #fef2f2; color: #ef4444; border-color: #fecaca; }
        .alert-success { background-color: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }

        .footer-links { text-align: center; margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-muted); }
        .footer-links a { color: var(--primary); text-decoration: none; font-weight: 700; cursor: pointer; }
        .footer-links a:hover { text-decoration: underline; }

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
                <div class="visual-icon"><i class="fas fa-shield-halved"></i></div>
                <h2>Secure Access</h2>
                <p>Protecting your account with<br>two-step email verification.</p>
            </div>
        </div>

        <div class="form-side">
            
            <a href="login.php" class="nav-link home-link" title="Back to Login">
                <i class="fas fa-arrow-left"></i>
            </a>

            <div class="logo-container">
                <img src="assets/logo-laptop-mitra.png" alt="LaptopMitra Logo" class="logo-img">
            </div>

            <div class="header-text">
                <h1>Verify Email</h1>
                <p>We've sent a 6-digit code to<br><strong><?= htmlspecialchars($email); ?></strong></p>
            </div>

            <?php if($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-circle-exclamation"></i><span><?= $error; ?></span>
                </div>
            <?php endif; ?>

            <?php if($success): ?>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i><span><?= $success; ?></span>
                </div>
            <?php endif; ?>

            <form method="POST" action="">
                
                <div class="form-group">
                    <label for="otp" class="form-label">Enter One Time Password</label>
                    <div class="input-group">
                        <input type="text" 
                               id="otp" 
                               name="otp" 
                               class="form-control otp-special-input" 
                               placeholder="000000" 
                               maxlength="6" 
                               autocomplete="off"
                               required>
                    </div>
                </div>

                <button type="submit" class="btn-submit">
                    Verify Account <i class="fas fa-check"></i>
                </button>
            </form>

            <div class="footer-links">
                <!--Didn't receive code? <a href="resend_otp.php">Resend Code</a>-->
            </div>
        </div>
    </div>
</body>
</html>
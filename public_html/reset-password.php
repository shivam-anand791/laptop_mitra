<?php
session_start();
require_once 'config/database.php';

$error = '';
$success = '';
$token = isset($_GET['token']) ? $_GET['token'] : '';
$is_valid_token = false;
$user_id = null;

// 1. Verify Token immediately upon page load
if (!empty($token)) {
    $token_hash = hash("sha256", $token);
    $current_time = date("Y-m-d H:i:s");

    // Check if token exists and is not expired
    $sql = "SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires_at > ?";
    $stmt = mysqli_prepare($conn, $sql);
    mysqli_stmt_bind_param($stmt, "ss", $token_hash, $current_time);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if ($row = mysqli_fetch_assoc($result)) {
        $is_valid_token = true;
        $user_id = $row['id'];
    } else {
        $error = "This password reset link is invalid or has expired.";
    }
} else {
    $error = "No token provided.";
}

// 2. Handle Password Update Form Submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && $is_valid_token) {
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];

    if ($password !== $confirm_password) {
        $error = "Passwords do not match!";
    } elseif (strlen($password) < 6) {
        $error = "Password must be at least 6 characters long.";
    } else {
        // Hash the new password
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        // Update password and clear reset token fields
        $update_sql = "UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = ?";
        $update_stmt = mysqli_prepare($conn, $update_sql);
        mysqli_stmt_bind_param($update_stmt, "si", $password_hash, $user_id);

        if (mysqli_stmt_execute($update_stmt)) {
            $success = "Password reset successfully!";
            // Invalidate token immediately so form cannot be resubmitted
            $is_valid_token = false; 
        } else {
            $error = "Something went wrong. Please try again.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Set New Password | LaptopMitra</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* Shared Styles */
        :root { --primary: #4f46e5; --primary-hover: #4338ca; --text-dark: #0f172a; --text-muted: #64748b; --bg-input: #f8fafc; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body { 
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 1.5rem; 
        }
        
        /* Pattern Overlay */
        body::before {
            content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            pointer-events: none; z-index: 0;
        }

        .login-wrapper { 
            background: #ffffff; 
            width: 100%; 
            max-width: 900px; 
            min-height: 500px; 
            border-radius: 24px; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
            display: flex; 
            overflow: hidden; 
            position: relative; 
            z-index: 1; 
            animation: fadeInUp 0.6s ease-out; 
        }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        /* Left Side */
        .visual-side { flex: 1; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; padding: 2rem; text-align: center; position: relative; }
        .visual-content { z-index: 2; }
        .logo-img { height: 50px; width: auto; object-fit: contain; }

        /* Right Side */
        .form-side { flex: 1.1; padding: 3rem; display: flex; flex-direction: column; justify-content: center; background: #fff; position: relative; }
        
        .header-text { margin-bottom: 2rem; text-align: center; }
        .header-text h1 { font-size: 1.75rem; color: var(--text-dark); font-weight: 800; margin-bottom: 0.5rem; }
        .header-text p { color: var(--text-muted); font-size: 0.95rem; }

        .form-group { margin-bottom: 1.25rem; }
        .form-label { display: block; margin-bottom: 0.5rem; color: var(--text-dark); font-weight: 700; font-size: 0.9rem; }
        
        .input-group { position: relative; }
        
        /* Left Icon */
        .input-group i.icon-left { position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: #94a3b8; z-index: 2; }
        
        /* Input Field */
        .form-control { 
            width: 100%; 
            padding: 1rem 3rem 1rem 3rem; /* Extra padding on right for eye icon */
            background: var(--bg-input); 
            border: 2px solid #e2e8f0; 
            border-radius: 12px; 
            font-size: 1rem; 
            color: var(--text-dark); 
            font-weight: 500; 
            transition: 0.3s; 
        }
        .form-control:focus { outline: none; background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        .form-control:focus + i.icon-left { color: var(--primary); }

        /* Password Toggle (Eye Icon) */
        .password-toggle {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 1rem;
            transition: color 0.2s;
            z-index: 3;
            padding: 5px; /* Increase click area */
        }
        .password-toggle:hover { color: var(--primary); }

        .btn-submit { 
            width: 100%; 
            padding: 1rem; 
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); 
            color: white; 
            border: none; 
            border-radius: 12px; 
            font-size: 1rem; 
            font-weight: 700; 
            cursor: pointer; 
            transition: 0.3s; 
            margin-top: 1rem; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 8px; 
            text-decoration: none;
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.5); }

        .alert { padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 600; }
        .alert.error { background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        .alert.success { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

        /* Mobile Responsive */
        @media (max-width: 850px) {
            body { padding: 1rem; }
            .login-wrapper { flex-direction: column; width: 100%; max-width: 450px; min-height: auto; }
            .visual-side { display: none; } 
            .form-side { padding: 2.5rem 1.5rem; }
            .header-text h1 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="login-wrapper">
        <div class="visual-side">
            <div class="visual-content">
                <img src="assets/logo.png" alt="Logo" class="logo-img" style="margin-bottom: 1rem;">
                <h2>Secure Your Account</h2>
                <p>Choose a strong password to protect your data.</p>
            </div>
        </div>

        <div class="form-side">
            <div class="header-text">
                <h1>Set New Password</h1>
                <p>Enter your new credentials below.</p>
            </div>

            <?php if($success): ?>
                <div class="alert success">
                    <i class="fas fa-check-circle"></i>
                    <span><?= $success; ?></span>
                </div>
                <a href="login.php" class="btn-submit">
                    Go to Login <i class="fas fa-arrow-right"></i>
                </a>
            
            <?php elseif($error): ?>
                <div class="alert error">
                    <i class="fas fa-circle-exclamation"></i>
                    <span><?= $error; ?></span>
                </div>
                <?php if(strpos($error, "expired") !== false || strpos($error, "invalid") !== false): ?>
                    <a href="forgot-password.php" class="btn-submit">
                        Request New Link <i class="fas fa-redo"></i>
                    </a>
                <?php endif; ?>

            <?php endif; ?>

            <?php if(!$success && $is_valid_token): ?>
            <form method="POST" action="">
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <div class="input-group">
                        <input type="password" name="password" id="newPass" class="form-control" placeholder="Min 6 characters" required>
                        <i class="fas fa-lock icon-left"></i>
                        <button type="button" class="password-toggle" onclick="togglePassword('newPass', 'iconNewPass')">
                            <i class="fas fa-eye" id="iconNewPass"></i>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <div class="input-group">
                        <input type="password" name="confirm_password" id="confirmPass" class="form-control" placeholder="Confirm new password" required>
                        <i class="fas fa-check-double icon-left"></i>
                        <button type="button" class="password-toggle" onclick="togglePassword('confirmPass', 'iconConfirmPass')">
                            <i class="fas fa-eye" id="iconConfirmPass"></i>
                        </button>
                    </div>
                </div>

                <button type="submit" class="btn-submit">
                    Update Password <i class="fas fa-shield-alt"></i>
                </button>
            </form>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function togglePassword(inputId, iconId) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(iconId);
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    </script>
</body>
</html>
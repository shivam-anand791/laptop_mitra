<?php
session_start();
require_once 'config/database.php';

// --- PHP MAILER SETUP ---
// Files are directly in 'PHPMailer/' folder
require 'PHPMailer/Exception.php';
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// --- CONFIGURATION FOR HOSTINGER (LIVE) ---
// IMPORTANT: Change this to your actual domain name
$base_url = "https://www.laptopmitra.com/"; 

$message = '';
$messageType = ''; // 'success' or 'error'

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = mysqli_real_escape_string($conn, $_POST['email']);

    // Check if email exists
    $sql = "SELECT id, fullname FROM users WHERE email = '$email'";
    $result = mysqli_query($conn, $sql);

    if (mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);
        
        // 1. Generate Token
        $token = bin2hex(random_bytes(32)); 
        
        // 2. Hash Token
        $token_hash = hash("sha256", $token);

        // 3. Expiry (30 mins)
        $expiry = date("Y-m-d H:i:s", time() + 60 * 30);

        // 4. Update Database
        $update_sql = "UPDATE users 
                       SET reset_token_hash = ?, 
                           reset_token_expires_at = ? 
                       WHERE email = ?";
                       
        $stmt = mysqli_prepare($conn, $update_sql);
        mysqli_stmt_bind_param($stmt, "sss", $token_hash, $expiry, $email);
        
        if (mysqli_stmt_execute($stmt)) {
            
            // --- PREPARE EMAIL ---
            $reset_link = $base_url . "reset-password.php?token=" . $token;
            $mail = new PHPMailer(true);

            try {
                // Server settings
                $mail->isSMTP();
                $mail->Host       = 'smtp.gmail.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = 'anuragkas29@gmail.com'; // YOUR EMAIL
                $mail->Password   = 'bdqivbkygdhpfpfq';      // YOUR APP PASSWORD
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port       = 587;

                // Recipients
                $mail->setFrom('no-reply@laptopmitra.com', 'LaptopMitra Support');
                $mail->addAddress($email, $user['fullname']); 

                // --- BEAUTIFUL EMAIL CONTENT ---
                $mail->isHTML(true);
                $mail->Subject = 'Reset Your Password - LaptopMitra';
                
                // Professional HTML Template
                $mail->Body = '
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
                        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                        .header { background-color: #4f46e5; padding: 30px; text-align: center; }
                        .logo { max-height: 50px; width: auto; background: white; padding: 5px; border-radius: 4px; }
                        .content { padding: 40px 30px; color: #333333; }
                        .button { background-color: #4f46e5; color: #ffffff !important; padding: 14px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px; }
                        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
                        .link-text { font-size: 13px; color: #94a3b8; word-break: break-all; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div style="padding: 40px 0;">
                        <div class="email-container">
                            <div class="header">
                                <img src="https://www.xpertnote.com/assets/img/xpertnotelogo.png" alt="XpertNote Logo" class="logo">
                            </div>
                            
                            <div class="content">
                                <h2 style="margin-top: 0; color: #1e293b;">Reset Your Password</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #475569;">
                                    Hi <strong>' . htmlspecialchars($user['fullname']) . '</strong>,<br><br>
                                    We received a request to reset the password for your account. If you made this request, simply click the button below:
                                </p>
                                
                                <p style="text-align: center;">
                                    <a href="' . $reset_link . '" class="button">Reset Password</a>
                                </p>
                                
                                <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                                    If you did not request a password reset, please ignore this email. This link will expire in 30 minutes.
                                </p>

                                <div class="link-text">
                                    Or copy this link: <br>
                                    <a href="' . $reset_link . '" style="color: #4f46e5;">' . $reset_link . '</a>
                                </div>
                            </div>
                            
                            <div class="footer">
                                &copy; ' . date("Y") . ' LaptopMitra / XpertNote. All rights reserved.<br>
                                This is an automated message, please do not reply.
                            </div>
                        </div>
                    </div>
                </body>
                </html>';

                $mail->send();
                $message = "Reset link has been sent to your email!";
                $messageType = "success";

            } catch (Exception $e) {
                $message = "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
                $messageType = "error";
            }
            
        } else {
            $message = "Database error. Please try again.";
            $messageType = "error";
        }
    } else {
        $message = "If that email is registered, we have sent a reset link.";
        $messageType = "success"; 
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password | LaptopMitra</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root { --primary: #4f46e5; --primary-hover: #4338ca; --text-dark: #0f172a; --text-muted: #64748b; --bg-input: #f8fafc; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        
        .login-wrapper { background: #ffffff; width: 100%; max-width: 900px; min-height: 500px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); display: flex; overflow: hidden; position: relative; z-index: 1; animation: fadeInUp 0.6s ease-out; }
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
        .input-group i.icon-left { position: absolute; left: 1.2rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .form-control { width: 100%; padding: 1rem 1rem 1rem 3rem; background: var(--bg-input); border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; color: var(--text-dark); font-weight: 500; transition: 0.3s; }
        .form-control:focus { outline: none; background: white; border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        .form-control:focus + i.icon-left { color: var(--primary); }

        .btn-submit { width: 100%; padding: 1rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.3s; margin-top: 1rem; }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.5); }

        .alert { padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 600; }
        .alert.error { background-color: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        .alert.success { background-color: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

        .back-link { text-align: center; margin-top: 1.5rem; display: block; color: var(--text-muted); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
        .back-link:hover { color: var(--primary); }

        @media (max-width: 850px) {
            .visual-side { display: none; } 
            .login-wrapper { max-width: 450px; }
            .form-side { padding: 2rem; }
        }
    </style>
</head>
<body>
    <div class="login-wrapper">
        <div class="visual-side">
            <div class="visual-content">
                <img src="assets/logo.png" alt="Logo" class="logo-img" style="margin-bottom: 1rem;">
                <h2>Forgot Password?</h2>
                <p>No worries! Enter your email and we'll send you reset instructions.</p>
            </div>
        </div>

        <div class="form-side">
            <div class="header-text">
                <h1>Reset Password</h1>
                <p>Enter the email associated with your account.</p>
            </div>

            <?php if($message): ?>
                <div class="alert <?= $messageType ?>">
                    <i class="fas <?= $messageType == 'success' ? 'fa-check-circle' : 'fa-circle-exclamation' ?>"></i>
                    <span><?= $message; ?></span>
                </div>
            <?php endif; ?>

            <form method="POST" action="">
                <div class="form-group">
                    <label for="email" class="form-label">Email Address</label>
                    <div class="input-group">
                        <input type="email" id="email" name="email" class="form-control" placeholder="name@example.com" required>
                        <i class="fas fa-envelope icon-left"></i>
                    </div>
                </div>

                <button type="submit" class="btn-submit">
                    Send Reset Link <i class="fas fa-paper-plane"></i>
                </button>
            </form>

            <a href="login.php" class="back-link">
                <i class="fas fa-arrow-left"></i> Back to Login
            </a>
        </div>
    </div>
</body>
</html>
<?php
session_start();
require_once 'config/database.php';

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = mysqli_real_escape_string($conn, $_POST['email']);

    // 1. Check if email exists in database
    $check_email = "SELECT * FROM users WHERE email = '$email'";
    $result = mysqli_query($conn, $check_email);

    if (mysqli_num_rows($result) > 0) {
        
        // 2. Generate 6-Digit OTP
        $otp = rand(100000, 999999);
        
        // 3. Update Database with OTP and Expiry (15 Minutes)
        // DHYAN DEIN: Hum 'otp_code' update kar rahe hain taaki verification page isse padh sake
        $update_otp = "UPDATE users SET otp_code = '$otp', otp_expiry = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = '$email'";
        
        if (mysqli_query($conn, $update_otp)) {
            
            // 4. Send Email (Basic PHP Mail Function)
            $to = $email;
            $subject = "Reset Password OTP - XpertNote";
            $message = "Your One-Time Password (OTP) for resetting your password is: " . $otp . "\n\nThis code expires in 15 minutes.";
            $headers = "From: no-reply@xpertnote.com"; // Apne domain ka email lagayein

            // Note: Agar aap Localhost (XAMPP) par hain, to mail() function shayad kaam na kare bina SMTP setup ke.
            // Live server par ye kaam karega.
            if(mail($to, $subject, $message, $headers)) {
                
                // 5. Store email in session for the next page
                $_SESSION['reset_email'] = $email;
                
                // 6. Redirect to verification page
                header("Location: reset-otp.php");
                exit();
                
            } else {
                // Fallback for Localhost testing (Show OTP on screen if mail fails)
                // Live server par is 'else' part ko hata de ya error show karein
                $_SESSION['reset_email'] = $email;
                // For testing only:
                echo "<script>alert('Mail failed on localhost. Your OTP is: $otp'); window.location.href='reset-otp.php';</script>";
            }
            
        } else {
            $error = "Database error. Could not generate OTP.";
        }
        
    } else {
        $error = "No account found with that email address.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password | XpertNote</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* Same Theme Styles */
        :root { --primary: #4f46e5; --primary-hover: #4338ca; --text-dark: #0f172a; --bg-input: #f8fafc; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body { 
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
        }
        
        .card-wrapper {
            background: white; width: 100%; max-width: 500px; padding: 2.5rem; border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative;
        }
        
        .header-text { text-align: center; margin-bottom: 2rem; }
        .header-text h1 { font-size: 1.75rem; color: var(--text-dark); margin-bottom: 0.5rem; }
        .header-text p { color: #64748b; font-size: 0.95rem; }
        
        .form-control {
            width: 100%; padding: 1rem; background: var(--bg-input); border: 2px solid #e2e8f0;
            border-radius: 12px; font-size: 1rem; margin-bottom: 1.5rem;
        }
        
        .btn-submit {
            width: 100%; padding: 1rem; background: var(--primary); color: white; border: none;
            border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer;
        }
        
        .back-link { display: block; text-align: center; margin-top: 1.5rem; color: #64748b; text-decoration: none; font-weight: 600; }
        .back-link:hover { color: var(--primary); }
        
        .alert { padding: 1rem; background: #fef2f2; color: #ef4444; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #fecaca; }
    </style>
</head>
<body>

    <div class="card-wrapper">
        <div class="header-text">
            <h1>Forgot Password?</h1>
            <p>Enter your email address to receive a verification code.</p>
        </div>

        <?php if($error): ?>
            <div class="alert"><i class="fas fa-circle-exclamation"></i> <?= $error; ?></div>
        <?php endif; ?>

        <form method="POST" action="">
            <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">Email Address</label>
            <input type="email" name="email" class="form-control" placeholder="example@email.com" required>
            
            <button type="submit" class="btn-submit">Send Code</button>
        </form>

        <a href="login.php" class="back-link"><i class="fas fa-arrow-left"></i> Back to Login</a>
    </div>

</body>
</html>
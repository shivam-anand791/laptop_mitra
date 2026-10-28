<?php
// Debugging ON (shows errors on screen)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();

// --- 1. Files Include (Based on your check_setup.php results) ---

// Database Connection
require 'config/db.php'; 

// PHPMailer (Found inside 'includes' folder)
require 'includes/PHPMailer/src/Exception.php';
require 'includes/PHPMailer/src/PHPMailer.php';
require 'includes/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// --- 2. Form Handling ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['email'])) {
    
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);

    // Database check
    if (!$conn) {
        die("Database Connection Failed. Check config/db.php");
    }

    $stmt = $conn->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // Token Generation
        $token = bin2hex(random_bytes(32));
        $token_hash = hash("sha256", $token);
        $expiry = date("Y-m-d H:i:s", time() + 60 * 30); // 30 Mins expiry

        // Update User
        $updateStmt = $conn->prepare("UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?");
        $updateStmt->bind_param("ssi", $token_hash, $expiry, $user['id']);

        if ($updateStmt->execute()) {
            
            // Email Logic
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
                $mail->setFrom('anuragkas29@gmail.com', 'Bid Sutra Security');
                $mail->addAddress($email, $user['name']);

                // Reset Link Generation
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
                $host = $_SERVER['HTTP_HOST'];
                
                // Construct the reset link
                $resetLink = $protocol . "://" . $host . "/reset_password.php?token=$token&email=$email";

                // Content
                $mail->isHTML(true);
                $mail->Subject = 'Reset Your Bid Sutra Password';
                $mail->Body    = "
                    <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;'>
                        <h2 style='color: #ea580c;'>Password Reset Request</h2>
                        <p>Hi {$user['name']},</p>
                        <p>Click the button below to reset your password:</p>
                        <p><a href='$resetLink' style='background-color: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reset Password</a></p>
                        <p>Or copy this link: <br> $resetLink</p>
                        <p>This link expires in 30 minutes.</p>
                    </div>
                ";

                $mail->send();
                header("Location: forgot_password.php?success=Reset link sent to your email!");
            
            } catch (Exception $e) {
                // If error, show it
                echo "Mailer Error: " . $mail->ErrorInfo; 
            }

        } else {
             header("Location: forgot_password.php?error=Database update failed.");
        }
    } else {
        header("Location: forgot_password.php?error=No account found with that email.");
    }
    
    $stmt->close();
    $conn->close();

} else {
    header("Location: forgot_password.php");
    exit();
}
?>
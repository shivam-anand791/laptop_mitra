<?php
// ==========================================
// 1. SETUP & SESSION HANDLING
// ==========================================
ini_set('display_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Security Check
if (!isset($_SESSION['order_success']) || !isset($_SESSION['user_id'])) {
    header("Location: store.php");
    exit;
}

require_once 'config/database.php';

// ==========================================
// PHP MAILER SETUP
// ==========================================
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Check paths strictly
if (file_exists('PHPMailer/Exception.php')) {
    require 'PHPMailer/Exception.php';
    require 'PHPMailer/PHPMailer.php';
    require 'PHPMailer/SMTP.php';
} else {
    // Fallback for Composer
    if(file_exists('vendor/autoload.php')) {
        require 'vendor/autoload.php';
    } else {
        die("<h3>Error: PHPMailer files not found.</h3><p>Make sure the 'PHPMailer' folder is in the same directory as this file.</p>");
    }
}

// ==========================================
// 2. DATA RETRIEVAL
// ==========================================
$user_id  = $_SESSION['user_id'];
$order_id = $_SESSION['last_order_id'] ?? 'ORD-' . time();
$domain   = "https://laptopmitra.com/"; 
$logo_url = "https://laptopmitra.com/assets/logo-laptop-mitra.png";

// A. Get Payment Info
$final_paid_amount = isset($_SESSION['last_order_amount']) ? floatval($_SESSION['last_order_amount']) : 0.00;

// B. User Info
$stmt = $conn->prepare("SELECT fullname, email FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_res = $stmt->get_result();
$user_data = $user_res->fetch_assoc();
$user_email = $user_data['email'] ?? '';
$user_name  = $user_data['fullname'] ?? 'Customer';
$stmt->close();

// C. LOGIC: Force Discount Display
$discount_text   = "Promo Applied"; // User requested generic text
$discount_amount = 500.00;          // Fixed 500 off
$subtotal_price  = $final_paid_amount + $discount_amount; // e.g., 27500 + 500 = 28000

// D. Fetch Single Product (Latest)
$item_name  = "Laptop Product";
$item_image = "default.png";
$item_qty   = 1;

if ($user_email) {
    // LIMIT 1 to show only one main product
    $sql_items = "SELECT laptop_name, quantity, image 
                  FROM bookings 
                  LEFT JOIN laptops ON bookings.laptop_id = laptops.id 
                  WHERE customer_email = ? 
                  ORDER BY bookings.id DESC LIMIT 1"; 

    $stmt_items = $conn->prepare($sql_items);
    if ($stmt_items) {
        $stmt_items->bind_param("s", $user_email);
        $stmt_items->execute();
        $res_items = $stmt_items->get_result();
        
        if ($row = $res_items->fetch_assoc()) {
            $item_name  = $row['laptop_name'];
            $item_qty   = $row['quantity'];
            $item_image = $row['image'] ?? 'default.png';
        }
        $stmt_items->close();
    }
}

// Image Fix
$display_image_url = (strpos($item_image, 'http') === 0) ? $item_image : $domain . 'admin/uploads/' . $item_image;

// ==========================================
// 3. SEND EMAIL (TO USER & ADMIN)
// ==========================================
$mail_sent_key = 'mail_sent_' . $order_id;
$mail_debug_msg = "";

if (!isset($_SESSION[$mail_sent_key]) && !empty($user_email)) {
    
    $mail = new PHPMailer(true);
    try {
        // --- SERVER SETTINGS ---
        // Agar mail fail ho raha hai, to niche wali line ko uncomment karein debug ke liye:
        // $mail->SMTPDebug = 2; 
        
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'anuragkas29@gmail.com';
        $mail->Password   = 'bdqivbkygdhpfpfq'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = 465;

        // --- RECIPIENTS ---
        // 1. Sender
        $mail->setFrom('anuragkas29@gmail.com', 'Laptop Mitra');
        
        // 2. Customer Email
        $mail->addAddress($user_email, $user_name);
        
        // 3. Admin Email (BCC - Taaki aapko bhi copy mile aur customer ko pata na chale)
        $mail->addBCC('anuragkas29@gmail.com', 'Admin Notification');

        // --- CONTENT ---
        $mail->isHTML(true);
        $mail->Subject = "Order Confirmed: #$order_id";
        
        // Email Body Design
        $mail->Body = '
        <div style="font-family:sans-serif; background:#f1f5f9; padding:20px;">
            <div style="max-width:500px; margin:auto; background:#fff; border-radius:10px; overflow:hidden;">
                
                <div style="background:#0f172a; padding:25px; text-align:center;">
                    <img src="'.$logo_url.'" alt="Laptop Mitra" style="max-width:180px; height:auto; display:block; margin:0 auto;">
                </div>

                <div style="padding:20px;">
                    <h2 style="text-align:center; color:#0f172a; margin-top:10px;">Order Successful!</h2>
                    <p style="text-align:center; color:#555;">Hi '.$user_name.', we have received your order.</p>
                    
                    <table width="100%" style="margin-bottom:20px; border-collapse:collapse;">
                        <tr>
                            <td style="padding:12px; border-bottom:1px solid #eee;">
                                <div style="font-weight:700; color:#333;">'.htmlspecialchars($item_name).'</div>
                                <div style="font-size:12px; color:#777;">Qty: '.$item_qty.'</div>
                            </td>
                            <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">
                                ₹'.number_format($subtotal_price).'
                            </td>
                        </tr>
                    </table>

                    <div style="background:#f8fafc; padding:15px; border-radius:5px;">
                        
                        <div style="display:flex; justify-content:space-between; color:#666; margin-bottom:5px;">
                            <span>Subtotal</span>
                            <span>₹'.number_format($subtotal_price).'</span>
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; color:#16a34a; font-weight:bold; margin-bottom:5px;">
                            <span>'.$discount_text.'</span>
                            <span>- ₹'.number_format($discount_amount).'</span>
                        </div>
                        
                        <div style="display:flex; justify-content:space-between; font-weight:800; font-size:18px; border-top:1px solid #ddd; padding-top:10px; margin-top:5px; color:#0f172a;">
                            <span>Total Paid</span>
                            <span>₹'.number_format($final_paid_amount).'</span>
                        </div>
                    </div>

                    <div style="text-align:center; margin-top:20px;">
                        <a href="'.$domain.'orders.php" style="background:#2563eb; color:#fff; padding:12px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Track Order</a>
                    </div>
                </div>
            </div>
        </div>';

        $mail->send();
        $_SESSION[$mail_sent_key] = true;

    } catch (Exception $e) {
        // Error capture karein taaki screen pe dikha sakein agar jarurat ho
        $mail_debug_msg = "Mail Error: " . $mail->ErrorInfo;
        error_log($mail_debug_msg); // Server logs mein save karein
    }
}

require_once 'includes/header.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Placed | Laptop Mitra</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

    <style>
        :root { --primary: #0f172a; --success: #16a34a; --success-bg: #dcfce7; --bg-page: #f1f5f9; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: var(--bg-page); min-height: 80vh; display: flex; flex-direction: column; align-items: center; }
        .success-container { width: 100%; max-width: 500px; padding: 20px; margin-top: 40px; z-index: 10; }
        .success-card { background: #ffffff; border-radius: 20px; padding: 40px 30px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; position: relative; animation: popUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes popUp { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .icon-circle { width: 80px; height: 80px; background: var(--success-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; position: relative; }
        .icon-circle i { color: var(--success); font-size: 35px; opacity: 0; animation: iconFade 0.5s ease-out 0.3s forwards; }
        @keyframes iconFade { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        
        .receipt-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: left; }
        .receipt-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #475569; font-size: 0.9rem; }
        .receipt-total { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px; font-weight: 800; color: var(--primary); font-size: 1.3rem; display: flex; justify-content: space-between; align-items: center; }
        
        /* Discount Row Style */
        .discount-row { 
            color: #16a34a; 
            font-weight: 700; 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px;
            font-size: 0.9rem;
        }

        .btn { padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 700; display: block; width: 100%; transition: 0.2s; margin-bottom: 12px; text-align: center; }
        .btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 10px rgba(15,23,42,0.2); }
        .btn-primary:hover { background: #334155; transform: translateY(-2px); }
        .btn-outline { background: white; border: 1px solid #cbd5e1; color: var(--primary); }
        .btn-outline:hover { background: #f8fafc; }
        .secure-msg { margin-top: 10px; font-size: 0.75rem; color: #94a3b8; display: flex; justify-content: center; gap: 5px; }
    </style>
</head>
<body>

<div class="success-container">
    <div class="success-card">
        <div class="icon-circle">
            <i class="fas fa-check"></i>
        </div>

        <h1>Order Successful!</h1>
        <p style="color:#64748b; margin-top:10px;">
            Thanks <strong><?php echo htmlspecialchars($user_name); ?></strong>! Your order has been placed.
        </p>

        <?php if(!empty($mail_debug_msg)): ?>
            <div style="background:#fee2e2; color:#b91c1c; padding:10px; border-radius:5px; font-size:12px; margin-bottom:15px; border:1px solid #fecaca; text-align:left;">
                <strong>Mail Not Sent:</strong> <?php echo $mail_debug_msg; ?>
            </div>
        <?php endif; ?>

        <div class="receipt-box">
            <div class="receipt-row">
                <span>Order ID</span>
                <span style="font-weight:700; color:#0f172a;">#<?php echo htmlspecialchars($order_id); ?></span>
            </div>
            
            <div class="receipt-row">
                <span><?php echo htmlspecialchars($item_name); ?> (x<?php echo $item_qty; ?>)</span>
                <span>₹<?php echo number_format($subtotal_price); ?></span>
            </div>

            <div style="border-bottom: 1px dashed #cbd5e1; margin: 10px 0;"></div>

            <div class="receipt-row">
                <span>Subtotal</span>
                <span>₹<?php echo number_format($subtotal_price); ?></span>
            </div>

            <div class="discount-row">
                <span><i class="fas fa-tag"></i> <?php echo $discount_text; ?></span>
                <span>- ₹<?php echo number_format($discount_amount); ?></span>
            </div>

            <div class="receipt-total">
                <span>Total Paid</span>
                <span>₹<?php echo number_format($final_paid_amount); ?></span>
            </div>
        </div>

        <div class="btn-wrapper">
            <a href="orders.php" class="btn btn-primary">Track Order <i class="fas fa-arrow-right" style="margin-left:5px;"></i></a>
            <a href="store.php" class="btn btn-outline">Back to Store</a>
        </div>

        <div class="secure-msg">
            <i class="fas fa-shield-alt"></i> SSL Encrypted Transaction
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

<script>
    window.addEventListener('load', () => {
        triggerConfetti();
        setInterval(() => { triggerConfettiSmall(); }, 1500); 
    });

    function triggerConfetti() {
        var duration = 2 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        var interval = setInterval(function() {
          var timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) { return clearInterval(interval); }
          var particleCount = 50 * (timeLeft / duration);
          confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
        }, 250);
    }

    function triggerConfettiSmall() {
        confetti({ particleCount: 30, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#2563eb', '#16a34a', '#facc15'] });
        confetti({ particleCount: 30, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#2563eb', '#16a34a', '#facc15'] });
    }
</script>
</body>
</html>
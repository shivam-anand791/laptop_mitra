<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php'; // Ensure isLoggedIn() exists

if (!isset($_SESSION['admin_logged_in']) && !isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// 1. GET BOOKING ID
if (!isset($_GET['id'])) {
    header('Location: all-bookings.php');
    exit;
}
$booking_id = intval($_GET['id']);

// 2. HANDLE STATUS UPDATE (Email Logic Included)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $new_status = $_POST['status'];
    $courier = isset($_POST['courier_name']) ? $_POST['courier_name'] : '';
    $tracking = isset($_POST['tracking_id']) ? $_POST['tracking_id'] : '';

    $update_sql = "UPDATE bookings SET status = ?, courier_name = ?, tracking_id = ? WHERE id = ?";
    $stmt = $conn->prepare($update_sql);
    $stmt->bind_param("sssi", $new_status, $courier, $tracking, $booking_id);
    
    if ($stmt->execute()) {
        // Fetch fresh data for email
        $c_stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $c_stmt->bind_param("i", $booking_id);
        $c_stmt->execute();
        $order_data = $c_stmt->get_result()->fetch_assoc();

        // Send Email if Shipped/Completed
        if (($new_status == 'Shipped' || $new_status == 'Completed') && !empty($order_data['customer_email'])) {
            $to = $order_data['customer_email'];
            $subject = "Update on Order #ORD-" . $booking_id;
            
            $track_html = "";
            if(!empty($tracking)) {
                $track_html = '<div style="background:#f0f9ff; border:1px dashed #0ea5e9; padding:15px; border-radius:8px; margin:20px 0;">
                    <p style="margin:0; font-size:14px; color:#0369a1;"><strong>Courier:</strong> '.htmlspecialchars($courier).'</p>
                    <p style="margin:5px 0 0; font-size:14px; color:#0369a1;"><strong>Tracking ID:</strong> '.htmlspecialchars($tracking).'</p>
                </div>';
            }

            $message = '
            <!DOCTYPE html>
            <html>
            <body style="font-family:sans-serif;background-color:#f8fafc;padding:20px;">
                <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    <div style="background:#002c8c;padding:30px;text-align:center;">
                        <h1 style="color:#fff;margin:0;">Order Status: '.$new_status.'</h1>
                    </div>
                    <div style="padding:30px;">
                        <p style="color:#334155;font-size:16px;">Hi <strong>'.htmlspecialchars($order_data['customer_name']).'</strong>,</p>
                        <p>Your order status has been updated to <strong>'.$new_status.'</strong>.</p>
                        '.$track_html.'
                        <p style="color:#64748b;">If you have questions, reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>';

            $headers = "MIME-Version: 1.0" . "\r\n";
            $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
            $headers .= "From: XpertNote <no-reply@xpertnote.com>" . "\r\n";
            @mail($to, $subject, $message, $headers);
        }
        $msg = "Status updated successfully!";
    }
}

// 3. FETCH BOOKING DETAILS
$sql = "SELECT * FROM bookings WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $booking_id);
$stmt->execute();
$booking = $stmt->get_result()->fetch_assoc();

if (!$booking) { echo "Booking not found."; exit; }
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Order #<?php echo $booking_id; ?> Details</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root { --primary: #002c8c; --bg: #f1f5f9; --text: #1e293b; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); margin: 0; padding: 20px; color: var(--text); }
        .container { max-width: 1000px; margin: 0 auto; }
        
        /* Header */
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .back-btn { text-decoration: none; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 5px; }
        .print-btn { background: #fff; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .print-btn:hover { background: #f1f5f9; }

        /* Grid Layout */
        .details-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; }
        
        .card { background: #fff; border-radius: 12px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); margin-bottom: 25px; border: 1px solid #e2e8f0; }
        .card-header { border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
        .card-header h3 { margin: 0; font-size: 1.1rem; color: var(--primary); }

        /* Timeline */
        .timeline { display: flex; justify-content: space-between; margin-bottom: 30px; position: relative; }
        .timeline::before { content: ''; position: absolute; top: 15px; left: 0; right: 0; height: 3px; background: #e2e8f0; z-index: 0; }
        .step { position: relative; z-index: 1; text-align: center; background: #fff; padding: 0 10px; }
        .step-circle { width: 35px; height: 35px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #64748b; font-weight: bold; }
        .step.active .step-circle { background: #10b981; color: white; }
        .step p { font-size: 0.85rem; font-weight: 600; margin: 0; color: #64748b; }
        .step.active p { color: #10b981; }

        /* Tables */
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 10px 0; border-bottom: 1px dashed #f1f5f9; font-size: 0.95rem; }
        .info-table td:first-child { color: #64748b; font-weight: 500; width: 40%; }
        .info-table td:last-child { color: var(--text); font-weight: 600; text-align: right; }

        /* Status Form */
        .status-form select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 15px; }
        .status-form input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 15px; box-sizing: border-box; }
        .update-btn { width: 100%; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .update-btn:hover { background: #1e40af; }

        /* Print Styles */
        @media print {
            body { background: #fff; padding: 0; }
            .sidebar, .back-btn, .print-btn, .status-card, .timeline { display: none !important; }
            .container { max-width: 100%; margin: 0; }
            .details-grid { grid-template-columns: 1fr; }
            .card { border: none; box-shadow: none; padding: 0; margin-bottom: 20px; }
        }
    </style>
</head>
<body>

<div class="container">
    <div class="page-header">
        <a href="all-bookings.php" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Orders</a>
        <div>
            <button onclick="window.print()" class="print-btn"><i class="fas fa-print"></i> Print Invoice</button>
        </div>
    </div>

    <?php if(isset($msg)): ?>
        <div style="background:#dcfce7; color:#166534; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #bbf7d0;">
            <i class="fas fa-check-circle"></i> <?php echo $msg; ?>
        </div>
    <?php endif; ?>

    <div class="card">
        <div class="timeline">
            <?php 
                $s = $booking['status']; 
                $step1 = true; 
                $step2 = ($s == 'Contacted' || $s == 'Shipped' || $s == 'Completed');
                $step3 = ($s == 'Shipped' || $s == 'Completed');
                $step4 = ($s == 'Completed');
            ?>
            <div class="step <?php echo $step1 ? 'active' : ''; ?>">
                <div class="step-circle"><i class="fas fa-file-alt"></i></div>
                <p>Placed</p>
            </div>
            <div class="step <?php echo $step2 ? 'active' : ''; ?>">
                <div class="step-circle"><i class="fas fa-headset"></i></div>
                <p>Confirmed</p>
            </div>
            <div class="step <?php echo $step3 ? 'active' : ''; ?>">
                <div class="step-circle"><i class="fas fa-truck"></i></div>
                <p>Shipped</p>
            </div>
            <div class="step <?php echo $step4 ? 'active' : ''; ?>">
                <div class="step-circle"><i class="fas fa-check"></i></div>
                <p>Delivered</p>
            </div>
        </div>
    </div>

    <div class="details-grid">
        <div class="left-col">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-box-open"></i> Order Details</h3>
                    <span style="background:#eff6ff; color:#2563eb; padding:5px 10px; border-radius:20px; font-size:0.8rem; font-weight:700;">
                        #ORD-<?php echo $booking['id']; ?>
                    </span>
                </div>
                
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:20px;">
                    <div style="width:80px; height:80px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">
                        <i class="fas fa-laptop fa-2x"></i>
                    </div>
                    <div>
                        <h2 style="margin:0; font-size:1.2rem;"><?php echo htmlspecialchars($booking['laptop_name']); ?></h2>
                        <p style="margin:5px 0; color:#64748b;">
                            Purchase Mode: <strong style="color:#002c8c; text-transform:uppercase;"><?php echo $booking['mode']; ?></strong>
                        </p>
                        <p style="margin:0; color:#64748b;">Quantity: <strong><?php echo $booking['quantity']; ?> Unit(s)</strong></p>
                    </div>
                </div>

                <table class="info-table">
                    <tr>
                        <td>Price Per Unit</td>
                        <td>₹<?php echo number_format($booking['price_per_unit']); ?></td>
                    </tr>
                    <tr>
                        <td>Subtotal</td>
                        <td>₹<?php echo number_format($booking['price_per_unit'] * $booking['quantity']); ?></td>
                    </tr>
                    <tr>
                        <td>Shipping Cost</td>
                        <td style="color:#10b981;">Free</td>
                    </tr>
                    <tr style="border-top:2px solid #e2e8f0; font-size:1.1rem;">
                        <td style="padding-top:15px; color:#002c8c;"><strong>Grand Total</strong></td>
                        <td style="padding-top:15px; color:#002c8c;"><strong>₹<?php echo number_format($booking['price_per_unit'] * $booking['quantity']); ?></strong></td>
                    </tr>
                </table>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-map-marker-alt"></i> Shipping Address</h3>
                </div>
                <p style="line-height:1.6; color:#334155;">
                    <?php echo nl2br(htmlspecialchars($booking['address'])); ?>
                </p>
                <?php if(!empty($booking['tracking_id'])): ?>
                    <div style="background:#f0fdf4; border:1px dashed #16a34a; padding:15px; border-radius:8px; margin-top:15px;">
                        <p style="margin:0; font-size:0.9rem; color:#15803d;"><strong>Courier:</strong> <?php echo htmlspecialchars($booking['courier_name']); ?></p>
                        <p style="margin:5px 0 0; font-size:0.9rem; color:#15803d;"><strong>Tracking ID:</strong> <?php echo htmlspecialchars($booking['tracking_id']); ?></p>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <div class="right-col">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-user"></i> Customer Info</h3>
                </div>
                <table class="info-table">
                    <tr>
                        <td>Name</td>
                        <td><?php echo htmlspecialchars($booking['customer_name']); ?></td>
                    </tr>
                    <tr>
                        <td>Email</td>
                        <td><a href="mailto:<?php echo htmlspecialchars($booking['customer_email']); ?>"><?php echo htmlspecialchars($booking['customer_email']); ?></a></td>
                    </tr>
                    <tr>
                        <td>Phone</td>
                        <td><a href="tel:<?php echo htmlspecialchars($booking['customer_phone']); ?>"><?php echo htmlspecialchars($booking['customer_phone']); ?></a></td>
                    </tr>
                    <tr>
                        <td>Date</td>
                        <td><?php echo date('d M Y, h:i A', strtotime($booking['created_at'])); ?></td>
                    </tr>
                </table>
            </div>

            <div class="card status-card">
                <div class="card-header">
                    <h3><i class="fas fa-cog"></i> Update Status</h3>
                </div>
                <form method="POST">
                    <input type="hidden" name="update_status" value="1">
                    
                    <div class="status-form">
                        <label style="font-size:0.85rem; font-weight:600; color:#64748b; display:block; margin-bottom:5px;">Order Status</label>
                        <select name="status" onchange="toggleShipping(this.value)">
                            <option value="Pending" <?php if($booking['status']=='Pending') echo 'selected'; ?>>Pending</option>
                            <option value="Contacted" <?php if($booking['status']=='Contacted') echo 'selected'; ?>>Contacted</option>
                            <option value="Shipped" <?php if($booking['status']=='Shipped') echo 'selected'; ?>>Shipped</option>
                            <option value="Completed" <?php if($booking['status']=='Completed') echo 'selected'; ?>>Completed</option>
                            <option value="Canceled" <?php if($booking['status']=='Canceled') echo 'selected'; ?>>Canceled</option>
                        </select>

                        <div id="shipInputs" style="display: <?php echo ($booking['status']=='Shipped' || $booking['status']=='Completed') ? 'block' : 'none'; ?>;">
                            <label style="font-size:0.85rem; font-weight:600; color:#64748b; display:block; margin-bottom:5px;">Courier Name</label>
                            <input type="text" name="courier_name" value="<?php echo htmlspecialchars($booking['courier_name']); ?>" placeholder="e.g. BlueDart">
                            
                            <label style="font-size:0.85rem; font-weight:600; color:#64748b; display:block; margin-bottom:5px;">Tracking ID</label>
                            <input type="text" name="tracking_id" value="<?php echo htmlspecialchars($booking['tracking_id']); ?>" placeholder="Tracking Number">
                        </div>

                        <button type="submit" class="update-btn">Update & Notify User</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
    function toggleShipping(status) {
        const div = document.getElementById('shipInputs');
        if (status === 'Shipped' || status === 'Completed') {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    }
</script>

</body>
</html>
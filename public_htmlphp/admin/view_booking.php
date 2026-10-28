<?php
// admin/view_booking.php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check if user is logged in (Assuming isLoggedIn() is defined in functions.php)
if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}

$booking_id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$booking_id) {
    header('Location: all-bookings.php');
    exit;
}

// 1. Fetch the specific booking
$stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
$stmt->bind_param("i", $booking_id);
$stmt->execute();
$result = $stmt->get_result();
$booking = $result->fetch_assoc();
$stmt->close();

if (!$booking) {
    // Redirect or display an error if booking is not found
    $_SESSION['error_message'] = "Booking with ID #$booking_id not found.";
    header('Location: all-bookings.php');
    exit;
}

$message = null;
$error = null;

// 2. Handle status update (POST request)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $new_status = sanitize($_POST['status']);
    
    // Validate status against allowed values
    $allowed_statuses = ['Pending', 'Contacted', 'Completed', 'Canceled'];
    if (in_array($new_status, $allowed_statuses)) {
        $update_stmt = $conn->prepare("UPDATE bookings SET status = ? WHERE id = ?");
        $update_stmt->bind_param("si", $new_status, $booking_id);
        
        if ($update_stmt->execute()) {
            $booking['status'] = $new_status; // Update display variable
            $message = "Status updated successfully to " . $new_status . ".";
        } else {
            $error = "Error updating status: " . $conn->error;
        }
        $update_stmt->close();
    } else {
        $error = "Invalid status selected. Action not permitted.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Booking #<?php echo $booking_id; ?></title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        /* Base Styles */
        body { 
            font-family: 'Inter', sans-serif; 
            background: #f4f7f9; 
            color: #1e293b; 
            margin: 0;
            padding: 0;
        }

        /* Container and Card */
        .container { 
            max-width: 900px; 
            margin: 40px auto; 
            padding: 30px; 
            background: white; 
            border-radius: 16px; 
            box-shadow: 0 8px 30px rgba(0,0,0,0.1); 
            border: 1px solid #e5e7eb;
        }

        /* Header and Title */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #eff6ff;
            padding-bottom: 15px;
        }
        h2 { 
            font-size: 1.8rem;
            font-weight: 800;
            color: #1e40af;
            margin: 0;
        }

        /* Back Button */
        .back-link { 
            display: inline-flex;
            align-items: center;
            padding: 8px 15px;
            color: #3b82f6; 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 0.9rem;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            transition: background 0.2s;
        }
        .back-link:hover {
            background: #eff6ff;
        }
        .back-link span { margin-right: 5px; font-size: 1.2rem;}

        /* Detail Grouping */
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .detail-group { 
            padding: 18px; 
            background: #f8fafc; 
            border-radius: 10px; 
            border-left: 4px solid #3b82f6; /* Highlight border */
        }
        .detail-label { 
            font-weight: 700; 
            color: #475569; 
            display: block; 
            font-size: 0.85rem; 
            margin-bottom: 5px; 
            text-transform: uppercase;
        }
        .detail-value { 
            font-size: 1.1rem; 
            font-weight: 600;
            line-height: 1.4;
        }
        .detail-value small {
            font-size: 0.9rem;
            color: #64748b;
            font-weight: 400;
        }
        .detail-value .highlight {
             color: #1e40af;
        }

        /* Status Badge */
        .status-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 10px;
            margin-bottom: 25px;
        }
        .status-badge { 
            padding: 8px 15px; 
            border-radius: 20px; 
            font-weight: 700; 
            font-size: 1rem; 
            display: inline-block; 
            text-transform: capitalize;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .status-Pending { background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
        .status-Contacted { background: #eef2ff; color: #4338ca; border: 1px solid #a5b4fc; }
        .status-Completed { background: #d1fae5; color: #065f46; border: 1px solid #34d399; }
        .status-Canceled { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        /* Update Form */
        .update-form { 
            display: flex; 
            gap: 15px; 
            align-items: center; 
            padding: 20px; 
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
        }
        .update-form label {
            font-weight: 600;
            color: #1e293b;
            font-size: 1rem;
        }
        .update-form select { 
            padding: 10px; 
            border-radius: 8px; 
            border: 1px solid #cbd5e1; 
            flex-grow: 1;
            font-size: 1rem;
            background-color: white;
            min-width: 150px;
        }
        .update-form button { 
            padding: 10px 20px; 
            background: #10b981; 
            color: white; 
            cursor: pointer; 
            border: none; 
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s;
        }
        .update-form button:hover {
            background: #059669;
        }

        /* Alert Messages */
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .alert-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #34d399;
        }
        .alert-error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        /* Responsive adjustments */
        @media (max-width: 650px) {
            .container {
                margin: 20px;
                padding: 20px;
            }
            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            .detail-grid {
                grid-template-columns: 1fr;
            }
            .update-form {
                flex-direction: column;
                align-items: stretch;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        
        <div class="header">
            <h2>Booking Details <small style="color: #94a3b8; font-weight: 400;">#<?php echo $booking_id; ?></small></h2>
            <a href="view-bookings.php" class="back-link">
                <span>&#8592;</span> Back to All Bookings
            </a>
        </div>

        <?php if ($message): ?>
            <div class="alert alert-success"><?php echo $message; ?></div>
        <?php endif; ?>
        <?php if ($error): ?>
            <div class="alert alert-error"><?php echo $error; ?></div>
        <?php endif; ?>

        <div class="detail-grid">
            
            <div class="detail-group">
                <span class="detail-label">Laptop & Order Type</span>
                <span class="detail-value highlight"><?php echo htmlspecialchars($booking['laptop_name']); ?></span>
                <span class="detail-value"><small><?php echo htmlspecialchars($booking['purchase_type']); ?> for <?php echo htmlspecialchars(ucfirst($booking['mode'])); ?></small></span>
            </div>
            
            <div class="detail-group">
                <span class="detail-label">Quantity & Unit Price</span>
                <span class="detail-value"><?php echo htmlspecialchars($booking['quantity']); ?> Unit(s)</span>
                <span class="detail-value"><small>Price: ₹<?php echo number_format($booking['price_per_unit'], 2); ?></small></span>
            </div>

            <div class="detail-group">
                <span class="detail-label">Customer Name</span>
                <span class="detail-value"><?php echo htmlspecialchars($booking['customer_name']); ?></span>
            </div>
            
            <div class="detail-group">
                <span class="detail-label">Contact Details</span>
                <span class="detail-value"><?php echo htmlspecialchars($booking['customer_phone']); ?></span>
                <span class="detail-value"><small><?php echo htmlspecialchars($booking['customer_email']); ?></small></span>
            </div>

        </div>

        <div class="detail-grid">
            <div class="detail-group" style="border-left-color: #f59e0b;">
                <span class="detail-label">Delivery/Pickup Address</span>
                <span class="detail-value" style="font-weight: 400; white-space: pre-wrap;"><?php echo htmlspecialchars($booking['address']); ?></span>
            </div>

            <div class="detail-group" style="border-left-color: #06b6d4;">
                <span class="detail-label">Customer Notes</span>
                <span class="detail-value" style="font-weight: 400; font-style: italic;"><?php echo htmlspecialchars($booking['notes'] ?: 'No notes provided by the customer.'); ?></span>
            </div>
        </div>
        
        <div class="status-section">
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">Current Status:</span>
                <span class="status-badge status-<?php echo htmlspecialchars($booking['status']); ?>"><?php echo htmlspecialchars($booking['status']); ?></span>
            </div>

            <form method="POST" class="update-form" style="margin: 0; padding: 0; border: none; background: none;">
                <label for="status">Change Status:</label>
                <select name="status" id="status" style="flex-grow: 0; width: auto;">
                    <option value="Pending" <?php echo ($booking['status'] == 'Pending') ? 'selected' : ''; ?>>Pending</option>
                    <option value="Contacted" <?php echo ($booking['status'] == 'Contacted') ? 'selected' : ''; ?>>Contacted</option>
                    <option value="Completed" <?php echo ($booking['status'] == 'Completed') ? 'selected' : ''; ?>>Completed</option>
                    <option value="Canceled" <?php echo ($booking['status'] == 'Canceled') ? 'selected' : ''; ?>>Canceled</option>
                </select>
                <button type="submit" name="update_status">Save Status</button>
            </form>
        </div>

    </div>
</body>
</html>
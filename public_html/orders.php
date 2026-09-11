<?php
require_once 'config/database.php';
require_once 'includes/header.php';

// Force Login
if (!isset($_SESSION['user_id'])) {
    echo "<script>window.location.href='login.php';</script>";
    exit;
}

$user_id = $_SESSION['user_id'];

// 1. Get User Email
$userStmt = $conn->prepare("SELECT email FROM users WHERE id = ?");
$userStmt->bind_param("i", $user_id);
$userStmt->execute();
$userRes = $userStmt->get_result()->fetch_assoc();
$user_email = $userRes['email'];

// 2. Fetch Orders + Laptop Image
// We join with the laptops table to get the image. 
// We select ALL booking details for the modal.
$sql = "
    SELECT b.*, l.image as product_image
    FROM bookings b
    LEFT JOIN laptops l ON b.laptop_id = l.id
    WHERE b.customer_email = ? 
    ORDER BY b.id DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $user_email);
$stmt->execute();
$orders = $stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Orders | XpertNote</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
:root {
    --primary: #002c8c;
    --accent: #2563eb;
    --bg-body: #f1f5f9;
    --card-bg: #ffffff;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
}

body {
    background: var(--bg-body);
    font-family: 'Plus Jakarta Sans', sans-serif;
    margin: 0;
    padding-bottom: 60px;
}

.orders-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
    margin-top: 80px; /* Adjust based on your header height */
}

/* HEADER */
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}
.page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
}
.order-count {
    background: #dbeafe;
    color: var(--accent);
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.85rem;
}

/* ORDER CARD */
.order-card {
    background: var(--card-bg);
    border-radius: 16px;
    border: 1px solid var(--border);
    padding: 24px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
}

.order-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
}

.order-left {
    display: flex;
    align-items: center;
    gap: 20px;
}

.product-thumb {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    object-fit: contain; /* Ensures logo fits inside */
    background: #f8fafc;
    border: 1px solid var(--border);
    padding: 5px;
}

.info-text h3 {
    margin: 0 0 6px;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-main);
}

.meta-row {
    display: flex;
    gap: 15px;
    font-size: 0.85rem;
    color: var(--text-muted);
    flex-wrap: wrap;
}
.meta-item { display: flex; align-items: center; gap: 6px; }

/* RIGHT SIDE ACTIONS */
.order-actions {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
}

.price-tag {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--primary);
}

.btn-details {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.btn-details:hover {
    background: #f1f5f9;
    color: var(--primary);
    border-color: #cbd5e1;
}

/* BADGES */
.status-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: inline-block;
}
.st-pending { background: #fff7ed; color: #c2410c; }
.st-confirmed { background: #eff6ff; color: #1d4ed8; }
.st-shipped { background: #f0f9ff; color: #0369a1; }
.st-delivered { background: #f0fdf4; color: #15803d; }
.st-cancelled { background: #fef2f2; color: #b91c1c; }

.mode-badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 700;
    margin-left: 8px;
    vertical-align: middle;
}
.mode-buy { background: #dcfce7; color: #166534; }
.mode-lease { background: #dbeafe; color: #1e40af; }

/* MODAL STYLES */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: none; /* Hidden by default */
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}
.modal-overlay.active { display: flex; opacity: 1; }

.modal-box {
    background: white;
    width: 90%;
    max-width: 600px;
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    transform: translateY(20px);
    transition: transform 0.3s ease;
    overflow: hidden;
}
.modal-overlay.active .modal-box { transform: translateY(0); }

.modal-header {
    background: var(--bg-body);
    padding: 20px 25px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.modal-header h4 { margin: 0; font-size: 1.1rem; color: var(--primary); font-weight: 700; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }

.modal-body { padding: 25px; }

.detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px dashed var(--border);
}
.detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.detail-label { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }
.detail-value { color: var(--text-main); font-size: 0.95rem; font-weight: 600; text-align: right; max-width: 60%; }

.address-block {
    background: #f8fafc;
    padding: 15px;
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--text-main);
    line-height: 1.5;
    margin-top: 10px;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .order-card { flex-direction: column; align-items: flex-start; gap: 20px; padding: 20px; }
    .order-left { width: 100%; }
    .order-actions { width: 100%; flex-direction: row; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
    .product-thumb { width: 60px; height: 60px; }
    .detail-value { max-width: 100%; }
}
</style>
</head>

<body>

<div class="orders-container">
    <div class="page-header">
        <h1 class="page-title"><i class="fas fa-boxes"></i> My Orders</h1>
        <span class="order-count"><?php echo $orders->num_rows; ?> orders found</span>
    </div>

    <?php if ($orders->num_rows > 0): ?>
        <?php while ($o = $orders->fetch_assoc()): 
            // 1. Status Logic
            $st = strtolower($o['status']);
            $stClass = 'st-pending';
            if(strpos($st, 'confirm') !== false) $stClass = 'st-confirmed';
            elseif(strpos($st, 'ship') !== false) $stClass = 'st-shipped';
            elseif(strpos($st, 'deliver') !== false) $stClass = 'st-delivered';
            elseif(strpos($st, 'cancel') !== false) $stClass = 'st-cancelled';

            // 2. Price & Image
            $total = $o['price_per_unit'] * $o['quantity'];
            $img = !empty($o['product_image']) ? 'admin/uploads/'.$o['product_image'] : 'assets/img/default-laptop.png';
            $date = isset($o['created_at']) ? date("d M, Y", strtotime($o['created_at'])) : "Recent";
            
            // 3. Prepare JSON for Modal (Safe way to pass data)
            // We encode the full address string
            $address = htmlspecialchars($o['address'] . ", " . $o['city'] . ", " . $o['state'] . " - " . $o['pincode']);
        ?>
        
        <div class="order-card">
            <div class="order-left">
                <img src="<?php echo $img; ?>" alt="Product" class="product-thumb">
                <div class="info-text">
                    <h3>
                        <?php echo htmlspecialchars($o['laptop_name']); ?>
                        <span class="mode-badge <?php echo ($o['mode'] == 'lease') ? 'mode-lease' : 'mode-buy'; ?>">
                            <?php echo ucfirst($o['mode']); ?>
                        </span>
                    </h3>
                    
                    <div class="meta-row">
                        <div class="meta-item"><i class="far fa-calendar"></i> <?php echo $date; ?></div>
                        <div class="meta-item"><i class="fas fa-hashtag"></i> #<?php echo $o['id']; ?></div>
                        <div class="status-badge <?php echo $stClass; ?>"><?php echo $o['status']; ?></div>
                    </div>
                </div>
            </div>

            <div class="order-actions">
                <div class="price-tag">₹<?php echo number_format($total); ?></div>
                
                <button class="btn-details" 
                        onclick="openModal(
                            '<?php echo $o['id']; ?>',
                            '<?php echo htmlspecialchars(addslashes($o['laptop_name'])); ?>',
                            '<?php echo $o['quantity']; ?>',
                            '<?php echo number_format($total); ?>',
                            '<?php echo $stClass; ?>',
                            '<?php echo $o['status']; ?>',
                            '<?php echo addslashes($address); ?>',
                            '<?php echo $o['customer_phone']; ?>'
                        )">
                    View Details <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>

        <?php endwhile; ?>
    <?php else: ?>
        <div style="text-align: center; padding: 100px 20px;">
            <i class="fas fa-shopping-basket" style="font-size: 4rem; color: #cbd5e1; margin-bottom: 20px;"></i>
            <h2 style="color: var(--text-main);">No orders found</h2>
            <p style="color: var(--text-muted);">You haven't placed any orders yet.</p>
            <a href="store.php" style="background: var(--primary); color: white; padding: 12px 30px; border-radius: 50px; text-decoration: none; display: inline-block; margin-top: 10px;">Start Shopping</a>
        </div>
    <?php endif; ?>
</div>

<div class="modal-overlay" id="orderModal">
    <div class="modal-box">
        <div class="modal-header">
            <h4 id="m-order-id">Order Details</h4>
            <button class="btn-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            
            <div class="detail-row">
                <span class="detail-label">Product Name</span>
                <span class="detail-value" id="m-name">MacBook Pro</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Quantity</span>
                <span class="detail-value" id="m-qty">1</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Total Amount</span>
                <span class="detail-value" style="color: var(--primary); font-weight:800;" id="m-price">₹50,000</span>
            </div>

            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span id="m-status-badge" class="status-badge st-pending">Pending</span>
            </div>

            <div style="margin-top: 20px;">
                <span class="detail-label">Shipping Address</span>
                <div class="address-block">
                    <div id="m-address">123 Street, City</div>
                    <div style="margin-top: 5px; color: var(--primary); font-weight: 600;">
                        <i class="fas fa-phone-alt" style="font-size: 0.8rem;"></i> <span id="m-phone">9876543210</span>
                    </div>
                </div>
            </div>

            <div style="margin-top: 25px; text-align: center;">
                <button onclick="closeModal()" style="width: 100%; padding: 14px; background: var(--bg-body); color: var(--text-main); border: 1px solid var(--border); border-radius: 10px; font-weight: 600; cursor: pointer;">
                    Close Details
                </button>
            </div>

        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

<script>
    const modal = document.getElementById('orderModal');
    
    function openModal(id, name, qty, price, stClass, stText, address, phone) {
        // Populate Data
        document.getElementById('m-order-id').innerText = 'Order #' + id;
        document.getElementById('m-name').innerText = name;
        document.getElementById('m-qty').innerText = 'x' + qty;
        document.getElementById('m-price').innerText = '₹' + price;
        document.getElementById('m-address').innerText = address;
        document.getElementById('m-phone').innerText = phone;
        
        // Status Badge Logic
        const badge = document.getElementById('m-status-badge');
        badge.className = 'status-badge ' + stClass;
        badge.innerText = stText;

        // Show Modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore scrolling
    }

    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
</script>

</body>
</html>
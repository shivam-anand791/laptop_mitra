<?php
session_start();

// --- 1. CONFIGURATION & INCLUDES ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Adjust paths based on your folder structure
if(file_exists('../PHPMailer/Exception.php')) {
    require '../PHPMailer/Exception.php';
    require '../PHPMailer/PHPMailer.php';
    require '../PHPMailer/SMTP.php';
}

require_once '../config/database.php';

// Security Check
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

// --- 2. EMAIL NOTIFICATION FUNCTION ---
function sendStatusEmail($orderData) {
    // Extract Data
    $to       = $orderData['customer_email'];
    $name     = $orderData['customer_name'];
    $status   = $orderData['status'];
    $item     = $orderData['laptop_name'];
    $price    = $orderData['price_per_unit'];
    $qty      = $orderData['quantity'];
    $total    = $price * $qty;
    $order_id = $orderData['id'];
    $courier  = $orderData['courier_name'] ?? '';
    $tracking = $orderData['tracking_id'] ?? '';

    // Design Config
    $logo_url = "https://www.laptopmitra.com/assets/logo-laptop-mitra.png"; 
    
    // Dynamic Colors & Text
    $color = "#4f46e5"; $headline = "Order Update"; $subtext = "There is an update on your order.";

    if ($status == 'Confirmed') { $color = "#16a34a"; $headline = "Order Confirmed ✅"; $subtext = "We have received your order and are getting it ready!"; } 
    elseif ($status == 'Shipped') { $color = "#2563eb"; $headline = "Order Dispatched 🚚"; $subtext = "Great news! Your package is on its way."; } 
    elseif ($status == 'Delivered') { $color = "#15803d"; $headline = "Delivered 📦"; $subtext = "Your package has been delivered."; } 
    elseif ($status == 'Canceled') { $color = "#dc2626"; $headline = "Order Canceled ❌"; $subtext = "Your order has been canceled."; }

    // HTML Email Template
    $html = '
    <div style="font-family: Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: '.$color.'; color: #ffffff; padding: 20px; text-align: center; font-weight: bold; font-size: 20px;">
                '.$headline.'
            </div>
            <div style="padding: 30px; color: #333;">
                <h2 style="margin-top: 0;">Hi '.$name.',</h2>
                <p>'.$subtext.'</p>
                <div style="background: #f9fafb; padding: 15px; border: 1px solid #eee; border-radius: 6px; margin: 20px 0;">
                    <strong>Order #'.$order_id.'</strong><br>
                    '.$item.' (x'.$qty.')<br>
                    <strong>Total: ₹'.number_format($total).'</strong>
                </div>
                '. ($status == 'Shipped' && !empty($tracking) ? '
                <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
                    <strong>Tracking Info:</strong><br>
                    Courier: '.$courier.'<br>
                    Tracking ID: '.$tracking.'
                </div>' : '') .'
                <p style="font-size: 12px; color: #888;">Laptop Mitra Team</p>
            </div>
        </div>
    </div>';

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();                                            
        $mail->Host       = 'smtp.gmail.com';                       
        $mail->SMTPAuth   = true;                                   
        $mail->Username   = 'anuragkas29@gmail.com';
        $mail->Password   = 'bdqivbkygdhpfpfq';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;            
        $mail->Port       = 465;                                    
        $mail->setFrom('anuragkas29@gmail.com', 'Laptop Mitra');
        $mail->addAddress($to, $name);        
        $mail->isHTML(true);                                  
        $mail->Subject = strip_tags($headline) . " - Order #$order_id";
        $mail->Body    = $html;
        $mail->send();
        return true;
    } catch (Exception $e) { return false; }
}

// --- 3. HANDLE STATUS UPDATE ---
$alert_msg = "";
$alert_type = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status_btn'])) {
    $booking_id = intval($_POST['booking_id']);
    $new_status = $_POST['status'];
    $courier = isset($_POST['courier_name']) ? trim($_POST['courier_name']) : '';
    $tracking = isset($_POST['tracking_id']) ? trim($_POST['tracking_id']) : '';

    $stmt = $conn->prepare("UPDATE bookings SET status = ?, courier_name = ?, tracking_id = ? WHERE id = ?");
    $stmt->bind_param("sssi", $new_status, $courier, $tracking, $booking_id);
    
    if ($stmt->execute()) {
        // Fetch fresh data for email
        $u_stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
        $u_stmt->bind_param("i", $booking_id);
        $u_stmt->execute();
        $order_result = $u_stmt->get_result();
        
        if ($order_data = $order_result->fetch_assoc()) {
            if ($new_status != 'Pending') {
                sendStatusEmail($order_data); 
            }
        }
        $alert_msg = "Order #$booking_id updated successfully.";
        $alert_type = "success";
    } else {
        $alert_msg = "Error updating order.";
        $alert_type = "error";
    }
}

// --- 4. FETCH DATA ---
$status_filter = isset($_GET['status']) && $_GET['status'] != 'All' ? $_GET['status'] : null;
$sql = "SELECT * FROM bookings";
if ($status_filter) { $sql .= " WHERE status = '$status_filter'"; }
$sql .= " ORDER BY created_at DESC";
$result = $conn->query($sql);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Manage Bookings | Laptop Mitra</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style> 
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; -webkit-tap-highlight-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        /* Modal Animation */
        .modal-enter { animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    </style>
</head>
<body class="text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700">

    <?php include 'includes/sidebar.php'; ?>

    <main class="lg:ml-[280px] min-h-screen transition-all duration-300 flex flex-col pb-20 lg:pb-0">
        
        <header class="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button onclick="toggleSidebar()" class="lg:hidden p-2 text-slate-500 hover:text-slate-700 transition">
                    <i class="fa-solid fa-bars-staggered text-xl"></i>
                </button>
                <div>
                    <h1 class="text-xl font-bold text-slate-800 tracking-tight">Order Management</h1>
                    <p class="text-xs text-slate-500 font-medium hidden sm:block">Total: <?php echo $result->num_rows; ?> Records</p>
                </div>
            </div>
        </header>

        <div class="p-4 sm:p-8 w-full max-w-7xl mx-auto">

            <?php if($alert_msg): ?>
                <div class="mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border animate-pulse <?php echo $alert_type == 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'; ?>">
                    <i class="<?php echo $alert_type == 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'; ?> text-lg"></i>
                    <span class="font-bold text-sm"><?php echo $alert_msg; ?></span>
                </div>
            <?php endif; ?>

            <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div class="flex gap-2 overflow-x-auto pb-4 md:pb-0 w-full md:w-auto custom-scrollbar no-scrollbar">
                    <a href="?status=All" class="px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 <?php echo !$status_filter ? 'bg-slate-900 text-white shadow-lg shadow-slate-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'; ?>">All</a>
                    <a href="?status=Pending" class="px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 <?php echo $status_filter == 'Pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200'; ?>">Pending</a>
                    <a href="?status=Confirmed" class="px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 <?php echo $status_filter == 'Confirmed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200'; ?>">Confirmed</a>
                    <a href="?status=Shipped" class="px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 <?php echo $status_filter == 'Shipped' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200'; ?>">Shipped</a>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr class="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th class="p-5">Order ID</th>
                                <th class="p-5">Customer</th>
                                <th class="p-5">Product Info</th>
                                <th class="p-5">Amount</th>
                                <th class="p-5">Status</th>
                                <th class="p-5">Date</th>
                                <th class="p-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if($result->num_rows > 0): ?>
                                <?php while($row = $result->fetch_assoc()): ?>
                                <tr class="hover:bg-slate-50 transition-colors group">
                                    <td class="p-5 font-bold text-slate-700">#<?php echo $row['id']; ?></td>
                                    
                                    <td class="p-5">
                                        <div class="font-bold text-slate-800"><?php echo htmlspecialchars($row['customer_name']); ?></div>
                                        <div class="text-xs text-slate-500 mt-0.5 font-mono"><?php echo htmlspecialchars($row['customer_phone']); ?></div>
                                    </td>
                                    
                                    <td class="p-5">
                                        <div class="font-medium text-slate-800 truncate max-w-[200px]" title="<?php echo htmlspecialchars($row['laptop_name']); ?>">
                                            <?php echo htmlspecialchars($row['laptop_name']); ?>
                                        </div>
                                        <div class="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                            <span class="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono">Qty: <?php echo $row['quantity']; ?></span>
                                            <span class="uppercase font-bold text-[10px] text-slate-400 tracking-wide"><?php echo $row['mode']; ?></span>
                                        </div>
                                    </td>
                                    
                                    <td class="p-5 font-bold text-slate-800">
                                        ₹<?php echo number_format($row['price_per_unit'] * $row['quantity']); ?>
                                    </td>
                                    
                                    <td class="p-5">
                                        <?php 
                                            $st = $row['status'];
                                            $badge = "bg-slate-100 text-slate-600 border-slate-200";
                                            $icon = "fa-circle";
                                            
                                            if($st == 'Pending') { $badge = "bg-orange-50 text-orange-600 border-orange-200"; $icon="fa-clock"; }
                                            elseif($st == 'Confirmed') { $badge = "bg-emerald-50 text-emerald-600 border-emerald-200"; $icon="fa-check"; }
                                            elseif($st == 'Shipped') { $badge = "bg-blue-50 text-blue-600 border-blue-200"; $icon="fa-truck-fast"; }
                                            elseif($st == 'Delivered') { $badge = "bg-green-50 text-green-700 border-green-200"; $icon="fa-box-open"; }
                                            elseif($st == 'Canceled') { $badge = "bg-red-50 text-red-600 border-red-200"; $icon="fa-xmark"; }
                                        ?>
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border <?php echo $badge; ?>">
                                            <i class="fa-solid <?php echo $icon; ?>"></i> <?php echo $st; ?>
                                        </span>
                                    </td>
                                    
                                    <td class="p-5 text-sm text-slate-500">
                                        <?php echo date('M d, Y', strtotime($row['created_at'])); ?>
                                    </td>
                                    
                                    <td class="p-5 text-center">
                                        <button onclick='openModal(<?php echo json_encode($row); ?>)' class="bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-500 w-9 h-9 rounded-xl flex items-center justify-center transition shadow-sm mx-auto active:scale-95">
                                            <i class="fa-regular fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="7" class="p-12 text-center text-slate-400">
                                        <i class="fa-solid fa-box-open text-3xl mb-3 opacity-50"></i>
                                        <p class="text-sm font-medium">No orders found.</p>
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </main>

    <div id="statusModal" class="fixed inset-0 z-50 hidden items-center justify-center px-4" style="z-index: 9999;">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onclick="closeModal()"></div>
        
        <div class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl modal-enter overflow-hidden flex flex-col max-h-[90vh]">
            
            <div class="bg-white border-b border-slate-100 p-5 flex justify-between items-center shrink-0 sticky top-0 z-10">
                <div>
                    <h3 class="font-bold text-xl text-slate-900 tracking-tight">Order Details</h3>
                    <p class="text-xs text-slate-400 font-mono mt-0.5">ID: #<span id="displayOrderId"></span></p>
                </div>
                <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition active:scale-90"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            
            <div class="overflow-y-auto custom-scrollbar p-5 space-y-6">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-4">
                        <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-slate-800 text-sm mb-1" id="displayCustomer"></h4>
                            <div class="flex flex-wrap gap-2 mb-2">
                                <a id="linkPhone" href="#" class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 transition truncate"><i class="fa-solid fa-phone mr-1"></i> <span id="displayPhone"></span></a>
                                <a id="linkEmail" href="#" class="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 hover:text-slate-700 transition truncate"><i class="fa-solid fa-envelope mr-1"></i> <span id="displayEmail"></span></a>
                            </div>
                            <div class="bg-white p-2 rounded-lg border border-slate-200/60">
                                <p class="text-xs text-slate-500 leading-relaxed flex gap-2">
                                    <i class="fa-solid fa-location-dot mt-0.5 text-slate-400"></i>
                                    <span id="displayAddress"></span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                        <div>
                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Item Purchased</h4>
                            <p class="text-sm font-bold text-slate-800 mb-1" id="displayProduct"></p>
                            <div class="flex gap-2">
                                <span class="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 uppercase" id="displayMode"></span>
                                <span class="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 uppercase" id="displayType"></span>
                            </div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                            <span class="text-xs text-slate-500 font-medium">Total Amount</span>
                            <span class="text-lg font-black text-slate-900">₹<span id="displayAmount"></span></span>
                        </div>
                    </div>
                </div>

                <form method="POST" class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <input type="hidden" name="booking_id" id="modalBookingId">
                    <input type="hidden" name="update_status_btn" value="1">

                    <h4 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-sliders text-blue-600"></i> Update Order Status
                    </h4>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1.5 ml-1">New Status</label>
                            <div class="relative">
                                <select name="status" id="modalStatus" onchange="toggleFields(this.value)" class="w-full pl-4 pr-8 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none transition cursor-pointer hover:bg-slate-100">
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Canceled">Canceled</option>
                                </select>
                                <i class="fa-solid fa-chevron-down absolute right-4 top-4 text-xs text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>

                        <div class="flex items-end">
                            <button type="submit" class="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                                <span>Update & Notify</span> <i class="fa-solid fa-paper-plane text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <div id="trackingFields" class="hidden mt-5 pt-5 border-t border-dashed border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in bg-blue-50/50 -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl">
                        <div class="md:col-span-2 text-[11px] text-blue-600 bg-blue-50 p-2.5 rounded-lg flex gap-2 items-center mb-1 border border-blue-100">
                            <i class="fa-solid fa-circle-info text-blue-500"></i>
                            <span>Tracking details will be automatically emailed to the customer.</span>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Courier Name</label>
                            <input type="text" name="courier_name" id="courierName" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium" placeholder="e.g. BlueDart">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Tracking Number</label>
                            <input type="text" name="tracking_id" id="trackingId" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium" placeholder="e.g. WB123456789">
                        </div>
                    </div>
                </form>

            </div>
        </div>
    </div>

    <script>
        // Sidebar Logic
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if(sidebar && overlay) {
                sidebar.classList.toggle('-translate-x-full');
                overlay.classList.toggle('hidden');
            }
        }

        // Modal Logic
        const modal = document.getElementById('statusModal');
        const trackingFields = document.getElementById('trackingFields');

        function openModal(data) {
            // Populate IDs & Text
            document.getElementById('modalBookingId').value = data.id;
            document.getElementById('displayOrderId').innerText = data.id;
            
            // Customer Info
            document.getElementById('displayCustomer').innerText = data.customer_name;
            document.getElementById('displayEmail').innerText = data.customer_email || 'N/A';
            document.getElementById('displayPhone').innerText = data.customer_phone;
            document.getElementById('displayAddress').innerText = data.address || 'No address provided.';
            
            // Set Links
            document.getElementById('linkPhone').href = "tel:" + data.customer_phone;
            document.getElementById('linkEmail').href = "mailto:" + data.customer_email;

            // Product Info
            document.getElementById('displayProduct').innerText = data.laptop_name + ' (Qty: ' + data.quantity + ')';
            document.getElementById('displayMode').innerText = data.mode;
            document.getElementById('displayType').innerText = data.purchase_type || 'Individual';

            // Calculate Amount
            const total = (parseFloat(data.price_per_unit) * parseInt(data.quantity)).toLocaleString('en-IN');
            document.getElementById('displayAmount').innerText = total;

            // Set Form Values
            document.getElementById('modalStatus').value = data.status;
            document.getElementById('courierName').value = data.courier_name || '';
            document.getElementById('trackingId').value = data.tracking_id || '';

            toggleFields(data.status);
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeModal() { 
            modal.classList.add('hidden'); 
            modal.classList.remove('flex');
        }

        function toggleFields(status) {
            if(status === 'Shipped') {
                trackingFields.classList.remove('hidden');
                document.getElementById('courierName').required = true;
                document.getElementById('trackingId').required = true;
            } else {
                trackingFields.classList.add('hidden');
                document.getElementById('courierName').required = false;
                document.getElementById('trackingId').required = false;
            }
        }

        // Close on Outside Click
        window.onclick = function(e) { if(e.target == modal) { closeModal(); } }
    </script>

</body>
</html>
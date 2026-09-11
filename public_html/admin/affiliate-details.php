<?php
session_start();
// 1. Auth Check
if(!isset($_SESSION['admin_logged_in'])) { 
    header('Location: login.php'); 
    exit; 
}

require_once '../config/database.php';

// 2. Validate ID
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// 3. Handle Withdrawal Actions (Approve/Reject)
if($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['request_id'])) {
    $req_id = intval($_POST['request_id']);
    $action = $_POST['action']; // 'approved' or 'rejected'
    
    // Security: Verify request belongs to this user
    $check = $conn->query("SELECT id FROM withdrawal_requests WHERE id=$req_id AND user_id=$id");
    
    if($check->num_rows > 0) {
        if($action == 'approved') {
            $stmt = $conn->prepare("UPDATE withdrawal_requests SET status='approved', processed_at=NOW() WHERE id=?");
            $stmt->bind_param("i", $req_id);
            $stmt->execute();
            $msg_type = 'success';
            $msg_text = 'Request marked as Approved.';
        } elseif($action == 'rejected') {
            $stmt = $conn->prepare("UPDATE withdrawal_requests SET status='rejected', processed_at=NOW() WHERE id=?");
            $stmt->bind_param("i", $req_id);
            $stmt->execute();
            $msg_type = 'error';
            $msg_text = 'Request rejected.';
        }
    }
}

// 4. Fetch User Data
$stmt_u = $conn->prepare("SELECT * FROM users WHERE id=?");
$stmt_u->bind_param("i", $id);
$stmt_u->execute();
$user = $stmt_u->get_result()->fetch_assoc();

if(!$user) { header('Location: affiliates.php'); exit; }

// 5. Fetch Payment Details (Bank/UPI/QR)
$stmt_pay = $conn->prepare("SELECT * FROM affiliate_payment_details WHERE user_id=?");
$stmt_pay->bind_param("i", $id);
$stmt_pay->execute();
$payment_details = $stmt_pay->get_result()->fetch_assoc();

// 6. Calculate Wallet Balance (Live)
$res_earn = $conn->query("SELECT COALESCE(SUM(amount), 0) FROM affiliate_earnings WHERE affiliate_id=$id");
$total_earned = $res_earn->fetch_row()[0];

$res_with = $conn->query("SELECT 
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as paid,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
    FROM withdrawal_requests WHERE user_id=$id");
$w_stats = $res_with->fetch_assoc();

$available_balance = $total_earned - ($w_stats['paid'] + $w_stats['pending']);

// 7. Fetch Withdrawals (All, ordered by date)
$withdrawals = $conn->query("SELECT * FROM withdrawal_requests WHERE user_id=$id ORDER BY requested_at DESC");

// 8. Pagination Logic for Commission History
$limit = 10;
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if($page < 1) $page = 1;
$offset = ($page - 1) * $limit;

// Count Total Items
$count_res = $conn->query("SELECT COUNT(id) FROM affiliate_earnings WHERE affiliate_id=$id");
$total_items = $count_res->fetch_row()[0];
$total_pages = ceil($total_items / $limit);

// Fetch Page Items
$earnings = $conn->query("SELECT ae.*, b.laptop_name 
                          FROM affiliate_earnings ae 
                          LEFT JOIN bookings b ON ae.booking_id = b.id 
                          WHERE ae.affiliate_id=$id 
                          ORDER BY ae.created_at DESC 
                          LIMIT $limit OFFSET $offset");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($user['fullname']) ?> | Affiliate Profile</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style> 
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; } 
        .status-badge { @apply px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider; }
        
        /* Smooth scrolling for the whole page */
        html { scroll-behavior: smooth; }
    </style>
</head>
<body class="antialiased text-slate-800 bg-slate-50">

    <?php include 'includes/sidebar.php'; ?>

    <main class="lg:ml-64 min-h-screen transition-all duration-300">
        
        <header class="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-4">
                <a href="affiliates.php" class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition">
                    <i class="fa-solid fa-arrow-left"></i>
                </a>
                <div>
                    <h1 class="text-lg md:text-xl font-bold text-slate-900 truncate max-w-[200px] md:max-w-none"><?= htmlspecialchars($user['fullname']) ?></h1>
                </div>
            </div>
        </header>

        <div class="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                    
                    <div class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl md:text-4xl font-bold text-slate-400 shrink-0 border-4 border-white shadow-lg z-10">
                        <?= strtoupper(substr($user['fullname'], 0, 1)) ?>
                    </div>
                    
                    <div class="text-center sm:text-left z-10 flex-1">
                        <h2 class="text-xl md:text-2xl font-bold text-slate-900"><?= htmlspecialchars($user['fullname']) ?></h2>
                        <div class="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-sm text-slate-500 mt-1">
                            <span><i class="fa-regular fa-envelope mr-1"></i> <?= htmlspecialchars($user['email']) ?></span>
                            <span class="hidden sm:inline">•</span>
                            <span><i class="fa-solid fa-phone mr-1"></i> <?= htmlspecialchars($user['phone']) ?></span>
                        </div>
                        
                        <div class="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                            <div class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-blue-100 flex items-center gap-2">
                                <i class="fa-solid fa-tag"></i> <span class="hidden sm:inline">Code:</span> <?= htmlspecialchars($user['referral_code']) ?>
                            </div>
                            <div class="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-100 flex items-center gap-2">
                                <i class="fa-solid fa-wallet"></i> Bal: ₹<?= number_format($available_balance) ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                    <div class="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
                    <div>
                        <h3 class="text-lg font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-building-columns text-blue-400"></i> Banking Info</h3>
                        <?php if($payment_details): ?>
                            <div class="space-y-3 text-sm text-slate-300">
                                <?php if(!empty($payment_details['bank_name'])): ?>
                                    <div class="flex justify-between border-b border-white/10 pb-1">
                                        <span>Bank</span>
                                        <span class="font-bold text-white text-right"><?= htmlspecialchars($payment_details['bank_name']) ?></span>
                                    </div>
                                    <div class="flex justify-between border-b border-white/10 pb-1">
                                        <span>A/C No</span>
                                        <span class="font-bold text-white tracking-wider"><?= htmlspecialchars($payment_details['account_number']) ?></span>
                                    </div>
                                    <div class="flex justify-between border-b border-white/10 pb-1">
                                        <span>IFSC</span>
                                        <span class="font-bold text-white"><?= htmlspecialchars($payment_details['ifsc_code']) ?></span>
                                    </div>
                                <?php endif; ?>
                                
                                <?php if(!empty($payment_details['upi_id'])): ?>
                                    <div class="flex justify-between items-center pt-1">
                                        <span>UPI</span>
                                        <span class="font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded"><?= htmlspecialchars($payment_details['upi_id']) ?></span>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php else: ?>
                            <div class="h-full flex flex-col items-center justify-center text-slate-500 my-4">
                                <i class="fa-solid fa-ban text-3xl mb-2"></i>
                                <p class="text-sm">No payment details linked.</p>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                    <?php if(!empty($payment_details['qr_code_image'])): ?>
                        <button onclick="openQrModal('../uploads/qr_codes/<?= $payment_details['qr_code_image'] ?>')" class="mt-4 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition border border-white/10 flex items-center justify-center gap-2">
                            <i class="fa-solid fa-qrcode"></i> View QR Code
                        </button>
                    <?php endif; ?>
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div class="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <i class="fa-solid fa-money-bill-transfer text-orange-500"></i> Withdrawal Requests
                    </h3>
                </div>
                
                <div class="overflow-x-auto w-full">
                    <table class="w-full text-left text-sm whitespace-nowrap">
                        <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th class="px-5 py-4">Requested Date</th>
                                <th class="px-5 py-4">Amount</th>
                                <th class="px-5 py-4">Method Snapshot</th>
                                <th class="px-5 py-4">Status</th>
                                <th class="px-5 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if($withdrawals->num_rows > 0): ?>
                                <?php while($w = $withdrawals->fetch_assoc()): ?>
                                <tr class="hover:bg-slate-50 transition">
                                    <td class="px-5 py-4 text-slate-500">
                                        <?= date('d M Y, h:i A', strtotime($w['requested_at'])); ?>
                                    </td>
                                    <td class="px-5 py-4 font-bold text-slate-900 text-base">₹<?= number_format($w['amount']); ?></td>
                                    <td class="px-5 py-4 text-xs text-slate-400 max-w-[200px] truncate" title="<?= htmlspecialchars($w['payment_method_snapshot'] ?? '') ?>">
                                        <?= htmlspecialchars($w['payment_method_snapshot'] ?? 'N/A') ?>
                                    </td>
                                    <td class="px-5 py-4">
                                        <?php if($w['status'] == 'pending'): ?>
                                            <span class="status-badge bg-orange-100 text-orange-700">Pending</span>
                                        <?php elseif($w['status'] == 'approved'): ?>
                                            <span class="status-badge bg-emerald-100 text-emerald-700">Paid</span>
                                        <?php else: ?>
                                            <span class="status-badge bg-red-100 text-red-700">Rejected</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="px-5 py-4 text-right">
                                        <?php if($w['status'] == 'pending'): ?>
                                        <form method="POST" class="inline-flex gap-2" onsubmit="return confirm('Are you sure you want to perform this action?');">
                                            <input type="hidden" name="request_id" value="<?= $w['id']; ?>">
                                            <button name="action" value="approved" title="Approve & Pay" class="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition shadow-sm border border-emerald-200">
                                                <i class="fa-solid fa-check"></i>
                                            </button>
                                            <button name="action" value="rejected" title="Reject" class="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition shadow-sm border border-red-200">
                                                <i class="fa-solid fa-xmark"></i>
                                            </button>
                                        </form>
                                        <?php else: ?>
                                            <span class="text-xs text-slate-400 italic">
                                                Processed on <br> <?= date('d M', strtotime($w['processed_at'])) ?>
                                            </span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="5" class="px-5 py-8 text-center text-slate-400 text-sm">No withdrawal requests found.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
                <div class="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <i class="fa-solid fa-list-check text-blue-500"></i> Commission History
                    </h3>
                    <span class="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">Total: <?= $total_items ?></span>
                </div>
                
                <div class="overflow-x-auto w-full">
                    <table class="w-full text-left text-sm whitespace-nowrap">
                        <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th class="px-5 py-4">Date</th>
                                <th class="px-5 py-4">Product / Source</th>
                                <th class="px-5 py-4 text-right">Commission</th>
                                <th class="px-5 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if($earnings->num_rows > 0): ?>
                                <?php while($e = $earnings->fetch_assoc()): ?>
                                <tr class="hover:bg-slate-50 transition">
                                    <td class="px-5 py-4 text-slate-500">
                                        <div class="font-medium text-slate-700"><?= date('d M Y', strtotime($e['created_at'])); ?></div>
                                        <div class="text-xs text-slate-400"><?= date('h:i A', strtotime($e['created_at'])); ?></div>
                                    </td>
                                    <td class="px-5 py-4">
                                        <span class="font-medium text-slate-700 block"><?= htmlspecialchars($e['laptop_name'] ?? 'System Bonus') ?></span>
                                        <span class="text-xs text-slate-400">Order ID: #<?= htmlspecialchars($e['booking_id']) ?></span>
                                    </td>
                                    <td class="px-5 py-4 text-right font-bold text-emerald-600 text-base">
                                        +₹<?= number_format($e['amount']); ?>
                                    </td>
                                    <td class="px-5 py-4 text-right">
                                        <span class="status-badge <?= $e['status']=='paid'?'bg-emerald-50 text-emerald-600 border border-emerald-100':'bg-orange-50 text-orange-600 border border-orange-100'; ?>">
                                            <?= $e['status']; ?>
                                        </span>
                                    </td>
                                </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr><td colspan="4" class="px-5 py-8 text-center text-slate-400 text-sm">No earnings history yet.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>

                <?php if($total_pages > 1): ?>
                <div class="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span class="text-xs text-slate-500 font-medium">Showing page <?= $page ?> of <?= $total_pages ?></span>
                    
                    <div class="flex items-center gap-2">
                        <a href="?id=<?= $id ?>&page=<?= max(1, $page - 1) ?>" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 transition shadow-sm <?= ($page <= 1) ? 'opacity-50 pointer-events-none' : '' ?>">
                            <i class="fa-solid fa-chevron-left text-xs"></i>
                        </a>
                        
                        <div class="flex gap-1">
                        <?php for($i = 1; $i <= $total_pages; $i++): ?>
                            <?php if ($i == 1 || $i == $total_pages || ($i >= $page - 1 && $i <= $page + 1)): ?>
                                <a href="?id=<?= $id ?>&page=<?= $i ?>" class="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-sm <?= ($i == $page) ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' ?>">
                                    <?= $i ?>
                                </a>
                            <?php elseif ($i == 2 || $i == $total_pages - 1): ?>
                                <span class="w-9 h-9 flex items-center justify-center text-slate-400 text-xs font-bold">...</span>
                            <?php endif; ?>
                        <?php endfor; ?>
                        </div>

                        <a href="?id=<?= $id ?>&page=<?= min($total_pages, $page + 1) ?>" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600 transition shadow-sm <?= ($page >= $total_pages) ? 'opacity-50 pointer-events-none' : '' ?>">
                            <i class="fa-solid fa-chevron-right text-xs"></i>
                        </a>
                    </div>
                </div>
                <?php endif; ?>
            </div>

        </div>
    </main>

    <div id="qrModal" class="fixed inset-0 z-50 hidden flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onclick="closeQrModal()"></div>
        <div class="relative bg-white p-4 rounded-2xl shadow-2xl max-w-sm w-full mx-auto transform transition-all scale-100">
            <button onclick="closeQrModal()" class="absolute top-2 right-2 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200"><i class="fa-solid fa-times"></i></button>
            <h3 class="text-center font-bold text-slate-800 mb-4">Payment QR Code</h3>
            <div class="bg-slate-100 p-2 rounded-xl border border-slate-200">
                <img id="qrImageFull" src="" class="w-full h-auto rounded-lg object-contain bg-white">
            </div>
            <div class="mt-4 text-center">
                <a id="qrDownloadLink" href="" download class="text-blue-600 font-bold text-sm hover:underline"><i class="fa-solid fa-download"></i> Download Image</a>
            </div>
        </div>
    </div>

    <?php if(isset($msg_type)): ?>
    <script>
        Swal.fire({
            icon: '<?= $msg_type ?>',
            title: '<?= $msg_type == 'success' ? 'Success!' : 'Error!' ?>',
            text: '<?= $msg_text ?>',
            timer: 2000,
            showConfirmButton: false
        });
        if ( window.history.replaceState ) {
            window.history.replaceState( null, null, window.location.href );
        }
    </script>
    <?php endif; ?>

    <script>
        function openQrModal(src) {
            document.getElementById('qrImageFull').src = src;
            document.getElementById('qrDownloadLink').href = src;
            document.getElementById('qrModal').classList.remove('hidden');
        }
        function closeQrModal() {
            document.getElementById('qrModal').classList.add('hidden');
        }
    </script>
</body>
</html>
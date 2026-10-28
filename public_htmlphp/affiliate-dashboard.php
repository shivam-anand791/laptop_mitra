<?php
// 1. Setup & Session
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set Timezone
date_default_timezone_set('Asia/Kolkata');

// 2. Auth Check
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

require_once 'config/database.php';
$user_id = $_SESSION['user_id'];

// Helper to create directory if not exists
$upload_dir = 'uploads/qr_codes/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// 3. Handle Withdrawal Request & Profile Update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['withdraw_amount'])) {
    $amount = floatval($_POST['withdraw_amount']);
    $current_balance = floatval($_POST['max_balance']);
    
    // Bank Details
    $bank_name = htmlspecialchars($_POST['bank_name'] ?? '');
    $acc_holder = htmlspecialchars($_POST['account_holder_name'] ?? '');
    $acc_num = htmlspecialchars($_POST['account_number'] ?? '');
    $ifsc = htmlspecialchars($_POST['ifsc_code'] ?? '');
    
    // UPI Details
    $upi_id = htmlspecialchars($_POST['upi_id'] ?? '');
    
    // QR Code Upload Logic
    $qr_image_path = $_POST['existing_qr'] ?? NULL; // Keep existing if not updated
    
    if (isset($_FILES['qr_code_image']) && $_FILES['qr_code_image']['error'] === 0) {
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        $filename = $_FILES['qr_code_image']['name'];
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (in_array($ext, $allowed)) {
            $new_filename = 'qr_' . $user_id . '_' . time() . '.' . $ext;
            $dest = $upload_dir . $new_filename;
            if (move_uploaded_file($_FILES['qr_code_image']['tmp_name'], $dest)) {
                $qr_image_path = $new_filename;
            }
        }
    }

    if ($amount > 0 && $amount <= $current_balance) {
        $conn->begin_transaction();
        try {
            // A. Save/Update Payment Details
            $stmt_pay = $conn->prepare("INSERT INTO affiliate_payment_details 
                (user_id, bank_name, account_holder_name, account_number, ifsc_code, upi_id, qr_code_image) 
                VALUES (?, ?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                bank_name=VALUES(bank_name), 
                account_holder_name=VALUES(account_holder_name), 
                account_number=VALUES(account_number), 
                ifsc_code=VALUES(ifsc_code), 
                upi_id=VALUES(upi_id), 
                qr_code_image=VALUES(qr_code_image)");
            
            $stmt_pay->bind_param("issssss", $user_id, $bank_name, $acc_holder, $acc_num, $ifsc, $upi_id, $qr_image_path);
            $stmt_pay->execute();

            // B. Create Withdrawal Request
            // Create a snapshot string of payment details for admin reference
            $snapshot = "Bank: $bank_name, Acc: $acc_num, IFSC: $ifsc | UPI: $upi_id";
            
            $stmt_req = $conn->prepare("INSERT INTO withdrawal_requests (user_id, amount, status, payment_method_snapshot) VALUES (?, ?, 'pending', ?)");
            $stmt_req->bind_param("ids", $user_id, $amount, $snapshot);
            $stmt_req->execute();
            
            $conn->commit();
            header("Location: affiliate-dashboard.php?msg=success");
            exit;
        } catch (Exception $e) {
            $conn->rollback();
            $error = "Transaction failed: " . $e->getMessage();
        }
    }
}

// 4. Fetch User Data
$stmt = $conn->prepare("SELECT referral_code, fullname, email, phone FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$user_data = $stmt->get_result()->fetch_assoc();
$ref_code = !empty($user_data['referral_code']) ? $user_data['referral_code'] : 'Generating...';
$user_name = $user_data['fullname'];

// 5. Fetch Saved Payment Details
$stmt_pd = $conn->prepare("SELECT * FROM affiliate_payment_details WHERE user_id = ?");
$stmt_pd->bind_param("i", $user_id);
$stmt_pd->execute();
$pay_details = $stmt_pd->get_result()->fetch_assoc();

// 6. Calculate Financials
$stmt_e = $conn->prepare("SELECT COALESCE(SUM(amount), 0) FROM affiliate_earnings WHERE affiliate_id = ?");
$stmt_e->bind_param("i", $user_id);
$stmt_e->execute();
$lifetime_earnings = $stmt_e->get_result()->fetch_row()[0];

$stmt_w = $conn->prepare("SELECT 
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as paid,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
    FROM withdrawal_requests WHERE user_id = ?");
$stmt_w->bind_param("i", $user_id);
$stmt_w->execute();
$w_stats = $stmt_w->get_result()->fetch_assoc();

$total_paid = $w_stats['paid'];
$pending_request = $w_stats['pending'];
$available_balance = $lifetime_earnings - ($total_paid + $pending_request);
if ($available_balance < 0) $available_balance = 0;

$stmt_count = $conn->prepare("SELECT COUNT(id) FROM affiliate_earnings WHERE affiliate_id = ?");
$stmt_count->bind_param("i", $user_id);
$stmt_count->execute();
$total_sales_count = $stmt_count->get_result()->fetch_row()[0];

// 7. Pagination Logic
$limit = 10;
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$offset = ($page - 1) * $limit;
$total_pages = ceil($total_sales_count / $limit);

// 8. Fetch History
$history_sql = "SELECT ae.*, 
                       u.fullname as buyer_name, u.email as buyer_email, u.phone as buyer_phone,
                       b.laptop_name, b.order_id, b.quantity, b.price_per_unit, b.status as order_status
                FROM affiliate_earnings ae
                JOIN users u ON ae.buyer_id = u.id
                JOIN bookings b ON ae.booking_id = b.id
                WHERE ae.affiliate_id = ? 
                ORDER BY ae.created_at DESC 
                LIMIT ? OFFSET ?";
$stmt_hist = $conn->prepare($history_sql);
$stmt_hist->bind_param("iii", $user_id, $limit, $offset);
$stmt_hist->execute();
$history = $stmt_hist->get_result();

require_once 'includes/header.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Partner Dashboard | Laptop Mitra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style> 
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; -webkit-tap-highlight-color: transparent; } 
        .wallet-gradient { background: linear-gradient(135deg, #0f172a 0%, #334155 100%); }
        .card-shadow { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }
        .table-row-hover:hover td { background-color: #f8fafc; }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        html { scroll-behavior: smooth; }
        .modal-content-scroll { max-height: calc(100vh - 120px); overflow-y: auto; }
    </style>
</head>
<body class="pt-24 pb-12 md:pb-12 px-4 md:px-6 lg:px-8">

<div class="max-w-7xl mx-auto w-full">
    
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
            <p class="text-slate-500 font-medium text-sm md:text-base">Welcome back, <?= htmlspecialchars(explode(' ', $user_name)[0]) ?>!</p>
        </div>
        <div class="flex items-center gap-3">
            <a href="store.php" class="bg-white border border-slate-200 text-slate-700 hover:text-blue-600 font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center gap-2 text-sm">
                <i class="fa-solid fa-store"></i> <span class="hidden sm:inline">Visit Store</span>
            </a>
            <!--<div class="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2">-->
            <!--    <i class="fa-regular fa-user-circle"></i> Profile-->
            <!--</div>-->
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        <div class="lg:col-span-1 h-full">
            <div class="wallet-gradient rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
                <div class="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
                
                <div>
                    <div class="flex justify-between items-start mb-6">
                        <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl border border-white/10">
                            <i class="fa-solid fa-wallet"></i>
                        </div>
                        <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">Wallet Balance</span>
                    </div>
                    
                    <h2 class="text-4xl font-black mb-1 tracking-tight">₹<?= number_format($available_balance) ?></h2>
                    <p class="text-slate-400 text-xs font-medium">Available for withdrawal</p>
                    
                    <div class="mt-6 space-y-3">
                        <div class="flex justify-between text-sm text-slate-300 border-b border-slate-600/50 pb-2">
                            <span>Lifetime Earnings</span>
                            <span class="font-bold text-white">₹<?= number_format($lifetime_earnings) ?></span>
                        </div>
                        <div class="flex justify-between text-sm text-slate-300">
                            <span>Pending Payout</span>
                            <span class="font-bold text-orange-400">₹<?= number_format($pending_request) ?></span>
                        </div>
                    </div>
                </div>

                <button onclick="openWithdrawModal()" class="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" <?= ($available_balance < 500) ? 'disabled' : '' ?>>
                    <i class="fa-solid fa-money-bill-transfer"></i> Withdraw Funds
                </button>
            </div>
        </div>

        <div class="lg:col-span-2 flex flex-col gap-6 h-full">
            
            <div class="bg-white rounded-3xl p-6 md:p-8 card-shadow border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div class="text-center md:text-left flex-1">
                    <span class="text-blue-600 font-bold uppercase text-xs tracking-widest mb-2 block">Referral Program</span>
                    <h3 class="text-2xl font-black text-slate-900 mb-2 leading-tight">Share Code & Earn <span class="text-emerald-600">₹500</span></h3>
                    <p class="text-slate-500 text-sm">Friends get discount, you get ₹500 cash per laptop sold.</p>
                </div>
                
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full md:w-auto min-w-[280px]">
                    <div class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center mb-3">
                        <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Your Unique Code</span>
                        <span class="text-2xl font-black text-slate-800 tracking-wider font-mono select-all break-all" id="refCodeText"><?= $ref_code ?></span>
                    </div>
                    <button onclick="copyCode()" class="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 active:bg-slate-700">
                        <i class="fa-regular fa-copy"></i> Copy Code
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 md:gap-6 flex-1">
                <div class="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 card-shadow flex flex-col justify-center items-center text-center gap-3 md:flex-row md:text-left md:justify-start">
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                        <i class="fa-solid fa-cart-shopping"></i>
                    </div>
                    <div>
                        <p class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
                        <h4 class="text-2xl md:text-3xl font-black text-slate-900 leading-none"><?= $total_sales_count ?></h4>
                    </div>
                </div>

                <div class="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 card-shadow flex flex-col justify-center items-center text-center gap-3 md:flex-row md:text-left md:justify-start">
                    <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
                        <i class="fa-solid fa-user-shield"></i>
                    </div>
                    <div>
                        <p class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
                        <h4 class="text-lg md:text-xl font-black text-slate-900 leading-tight">Active</h4>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-3xl card-shadow border border-slate-200 overflow-hidden">
        <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-list-ul text-slate-400"></i> Commission History
            </h3>
        </div>
        
        <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                        <th class="p-5">Date</th>
                        <th class="p-5">Buyer</th>
                        <th class="p-5">Product Info</th>
                        <th class="p-5 text-center">Action</th>
                        <th class="p-5 text-right">Commission</th>
                        <th class="p-5 text-right">Status</th>
                    </tr>
                </thead>
                <tbody class="text-sm divide-y divide-slate-100 bg-white">
                    <?php 
                    if($history && $history->num_rows > 0) {
                        $history->data_seek(0); 
                        while($row = $history->fetch_assoc()): 
                            $modalData = htmlspecialchars(json_encode([
                                'date' => date('d M Y, h:i A', strtotime($row['created_at'])),
                                'buyer_name' => $row['buyer_name'],
                                'buyer_email' => $row['buyer_email'],
                                'buyer_phone' => $row['buyer_phone'],
                                'product' => $row['laptop_name'],
                                'qty' => $row['quantity'],
                                'price' => number_format($row['price_per_unit']),
                                'total_order' => number_format($row['quantity'] * $row['price_per_unit']),
                                'commission' => number_format($row['amount']),
                                'order_id' => $row['order_id'] ?? 'N/A',
                                'status' => ucfirst($row['status'])
                            ]));
                    ?>
                        <tr class="table-row-hover transition-colors">
                            <td class="p-5 text-slate-500">
                                <div class="font-bold text-slate-700"><?= date('d M', strtotime($row['created_at'])) ?></div>
                                <div class="text-xs text-slate-400"><?= date('h:i A', strtotime($row['created_at'])) ?></div>
                            </td>
                            <td class="p-5">
                                <div class="font-bold text-slate-800"><?= htmlspecialchars($row['buyer_name']) ?></div>
                            </td>
                            <td class="p-5 text-slate-600">
                                <div class="font-medium"><?= htmlspecialchars($row['laptop_name']) ?></div>
                                <div class="text-xs text-slate-400">ID: #<?= $row['booking_id'] ?></div>
                            </td>
                            <td class="p-5 text-center">
                                <button onclick='openDetailsModal(<?= $modalData ?>)' class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-center">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                            </td>
                            <td class="p-5 text-right font-bold text-emerald-600 text-base">
                                + ₹<?= number_format($row['amount']) ?>
                            </td>
                            <td class="p-5 text-right">
                                <?php if($row['status'] == 'paid'): ?>
                                    <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase">Paid</span>
                                <?php else: ?>
                                    <span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase">Pending</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endwhile; } else { echo '<tr><td colspan="6" class="p-16 text-center text-slate-400">No transactions found.</td></tr>'; } ?>
                </tbody>
            </table>
        </div>

        <div class="md:hidden">
            <div class="divide-y divide-slate-100">
                <?php 
                if($history && $history->num_rows > 0):
                    $history->data_seek(0);
                    while($row = $history->fetch_assoc()):
                        $modalData = htmlspecialchars(json_encode([
                            'date' => date('d M Y, h:i A', strtotime($row['created_at'])),
                            'buyer_name' => $row['buyer_name'],
                            'buyer_email' => $row['buyer_email'],
                            'buyer_phone' => $row['buyer_phone'],
                            'product' => $row['laptop_name'],
                            'qty' => $row['quantity'],
                            'price' => number_format($row['price_per_unit']),
                            'total_order' => number_format($row['quantity'] * $row['price_per_unit']),
                            'commission' => number_format($row['amount']),
                            'order_id' => $row['order_id'] ?? 'N/A',
                            'status' => ucfirst($row['status'])
                        ]));
                ?>
                    <div class="p-5 bg-white active:bg-slate-50 transition cursor-pointer" onclick='openDetailsModal(<?= $modalData ?>)'>
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-bold text-slate-800"><?= htmlspecialchars($row['buyer_name']) ?></h4>
                                <p class="text-[11px] text-slate-400 mt-0.5"><?= date('d M Y, h:i A', strtotime($row['created_at'])) ?></p>
                            </div>
                            <div class="text-right">
                                <span class="block font-bold text-emerald-600">+ ₹<?= number_format($row['amount']) ?></span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-2 border-t border-dashed border-slate-100 mt-2">
                            <span class="text-xs text-slate-500 truncate max-w-[200px]"><?= htmlspecialchars($row['laptop_name']) ?></span>
                            <?php if($row['status'] == 'paid'): ?>
                                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">Paid</span>
                            <?php else: ?>
                                <span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">Pending</span>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endwhile; else: ?>
                    <div class="p-12 text-center text-slate-400">
                        <i class="fa-solid fa-box-open text-3xl mb-3 opacity-50"></i>
                        <p class="text-sm">No transactions yet.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <?php if($total_pages > 1): ?>
        <div class="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-center">
            <nav class="flex items-center gap-2">
                <?php if($page > 1): ?>
                    <a href="?page=<?= $page - 1 ?>" class="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 font-bold text-sm shadow-sm">Prev</a>
                <?php endif; ?>
                <span class="text-sm font-bold text-slate-500 px-2">Page <?= $page ?> / <?= $total_pages ?></span>
                <?php if($page < $total_pages): ?>
                    <a href="?page=<?= $page + 1 ?>" class="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 font-bold text-sm shadow-sm">Next</a>
                <?php endif; ?>
            </nav>
        </div>
        <?php endif; ?>
    </div>

</div>

<div id="withdrawModal" class="fixed inset-0 z-50 hidden flex items-center justify-center px-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity opacity-0" id="withdrawBackdrop"></div>
    <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl transform scale-95 opacity-0 transition-all duration-300 overflow-hidden mx-auto flex flex-col max-h-[90vh]" id="withdrawContent">
        
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
                <h3 class="text-xl font-bold text-slate-900">Withdraw Funds</h3>
                <p class="text-xs text-slate-500">Fill in details to receive payment</p>
            </div>
            <button onclick="closeWithdrawModal()" class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-300 transition"><i class="fa-solid fa-times"></i></button>
        </div>
        
        <form method="POST" action="" enctype="multipart/form-data" class="flex-1 overflow-hidden flex flex-col">
            <div class="p-6 modal-content-scroll flex-1">
                <input type="hidden" name="max_balance" value="<?= $available_balance ?>">
                
                <div class="bg-blue-50 rounded-2xl p-5 mb-6 text-center border border-blue-100">
                    <p class="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Available Balance</p>
                    <p class="text-3xl font-black text-blue-900">₹<?= number_format($available_balance) ?></p>
                </div>

                <div class="mb-6">
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-2 ml-1">Withdrawal Amount <span class="text-red-500">*</span></label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                        <input type="number" name="withdraw_amount" id="withdrawInput" class="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-200 font-bold text-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" placeholder="0" min="500" max="<?= $available_balance ?>" required>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-2 ml-1">Minimum: ₹500</p>
                </div>

                <div class="h-px bg-slate-100 my-4"></div>

                <h4 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-building-columns text-blue-600"></i> Payment Details
                </h4>

                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Bank Name</label>
                            <input type="text" name="bank_name" value="<?= htmlspecialchars($pay_details['bank_name'] ?? '') ?>" class="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. HDFC Bank">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Account Holder Name</label>
                            <input type="text" name="account_holder_name" value="<?= htmlspecialchars($pay_details['account_holder_name'] ?? '') ?>" class="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500" placeholder="Name as per bank">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Account Number</label>
                            <input type="text" name="account_number" value="<?= htmlspecialchars($pay_details['account_number'] ?? '') ?>" class="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500" placeholder="XXXXXXXXXX">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">IFSC Code</label>
                            <input type="text" name="ifsc_code" value="<?= htmlspecialchars($pay_details['ifsc_code'] ?? '') ?>" class="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500" placeholder="HDFC0001234">
                        </div>
                    </div>

                    <div class="relative flex py-2 items-center">
                        <div class="flex-grow border-t border-slate-200"></div>
                        <span class="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">OR / AND</span>
                        <div class="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">UPI ID (GooglePay / PhonePe)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i class="fa-solid fa-mobile-screen"></i></span>
                                <input type="text" name="upi_id" value="<?= htmlspecialchars($pay_details['upi_id'] ?? '') ?>" class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500" placeholder="username@oksbi">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase mb-1">Upload QR Code (Screenshot)</label>
                            <div class="flex items-center gap-4">
                                <?php if(!empty($pay_details['qr_code_image'])): ?>
                                    <div class="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden shrink-0 relative group">
                                        <img src="uploads/qr_codes/<?= htmlspecialchars($pay_details['qr_code_image']) ?>" class="w-full h-full object-cover">
                                        <input type="hidden" name="existing_qr" value="<?= htmlspecialchars($pay_details['qr_code_image']) ?>">
                                    </div>
                                <?php endif; ?>
                                <input type="file" name="qr_code_image" accept="image/*" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                            </div>
                            <p class="text-[10px] text-slate-400 mt-1">Upload your Payment QR for faster processing. Max 2MB.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                    <span>Confirm Request</span> <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </form>
    </div>
</div>

<div id="detailsModal" class="fixed inset-0 z-50 hidden flex items-center justify-center px-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="closeDetailsModal()"></div>
    <div class="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100 mx-auto max-h-[90vh] flex flex-col">
        <div class="bg-slate-900 p-6 text-white flex justify-between items-start shrink-0">
            <div>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction</p>
                <h3 class="text-2xl font-bold flex items-center gap-2">
                    ₹<span id="dtl_comm"></span> <span id="dtl_status_badge" class="text-xs px-2 py-1 rounded bg-white/20"></span>
                </h3>
            </div>
            <button onclick="closeDetailsModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-slate-300 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="p-6 space-y-6 overflow-y-auto">
            <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Buyer Details</h4>
                     <div class="flex justify-between items-center mb-2">
                         <span class="text-sm font-bold text-slate-700" id="dtl_buyer"></span>
                     </div>
                     <div class="text-xs text-slate-500 space-y-1">
                         <p id="dtl_email" class="break-all"></p>
                         <p id="dtl_phone"></p>
                     </div>
                </div>
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Summary</h4>
                     <div class="flex justify-between items-center mb-1">
                         <span class="text-sm text-slate-500">Product</span>
                         <span class="text-sm font-bold text-slate-900 text-right max-w-[150px] truncate" id="dtl_prod"></span>
                     </div>
                     <div class="flex justify-between items-center mb-1">
                         <span class="text-sm text-slate-500">Quantity</span>
                         <span class="text-sm font-bold text-slate-900" id="dtl_qty"></span>
                     </div>
                     <div class="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                         <span class="text-sm text-slate-500">Total Value</span>
                         <span class="text-sm font-bold text-slate-900">₹<span id="dtl_order_val"></span></span>
                     </div>
                </div>
            </div>
            <div class="text-center">
                <p class="text-xs text-slate-400">Processed on <span id="dtl_date" class="font-bold text-slate-500"></span></p>
                <p class="text-xs text-slate-400 mt-1">Order ID: #<span id="dtl_order_id"></span></p>
            </div>
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

<script>
    // Copy Code Logic
    function copyCode() {
        const text = document.getElementById('refCodeText').innerText;
        navigator.clipboard.writeText(text).then(() => {
            if(typeof Toastify === 'function') {
                Toastify({ text: "Code Copied!", duration: 3000, gravity: "bottom", position: "center", style: { background: "#2563eb", borderRadius: "10px", fontSize: "14px" } }).showToast();
            } else { alert("Code Copied!"); }
        });
    }

    // Withdrawal Modal Handlers
    const wModal = document.getElementById('withdrawModal');
    const wBackdrop = document.getElementById('withdrawBackdrop');
    const wContent = document.getElementById('withdrawContent');

    function openWithdrawModal() {
        wModal.classList.remove('hidden');
        setTimeout(() => { 
            wBackdrop.classList.remove('opacity-0'); 
            wContent.classList.remove('scale-95', 'opacity-0'); 
            wContent.classList.add('scale-100', 'opacity-100'); 
        }, 10);
    }
    
    function closeWithdrawModal() {
        wBackdrop.classList.add('opacity-0'); 
        wContent.classList.remove('scale-100', 'opacity-100'); 
        wContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { wModal.classList.add('hidden'); }, 300);
    }

    // Details Modal Logic
    const dModal = document.getElementById('detailsModal');
    
    function openDetailsModal(data) {
        document.getElementById('dtl_date').innerText = data.date;
        document.getElementById('dtl_buyer').innerText = data.buyer_name;
        document.getElementById('dtl_email').innerText = data.buyer_email || 'N/A';
        document.getElementById('dtl_phone').innerText = data.buyer_phone || 'N/A';
        document.getElementById('dtl_prod').innerText = data.product;
        document.getElementById('dtl_qty').innerText = data.qty;
        document.getElementById('dtl_order_val').innerText = data.total_order;
        document.getElementById('dtl_comm').innerText = data.commission;
        document.getElementById('dtl_order_id').innerText = data.order_id;
        
        const statusBadge = document.getElementById('dtl_status_badge');
        statusBadge.innerText = data.status;
        if(data.status === 'Paid') {
            statusBadge.className = 'text-[10px] px-2 py-1 rounded bg-emerald-500 text-white font-bold uppercase tracking-wider ml-2';
        } else {
            statusBadge.className = 'text-[10px] px-2 py-1 rounded bg-orange-500 text-white font-bold uppercase tracking-wider ml-2';
        }

        dModal.classList.remove('hidden');
    }

    function closeDetailsModal() {
        dModal.classList.add('hidden');
    }

    // Validation
    const maxBal = <?= $available_balance ?>;
    const input = document.getElementById('withdrawInput');
    if(input) {
        input.addEventListener('input', function() {
            if(parseFloat(this.value) > maxBal) this.value = maxBal;
        });
    }

    // Alerts
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('msg') === 'success') {
        Swal.fire({ icon: 'success', title: 'Request Sent!', text: 'Your withdrawal request has been submitted.', confirmButtonColor: '#2563eb' });
        window.history.replaceState({}, document.title, window.location.pathname);
    }
</script>

</body>
</html>
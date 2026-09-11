<?php
session_start();
if(!isset($_SESSION['admin_logged_in'])) { header('Location: login.php'); exit; }
require_once '../config/database.php';

// Fetch users who are affiliates (have referral code) + Earnings Stats
$sql = "SELECT u.id, u.fullname, u.email, u.phone, u.referral_code, 
        COALESCE(SUM(ae.amount), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN ae.status='paid' THEN ae.amount ELSE 0 END), 0) as paid_earnings
        FROM users u
        LEFT JOIN affiliate_earnings ae ON u.id = ae.affiliate_id
        WHERE u.referral_code IS NOT NULL AND u.referral_code != ''
        GROUP BY u.id
        ORDER BY total_earnings DESC";
$affiliates = $conn->query($sql);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Affiliates | Laptop Mitra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style> body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; } </style>
</head>
<body class="antialiased text-slate-800">
    <?php include 'includes/sidebar.php'; ?>
    <main class="lg:ml-64 min-h-screen">
        <header class="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 sticky top-0 z-30">
            <button onclick="toggleSidebar()" class="lg:hidden text-slate-500 mr-4"><i class="fa-solid fa-bars text-xl"></i></button>
            <h1 class="text-xl font-bold">Affiliate Partners</h1>
        </header>

        <div class="p-4 lg:p-8 max-w-7xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <?php while($aff = $affiliates->fetch_assoc()): 
                    $pending = $aff['total_earnings'] - $aff['paid_earnings'];
                ?>
                <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            <?php echo substr($aff['fullname'], 0, 1); ?>
                        </div>
                        <span class="bg-slate-100 text-slate-600 text-xs font-mono font-bold px-2 py-1 rounded"><?php echo $aff['referral_code']; ?></span>
                    </div>
                    <h3 class="font-bold text-lg text-slate-800"><?php echo htmlspecialchars($aff['fullname']); ?></h3>
                    <p class="text-sm text-slate-500 mb-4"><?php echo $aff['email']; ?></p>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-100">
                        <div>
                            <p class="text-xs text-slate-400 font-bold uppercase">Total Earned</p>
                            <p class="font-black text-slate-800">₹<?php echo number_format($aff['total_earnings']); ?></p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-slate-400 font-bold uppercase">Pending</p>
                            <p class="font-black text-orange-500">₹<?php echo number_format($pending); ?></p>
                        </div>
                    </div>

                    <a href="affiliate-details.php?id=<?php echo $aff['id']; ?>" class="block w-full text-center bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition">
                        View Details
                    </a>
                </div>
                <?php endwhile; ?>
            </div>
        </div>
    </main>
    <script>function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }</script>
</body>
</html>
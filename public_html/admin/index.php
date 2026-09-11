<?php
session_start();

// 1. Security Check
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

require_once '../config/database.php';

// 2. Fetch Dashboard Statistics
// Total Pending Orders
$pending_query = $conn->query("SELECT COUNT(*) FROM bookings WHERE status = 'Pending'");
$pending_count = $pending_query ? $pending_query->fetch_row()[0] : 0;

// Total Laptop Models
$models_query = $conn->query("SELECT COUNT(*) FROM laptops");
$total_models = $models_query ? $models_query->fetch_row()[0] : 0;

// Total Stock Count
$stock_query = $conn->query("SELECT SUM(stock_quantity) FROM laptops WHERE status = 'active'");
$total_stock = $stock_query ? $stock_query->fetch_row()[0] : 0;

// Total Users
$user_query = $conn->query("SELECT COUNT(*) FROM users");
$total_users = $user_query ? $user_query->fetch_row()[0] : 0;

// 3. Fetch Recent 5 Bookings for the Table
$recent_bookings = $conn->query("
    SELECT id, customer_name, laptop_name, quantity, status, created_at 
    FROM bookings 
    ORDER BY created_at DESC 
    LIMIT 5
");

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | Laptop Mitra Admin</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style> 
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
        /* Smooth Fade In Animation */
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="text-slate-800 antialiased bg-slate-50">

    <?php include 'includes/sidebar.php'; ?>

    <main class="lg:ml-[280px] min-h-screen transition-all duration-300 flex flex-col">
        
        <header class="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <button onclick="toggleSidebar()" class="lg:hidden p-2 text-slate-500 hover:text-slate-700 transition">
                    <i class="fa-solid fa-bars-staggered text-xl"></i>
                </button>
                
                <div>
                    <h1 class="text-xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
                    <p class="text-xs text-slate-500 font-medium hidden sm:block">Welcome back, Admin!</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <a href="add-laptop.php" class="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-slate-200">
                    <i class="fa-solid fa-plus"></i> <span class="hidden md:inline">Add Laptop</span>
                </a>
                <div class="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200">
                    <i class="fa-regular fa-bell"></i>
                </div>
            </div>
        </header>

        <div class="p-4 sm:p-8 space-y-8 fade-in">

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                <a href="bookings.php?status=Pending" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.1)] hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <div class="p-3 bg-orange-100 text-orange-600 rounded-xl">
                                <i class="fa-solid fa-clock text-xl"></i>
                            </div>
                            <?php if($pending_count > 0): ?>
                                <span class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Action Needed</span>
                            <?php endif; ?>
                        </div>
                        <h3 class="text-3xl font-black text-slate-800 mb-1"><?php echo $pending_count; ?></h3>
                        <p class="text-sm font-semibold text-slate-400">Pending Orders</p>
                    </div>
                </a>

                <a href="inventory.php" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <div class="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                <i class="fa-solid fa-boxes-stacked text-xl"></i>
                            </div>
                        </div>
                        <h3 class="text-3xl font-black text-slate-800 mb-1"><?php echo $total_stock; ?></h3>
                        <p class="text-sm font-semibold text-slate-400">Laptops in Stock</p>
                    </div>
                </a>

                <a href="inventory.php" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.1)] hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <div class="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                <i class="fa-solid fa-laptop text-xl"></i>
                            </div>
                        </div>
                        <h3 class="text-3xl font-black text-slate-800 mb-1"><?php echo $total_models; ?></h3>
                        <p class="text-sm font-semibold text-slate-400">Active Models</p>
                    </div>
                </a>

                <a href="users.php" class="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <div class="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                <i class="fa-solid fa-users text-xl"></i>
                            </div>
                        </div>
                        <h3 class="text-3xl font-black text-slate-800 mb-1"><?php echo $total_users; ?></h3>
                        <p class="text-sm font-semibold text-slate-400">Registered Users</p>
                    </div>
                </a>

            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                <div class="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 class="font-bold text-lg text-slate-800">Recent Booking Queries</h3>
                        <a href="bookings.php" class="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">View All <i class="fa-solid fa-arrow-right ml-1"></i></a>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                                <tr>
                                    <th class="px-6 py-4">Customer</th>
                                    <th class="px-6 py-4">Laptop Model</th>
                                    <th class="px-6 py-4 text-center">Status</th>
                                    <th class="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <?php if($recent_bookings && $recent_bookings->num_rows > 0): ?>
                                    <?php while($row = $recent_bookings->fetch_assoc()): ?>
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="px-6 py-4">
                                            <div class="font-bold text-slate-700"><?php echo htmlspecialchars($row['customer_name']); ?></div>
                                            <div class="text-xs text-slate-400 mt-0.5"><?php echo date('d M, h:i A', strtotime($row['created_at'])); ?></div>
                                        </td>
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-2">
                                                <div class="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <i class="fa-solid fa-laptop"></i>
                                                </div>
                                                <span class="font-medium text-slate-600"><?php echo htmlspecialchars($row['laptop_name']); ?></span>
                                                <span class="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">x<?php echo $row['quantity']; ?></span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <?php 
                                                $status = $row['status'];
                                                $badgeColor = match($status) {
                                                    'Pending' => 'bg-orange-50 text-orange-600 border-orange-100',
                                                    'Confirmed' => 'bg-blue-50 text-blue-600 border-blue-100',
                                                    'Shipped' => 'bg-purple-50 text-purple-600 border-purple-100',
                                                    'Delivered' => 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                                    'Canceled' => 'bg-red-50 text-red-600 border-red-100',
                                                    default => 'bg-slate-50 text-slate-600'
                                                };
                                            ?>
                                            <span class="px-2.5 py-1 rounded-full text-xs font-bold border <?php echo $badgeColor; ?>">
                                                <?php echo $status; ?>
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <a href="bookings.php?id=<?php echo $row['id']; ?>" class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition">
                                                <i class="fa-solid fa-eye"></i>
                                            </a>
                                        </td>
                                    </tr>
                                    <?php endwhile; ?>
                                <?php else: ?>
                                    <tr>
                                        <td colspan="4" class="px-6 py-12 text-center text-slate-400">
                                            <i class="fa-solid fa-inbox text-3xl mb-2 opacity-50"></i>
                                            <p>No recent bookings found.</p>
                                        </td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="flex flex-col gap-6">
                    
                    <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                        <h3 class="font-bold text-lg mb-1">Quick Actions</h3>
                        <p class="text-slate-400 text-sm mb-6">Manage your inventory efficiently.</p>
                        
                        <div class="space-y-3">
                            <a href="add-laptop.php" class="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition backdrop-blur-sm border border-white/5 group">
                                <div class="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <i class="fa-solid fa-plus text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <span class="block font-bold text-sm">Add New Laptop</span>
                                    <span class="block text-xs text-slate-400">Update inventory stock</span>
                                </div>
                                <i class="fa-solid fa-chevron-right text-xs text-slate-500"></i>
                            </a>

                            <a href="affiliates.php" class="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition backdrop-blur-sm border border-white/5 group">
                                <div class="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <i class="fa-solid fa-hand-holding-dollar text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <span class="block font-bold text-sm">Manage Affiliates</span>
                                    <span class="block text-xs text-slate-400">Check payouts & commissions</span>
                                </div>
                                <i class="fa-solid fa-chevron-right text-xs text-slate-500"></i>
                            </a>
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 class="font-bold text-slate-800 mb-4">System Status</h3>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Server Load</span>
                                    <span class="text-emerald-600">Optimal</span>
                                </div>
                                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="h-full bg-emerald-500 w-[12%] rounded-full"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Database Storage</span>
                                    <span class="text-blue-600">Healthy</span>
                                </div>
                                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div class="h-full bg-blue-500 w-[45%] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    </main>

    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if(sidebar && overlay) {
                sidebar.classList.toggle('-translate-x-full');
                overlay.classList.toggle('hidden');
            }
        }
    </script>
</body>
</html>
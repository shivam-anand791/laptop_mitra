<?php
session_start();
if(!isset($_SESSION['admin_logged_in'])) { header('Location: login.php'); exit; }
require_once '../config/database.php';
$users = $conn->query("SELECT * FROM users ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Users | Laptop Mitra</title>
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
            <h1 class="text-xl font-bold">User Management</h1>
        </header>

        <div class="p-4 lg:p-8 max-w-7xl mx-auto">
            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                <th class="p-4">Name</th>
                                <th class="p-4">Contact</th>
                                <th class="p-4">Verified</th>
                                <th class="p-4">Joined</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php while($u = $users->fetch_assoc()): ?>
                            <tr class="hover:bg-slate-50">
                                <td class="p-4 font-bold text-slate-700">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs"><i class="fa-solid fa-user"></i></div>
                                        <?php echo htmlspecialchars($u['fullname']); ?>
                                    </div>
                                </td>
                                <td class="p-4 text-sm">
                                    <div class="text-slate-700"><?php echo $u['email']; ?></div>
                                    <div class="text-slate-400 text-xs"><?php echo $u['phone']; ?></div>
                                </td>
                                <td class="p-4">
                                    <?php if($u['is_verified']): ?>
                                        <span class="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold border border-emerald-100">Verified</span>
                                    <?php else: ?>
                                        <span class="text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-bold">Pending</span>
                                    <?php endif; ?>
                                </td>
                                <td class="p-4 text-sm text-slate-500"><?php echo date('d M Y', strtotime($u['created_at'])); ?></td>
                            </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>
    <script>function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }</script>
</body>
</html>
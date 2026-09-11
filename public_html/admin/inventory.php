<?php
session_start();
if(!isset($_SESSION['admin_logged_in'])) { header('Location: login.php'); exit; }
require_once '../config/database.php';
$result = $conn->query("SELECT * FROM laptops ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventory | Laptop Mitra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style> body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; } </style>
</head>
<body class="antialiased text-slate-800">
    <?php include 'includes/sidebar.php'; ?>
    <main class="lg:ml-64 min-h-screen">
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            <button onclick="toggleSidebar()" class="lg:hidden text-slate-500"><i class="fa-solid fa-bars text-xl"></i></button>
            <div class="flex items-center gap-4">
                <h1 class="text-xl font-bold">Inventory</h1>
                <a href="add-laptop.php" class="hidden sm:inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">+ Add Laptop</a>
            </div>
        </header>

        <div class="p-4 lg:p-8 max-w-7xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <a href="add-laptop.php" class="sm:hidden border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-blue-500 hover:text-blue-600 transition">
                    <i class="fa-solid fa-plus text-3xl mb-2"></i>
                    <span class="font-bold">Add New Laptop</span>
                </a>

                <?php while($row = $result->fetch_assoc()): ?>
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition group">
                    <div class="aspect-video bg-slate-100 relative overflow-hidden">
                        <?php if($row['image']): ?>
                            <img src="../uploads/<?php echo $row['image']; ?>" class="w-full h-full object-cover">
                        <?php else: ?>
                            <div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fa-regular fa-image text-3xl"></i></div>
                        <?php endif; ?>
                        <div class="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">
                            Stock: <?php echo $row['stock_quantity']; ?>
                        </div>
                    </div>
                    <div class="p-5">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h3 class="font-bold text-slate-800 text-lg leading-tight"><?php echo $row['brand'] . ' ' . $row['model']; ?></h3>
                                <p class="text-xs text-slate-500 mt-1"><?php echo $row['processor']; ?> / <?php echo $row['ram']; ?></p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                            <a href="edit-laptop.php?id=<?php echo $row['id']; ?>" class="flex-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 py-2 rounded-lg text-sm font-bold text-center transition">Edit</a>
                            <a href="delete-laptop.php?id=<?php echo $row['id']; ?>" onclick="return confirm('Delete?')" class="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition"><i class="fa-solid fa-trash"></i></a>
                        </div>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </div>
    </main>
    <script>function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }</script>
</body>
</html>
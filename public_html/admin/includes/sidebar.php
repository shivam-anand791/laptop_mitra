<?php
$current_page = basename($_SERVER['PHP_SELF']);
?>

<div id="sidebarOverlay" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 hidden lg:hidden transition-opacity duration-300" onclick="toggleSidebar()"></div>

<aside id="sidebar" class="fixed top-0 left-0 z-50 h-screen w-[280px] bg-[#0f172a] text-slate-300 transition-transform duration-300 ease-in-out -translate-x-full lg:translate-x-0 flex flex-col shadow-2xl border-r border-slate-800 font-sans">
    
    <div class="h-24 flex items-center justify-center border-b border-slate-800 bg-[#020617] relative shrink-0">
        
        <div class="bg-white px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.15)] w-48 h-14 flex items-center justify-center transition-transform duration-300 hover:scale-105 border border-slate-700/50 group relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            
            <img src="https://www.laptopmitra.com/assets/logo-laptop-mitra.png" 
                 alt="Laptop Mitra" 
                 class="h-full w-full object-contain">
        </div>

        <button class="absolute top-4 right-4 lg:hidden text-slate-500 hover:text-white transition-colors" onclick="toggleSidebar()">
            <i class="fa-solid fa-xmark text-xl"></i>
        </button>
    </div>

    <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
        
        <a href="index.php" class="flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 group <?php echo $current_page == 'index.php' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800/80 hover:text-white'; ?>">
            <div class="w-6 flex justify-center">
                <i class="fa-solid fa-gauge-high text-lg transition-transform group-hover:scale-110 <?php echo $current_page == 'index.php' ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'; ?>"></i>
            </div>
            Dashboard
        </a>

        <a href="bookings.php" class="flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 group <?php echo $current_page == 'bookings.php' || $current_page == 'all-bookings.php' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800/80 hover:text-white'; ?>">
            <div class="w-6 flex justify-center">
                <i class="fa-solid fa-cart-shopping text-lg transition-transform group-hover:scale-110 <?php echo $current_page == 'bookings.php' || $current_page == 'all-bookings.php' ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'; ?>"></i>
            </div>
            Bookings
        </a>

        <div class="my-4 border-t border-slate-800/60 mx-2"></div>

        <a href="inventory.php" class="flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 group <?php echo ($current_page == 'inventory.php' || $current_page == 'add-laptop.php' || $current_page == 'edit-laptop.php') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800/80 hover:text-white'; ?>">
            <div class="w-6 flex justify-center">
                <i class="fa-solid fa-laptop text-lg transition-transform group-hover:scale-110 <?php echo ($current_page == 'inventory.php' || $current_page == 'add-laptop.php') ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'; ?>"></i>
            </div>
            Laptops Inventory
        </a>

        <div class="my-4 border-t border-slate-800/60 mx-2"></div>

        <a href="users.php" class="flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 group <?php echo $current_page == 'users.php' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800/80 hover:text-white'; ?>">
            <div class="w-6 flex justify-center">
                <i class="fa-solid fa-users text-lg transition-transform group-hover:scale-110 <?php echo $current_page == 'users.php' ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'; ?>"></i>
            </div>
            Users
        </a>

        <a href="affiliates.php" class="flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 group <?php echo ($current_page == 'affiliates.php' || $current_page == 'affiliate-details.php') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800/80 hover:text-white'; ?>">
            <div class="w-6 flex justify-center">
                <i class="fa-solid fa-handshake-simple text-lg transition-transform group-hover:scale-110 <?php echo ($current_page == 'affiliates.php') ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'; ?>"></i>
            </div>
            Affiliates
        </a>

    </nav>

    <div class="p-5 border-t border-slate-800 bg-[#020617] shrink-0">
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors backdrop-blur-md">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-slate-800">
                AD
            </div>
            
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-white truncate">Administrator</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Online</p>
                </div>
            </div>

            <a href="logout.php" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-red-500/20 hover:border hover:border-red-500/50 transition-all group" title="Logout">
                <i class="fa-solid fa-power-off text-xs group-hover:text-red-400"></i>
            </a>
        </div>
    </div>
</aside>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
    
    @keyframes shimmer {
        100% { transform: translateX(100%); }
    }
</style>
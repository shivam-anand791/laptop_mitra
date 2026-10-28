<?php
// search_api.php
require_once 'config/database.php';

$q = isset($_GET['q']) ? trim($_GET['q']) : '';

if (strlen($q) < 2) {
    // Don't search if the user has only typed 1 character
    echo '';
    exit;
}

// Prepare SQL to prevent injection
$stmt = $conn->prepare("SELECT id, model, brand, processor, ram, price_individual_sell, image 
                        FROM laptops 
                        WHERE status='active' 
                        AND (model LIKE ? OR brand LIKE ?) 
                        LIMIT 6");
$searchTerm = "%" . $q . "%";
$stmt->bind_param("ss", $searchTerm, $searchTerm);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $img_path = !empty($row['image']) ? "admin/uploads/" . $row['image'] : "https://via.placeholder.com/100x80?text=No+Img";
        $price = number_format($row['price_individual_sell']);
        
        // Output the Rectangular Compact Tile HTML
        echo '
        <a href="laptop-details.php?id=' . $row['id'] . '" class="flex items-center gap-4 p-3 border-b border-slate-100 hover:bg-blue-50/50 transition-all duration-200 group cursor-pointer">
            <div class="w-16 h-12 shrink-0 bg-white rounded border border-slate-200 flex items-center justify-center p-1">
                <img src="' . $img_path . '" class="h-full w-auto object-contain mix-blend-multiply" alt="' . htmlspecialchars($row['model']) . '">
            </div>
            
            <div class="flex-grow min-w-0">
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">' . htmlspecialchars($row['brand']) . '</div>
                <h4 class="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">' . htmlspecialchars($row['model']) . '</h4>
                <div class="text-[11px] text-slate-500 truncate mt-0.5">
                    ' . htmlspecialchars($row['processor']) . ' <span class="text-slate-300 mx-1">|</span> ' . htmlspecialchars($row['ram']) . '
                </div>
            </div>
            
            <div class="text-right shrink-0">
                <div class="text-sm font-black text-blue-600">₹' . $price . '</div>
                <div class="text-[10px] text-slate-400 mt-1 group-hover:translate-x-1 transition-transform">View <i class="fas fa-arrow-right ml-1"></i></div>
            </div>
        </a>
        ';
    }
    // "View all results" link at the bottom
    echo '
    <a href="store.php?search=' . urlencode($q) . '" class="block text-center py-3 text-xs font-bold text-blue-600 bg-slate-50 hover:bg-blue-600 hover:text-white transition-colors uppercase tracking-widest">
        View all results for "' . htmlspecialchars($q) . '"
    </a>';
} else {
    echo '
    <div class="p-6 text-center">
        <div class="text-slate-300 text-3xl mb-2"><i class="fas fa-search"></i></div>
        <p class="text-sm text-slate-500">No matching laptops found.</p>
    </div>';
}
?>
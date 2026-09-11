<?php
session_start();
require_once 'config/database.php';

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$brand = isset($_GET['brand']) ? $_GET['brand'] : '';
$processor = isset($_GET['processor']) ? $_GET['processor'] : '';
$ram = isset($_GET['ram']) ? $_GET['ram'] : '';
$storage = isset($_GET['storage']) ? $_GET['storage'] : '';
$priceRange = isset($_GET['price_range']) ? $_GET['price_range'] : '';
$mode = isset($_GET['mode']) ? $_GET['mode'] : 'sell'; 
$sort = isset($_GET['sort']) ? $_GET['sort'] : 'featured'; 

$minPrice = 0;
$maxPrice = 999999;
if($priceRange != '' && $priceRange != 'all') {
    list($minPrice, $maxPrice) = explode('-', $priceRange);
    $minPrice = (int)$minPrice;
    $maxPrice = (int)$maxPrice;
}

$conditions = ["status='active'"];
$conditions[] = $mode == 'sell' ? "(price_individual_sell BETWEEN $minPrice AND $maxPrice)" : "(price_individual_lease BETWEEN $minPrice AND $maxPrice)";

if($search != '') {
    $searchEscaped = $conn->real_escape_string($search);
    $conditions[] = "(model LIKE '%$searchEscaped%' OR brand LIKE '%$searchEscaped%' OR processor LIKE '%$searchEscaped%')";
}
if($brand != '') $conditions[] = "brand = '".$conn->real_escape_string($brand)."'";
if($processor != '') $conditions[] = "processor = '".$conn->real_escape_string($processor)."'";
if($ram != '') $conditions[] = "ram = '".$conn->real_escape_string($ram)."'";
if($storage != '') $conditions[] = "storage = '".$conn->real_escape_string($storage)."'";

$orderByClause = "created_at DESC"; 

switch ($sort) {
    case 'price_low':
        $col = ($mode == 'sell') ? 'price_individual_sell' : 'price_individual_lease';
        $orderByClause = "$col ASC";
        break;
    case 'price_high':
        $col = ($mode == 'sell') ? 'price_individual_sell' : 'price_individual_lease';
        $orderByClause = "$col DESC";
        break;
    case 'best_sellers':
        $orderByClause = "sales_count DESC"; 
        break;
    case 'newest':
    case 'featured':
    default:
        $orderByClause = "created_at DESC";
        break;
}

$whereClause = implode(' AND ', $conditions);
$laptops = $conn->query("SELECT * FROM laptops WHERE $whereClause ORDER BY $orderByClause");

$brands = $conn->query("SELECT DISTINCT brand FROM laptops WHERE status='active' ORDER BY brand");
$processors = $conn->query("SELECT DISTINCT processor FROM laptops WHERE status='active' ORDER BY processor");
$ramOptions = $conn->query("SELECT DISTINCT ram FROM laptops WHERE status='active' ORDER BY CAST(SUBSTRING_INDEX(ram, 'GB', 1) AS UNSIGNED)");
$storageOptions = $conn->query("SELECT DISTINCT storage FROM laptops WHERE status='active' ORDER BY CAST(SUBSTRING_INDEX(storage, 'GB', 1) AS UNSIGNED)");

$wishlistItems = [];
if (isset($_SESSION['user_id'])) {
    $uid = $_SESSION['user_id'];
    $w_query = $conn->query("SELECT laptop_id, mode FROM wishlist WHERE user_id = '$uid'");
    if ($w_query) {
        while ($row = $w_query->fetch_assoc()) {
            $wishlistItems[] = $row['laptop_id'] . '-' . $row['mode'];
        }
    }
}

require_once 'includes/header.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <base href="/"> 
    <title>Shop Laptops | Laptop Mitra</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #10b981;
            --danger: #ef4444;
            --text: #002c8c;
            --text-light: #6b7280;
            --border: #e5e7eb;
            --bg: #f9fafb;
            --card: #ffffff;
            --header-height: 80px;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', sans-serif; 
            background: var(--bg); 
            color: #4f46e5; 
            line-height: 1.6;
            padding-top: var(--header-height); 
        }
        
        .content-wrapper { 
            display: flex; 
            max-width: 1400px; 
            width: 100%; 
            margin: 0 auto; 
            padding: 24px; 
            gap: 30px; 
            align-items: flex-start; 
        }
        
        .sidebar { 
            width: 280px; 
            flex-shrink: 0; 
            position: -webkit-sticky; 
            position: sticky; 
            top: calc(var(--header-height) + 24px); 
            height: fit-content; 
            max-height: calc(100vh - var(--header-height) - 40px); 
            overflow-y: auto; 
            background: var(--card); 
            border-radius: 12px; 
            padding: 24px; 
            border: 1px solid var(--border); 
            z-index: 40; 
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar::-webkit-scrollbar { width: 4px; }
        .sidebar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

        .filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--border); }
        .filter-header h2 { font-size: 1.25rem; font-weight: 700; color: var(--text); }
        .reset-link { color: var(--danger); font-size: 0.875rem; font-weight: 600; text-decoration: none; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; }
        .reset-link:hover { background: #fee2e2; }
        
        .mode-toggle { display: flex; background: var(--bg); border-radius: 10px; padding: 4px; margin-bottom: 20px; position: relative; border: 1px solid var(--border); }
        .mode-btn { flex: 1; padding: 10px; text-align: center; font-weight: 600; font-size: 0.9rem; cursor: pointer; border-radius: 8px; transition: all 0.3s; color: var(--text-light); z-index: 2; background: transparent; border: none; }
        .mode-btn.active { color: white; }
        .mode-slider { position: absolute; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px); background: var(--primary); border-radius: 8px; transition: transform 0.3s ease; z-index: 1; }
        .mode-toggle[data-mode="lease"] .mode-slider { transform: translateX(calc(100% + 4px)); }
        
        .filter-group { margin-bottom: 16px; }
        .filter-label { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .filter-input, .filter-select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; font-family: inherit; background: white; transition: all 0.2s; }
        .filter-input:focus, .filter-select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        
        .main-content { flex: 1; min-width: 0; }
        
        .results-header { 
        margin-top: 75px;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 24px; 
            padding-bottom: 16px; 
            border-bottom: 1px solid var(--border);
            position: relative;
            z-index: 20;
            flex-wrap: wrap;
            gap: 15px;
        }
        .results-count { font-size: 1.125rem; font-weight: 600; color: var(--text); }
        .results-count span { color: var(--primary); }

        .sort-wrapper {
            display: flex;
            align-items: center;
            gap: 12px;
            background: white; 
            padding: 5px;
            border-radius: 8px;
        }
        .sort-label {
            font-size: 0.9rem;
            color: var(--text-light);
            font-weight: 600;
            white-space: nowrap;
        }
        .sort-select {
            padding: 10px 36px 10px 14px;
            font-size: 0.9rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background-color: white;
            color: var(--text);
            cursor: pointer;
            outline: none;
            font-weight: 600;
            appearance: none;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 14px top 50%;
            background-size: 10px auto;
            min-width: 180px;
        }
        
        .product-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
            gap: 24px; 
        }

        .product-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: all 0.3s; position: relative; display: flex; flex-direction: column; height: 100%; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-color: #d1d5db; }
        .product-card.out-of-stock { opacity: 0.6; background: #fafafa; }
        .product-card.out-of-stock .product-image { filter: grayscale(50%); }
        .stock-badge { position: absolute; top: 12px; left: 12px; background: var(--secondary); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; z-index: 10; display: flex; align-items: center; gap: 6px; }
        .stock-badge.out { background: var(--danger); }
        .stock-badge.low { background: #f59e0b; }
        .stock-count { font-size: 0.7rem; font-weight: 600; opacity: 0.9; }
        .wishlist-btn { position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border-radius: 50%; background: white; border: 1px solid var(--border); color: var(--text-light); cursor: pointer; transition: all 0.2s; z-index: 10; display: flex; align-items: center; justify-content: center; }
        .wishlist-btn:hover { transform: scale(1.1); border-color: var(--danger); color: var(--danger); }
        .wishlist-btn.active { background: var(--danger); border-color: var(--danger); color: white; }

        .product-image { 
            height: 220px;
            width: 100%;
            padding: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: #ffffff; 
            border-bottom: 1px solid var(--border); 
            overflow: hidden; 
        }
        
        .product-image a { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
        .product-image img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; transition: transform 0.3s ease; }
        .product-card:hover .product-image img { transform: scale(1.08); }

        .product-info { padding: 16px; display: flex; flex-direction: column; flex-grow: 1; }
        .product-specs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
        .spec-badge { font-size: 0.75rem; font-weight: 600; color: var(--text-light); background: var(--bg); padding: 4px 8px; border-radius: 6px; }
        .product-title { margin: 0 0 12px 0; font-size: 1rem; line-height: 1.4; font-weight: 600; min-height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .product-title a { color: var(--text); text-decoration: none; transition: color 0.2s; }
        .product-title a:hover { color: var(--primary); }
        .product-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); }
        .price-qty-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; }
        .price-section { display: flex; flex-direction: column; }
        .price-main { font-size: 1.25rem; font-weight: 800; color: var(--text); }
        .price-sub { font-size: 0.75rem; color: var(--text-light); }
        .qty-control { display: flex; align-items: center; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; flex-shrink: 0;}
        .qty-btn { width: 30px; height: 32px; border: none; background: white; color: var(--text-light); cursor: pointer; font-weight: 600; transition: all 0.2s; }
        .qty-btn:hover:not(:disabled) { background: var(--bg); color: var(--text); }
        .qty-input { width: 36px; height: 32px; text-align: center; border: none; border-left: 1px solid var(--border); border-right: 1px solid var(--border); font-size: 0.9rem; font-weight: 600; padding: 0; outline: none; }
        .action-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .btn { padding: 10px 10px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; text-decoration: none; width: 100%; white-space: nowrap; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; background: #e5e7eb !important; color: #9ca3af !important; border-color: #e5e7eb !important; }
        .btn-cart { background: white; border: 1.5px solid var(--border); color: var(--text); }
        .btn-cart:hover:not(:disabled) { border-color: var(--text); background: var(--bg); }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-1px); }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-light); }
        .empty-state i { font-size: 3rem; color: var(--border); margin-bottom: 16px; }
        
        .modal { display: none; position: fixed; z-index: 3000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); align-items: center; justify-content: center; }
        .modal.show { display: flex; }
        .modal-content { background: white; padding: 32px; border-radius: 16px; width: 90%; max-width: 500px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header { margin-bottom: 20px; }
        .close-modal { position: absolute; top: 20px; right: 20px; font-size: 1.5rem; cursor: pointer; color: var(--text-light); }
        .modal-btn { width: 100%; padding: 14px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s; margin-top: 16px; }
        
        .mobile-filter-btn { display: none; }
        .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1500; opacity: 0; transition: opacity 0.3s; pointer-events: none;}
        .overlay.active { display: block; opacity: 1; pointer-events: auto; }
        .close-sidebar { display: none; }

        @media (max-width: 1024px) {
            .content-wrapper { 
                flex-direction: column; 
                padding: 16px; 
                gap: 20px; 
                align-items: stretch;
            }
            
            .main-content {
                width: 100%;
            }
            
            .sidebar { 
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 280px; 
                height: 100vh; 
                max-height: 100vh; 
                z-index: 2000; 
                border-radius: 0; 
                border: none; 
                box-shadow: 4px 0 20px rgba(0,0,0,0.1); 
                transform: translateX(-100%); 
                transition: transform 0.3s ease;
            }
            .sidebar.active { transform: translateX(0); }
            
            .close-sidebar { display: block; background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text); }
            
            .mobile-filter-btn { 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 10px; 
                position: fixed; 
                bottom: 30px; 
                right: 30px; 
                left: auto;
                transform: none;
                background: var(--text); 
                color: white; 
                padding: 14px 24px; 
                border-radius: 50px; 
                font-weight: 600; 
                font-size: 1rem; 
                z-index: 1000; 
                border: none; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
                cursor: pointer; 
                transition: transform 0.2s;
            }
            .mobile-filter-btn:active { transform: scale(0.95); }

            .product-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        }

        @media (max-width: 768px) {
            .results-header { flex-direction: column; align-items: flex-start; gap: 12px; }
            .sort-wrapper { width: 100%; justify-content: space-between; flex-wrap: wrap; }
            .sort-select { flex-grow: 1; min-width: 0; }
            
            .product-grid { grid-template-columns: 1fr 1fr; gap: 16px; } 
            .product-image { height: 160px; padding: 15px; }
            .price-main { font-size: 1.1rem; }
            .btn { font-size: 0.8rem; padding: 8px; }
        }

        @media (max-width: 480px) {
            .content-wrapper { padding: 12px; }
            .product-grid { grid-template-columns: 1fr; gap: 16px; } 
            .product-card { width: 100%; border-radius: 12px; border: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }
            .product-image { height: 200px; padding: 15px; background: #fff; }
            .action-buttons { grid-template-columns: 1fr; }
            .btn { width: 100%; padding: 12px; font-size: 0.95rem; }
            .results-count { font-size: 1rem; }
            .mobile-filter-btn { bottom: 20px; right: 20px; padding: 12px 20px; font-size: 0.9rem; }
            .modal-content { padding: 24px; width: 95%; margin: 10px; }
            .sort-wrapper { width: 100%; }
            .sort-select { width: 100%; min-width: unset; } 
        }
    </style>
</head>
<body>
    
    <div class="overlay" id="overlay" onclick="toggleSidebar()"></div>
    
    <div class="content-wrapper">
        <aside class="sidebar" id="sidebar">
            <div class="filter-header">
                <h2><i class="fas fa-filter"></i> Filters</h2>
                <button class="close-sidebar" onclick="toggleSidebar()"><i class="fas fa-times"></i></button>
            </div>
            
            <?php if($search || $brand || $processor || $ram || $storage || ($priceRange && $priceRange != 'all')): ?>
                <div style="margin-bottom: 15px;">
                    <a href="store?mode=<?php echo $mode; ?>" class="reset-link" style="width:100%; display:block; text-align:center;"><i class="fas fa-redo"></i> Reset All Filters</a>
                </div>
            <?php endif; ?>

            <form method="GET" action="store" id="filterForm">
                <input type="hidden" name="mode" id="modeInput" value="<?php echo htmlspecialchars($mode); ?>">
                <input type="hidden" name="sort" id="hiddenSortInput" value="<?php echo htmlspecialchars($sort); ?>">
                
                <div class="mode-toggle" data-mode="<?php echo htmlspecialchars($mode); ?>">
                    <button type="button" class="mode-btn <?php echo ($mode == 'sell') ? 'active' : ''; ?>" onclick="setMode('sell')"><i class="fas fa-shopping-bag"></i> Buy</button>
                    <button type="button" class="mode-btn <?php echo ($mode == 'lease') ? 'active' : ''; ?>" onclick="setMode('lease')"><i class="fas fa-calendar-alt"></i> Lease</button>
                    <div class="mode-slider"></div>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-search"></i> Search</label>
                    <input type="text" name="search" class="filter-input" placeholder="Search laptops..." value="<?php echo htmlspecialchars($search); ?>">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-bookmark"></i> Brand</label>
                    <select name="brand" class="filter-select" onchange="submitForm()">
                        <option value="">All Brands</option>
                        <?php if($brands) while($b = $brands->fetch_assoc()): ?>
                            <option value="<?php echo htmlspecialchars($b['brand']); ?>" <?php echo ($brand == $b['brand']) ? 'selected' : ''; ?>><?php echo htmlspecialchars($b['brand']); ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-microchip"></i> Processor</label>
                    <select name="processor" class="filter-select" onchange="submitForm()">
                        <option value="">All Processors</option>
                        <?php if($processors) while($p = $processors->fetch_assoc()): ?>
                            <option value="<?php echo htmlspecialchars($p['processor']); ?>" <?php echo ($processor == $p['processor']) ? 'selected' : ''; ?>><?php echo htmlspecialchars($p['processor']); ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-memory"></i> RAM</label>
                    <select name="ram" class="filter-select" onchange="submitForm()">
                        <option value="">All RAM</option>
                        <?php if($ramOptions) while($r = $ramOptions->fetch_assoc()): ?>
                            <option value="<?php echo htmlspecialchars($r['ram']); ?>" <?php echo ($ram == $r['ram']) ? 'selected' : ''; ?>><?php echo htmlspecialchars($r['ram']); ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-hdd"></i> Storage</label>
                    <select name="storage" class="filter-select" onchange="submitForm()">
                        <option value="">All Storage</option>
                        <?php if($storageOptions) while($s = $storageOptions->fetch_assoc()): ?>
                            <option value="<?php echo htmlspecialchars($s['storage']); ?>" <?php echo ($storage == $s['storage']) ? 'selected' : ''; ?>><?php echo htmlspecialchars($s['storage']); ?></option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label"><i class="fas fa-rupee-sign"></i> Price Range</label>
                    <select name="price_range" class="filter-select" onchange="submitForm()">
                        <option value="all">Any Price</option>
                        <option value="6999-13999" <?php echo ($priceRange == '6999-13999') ? 'selected' : ''; ?>>₹6,999 - ₹13,999</option>
                        <option value="14000-23999" <?php echo ($priceRange == '14000-23999') ? 'selected' : ''; ?>>₹14,000 - ₹23,999</option>
                        <option value="24000-33999" <?php echo ($priceRange == '24000-33999') ? 'selected' : ''; ?>>₹24,000 - ₹33,999</option>
                        <option value="34000-999999" <?php echo ($priceRange == '34000-999999') ? 'selected' : ''; ?>>₹34,999+</option>
                    </select>
                </div>
            </form>
        </aside>
        
        <main class="main-content">
            <div class="results-header">
                <h1 class="results-count"><?php $totalResults = $laptops ? $laptops->num_rows : 0; echo $totalResults; ?> <span>Laptop<?php echo $totalResults != 1 ? 's' : ''; ?> Found</span></h1>
                
                <div class="sort-wrapper">
                    <label for="sortDropdown" class="sort-label">Sort by:</label>
                    <select id="sortDropdown" class="sort-select" onchange="updateSort(this.value)">
                        <option value="featured" <?php echo ($sort == 'featured' || $sort == 'newest') ? 'selected' : ''; ?>>Featured</option>
                        <option value="price_low" <?php echo ($sort == 'price_low') ? 'selected' : ''; ?>>Price: Low to High</option>
                        <option value="price_high" <?php echo ($sort == 'price_high') ? 'selected' : ''; ?>>Price: High to Low</option>
                        <option value="best_sellers" <?php echo ($sort == 'best_sellers') ? 'selected' : ''; ?>>Best Sellers</option>
                        <option value="newest" <?php echo ($sort == 'newest') ? 'selected' : ''; ?>>Newest Arrivals</option>
                    </select>
                </div>
            </div>
            
            <div class="product-grid">
                <?php if($laptops && $laptops->num_rows > 0): ?>
                    <?php while($laptop = $laptops->fetch_assoc()): 
                        $wishlistCheckKey = $laptop['id'] . '-' . $mode;
                        $isInWishlist = in_array($wishlistCheckKey, $wishlistItems);
                        $isOutOfStock = $laptop['stock_quantity'] <= 0;
                        $isLowStock = $laptop['stock_quantity'] > 0 && $laptop['stock_quantity'] <= 5;
                        
                        // NEW LOGIC: Generate SEO Friendly Slug for URLs
                        if (!empty($laptop['slug'])) {
                            $urlSlug = $laptop['slug'];
                        } else {
                            $urlSlug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $laptop['model'])));
                            $urlSlug = trim($urlSlug, '-'); // Clean edges
                        }
                        if (empty($urlSlug)) {
                            $urlSlug = 'product-' . $laptop['id']; // Final fallback
                        }
                    ?>
                        <div class="product-card <?php echo $isOutOfStock ? 'out-of-stock' : ''; ?>">
                            <span class="stock-badge <?php echo $isOutOfStock ? 'out' : ($isLowStock ? 'low' : ''); ?>">
                                <i class="fas fa-<?php echo $isOutOfStock ? 'times' : 'check'; ?>-circle"></i> 
                                <?php 
                                    if($isOutOfStock) {
                                        echo 'Out of Stock';
                                    } else {
                                        echo '<span class="stock-count">' . $laptop['stock_quantity'] . ' available</span>';
                                    }
                                ?>
                            </span>
                            
                            <button type="button" class="wishlist-btn <?php echo $isInWishlist ? 'active' : ''; ?>" onclick="toggleWishlist(this, '<?php echo $laptop['id']; ?>', '<?php echo $mode; ?>')">
                                <i class="<?php echo $isInWishlist ? 'fas' : 'far'; ?> fa-heart"></i>
                            </button>
                            
                            <div class="product-image">
                                <a href="laptop/<?php echo $urlSlug; ?>">
                                    <img src="admin/uploads/<?php echo htmlspecialchars($laptop['image']); ?>" alt="<?php echo htmlspecialchars($laptop['model']); ?>">
                                </a>
                            </div>
                            
                            <div class="product-info">
                                <div class="product-specs">
                                    <span class="spec-badge"><?php echo htmlspecialchars($laptop['brand']); ?></span>
                                    <span class="spec-badge"><i class="fas fa-microchip"></i> <?php echo htmlspecialchars($laptop['processor']); ?></span>
                                </div>
                                
                                <h3 class="product-title">
                                    <a href="laptop/<?php echo $urlSlug; ?>"><?php echo htmlspecialchars($laptop['model']); ?></a>
                                </h3>
                                
                                <div class="product-footer">
                                    <div class="price-qty-row">
                                        <div class="price-section">
                                            <?php if ($mode == 'sell'): ?>
                                                <span class="price-main">₹<?php echo number_format($laptop['price_individual_sell']); ?></span>
                                                <span class="price-sub">Bulk: ₹<?php echo number_format($laptop['price_bulk_sell']); ?></span>
                                            <?php else: ?>
                                                <span class="price-main">₹<?php echo number_format($laptop['price_individual_lease']); ?>/mo</span>
                                                <span class="price-sub">Bulk: ₹<?php echo number_format($laptop['price_bulk_lease']); ?>/mo</span>
                                            <?php endif; ?>
                                        </div>
                                    
                                        <div class="qty-control">
                                            <button type="button" class="qty-btn" onclick="updateQty('<?php echo $laptop['id']; ?>', -1)" <?php echo $isOutOfStock ? 'disabled' : ''; ?>><i class="fas fa-minus"></i></button>
                                            <input type="number" id="qty-<?php echo $laptop['id']; ?>" class="qty-input" value="1" min="1" max="<?php echo $laptop['stock_quantity']; ?>" readonly>
                                            <button type="button" class="qty-btn" onclick="updateQty('<?php echo $laptop['id']; ?>', 1)" <?php echo $isOutOfStock ? 'disabled' : ''; ?>><i class="fas fa-plus"></i></button>
                                        </div>
                                    </div>
                                    
                                    <div class="action-buttons">
                                            <button type="button" class="btn btn-cart" onclick="addToCart('<?php echo $laptop['id']; ?>', '<?php echo addslashes($laptop['model']); ?>', '<?php echo $mode; ?>')" <?php echo $isOutOfStock ? 'disabled' : ''; ?>>
                                                <i class="fas fa-shopping-cart"></i> Add
                                            </button>
                                            
                                            <?php if($mode == 'sell'): ?>
                                                <button type="button" class="btn btn-primary" onclick="buyNow('<?php echo $laptop['id']; ?>', 'sell')" <?php echo $isOutOfStock ? 'disabled' : ''; ?>><i class="fas fa-bolt"></i> Buy Now</button>
                                            <?php else: ?>
                                                <button type="button" class="btn btn-primary" onclick="buyNow('<?php echo $laptop['id']; ?>', 'lease')" <?php echo $isOutOfStock ? 'disabled' : ''; ?>><i class="fas fa-file-contract"></i> Lease Now</button>
                                            <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endwhile; ?>
                <?php else: ?>
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No Laptops Found</h3>
                        <p>Try adjusting your filters or search term.</p>
                    </div>
                <?php endif; ?>
            </div>
        </main>
    </div>
    
    <?php include 'includes/footer.php'; ?>
    
    <button class="mobile-filter-btn" onclick="toggleSidebar()"><i class="fas fa-sliders-h"></i> Filters</button>
    
    <script>
        const wishlistItems = <?php echo json_encode($wishlistItems); ?>;
        
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
        
        function updateSort(sortValue) {
            document.getElementById('hiddenSortInput').value = sortValue;
            submitForm();
        }

        function setMode(mode) {
            document.getElementById('modeInput').value = mode;
            submitForm();
        }
        
        function submitForm() {
            document.getElementById('filterForm').submit();
        }
        
        let searchTimeout;
        const searchInput = document.querySelector('input[name="search"]');
        if(searchInput) {
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => submitForm(), 600);
            });
        }
        
        function updateQty(id, change) {
            const input = document.getElementById('qty-' + id);
            let val = parseInt(input.value) || 1;
            const maxQty = parseInt(input.getAttribute('max')) || 99;
            
            val += change;
            if(val < 1) val = 1;
            if(val > maxQty) val = maxQty;
            input.value = val;
        }
        
        function buyNow(id, mode) {
            const qty = document.getElementById('qty-' + id).value;
            const checkoutUrl = `checkout.php?type=direct&id=${id}&qty=${qty}&mode=${mode}`;
            window.location.href = checkoutUrl;
        }
        
        function addToCart(id, model, mode) {
            const qty = document.getElementById('qty-' + id).value;
            
            fetch('ajax/cart_action.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    id: id, 
                    qty: qty, 
                    model: model, 
                    type: mode // Correct parameter name expected by backend
                })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    if(typeof updateHeaderBadge === 'function') {
                        updateHeaderBadge('cart', data.cart_count);
                    }
                    const typeText = mode === 'lease' ? ' (Lease)' : '';
                    showNotification('✓ ' + model + typeText + ' added to cart!', 'success');
                } else {
                    showNotification(data.message || 'Failed to add to cart', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('An error occurred. Please try again.', 'error');
            });
        }
        
        function toggleWishlist(btn, id, mode) {
            fetch('ajax/wishlist_action.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'toggle', id: id, mode: mode })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    const icon = btn.querySelector('i');
                    if(data.message.includes('Added')) {
                        btn.classList.add('active');
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        showNotification('Added to wishlist!', 'success');
                    } else {
                        btn.classList.remove('active');
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                        showNotification('Removed from wishlist', 'info');
                    }
                    if(typeof updateHeaderBadge === 'function') {
                        updateHeaderBadge('wishlist', data.wishlist_count);
                    }
                } else {
                    showNotification(data.message || 'Failed to update wishlist', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('An error occurred. Please try again.', 'error');
            });
        }
        
        // Dummy function to prevent errors if header doesn't have it
        if(typeof updateHeaderBadge !== 'function') {
            function updateHeaderBadge(type, count) {
                console.log('Badge update:', type, count);
                // Try to find element manually if function missing
                const badge = document.querySelector(`.${type}-count`);
                if(badge) badge.innerText = count;
            }
        }
        
        function showNotification(message, type = 'info') {
            const colors = {success: '#10b981', error: '#ef4444', info: '#6366f1'};
            const notification = document.createElement('div');
            notification.style.cssText = `position: fixed; top: 100px; right: 20px; background: ${colors[type]}; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 9999; font-weight: 600; animation: slideIn 0.3s ease;`;
            notification.textContent = message;
            const style = document.createElement('style');
            style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; }} @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; }}`;
            document.head.appendChild(style);
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }
    </script>
</body>
</html>
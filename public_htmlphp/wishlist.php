<?php
session_start();
require_once 'config/database.php';
require_once 'includes/header.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo "<script>window.location.href='login.php';</script>";
    exit;
}

$user_id = $_SESSION['user_id'];

// Fetch wishlist items
$sql = "SELECT l.*, w.id as wishlist_id, w.mode as saved_mode, w.created_at as date_added 
        FROM wishlist w 
        JOIN laptops l ON w.laptop_id = l.id 
        WHERE w.user_id = ? AND l.status = 'active'
        ORDER BY w.created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Wishlist | XpertNote</title>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
    :root {
        --primary: #002c8c;        
        --accent: #2563eb;          
        --bg-body: #f8fafc;        
        --bg-card: #ffffff;
        --text-main: #1e293b;
        --text-muted: #64748b;
        --danger: #ef4444;
        --border: #e2e8f0;
        --radius: 12px;            
        
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        
        --badge-lease-bg: #dbeafe;
        --badge-lease-text: #1e40af;
        --badge-buy-bg: #dcfce7;
        --badge-buy-text: #166534;
    }

    body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background-color: var(--bg-body);
        color: var(--text-main);
        margin: 0;
        padding-bottom: 80px; 
        overflow-x: hidden;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
    }

    /* --- Page Header --- */
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        margin-bottom: 25px;
        padding: 0 5px;
    }
    .page-header h1 { 
        margin: 0; 
        font-size: 1.5rem; 
        font-weight: 800; 
        display: flex; 
        align-items: center; 
        gap: 10px; 
        color: var(--primary);
    }
    .page-header h1 i { color: var(--danger); font-size: 1.2rem; }
    
    /* Specific ID added to update this badge via JS */
    .count-badge {
        background: #fff;
        color: var(--accent);
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.85rem;
        border: 1px solid #bfdbfe;
        box-shadow: var(--shadow-sm);
    }

    /* --- Grid System --- */
    .grid-view {
        display: grid;
        grid-template-columns: repeat(1, 1fr); 
        gap: 20px;
    }

    @media (min-width: 768px) {
        .grid-view { grid-template-columns: repeat(2, 1fr); gap: 24px; }
    }
    @media (min-width: 1024px) {
        .grid-view { grid-template-columns: repeat(3, 1fr); gap: 30px; }
    }

    /* --- Desktop Card Styles --- */
    .card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        position: relative;
        transition: border 0.2s, box-shadow 0.2s;
        display: flex;
        flex-direction: column; 
        height: 100%;
    }

    /* Hover Effect - DESKTOP ONLY */
    @media (min-width: 769px) {
        .card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-hover);
            border-color: #cbd5e1;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover .img-container img {
            transform: scale(1.05);
        }
    }

    /* --- Badges --- */
    .badges-container {
        position: absolute;
        top: 12px;
        left: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 5;
    }

    .badge {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 4px 8px;
        border-radius: 6px;
        width: fit-content;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .badge-mode.sell { background: var(--badge-buy-bg); color: var(--badge-buy-text); border: 1px solid #bbf7d0; }
    .badge-mode.lease { background: var(--badge-lease-bg); color: var(--badge-lease-text); border: 1px solid #bfdbfe; }
    .out-stock { background: #fee2e2; color: #991b1b; }

    /* --- Image Area --- */
    .img-container {
        width: 100%;
        height: 200px;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box; 
        border-bottom: 1px solid var(--border);
        position: relative;
    }
    .img-container img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        transition: transform 0.3s ease;
    }

    /* --- Content Body --- */
    .card-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
    .brand {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 4px;
    }
    .model-name {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-main);
        margin: 0 0 12px 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-decoration: none;
    }
    .model-name a { color: inherit; text-decoration: none; }

    /* Pricing & Footer */
    .pricing-box {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        margin-top: auto;
    }
    .price-main { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .price-sub { display: block; font-size: 0.7rem; color: #64748b; }

    .card-footer { padding: 0 16px 16px 16px; display: flex; gap: 10px; }
    
    .btn-cart {
        flex: 1;
        padding: 10px;
        background: var(--primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: background 0.2s;
    }
    .btn-trash {
        width: 40px;
        height: 40px;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    /* =========================================
       MOBILE UI (3D, COMPACT, BADGE ON IMAGE)
       ========================================= */
    @media (max-width: 768px) {
        body { background: #fff; padding-top: 5px; }
        
        .container { padding: 10px 10px !important; width: 100%; box-sizing: border-box; }
        
        .page-header { padding: 0 5px; margin-bottom: 15px; }

        .grid-view { gap: 15px; display: flex; flex-direction: column; }

        .card {
            flex-direction: row; 
            align-items: center;
            padding: 10px;
            height: auto;
            border-radius: 12px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-bottom: 4px solid #cbd5e1;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            width: 100%; 
            margin: 0;
            transform: none !important; 
        }
        .card:active {
            border-bottom: 1px solid #e2e8f0;
            transform: translateY(3px) !important;
            box-shadow: none;
        }

        .img-container {
            width: 85px; 
            height: 85px;
            flex-shrink: 0; 
            padding: 5px;
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            margin-right: 12px;
            border-radius: 10px;
            position: relative;
        }
        .img-container img { border-radius: 4px; }

        .badges-container {
            position: absolute;
            top: 0; left: 0; margin: 0; padding: 0; z-index: 10;
        }
        .badge {
            font-size: 0.55rem;
            padding: 3px 6px;
            border-top-left-radius: 9px;
            border-bottom-right-radius: 6px;
            border-top-right-radius: 0;
            border-bottom-left-radius: 0;
            box-shadow: none;
            border: none;
        }

        .card-content { padding: 0; margin: 0; justify-content: center; width: 100%; }

        .brand { font-size: 0.65rem; margin-bottom: 2px; }
        .model-name { font-size: 1rem; margin-bottom: 2px; -webkit-line-clamp: 1; }

        .pricing-box { display: none; }

        .mobile-price-text {
            display: block;
            font-size: 1rem;
            color: var(--primary);
            font-weight: 800;
        }

        .card-footer {
            padding: 0; margin-left: 8px; display: flex; flex-direction: column; 
            align-items: center; gap: 8px; width: auto;
        }

        .btn-cart {
            width: 40px; height: 40px; border-radius: 50%; padding: 0; flex: none; 
            background: var(--primary); color: #fff;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
        }
        .btn-cart span { display: none; } 
        .btn-cart i { margin: 0; font-size: 0.95rem; }

        .btn-trash {
            width: 35px; height: 35px; border: 1px solid #fecaca;
            background: #fef2f2; color: #ef4444; border-radius: 50%;
            font-size: 0.95rem; display: flex; align-items: center; justify-content: center;
        }
        .btn-trash:active { background: #ef4444; color: #fff; }
    }

    .empty-box {
        text-align: center;
        padding: 60px 20px;
        margin: 20px;
        background: #fff;
        border-radius: var(--radius);
        border: 1px dashed var(--border);
    }
</style>
</head>
<body>

<div class="container">
    <br><br><br>
    <div class="page-header">
        <h1><i class="fas fa-heart"></i> My Wishlist</h1>
        <div class="count-badge" id="page-wishlist-count"><?php echo $result->num_rows; ?> Items</div>
    </div>

    <div class="grid-view">
        <?php if($result->num_rows > 0): while($item=$result->fetch_assoc()): ?>
            <?php 
                $isInStock = $item['stock_quantity'] > 0;
                $mode = $item['saved_mode']; 
                
                $badgeText = ($mode == 'sell') ? 'Buy' : 'Lease';
                $badgeClass = ($mode == 'sell') ? 'sell' : 'lease';
                
                if($mode == 'sell') {
                    $displayPrice = '₹' . number_format($item['price_individual_sell']);
                } else {
                    $displayPrice = '₹' . number_format($item['price_individual_lease']) . '/mo';
                }
                
                $uniqueCardId = "card-" . $item['id'] . "-" . $mode;
            ?>
            
            <div class="card" id="<?php echo $uniqueCardId; ?>">
                
                <div class="img-container">
                    <div class="badges-container">
                        <span class="badge badge-mode <?php echo $badgeClass; ?>"><?php echo $badgeText; ?></span>
                        <?php if(!$isInStock): ?>
                            <span class="badge out-stock">Out</span>
                        <?php endif; ?>
                    </div>

                    <a href="laptop-details.php?id=<?php echo $item['id']; ?>" style="display:contents;">
                        <img src="admin/uploads/<?php echo htmlspecialchars($item['image']); ?>" alt="Laptop">
                    </a>
                </div>

                <div class="card-content">
                    <div class="brand"><?php echo htmlspecialchars($item['brand']); ?></div>
                    <h3 class="model-name">
                        <a href="laptop-details.php?id=<?php echo $item['id']; ?>">
                            <?php echo htmlspecialchars($item['model']); ?>
                        </a>
                    </h3>

                    <div class="pricing-box">
                        <div class="price-main"><?php echo $displayPrice; ?></div>
                        <span class="price-sub"><?php echo ($mode == 'sell' ? 'Full Price' : 'Monthly'); ?></span>
                    </div>

                    <div class="mobile-price-text" style="display:none;">
                        <?php echo $displayPrice; ?>
                    </div>
                    <style>@media(max-width:768px){ .mobile-price-text{display:block!important;} }</style>
                </div>

                <div class="card-footer">
                    <?php if($isInStock): ?>
                        <button class="btn-cart" 
                            onclick="addToCart('<?php echo $item['id']; ?>', '<?php echo addslashes($item['model']); ?>', '<?php echo $mode; ?>')">
                            <i class="fas fa-cart-shopping"></i> <span>Move to Cart</span>
                        </button>
                    <?php else: ?>
                        <button class="btn-cart btn-disabled" disabled>
                            <i class="fas fa-ban"></i> <span>Unavailable</span>
                        </button>
                    <?php endif; ?>

                    <button class="btn-trash" onclick="removeFromWishlist('<?php echo $item['id']; ?>', '<?php echo $mode; ?>', '<?php echo $uniqueCardId; ?>')" title="Remove">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>

            </div>

        <?php endwhile; else: ?>
            
            <div class="empty-box">
                <i class="far fa-heart" style="font-size:3rem; color:#cbd5e1; margin-bottom:20px;"></i>
                <h3 style="margin:0 0 10px 0; color:#1e293b;">Your wishlist is empty</h3>
                <a href="store.php" style="color:#2563eb; font-weight:700; text-decoration:none;">Browse Laptops &rarr;</a>
            </div>

        <?php endif; ?>
    </div>
</div>

<?php include 'includes/footer.php'; ?>

<script>
// --- FUNCTION: Update Badges Instantly ---
function updateHeaderBadges(wishlistCount, cartCount) {
    // 1. Update the counter on this specific page (Items count)
    const pageBadge = document.getElementById('page-wishlist-count');
    if(pageBadge) {
        pageBadge.innerText = wishlistCount + " Items";
    }

    // 2. Update Header/Navbar Badges
    // NOTE: This targets standard badge IDs. If your header uses different IDs, update them here.
    const wBadges = document.querySelectorAll('.wishlist-count, #wishlist-count, #wishlist-badge'); 
    wBadges.forEach(el => {
        el.innerText = wishlistCount;
        el.style.display = wishlistCount > 0 ? 'inline-block' : 'none';
    });

    const cBadges = document.querySelectorAll('.cart-count, #cart-count, #cart-badge');
    cBadges.forEach(el => {
        el.innerText = cartCount;
        el.style.display = cartCount > 0 ? 'inline-block' : 'none';
    });
}

// --- FUNCTION: Remove From Wishlist ---
function removeFromWishlist(id, mode, cardId) {
    Swal.fire({
        title: 'Remove?',
        text: `Remove from wishlist?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes',
        width: '300px'
    }).then((result) => {
        if (result.isConfirmed) {
            
            fetch('wishlist_action.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Sending JSON body
                body: JSON.stringify({ 
                    action: 'remove', 
                    laptop_id: id 
                })
            })
            .then(r => r.json())
            .then(data => {
                if(data.status === 'success') {
                    // 1. Remove Card Animation
                    const card = document.getElementById(cardId);
                    if(card) {
                        card.style.transition = 'all 0.3s';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.9)';
                        setTimeout(() => { 
                            card.remove(); 
                            // Reload if empty to show "Empty Box"
                            if(document.querySelectorAll('.card').length === 0) location.reload();
                        }, 300);
                    }
                    
                    // 2. INSTANT BADGE UPDATE (Using data from PHP)
                    updateHeaderBadges(data.wishlist_count, data.cart_count);

                } else {
                    Swal.fire('Error', data.message || 'Could not remove', 'error');
                }
            })
            .catch(err => console.error("Fetch error:", err));
        }
    })
}

// --- FUNCTION: Move to Cart ---
function addToCart(id, model, mode) {
    
    fetch('wishlist_action.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        // Sending JSON body
        body: JSON.stringify({ 
            action: 'move_to_cart', 
            laptop_id: id,
            mode: mode 
        })
    })
    .then(r => r.json())
    .then(data => {
        if(data.status === 'success') {
            const cardId = "card-" + id + "-" + mode;
            
            // 1. Remove Card Animation
            const card = document.getElementById(cardId);
            if(card) {
                card.style.transition = 'all 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'translateY(-20px)';
                setTimeout(() => { 
                    card.remove();
                    if(document.querySelectorAll('.card').length === 0) location.reload();
                }, 300);
            }

            // 2. INSTANT BADGE UPDATE (Using data from PHP)
            updateHeaderBadges(data.wishlist_count, data.cart_count);

            // 3. Success Toast
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'Moved to Cart'
            });

        } else {
            Swal.fire('Error', data.message, 'error');
        }
    })
    .catch(err => console.error("Fetch error:", err));
}
</script>

</body>
</html>
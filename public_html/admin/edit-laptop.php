<?php
session_start();

// 1. Authentication Check
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

require_once '../config/database.php';
// require_once '../includes/functions.php'; // Optional if not used elsewhere for this page

// 2. Fetch Laptop Data
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

$stmt = $conn->prepare("SELECT * FROM laptops WHERE id=?");
$stmt->bind_param("i", $id);
$stmt->execute();
$laptop = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$laptop) {
    header('Location: index.php');
    exit;
}

$message = '';
$messageType = ''; // 'error' or 'success'

// 3. Handle Form Submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Sanitize Inputs
    $brand = trim($_POST['brand'] ?? '');
    $model = trim($_POST['model'] ?? '');
    $processor = trim($_POST['processor'] ?? '');
    $ram = trim($_POST['ram'] ?? '');
    $storage = trim($_POST['storage'] ?? '');
    $graphics = trim($_POST['graphics'] ?? '');
    $display = trim($_POST['display'] ?? '');
    $os = trim($_POST['operating_system'] ?? '');
    $price_ind_sell = max(0, floatval($_POST['price_individual_sell'] ?? 0));
    $price_bulk_sell = max(0, floatval($_POST['price_bulk_sell'] ?? 0));
    $price_ind_lease = max(0, floatval($_POST['price_individual_lease'] ?? 0));
    $price_bulk_lease = max(0, floatval($_POST['price_bulk_lease'] ?? 0));
    $stock = max(0, intval($_POST['stock_quantity'] ?? 0));
    $description = trim($_POST['description'] ?? '');
    $status = trim($_POST['status'] ?? 'inactive');
    
    // Default to current image
    $image_name = $laptop['image'];
    $upload_error = false;

    // 4. Secure Image Upload Logic
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['image']['tmp_name'];
        $fileName = $_FILES['image']['name'];
        $fileSize = $_FILES['image']['size'];
        $fileType = $_FILES['image']['type'];
        
        // Define Upload Directory (Ensure this folder exists next to this file)
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Validate Extension
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));
        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg', 'webp');

        if (in_array($fileExtension, $allowedfileExtensions)) {
            // Generate Unique Filename to prevent overwriting
            $newFileName = time() . '_' . bin2hex(random_bytes(5)) . '.' . $fileExtension;
            $dest_path = $uploadDir . $newFileName;

            if (move_uploaded_file($fileTmpPath, $dest_path)) {
                // Delete Old Image (Garbage Collection)
                $old_image_path = $uploadDir . $laptop['image'];
                if (!empty($laptop['image']) && file_exists($old_image_path)) {
                    @unlink($old_image_path); // @ suppresses error if file is already gone
                }
                $image_name = $newFileName;
            } else {
                $message = 'Error moving the file to the upload directory.';
                $messageType = 'error';
                $upload_error = true;
            }
        } else {
            $message = 'Upload failed. Allowed file types: ' . implode(',', $allowedfileExtensions);
            $messageType = 'error';
            $upload_error = true;
        }
    }

    // 5. Update Database
    if (!$upload_error) {
        $sql = "UPDATE laptops SET brand=?, model=?, processor=?, ram=?, 
                storage=?, graphics=?, display=?, operating_system=?,
                price_individual_sell=?, price_bulk_sell=?,
                price_individual_lease=?, price_bulk_lease=?,
                stock_quantity=?, description=?, image=?, status=?
                WHERE id=?";
        
        $stmt = $conn->prepare($sql);
        
        if ($stmt) {
            $stmt->bind_param(
                "ssssssssddddisssi", 
                $brand, $model, $processor, $ram, 
                $storage, $graphics, $display, $os,
                $price_ind_sell, $price_bulk_sell, 
                $price_ind_lease, $price_bulk_lease, 
                $stock, $description, $image_name, $status, $id
            );
            
            if ($stmt->execute()) {
                $message = 'Laptop updated successfully!';
                $messageType = 'success';
                // Refresh data to show changes immediately
                $laptop = $conn->query("SELECT * FROM laptops WHERE id=$id")->fetch_assoc();
            } else {
                $message = 'Database Update Error: ' . $stmt->error;
                $messageType = 'error';
            }
            $stmt->close();
        } else {
            $message = 'Database Prepare Error: ' . $conn->error;
            $messageType = 'error';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Laptop: <?php echo htmlspecialchars($laptop['brand'] . ' ' . $laptop['model']); ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <style>
        /* Your Professional CSS - Unchanged but verified */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; min-height: 100vh; padding-bottom: 40px; }
        
        .top-header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            padding: 16px; box-shadow: 0 4px 20px rgba(30, 64, 175, 0.15);
            position: sticky; top: 0; z-index: 100;
        }
        .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .page-title { font-size: 1.25rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 10px; line-height: 1; }
        .btn-back { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; transition: all 0.3s ease; white-space: nowrap; }
        .btn-back:hover { background: rgba(255, 255, 255, 0.3); transform: translateX(-3px); }
        
        .main-container { max-width: 1400px; margin: 0 auto; padding: 0 16px; }
        .form-wrapper { padding: 16px; background: white; margin: 24px auto; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); }
        
        /* Alerts */
        .alert { padding: 14px 16px; margin-bottom: 20px; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 10px; border-left: 4px solid; border-radius: 4px; animation: slideDown 0.4s ease-out; }
        .alert-error { background: #fee2e2; color: #dc2626; border-color: #ef4444; }
        .alert-success { background: #dcfce7; color: #16a34a; border-color: #22c55e; }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .section-header { background: #f8fafc; padding: 14px 16px; border-left: 4px solid #3b82f6; margin: 24px 0 16px 0; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; color: #1e40af; display: flex; align-items: center; gap: 10px; border-radius: 4px; }
        .section-header:first-of-type { margin-top: 0; }
        
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-label { font-weight: 600; font-size: 0.85rem; color: #475569; letter-spacing: 0.3px; display: flex; align-items: center; gap: 4px; }
        .required { color: #ef4444; }
        .form-input, .form-textarea, .form-select { padding: 12px 14px; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; font-family: inherit; transition: all 0.3s ease; color: #0f172a; font-weight: 500; width: 100%; }
        .form-input:focus, .form-textarea:focus, .form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        .form-textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
        
        /* Improved Image Preview */
        .image-upload-area { display: flex; flex-direction: column; gap: 15px; border: 2px dashed #e2e8f0; padding: 20px; border-radius: 8px; background: #fafafa; transition: all 0.3s; }
        .image-upload-area:hover { border-color: #3b82f6; background: #f0f9ff; }
        .preview-container { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .preview-box { text-align: center; }
        .preview-box img { width: 120px; height: 90px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; background: white; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .preview-label { display: block; font-size: 0.75rem; color: #64748b; margin-top: 5px; font-weight: 600; }
        .arrow-icon { color: #94a3b8; }

        .btn-submit { width: 100%; padding: 15px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.3s ease; margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(5, 150, 105, 0.3); }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(5, 150, 105, 0.4); }
        .btn-submit:active { transform: translateY(0); }

        @media (min-width: 768px) {
            .top-header { padding: 24px 32px; }
            .page-title { font-size: 1.75rem; }
            .form-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .form-wrapper { padding: 32px; }
        }
        @media (min-width: 1024px) {
            .form-wrapper { padding: 40px; margin-top: 40px; }
            .form-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; }
            .btn-submit { width: auto; padding: 16px 80px; align-self: flex-start; margin-top: 30px; }
        }
    </style>
</head>
<body>
    <div class="top-header">
        <div class="header-content">
            <h1 class="page-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5l-3 3 7 7 3-3-7-7z"/><path d="M17 14l-2 2"/><path d="M7 7h.01"/><path d="M7 11h.01"/><path d="M7 15h.01"/><path d="M10 7h.01"/><path d="M10 11h.01"/></svg>
                Edit Laptop: <?php echo htmlspecialchars($laptop['brand'] . ' ' . $laptop['model']); ?>
            </h1>
            <a href="index.php" class="btn-back">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                Back to Inventory
            </a>
        </div>
    </div>

    <div class="main-container">
        <?php if($message): ?>
            <div class="alert <?php echo $messageType === 'success' ? 'alert-success' : 'alert-error'; ?>">
                <?php if($messageType === 'success'): ?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <?php else: ?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <?php endif; ?>
                <span><?php echo htmlspecialchars($message); ?></span>
            </div>
            
            <?php if($messageType === 'success'): ?>
                <script>
                    // Prevent form resubmission on refresh
                    if ( window.history.replaceState ) {
                        window.history.replaceState( null, null, window.location.href );
                    }
                    // Optional: Redirect after 2 seconds
                    setTimeout(function(){ window.location.href = 'index.php'; }, 2000);
                </script>
            <?php endif; ?>
        <?php endif; ?>

        <div class="form-wrapper">
            <form method="POST" enctype="multipart/form-data">
                
                <div class="section-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
                    Basic Specifications
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Brand <span class="required">*</span></label>
                        <input type="text" name="brand" class="form-input" value="<?php echo htmlspecialchars($laptop['brand']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Model <span class="required">*</span></label>
                        <input type="text" name="model" class="form-input" value="<?php echo htmlspecialchars($laptop['model']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Processor <span class="required">*</span></label>
                        <input type="text" name="processor" class="form-input" value="<?php echo htmlspecialchars($laptop['processor']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">RAM <span class="required">*</span></label>
                        <input type="text" name="ram" class="form-input" value="<?php echo htmlspecialchars($laptop['ram']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Storage <span class="required">*</span></label>
                        <input type="text" name="storage" class="form-input" value="<?php echo htmlspecialchars($laptop['storage']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Graphics (GPU)</label>
                        <input type="text" name="graphics" class="form-input" value="<?php echo htmlspecialchars($laptop['graphics']); ?>">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Display</label>
                        <input type="text" name="display" class="form-input" value="<?php echo htmlspecialchars($laptop['display']); ?>">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Operating System</label>
                        <input type="text" name="operating_system" class="form-input" value="<?php echo htmlspecialchars($laptop['operating_system']); ?>">
                    </div>
                </div>

                <div class="section-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Pricing & Inventory
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Stock Quantity <span class="required">*</span></label>
                        <input type="number" name="stock_quantity" class="form-input" value="<?php echo htmlspecialchars($laptop['stock_quantity']); ?>" required min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select name="status" class="form-select">
                            <option value="active" <?php echo $laptop['status']=='active'?'selected':''; ?>>Active</option>
                            <option value="inactive" <?php echo $laptop['status']=='inactive'?'selected':''; ?>>Inactive</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Individual Sell Price (₹)</label>
                        <input type="number" step="1" name="price_individual_sell" class="form-input" value="<?php echo htmlspecialchars($laptop['price_individual_sell']); ?>" required min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bulk Sell Price (₹)</label>
                        <input type="number" step="1" name="price_bulk_sell" class="form-input" value="<?php echo htmlspecialchars($laptop['price_bulk_sell']); ?>" required min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Individual Lease (₹/mo)</label>
                        <input type="number" step="1" name="price_individual_lease" class="form-input" value="<?php echo htmlspecialchars($laptop['price_individual_lease']); ?>" required min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bulk Lease (₹/mo)</label>
                        <input type="number" step="1" name="price_bulk_lease" class="form-input" value="<?php echo htmlspecialchars($laptop['price_bulk_lease']); ?>" required min="0">
                    </div>
                </div>

                <div class="section-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    Media & Description
                </div>
                
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label class="form-label">Product Image</label>
                        
                        <div class="image-upload-area">
                            <input type="file" name="image" id="fileInput" class="form-input" accept="image/*" onchange="previewImage(this)">
                            
                            <div class="preview-container">
                                <div class="preview-box">
                                    <?php if(!empty($laptop['image'])): ?>
                                        <img src="uploads/<?php echo htmlspecialchars($laptop['image']); ?>" alt="Current" id="currentImg">
                                    <?php else: ?>
                                        <img src="https://via.placeholder.com/150?text=No+Image" alt="No Image">
                                    <?php endif; ?>
                                    <span class="preview-label">Current Image</span>
                                </div>
                                
                                <div class="arrow-icon" id="previewArrow" style="display:none;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                </div>

                                <div class="preview-box" id="newPreviewBox" style="display:none;">
                                    <img src="" id="newImgPreview">
                                    <span class="preview-label" style="color: #059669;">New Selection</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-textarea" placeholder="Enter details..."><?php echo htmlspecialchars($laptop['description']); ?></textarea>
                    </div>
                </div>
                
                <button type="submit" class="btn-submit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save Changes
                </button>
            </form>
        </div>
    </div>

    <script>
        function previewImage(input) {
            const previewBox = document.getElementById('newPreviewBox');
            const previewImg = document.getElementById('newImgPreview');
            const arrow = document.getElementById('previewArrow');
            
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewBox.style.display = 'block';
                    arrow.style.display = 'block';
                }
                
                reader.readAsDataURL(input.files[0]);
            } else {
                previewBox.style.display = 'none';
                arrow.style.display = 'none';
            }
        }
    </script>
</body>
</html>
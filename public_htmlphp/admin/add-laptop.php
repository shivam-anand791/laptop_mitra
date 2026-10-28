<?php
// --- 1. Enable Debugging ---
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

// Security Check
if(!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

require_once '../config/database.php';

$message = '';
$success = '';
$errors = [];

// --- 2. Handle POST Request ---
if($_SERVER['REQUEST_METHOD'] == 'POST') {

    // CHECK: Did the server drop the POST data due to size limits?
    if (empty($_POST) && $_SERVER['CONTENT_LENGTH'] > 0) {
        $displayMax = ini_get('post_max_size');
        $message = "<b>Critical Error:</b> The total size of files uploaded exceeds the server limit ($displayMax).<br>Please edit your <b>.htaccess</b> file to increase <code>post_max_size</code> and <code>upload_max_filesize</code>.";
    } 
    else {
        // --- 3. Capture Data safely ---
        $brand = trim($_POST['brand'] ?? '');
        $model = trim($_POST['model'] ?? '');
        $processor = trim($_POST['processor'] ?? '');
        $ram = trim($_POST['ram'] ?? '');
        $storage = trim($_POST['storage'] ?? '');
        $graphics = trim($_POST['graphics'] ?? '');
        $display = trim($_POST['display'] ?? '');
        $os = trim($_POST['operating_system'] ?? '');
        $desc = trim($_POST['description'] ?? '');
        $stock = intval($_POST['stock_quantity'] ?? 0);
        
        $p_ind_sell = floatval($_POST['price_individual_sell'] ?? 0);
        $p_bulk_sell = floatval($_POST['price_bulk_sell'] ?? 0);
        $p_ind_lease = floatval($_POST['price_individual_lease'] ?? 0);
        $p_bulk_lease = floatval($_POST['price_bulk_lease'] ?? 0);

        $status = 'active'; 
        $default_image = ''; 

        // Validate basic requirement
        if(empty($brand) || empty($model)) {
            $message = "Please fill in all required fields (Brand and Model).";
        }
        else if($conn) {
            // 4. Insert into LAPTOPS table
            $sql = "INSERT INTO laptops (
                brand, model, processor, ram, storage, graphics, display, operating_system, 
                price_individual_sell, price_bulk_sell, price_individual_lease, price_bulk_lease, 
                stock_quantity, description, image, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            
            if($stmt) {
                $stmt->bind_param(
                    "ssssssssddddisss", 
                    $brand, $model, $processor, $ram, $storage, $graphics, $display, $os,
                    $p_ind_sell, $p_bulk_sell, $p_ind_lease, $p_bulk_lease, 
                    $stock, $desc, $default_image, $status
                );

                if($stmt->execute()) {
                    $laptop_id = $conn->insert_id; // Get generated ID
                    $uploaded_files = [];
                    $target_dir = "uploads/";

                    // Create directory if not exists
                    if (!file_exists($target_dir)) {
                        if (!mkdir($target_dir, 0777, true)) {
                            $errors[] = "Failed to create uploads directory. Check permissions.";
                        }
                    }

                    // 5. Handle MULTIPLE Images
                    if(isset($_FILES['images']) && !empty($_FILES['images']['name'][0])) {
                        $total_files = count($_FILES['images']['name']);
                        
                        // Prepare Gallery Insert Statement
                        $img_sql = "INSERT INTO laptop_images (laptop_id, image_path) VALUES (?, ?)";
                        $img_stmt = $conn->prepare($img_sql);

                        for($i = 0; $i < $total_files; $i++) {
                            $file_name = $_FILES['images']['name'][$i];
                            $file_tmp = $_FILES['images']['tmp_name'][$i];
                            $file_error = $_FILES['images']['error'][$i];
                            $file_size = $_FILES['images']['size'][$i];
                            
                            // Error handling for specific files
                            if($file_error === 0) {
                                $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
                                $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

                                if(in_array($file_ext, $allowed)) {
                                    // CHECK: 20MB Limit (20 * 1024 * 1024 = 20971520 bytes)
                                    if($file_size < 20971520) {
                                        // Unique Name: lptp_ID_Timestamp_Index.ext
                                        $new_name = "lptp_" . $laptop_id . "_" . time() . "_" . $i . "." . $file_ext;
                                        $target_file = $target_dir . $new_name;

                                        if(move_uploaded_file($file_tmp, $target_file)) {
                                            $uploaded_files[] = $new_name;

                                            // Insert into `laptop_images`
                                            $img_stmt->bind_param("is", $laptop_id, $new_name);
                                            $img_stmt->execute();
                                        } else {
                                            $errors[] = "Failed to move file: $file_name (Check Folder Permissions)";
                                        }
                                    } else {
                                        $errors[] = "File too large (>20MB): $file_name";
                                    }
                                } else {
                                    $errors[] = "Invalid file type: $file_name";
                                }
                            } else {
                                // PHP File Upload Errors
                                $php_upload_errors = [
                                    1 => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
                                    2 => 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form',
                                    3 => 'The uploaded file was only partially uploaded',
                                    4 => 'No file was uploaded',
                                    6 => 'Missing a temporary folder',
                                    7 => 'Failed to write file to disk.',
                                    8 => 'A PHP extension stopped the file upload.',
                                ];
                                if ($file_error != 4) { 
                                    $errors[] = "Error uploading $file_name: " . ($php_upload_errors[$file_error] ?? 'Unknown Error');
                                }
                            }
                        }
                        $img_stmt->close();
                    }

                    // 6. Update Main Image
                    if(!empty($uploaded_files)) {
                        $main_image = $uploaded_files[0];
                        $update_sql = "UPDATE laptops SET image = ? WHERE id = ?";
                        $up_stmt = $conn->prepare($update_sql);
                        $up_stmt->bind_param("si", $main_image, $laptop_id);
                        $up_stmt->execute();
                        $up_stmt->close();
                        
                        $success = "Laptop added successfully with " . count($uploaded_files) . " images!";
                        // Redirect after 2 seconds
                        header("refresh:2;url=index.php"); 
                    } else {
                        $message = "Laptop info saved, but NO images were uploaded.";
                        if(!empty($errors)) {
                            $message .= " Errors: " . implode(", ", $errors);
                        }
                    }

                } else {
                    $message = "Database Insertion Error: " . $stmt->error;
                }
                $stmt->close();
            } else {
                $message = "SQL Prepare Error: " . $conn->error;
            }
        } else {
            $message = "Database connection failed.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Add New Laptop</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F1F5F9; }
        .input-group:focus-within label { color: #4F46E5; }
        .input-group:focus-within i { color: #4F46E5; }
        .input-group:focus-within input, .input-group:focus-within textarea { border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
    </style>
</head>
<body class="text-slate-600">

    <div class="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center gap-3">
                    <div class="bg-indigo-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <i class="fa-solid fa-laptop-medical"></i>
                    </div>
                    <span class="font-bold text-slate-800 text-lg">Add Inventory</span>
                </div>
                <a href="index.php" class="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-lg">
                    <i class="fa-solid fa-arrow-left-long"></i> Back to Dashboard
                </a>
            </div>
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <?php 
        $max_upload = ini_get('upload_max_filesize');
        $max_post = ini_get('post_max_size');
        ?>
        <div class="mb-6 p-4 rounded-xl bg-blue-50 text-blue-700 text-sm border border-blue-200 shadow-sm">
            <div class="flex items-start gap-3">
                <i class="fas fa-server mt-1"></i>
                <div>
                    <p class="font-bold">Server Constraints Detected:</p>
                    <ul class="list-disc ml-4 mt-1 space-y-1 text-xs">
                        <li>Max Single File Upload: <strong><?php echo $max_upload; ?></strong></li>
                        <li>Max Total POST Size: <strong><?php echo $max_post; ?></strong> (If upload > limit, server will block it)</li>
                    </ul>
                    <p class="mt-2 text-xs text-blue-600">
                        <strong>Important:</strong> If these numbers are small (e.g. 2M/8M), create a <code>.htaccess</code> file in root folder with:<br>
                        <code>php_value post_max_size 128M</code><br>
                        <code>php_value upload_max_filesize 128M</code>
                    </p>
                </div>
            </div>
        </div>

        <?php if($message): ?>
            <div class="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex flex-col gap-2 animate-bounce">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-circle-exclamation text-xl"></i> 
                    <span class="font-semibold">Upload Failed / Warning</span>
                </div>
                <p class="ml-8 text-sm"><?php echo $message; ?></p>
            </div>
        <?php endif; ?>
        
        <?php if($success): ?>
            <div class="mb-8 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center gap-3">
                <i class="fa-solid fa-circle-check text-xl"></i> 
                <span class="font-semibold"><?php echo $success; ?></span>
            </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div class="lg:col-span-8 space-y-6">
                
                <div class="bg-white rounded-2xl p-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div class="p-2 bg-blue-50 text-blue-600 rounded-lg"><i class="fa-regular fa-id-card"></i></div>
                        <h2 class="text-lg font-bold text-slate-800">Basic Information</h2>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Brand Name</label>
                            <div class="relative">
                                <span class="absolute left-4 top-3.5 text-slate-400 transition"><i class="fa-solid fa-copyright"></i></span>
                                <input type="text" name="brand" placeholder="e.g. Apple, Dell" required
                                    class="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition font-semibold text-slate-700 placeholder-slate-400">
                            </div>
                        </div>

                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Model Name</label>
                            <div class="relative">
                                <span class="absolute left-4 top-3.5 text-slate-400 transition"><i class="fa-solid fa-tag"></i></span>
                                <input type="text" name="model" placeholder="e.g. MacBook Pro M3" required
                                    class="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition font-semibold text-slate-700 placeholder-slate-400">
                            </div>
                        </div>

                        <div class="md:col-span-2 input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Product Description</label>
                            <textarea name="description" rows="4" placeholder="Highlight key features and condition..."
                                class="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 placeholder-slate-400 resize-none"></textarea>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div class="p-2 bg-purple-50 text-purple-600 rounded-lg"><i class="fa-solid fa-microchip"></i></div>
                        <h2 class="text-lg font-bold text-slate-800">Technical Specs</h2>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Processor (CPU)</label>
                            <input type="text" name="processor" placeholder="e.g. Intel Core i9-13900H" required
                                class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 font-medium">
                        </div>
                        
                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">RAM Memory</label>
                            <input type="text" name="ram" placeholder="e.g. 32GB DDR5" required
                                class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 font-medium">
                        </div>

                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Storage (SSD/HDD)</label>
                            <input type="text" name="storage" placeholder="e.g. 1TB NVMe Gen4" required
                                class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 font-medium">
                        </div>

                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Graphics (GPU)</label>
                            <input type="text" name="graphics" placeholder="e.g. NVIDIA RTX 4070 8GB"
                                class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 font-medium">
                        </div>

                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Display</label>
                            <input type="text" name="display" placeholder="e.g. 16-inch Liquid Retina XDR"
                                class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 font-medium">
                        </div>

                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Operating System</label>
                            <input type="text" name="operating_system" placeholder="e.g. Windows 11 Pro"
                                class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition text-slate-700 font-medium">
                        </div>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-4 space-y-6">
                
                <div class="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div class="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i class="fa-solid fa-tags"></i></div>
                        <h2 class="text-lg font-bold text-slate-800">Inventory & Pricing</h2>
                    </div>

                    <div class="space-y-4">
                        <div class="input-group">
                            <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Available Stock</label>
                            <div class="flex items-center">
                                <input type="number" name="stock_quantity" value="1" min="0" required
                                    class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none transition font-bold text-slate-800 text-lg">
                            </div>
                        </div>

                        <div class="h-px bg-slate-100 my-2"></div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-[10px] font-bold text-indigo-600 uppercase">Sell (Unit)</label>
                                <input type="number" name="price_individual_sell" step="0.01" placeholder="₹ 0" required
                                    class="w-full px-3 py-2 rounded-lg bg-indigo-50/30 border border-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-indigo-600 uppercase">Sell (Bulk)</label>
                                <input type="number" name="price_bulk_sell" step="0.01" placeholder="₹ 0" required
                                    class="w-full px-3 py-2 rounded-lg bg-indigo-50/30 border border-indigo-100 focus:border-indigo-500 outline-none text-sm font-semibold">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-orange-600 uppercase">Rent (Unit)</label>
                                <input type="number" name="price_individual_lease" step="0.01" placeholder="₹ 0" required
                                    class="w-full px-3 py-2 rounded-lg bg-orange-50/30 border border-orange-100 focus:border-orange-500 outline-none text-sm font-semibold">
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-orange-600 uppercase">Rent (Bulk)</label>
                                <input type="number" name="price_bulk_lease" step="0.01" placeholder="₹ 0" required
                                    class="w-full px-3 py-2 rounded-lg bg-orange-50/30 border border-orange-100 focus:border-orange-500 outline-none text-sm font-semibold">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-pink-50 text-pink-600 rounded-lg"><i class="fa-regular fa-images"></i></div>
                        <h2 class="text-lg font-bold text-slate-800">Gallery</h2>
                    </div>

                    <label class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-indigo-200 rounded-2xl cursor-pointer bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-400 transition group relative overflow-hidden">
                        
                        <div class="flex flex-col items-center justify-center pt-5 pb-6 text-center z-10">
                            <i class="fa-solid fa-cloud-arrow-up text-3xl text-indigo-400 mb-3 group-hover:scale-110 transition duration-300"></i>
                            <p class="mb-1 text-sm text-slate-600 font-semibold">Click to upload images</p>
                            <p class="text-xs text-slate-400">JPG, PNG, GIF or WEBP (Max 20MB/file)</p>
                        </div>
                        <input type="file" name="images[]" id="imageInput" multiple accept="image/*" class="hidden" onchange="handleImagePreview(event)" required>
                    </label>

                    <div id="previewContainer" class="grid grid-cols-3 gap-2 mt-4">
                        </div>
                </div>

                <button type="submit" class="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-300 hover:shadow-indigo-300 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3">
                    <span>Save & Publish</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>

            </div>
        </form>
    </div>

    <script>
        function handleImagePreview(event) {
            const container = document.getElementById('previewContainer');
            container.innerHTML = ''; // Clear previous
            
            const files = event.target.files;

            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    
                    // Client-side 20MB check (20971520 bytes)
                    if(file.size > 20971520) {
                        alert('Warning: ' + file.name + ' is larger than 20MB and may be rejected by the server.');
                    }

                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            const div = document.createElement('div');
                            div.className = 'relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm group';
                            
                            div.innerHTML = `
                                <img src="${e.target.result}" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">
                                    ${i + 1}
                                </div>
                            `;
                            container.appendChild(div);
                        }
                        
                        reader.readAsDataURL(file);
                    }
                }
            }
        }
    </script>

</body>
</html>
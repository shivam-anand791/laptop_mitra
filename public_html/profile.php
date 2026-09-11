<?php
session_start();
// Ensure no whitespace is before this tag to allow header redirection
require_once 'config/database.php';

// --- SECURITY CHECK ---
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Include header AFTER the redirect check to prevents loading UI for non-users
require_once 'includes/header.php'; 

$user_id = $_SESSION['user_id'];
$message = "";
$msg_type = "";

// --- 1. UPDATE PERSONAL INFO ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_personal'])) {
    $fullname = trim($_POST['fullname']);
    $gender   = $_POST['gender'];
    $dob      = $_POST['dob'];
    
    // Validation
    if(empty($fullname)) {
        $message = "Full Name is required.";
        $msg_type = "error";
    } else {
        $stmt = $conn->prepare("UPDATE users SET fullname = ?, gender = ?, dob = ? WHERE id = ?");
        $stmt->bind_param("sssi", $fullname, $gender, $dob, $user_id);
        
        if ($stmt->execute()) {
            $_SESSION['user_name'] = $fullname; // Update session immediately
            $message = "Personal details updated successfully!";
            $msg_type = "success";
        } else {
            $message = "Error updating details.";
            $msg_type = "error";
        }
    }
}

// --- 2. UPDATE ADDRESS ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_contact'])) {
    // Sanitize inputs
    $phone   = trim($_POST['phone']);
    $address = trim($_POST['address']);
    $city    = trim($_POST['city']);
    $state   = trim($_POST['state']);
    $pincode = trim($_POST['pincode']);
    
    $stmt = $conn->prepare("UPDATE users SET phone = ?, address = ?, city = ?, state = ?, pincode = ? WHERE id = ?");
    $stmt->bind_param("sssssi", $phone, $address, $city, $state, $pincode, $user_id);
    
    if ($stmt->execute()) {
        $message = "Address details saved successfully!";
        $msg_type = "success";
    } else {
        $message = "Error updating address.";
        $msg_type = "error";
    }
}

// --- 3. UPDATE PASSWORD ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_password'])) {
    $current_pass = $_POST['current_password'];
    $new_pass     = $_POST['new_password'];
    $confirm_pass = $_POST['confirm_password'];

    $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $user_res = $stmt->get_result()->fetch_assoc();

    if ($user_res && password_verify($current_pass, $user_res['password'])) {
        if ($new_pass === $confirm_pass) {
            if(strlen($new_pass) < 8) {
                $message = "Password must be at least 8 characters.";
                $msg_type = "error";
            } else {
                $hashed = password_hash($new_pass, PASSWORD_DEFAULT);
                $update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $update->bind_param("si", $hashed, $user_id);
                
                if ($update->execute()) {
                    $message = "Password changed successfully!";
                    $msg_type = "success";
                }
            }
        } else {
            $message = "New passwords do not match.";
            $msg_type = "error";
        }
    } else {
        $message = "Current password is incorrect.";
        $msg_type = "error";
    }
}

// --- 4. DATA FETCH ---
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$u = $stmt->get_result()->fetch_assoc();

// Null Coalescing for UI Safety
$u_gender = $u['gender'] ?? ''; 
$u_dob    = $u['dob'] ?? ''; 
$u_phone  = $u['phone'] ?? '';
$u_addr   = $u['address'] ?? ''; 
$u_city   = $u['city'] ?? ''; 
$u_state  = $u['state'] ?? ''; 
$u_pin    = $u['pincode'] ?? '';

// SECURE CART COUNT (Using Prepared Statement)
$cart_stmt = $conn->prepare("SELECT SUM(quantity) as total FROM cart WHERE user_id = ?");
$cart_stmt->bind_param("i", $user_id);
$cart_stmt->execute();
$cart_res = $cart_stmt->get_result()->fetch_assoc();
$cart_count = $cart_res['total'] ?? 0;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile | XpertNote</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            /* Theme Colors */
            --primary: #4f46e5;       
            --primary-dark: #4338ca;
            --secondary: #1e293b;     
            --bg-body: #f8fafc;       
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --success: #10b981;
            --danger: #ef4444;
            --header-height: 80px; 
        }

        body {
            background-color: var(--bg-body);
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: var(--text-main);
            margin: 0;
            padding: 0;
        }

        /* --- LAYOUT GRID --- */
        .profile-container {
            max-width: 1400px; 
            margin: 0 auto; /* Center the container */
            padding: 40px 20px;
            display: grid;
            grid-template-columns: 320px 1fr; 
            gap: 30px;
            align-items: start;
        }

        /* --- SIDEBAR CARD --- */
        .sidebar {
            position: sticky;
            /* Dynamic spacing based on header height + 20px gap */
            top: calc(var(--header-height) + 20px); 
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .user-card {
            background: var(--card-bg);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
            border: 1px solid var(--border);
        }

        .avatar-box {
            width: 100px;
            height: 100px;
            margin: 0 auto 15px;
            border-radius: 50%;
            padding: 4px;
            background: linear-gradient(135deg, var(--primary), #a855f7); 
        }
        .avatar-box img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid var(--card-bg);
            background: #fff;
        }

        .user-name { font-size: 1.25rem; font-weight: 700; color: var(--secondary); margin-bottom: 5px; }
        .user-email { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px; }

        /* Menu Links */
        .side-menu {
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
        }
        .menu-link {
            padding: 12px 16px;
            border-radius: 12px;
            color: var(--text-muted);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
        }
        .menu-link:hover { background: #f1f5f9; color: var(--primary); }
        .menu-link.active { background: #eef2ff; color: var(--primary); }
        .menu-link i { width: 20px; text-align: center; }
        
        .menu-link.logout { color: var(--danger); margin-top: 10px; border-top: 1px solid var(--border); padding-top: 20px; border-radius: 0; }
        .menu-link.logout:hover { background: transparent; color: #dc2626; }

        /* --- MAIN CONTENT --- */
        .content-area {
            display: flex;
            flex-direction: column;
            gap: 30px;
        }

        /* Content Cards */
        .content-card {
            background: var(--card-bg);
            border-radius: 20px;
            padding: 35px;
            box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05);
            border: 1px solid var(--border);
            scroll-margin-top: calc(var(--header-height) + 20px); /* Smooth scroll alignment */
        }

        .card-title {
            font-size: 1.1rem;
            font-weight: 800;
            color: var(--secondary);
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .card-title i { color: var(--primary); }

        /* Form Styling */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        .full-width { grid-column: 1 / -1; }

        .input-wrapper { position: relative; display: flex; flex-direction: column; gap: 8px; }
        
        .input-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-control {
            width: 100%;
            padding: 14px 16px;
            background: #fff;
            border: 2px solid var(--border);
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--secondary);
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
            outline: none;
        }
        .form-control:disabled {
            background: #f8fafc;
            color: #94a3b8;
            cursor: not-allowed;
        }

        /* Fancy Radio Buttons */
        .gender-options { display: flex; gap: 15px; }
        .gender-radio { position: relative; flex: 1; }
        .gender-radio input { position: absolute; opacity: 0; cursor: pointer; }
        .radio-tile {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            border: 2px solid var(--border);
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
            color: var(--text-muted);
        }
        .gender-radio input:checked + .radio-tile {
            background-color: #eef2ff;
            border-color: var(--primary);
            color: var(--primary);
            box-shadow: 0 2px 10px rgba(79, 70, 229, 0.15);
        }

        /* Buttons */
        .btn-save {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-top: 10px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
        }

        /* Alert Messages */
        .alert-box {
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideDown 0.3s ease;
        }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .alert-box.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .alert-box.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

        /* --- RESPONSIVE ADJUSTMENTS --- */
        @media (max-width: 1024px) {
            .profile-container { grid-template-columns: 280px 1fr; }
        }

        @media (max-width: 900px) {
            .profile-container { grid-template-columns: 1fr; }
            
            .sidebar { 
                position: relative; 
                top: 0; 
                flex-direction: row; 
                overflow-x: auto; 
                background: white; 
                padding: 15px; 
                border-radius: 16px; 
                border: 1px solid var(--border);
                align-items: center;
            }
            .user-card { display: none; } /* Hide big card on mobile, show mini header */
            
            /* Horizontal Scroll Menu for Mobile */
            .side-menu { 
                flex-direction: row; 
                width: 100%; 
                white-space: nowrap; 
            }
            .menu-link { 
                background: #f8fafc; 
                border: 1px solid var(--border); 
                padding: 10px 20px; 
                font-size: 0.9rem;
            }
            .menu-link.active { background: var(--primary); color: white; border-color: var(--primary); }
            .menu-link.active:hover { background: var(--primary-dark); color: white; }
            .menu-link.logout { border: none; margin-top: 0; padding-top: 10px; }
        }

        @media (max-width: 600px) {
            .form-grid { grid-template-columns: 1fr; }
            .content-card { padding: 25px; }
            .gender-options { flex-direction: column; gap: 10px; }
        }
    </style>
</head>
<body>

<div class="profile-container">

    <div class="sidebar">
        <div class="user-card">
            <div class="avatar-box">
                <img src="https://ui-avatars.com/api/?name=<?php echo urlencode($u['fullname']); ?>&background=4f46e5&color=fff&size=200&font-size=0.4&bold=true" alt="User">
            </div>
            <div class="user-name"><?php echo htmlspecialchars($u['fullname']); ?></div>
            <div class="user-email"><?php echo htmlspecialchars($u['email']); ?></div>
            <div style="font-size:0.8rem; color:#94a3b8; background:#f1f5f9; padding:5px 10px; border-radius:20px; display:inline-block;">
                Joined: <?php echo date("M Y", strtotime($u['created_at'])); ?>
            </div>
        </div>

        <div class="user-card" style="padding: 15px;">
            <div class="side-menu">
                <a href="#personal" class="menu-link active"><i class="fas fa-user"></i> Personal Info</a>
                <a href="#contact" class="menu-link"><i class="fas fa-map-marker-alt"></i> Address Book</a>
                <a href="cart.php" class="menu-link"><i class="fas fa-shopping-cart"></i> My Cart (<?php echo $cart_count; ?>)</a>
                <a href="#security" class="menu-link"><i class="fas fa-shield-alt"></i> Security</a>
                <a href="logout.php" class="menu-link logout"><i class="fas fa-sign-out-alt"></i> Log Out</a>
            </div>
        </div>
    </div>

    <div class="content-area">

        <?php if($message): ?>
            <div class="alert-box <?php echo $msg_type; ?>">
                <i class="fas <?php echo $msg_type == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?>"></i>
                <span><?php echo $message; ?></span>
            </div>
        <?php endif; ?>

        <div class="content-card" id="personal">
            <div class="card-title"><i class="far fa-id-card"></i> Personal Information</div>
            
            <form method="POST">
                <div class="form-grid">
                    <div class="input-wrapper">
                        <label class="input-label">Full Name</label>
                        <input type="text" name="fullname" class="form-control" value="<?php echo htmlspecialchars($u['fullname']); ?>" required>
                    </div>
                    
                    <div class="input-wrapper">
                        <label class="input-label">Date of Birth</label>
                        <input type="date" name="dob" class="form-control" value="<?php echo $u_dob; ?>">
                    </div>

                    <div class="input-wrapper full-width">
                        <label class="input-label">Gender</label>
                        <div class="gender-options">
                            <label class="gender-radio">
                                <input type="radio" name="gender" value="Male" <?php if($u_gender == 'Male') echo 'checked'; ?>>
                                <div class="radio-tile"><i class="fas fa-male" style="margin-right:8px;"></i> Male</div>
                            </label>
                            <label class="gender-radio">
                                <input type="radio" name="gender" value="Female" <?php if($u_gender == 'Female') echo 'checked'; ?>>
                                <div class="radio-tile"><i class="fas fa-female" style="margin-right:8px;"></i> Female</div>
                            </label>
                            <label class="gender-radio">
                                <input type="radio" name="gender" value="Other" <?php if($u_gender == 'Other') echo 'checked'; ?>>
                                <div class="radio-tile"><i class="fas fa-user" style="margin-right:8px;"></i> Other</div>
                            </label>
                        </div>
                    </div>
                </div>
                <button type="submit" name="update_personal" class="btn-save">
                    Update Details <i class="fas fa-arrow-right"></i>
                </button>
            </form>
        </div>

        <div class="content-card" id="contact">
            <div class="card-title"><i class="fas fa-shipping-fast"></i> Contact & Address</div>
            
            <form method="POST">
                <div class="form-grid">
                    <div class="input-wrapper">
                        <label class="input-label">Email Address</label>
                        <input type="email" class="form-control" value="<?php echo htmlspecialchars($u['email']); ?>" disabled style="cursor: not-allowed; opacity: 0.7;">
                        <small style="color: #94a3b8; font-size: 0.75rem;">Email cannot be changed.</small>
                    </div>
                    <div class="input-wrapper">
                        <label class="input-label">Phone Number</label>
                        <input type="tel" name="phone" class="form-control" value="<?php echo htmlspecialchars($u_phone); ?>" placeholder="Enter 10-digit number">
                    </div>

                    <div class="input-wrapper full-width">
                        <label class="input-label">Address (House No, Street, Area)</label>
                        <textarea name="address" class="form-control" rows="2" placeholder="e.g. Flat 101, Galaxy Apartments..."><?php echo htmlspecialchars($u_addr); ?></textarea>
                    </div>

                    <div class="input-wrapper">
                        <label class="input-label">City</label>
                        <input type="text" name="city" class="form-control" value="<?php echo htmlspecialchars($u_city); ?>">
                    </div>

                    <div class="input-wrapper">
                        <label class="input-label">State</label>
                        <select name="state" class="form-control">
                            <option value="">Select State</option>
                            <?php 
                            $states = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal', 'Bihar', 'Gujarat'];
                            foreach($states as $st) {
                                $sel = ($u_state == $st) ? 'selected' : '';
                                echo "<option value='$st' $sel>$st</option>";
                            }
                            ?>
                        </select>
                    </div>

                    <div class="input-wrapper">
                        <label class="input-label">Pincode</label>
                        <input type="number" name="pincode" class="form-control" value="<?php echo htmlspecialchars($u_pin); ?>">
                    </div>
                </div>
                <button type="submit" name="update_contact" class="btn-save">
                    Save Address <i class="fas fa-save"></i>
                </button>
            </form>
        </div>

        <div class="content-card" id="security">
            <div class="card-title"><i class="fas fa-lock"></i> Security Settings</div>
            
            <form method="POST">
                <div class="form-grid">
                    <div class="input-wrapper full-width">
                        <label class="input-label">Current Password</label>
                        <input type="password" name="current_password" class="form-control" required placeholder="Enter current password to verify">
                    </div>
                    
                    <div class="input-wrapper">
                        <label class="input-label">New Password</label>
                        <input type="password" name="new_password" class="form-control" required placeholder="Min 8 chars">
                    </div>
                    
                    <div class="input-wrapper">
                        <label class="input-label">Confirm New Password</label>
                        <input type="password" name="confirm_password" class="form-control" required placeholder="Re-enter new password">
                    </div>
                </div>
                <button type="submit" name="update_password" class="btn-save" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
                    Change Password <i class="fas fa-key"></i>
                </button>
            </form>
        </div>

    </div>
</div>

<?php include 'includes/footer.php'; ?>
</body>
</html>
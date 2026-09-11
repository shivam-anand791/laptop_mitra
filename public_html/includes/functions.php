<?php
// includes/functions.php

function sanitize($data) {
    global $conn;
    return mysqli_real_escape_string($conn, htmlspecialchars(strip_tags(trim($data))));
}

function uploadImage($file) {
    if(!isset($file) || $file['error'] == UPLOAD_ERR_NO_FILE) {
        return false;
    }
    
    if($file['error'] != UPLOAD_ERR_OK) {
        return false;
    }
    
    // Path correction based on provided structure: includes/../admin/uploads/
    $target_dir = __DIR__ . "/../admin/uploads/"; 
    
    if (!file_exists($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    
    $imageFileType = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
    $newFileName = uniqid() . '.' . $imageFileType;
    $target_file = $target_dir . $newFileName;
    
    $check = getimagesize($file["tmp_name"]);
    if($check === false) {
        return false;
    }
    
    if ($file["size"] > 5000000) {
        return false;
    }
    
    $allowed = array("jpg", "jpeg", "png", "gif");
    if(!in_array($imageFileType, $allowed)) {
        return false;
    }
    
    if (move_uploaded_file($file["tmp_name"], $target_file)) {
        return $newFileName;
    }
    
    return false;
}

// ADMIN FUNCTION: Get single laptop details securely
function getLaptopById($laptop_id) {
    global $conn;
    $stmt = $conn->prepare("SELECT * FROM laptops WHERE id = ?");
    if ($stmt === false) return false;
    $stmt->bind_param("i", $laptop_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $laptop = $result->fetch_assoc();
    $stmt->close();
    return $laptop;
}

// ADMIN FUNCTION: Get all booking details for dashboard
function getAllBookings() {
    global $conn;
    $sql = "SELECT * FROM bookings ORDER BY created_at DESC";
    return $conn->query($sql);
}


function getLaptops($search = '', $brand = '', $processor = '', $ram = '', $storage = '', $minPrice = 0, $maxPrice = 999999, $mode = 'sell') {
    global $conn;
    $sql = "SELECT * FROM laptops WHERE status='active'";
    
    if($search != '') {
        $search = sanitize($search);
        $sql .= " AND (brand LIKE '%$search%' OR model LIKE '%$search%' OR processor LIKE '%$search%')";
    }
    
    if($brand != '') {
        $brand = sanitize($brand);
        $sql .= " AND brand='$brand'";
    }
    
    if($processor != '') {
        $processor = sanitize($processor);
        $sql .= " AND processor='$processor'";
    }
    
    if($ram != '') {
        $ram = sanitize($ram);
        $sql .= " AND ram='$ram'";
    }
    
    if($storage != '') {
        $storage = sanitize($storage);
        $sql .= " AND storage='$storage'";
    }
    
    if($mode == 'sell') {
        $sql .= " AND (price_individual_sell BETWEEN $minPrice AND $maxPrice)";
    } else {
        $sql .= " AND (price_individual_lease BETWEEN $minPrice AND $maxPrice)";
    }
    
    $sql .= " ORDER BY created_at DESC";
    
    return $conn->query($sql);
}

function getBrands() {
    global $conn;
    $sql = "SELECT DISTINCT brand FROM laptops WHERE status='active' ORDER BY brand";
    return $conn->query($sql);
}

function getProcessors() {
    global $conn;
    $sql = "SELECT DISTINCT processor FROM laptops WHERE status='active' ORDER BY processor";
    return $conn->query($sql);
}

function getRamOptions() {
    global $conn;
    $sql = "SELECT DISTINCT ram FROM laptops WHERE status='active' ORDER BY ram";
    return $conn->query($sql);
}

function getStorageOptions() {
    global $conn;
    $sql = "SELECT DISTINCT storage FROM laptops WHERE status='active' ORDER BY storage";
    return $conn->query($sql);
}

// Auth function placeholder
function isLoggedIn() {
    return isset($_SESSION['admin_logged_in']);
}
?>
<?php
// process_booking.php
require_once 'config/database.php';
require_once 'includes/functions.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 1. Sanitize Inputs (Matching Admin Logic)
    $laptop_id      = isset($_POST['laptop_id']) ? (int)$_POST['laptop_id'] : 0;
    $laptop_name    = isset($_POST['laptop_name']) ? trim($_POST['laptop_name']) : '';
    $mode           = isset($_POST['mode']) && in_array($_POST['mode'], ['sell', 'lease']) ? $_POST['mode'] : '';
    $customer_name  = isset($_POST['name']) ? trim($_POST['name']) : '';
    $customer_email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $customer_phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
    $purchase_type  = isset($_POST['purchase_type']) ? $_POST['purchase_type'] : 'individual';
    $quantity       = isset($_POST['quantity']) ? (int)$_POST['quantity'] : 1;
    $address        = isset($_POST['address']) ? trim($_POST['address']) : '';
    $notes          = isset($_POST['notes']) ? trim($_POST['notes']) : '';

    // Basic Validation
    if (!$laptop_id || empty($laptop_name) || empty($customer_name) || empty($customer_email) || empty($customer_phone) || empty($address)) {
        echo "<script>alert('Please fill all required fields.'); window.history.back();</script>";
        exit;
    }

    // 2. Fetch Laptop Price to Calculate price_per_unit (Matching Admin Logic)
    $price_per_unit = 0;
    $stmt = $conn->prepare("SELECT price_individual_sell, price_bulk_sell, price_individual_lease, price_bulk_lease FROM laptops WHERE id = ?");
    $stmt->bind_param("i", $laptop_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $laptop = $result->fetch_assoc();
        
        // Determine the correct price field based on mode and purchase type
        if ($mode === 'sell') {
            $price_per_unit = ($purchase_type === 'bulk') ? $laptop['price_bulk_sell'] : $laptop['price_individual_sell'];
        } else { // 'lease'
            $price_per_unit = ($purchase_type === 'bulk') ? $laptop['price_bulk_lease'] : $laptop['price_individual_lease'];
        }
    } else {
        echo "<script>alert('Laptop not found.'); window.location.href='store.php';</script>";
        exit;
    }
    $stmt->close();

    // 3. Insert into Database (Exactly same structure as Admin)
    $sql = "INSERT INTO bookings (
                laptop_id, laptop_name, customer_name, customer_email, customer_phone, 
                purchase_type, quantity, address, notes, price_per_unit, mode, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')";
    
    if ($insertStmt = $conn->prepare($sql)) {
        // Bind Params: i=int, s=string, d=double/decimal
        $insertStmt->bind_param("isssssisdss", 
            $laptop_id, 
            $laptop_name, 
            $customer_name, 
            $customer_email, 
            $customer_phone, 
            $purchase_type, 
            $quantity, 
            $address, 
            $notes, 
            $price_per_unit, 
            $mode
        );
        
        if ($insertStmt->execute()) {
            // Success: Redirect back to Store
            echo "<script>
                    alert('Booking Request Successful! We will contact you at ' + '$customer_email');
                    window.location.href = 'store.php';
                  </script>";
        } else {
            // SQL Error
            echo "Error: " . $insertStmt->error;
        }
        $insertStmt->close();
    } else {
        echo "Database Prepare Error: " . $conn->error;
    }

} else {
    header("Location: store.php");
    exit;
}
?>
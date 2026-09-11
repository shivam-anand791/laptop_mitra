<?php
// ajax/validate_coupon.php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

$response = ['status' => 'error', 'message' => 'Invalid Request'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON input
    $data = json_decode(file_get_contents('php://input'), true);
    $code = isset($data['code']) ? strtoupper(trim($data['code'])) : '';
    $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0;

    // 1. Basic Validation
    if (empty($code)) {
        echo json_encode(['status' => 'error', 'message' => 'Please enter a code']);
        exit;
    }

    // 2. Prevent Self-Referral (If logged in)
    if ($user_id > 0) {
        $stmt = $conn->prepare("SELECT referral_code FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $userData = $res->fetch_assoc();
        
        if ($userData && strtoupper($userData['referral_code']) === $code) {
            echo json_encode(['status' => 'error', 'message' => 'You cannot use your own code!']);
            exit;
        }
    }

    // 3. Check if Code Exists in DB (Find the Referrer)
    $stmt = $conn->prepare("SELECT id, fullname, referral_code FROM users WHERE referral_code = ?");
    $stmt->bind_param("s", $code);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $referrer = $result->fetch_assoc();
        
        // --- SUCCESS! SAVE TO SESSION ---
        $_SESSION['applied_coupon'] = $referrer['referral_code'];
        $_SESSION['referrer_id'] = $referrer['id']; // We track this ID to pay them later
        $_SESSION['discount_amount'] = 500; // Flat ₹500 Discount

        echo json_encode([
            'status' => 'success', 
            'message' => 'Code Applied! ₹500 Discount Added.',
            'discount' => 500,
            'code' => $referrer['referral_code']
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Referral Code']);
    }
}
?>
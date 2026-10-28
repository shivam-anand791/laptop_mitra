<?php
session_start();
require_once '../config/database.php';

if(!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

if(isset($_FILES['csv_file'])) {
    $file = $_FILES['csv_file']['tmp_name'];

    // Validate file type
    $fileInfo = pathinfo($_FILES['csv_file']['name']);
    if(strtolower($fileInfo['extension']) != 'csv') {
        header("Location: index.php?error=Only CSV files are allowed");
        exit;
    }

    $handle = fopen($file, "r");
    
    // Skip the first row (Header row)
    fgetcsv($handle);

    $success_count = 0;

    while(($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
        // Map CSV columns to Variables (Adjust index based on your CSV format)
        // Expected CSV Format: Brand, Model, Processor, RAM, Storage, Graphics, Price(Sell), Price(Lease), Stock, Desc
        $brand = $conn->real_escape_string($data[0] ?? '');
        $model = $conn->real_escape_string($data[1] ?? '');
        $processor = $conn->real_escape_string($data[2] ?? '');
        $ram = $conn->real_escape_string($data[3] ?? '');
        $storage = $conn->real_escape_string($data[4] ?? '');
        $graphics = $conn->real_escape_string($data[5] ?? '');
        $price_sell = floatval($data[6] ?? 0);
        $price_lease = floatval($data[7] ?? 0);
        $stock = intval($data[8] ?? 0);
        $desc = $conn->real_escape_string($data[9] ?? '');
        
        // Simple Insert Query
        $sql = "INSERT INTO laptops (brand, model, processor, ram, storage, graphics, price_individual_sell, price_individual_lease, stock_quantity, description, status) 
                VALUES ('$brand', '$model', '$processor', '$ram', '$storage', '$graphics', '$price_sell', '$price_lease', '$stock', '$desc', 'active')";
        
        if($conn->query($sql)) {
            $success_count++;
        }
    }

    fclose($handle);
    header("Location: index.php?msg=Successfully imported $success_count laptops");
} else {
    header("Location: index.php?error=No file uploaded");
}
?>
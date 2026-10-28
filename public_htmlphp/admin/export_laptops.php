<?php
session_start();
require_once '../config/database.php';

if(!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

// Set headers to download file
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=laptops_inventory_' . date('Y-m-d') . '.csv');

// Open output stream
$output = fopen('php://output', 'w');

// Define Column Headers (Must match your DB structure logically)
fputcsv($output, array('ID', 'Brand', 'Model', 'Processor', 'RAM', 'Storage', 'Graphics', 'Price (Sell)', 'Price (Lease)', 'Stock', 'Status', 'Description'));

// Fetch Data
$query = "SELECT id, brand, model, processor, ram, storage, graphics, price_individual_sell, price_individual_lease, stock_quantity, status, description FROM laptops ORDER BY id DESC";
$result = $conn->query($query);

while($row = $result->fetch_assoc()) {
    fputcsv($output, $row);
}

fclose($output);
exit;
?>
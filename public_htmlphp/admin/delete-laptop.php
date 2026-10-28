<?php
session_start();
if(!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

require_once '../config/database.php';

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$conn->query("DELETE FROM laptops WHERE id=$id");
header('Location: index.php');
?>
-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Dec 12, 2025 at 08:06 AM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u797209756_laptop`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `password`, `created_at`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2025-12-11 05:58:39');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `laptop_id` int(11) NOT NULL,
  `laptop_name` varchar(255) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_email` varchar(100) NOT NULL,
  `customer_phone` varchar(50) NOT NULL,
  `purchase_type` enum('individual','bulk') NOT NULL,
  `quantity` int(11) NOT NULL,
  `address` text NOT NULL,
  `notes` text DEFAULT NULL,
  `price_per_unit` decimal(10,2) NOT NULL,
  `mode` enum('sell','lease') NOT NULL,
  `status` enum('Pending','Contacted','Completed','Canceled') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `laptops`
--

CREATE TABLE `laptops` (
  `id` int(11) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  `processor` varchar(100) NOT NULL,
  `ram` varchar(50) NOT NULL,
  `storage` varchar(50) NOT NULL,
  `graphics` varchar(100) DEFAULT NULL,
  `display` varchar(50) DEFAULT NULL,
  `operating_system` varchar(50) DEFAULT NULL,
  `price_individual_sell` decimal(10,2) DEFAULT NULL,
  `price_bulk_sell` decimal(10,2) DEFAULT NULL,
  `price_individual_lease` decimal(10,2) DEFAULT NULL,
  `price_bulk_lease` decimal(10,2) DEFAULT NULL,
  `stock_quantity` int(11) DEFAULT 0,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `laptops`
--

INSERT INTO `laptops` (`id`, `brand`, `model`, `processor`, `ram`, `storage`, `graphics`, `display`, `operating_system`, `price_individual_sell`, `price_bulk_sell`, `price_individual_lease`, `price_bulk_lease`, `stock_quantity`, `description`, `image`, `status`, `created_at`) VALUES
(3, 'HP', 'Spectre x360', 'Intel Core i7-14700K', '32GB DDR5', '1TB NVMe SSD', 'Intel Iris Xe', '13.5\" OLED 3K', 'Windows 11 Pro', 125000.00, 115000.00, 4800.00, 4200.00, 15, 'Premium convertible laptop with stunning display and powerful performance.', 'lptp_hp_spectre.png', 'active', '2025-12-11 09:40:00'),
(4, 'Lenovo', 'ThinkPad T14 Gen 4', 'AMD Ryzen 7 Pro 7840U', '16GB DDR5', '512GB NVMe SSD', 'AMD Radeon 780M', '14\" FHD+', 'Windows 11 Pro', 85000.00, 78000.00, 3200.00, 2900.00, 45, 'Business standard rugged laptop, excellent keyboard and battery life.', 'lptp_lenovo_t14.png', 'active', '2025-12-11 09:42:00'),
(5, 'Apple', 'MacBook Air M2', 'Apple M2 Chip (8-Core)', '8GB Unified', '256GB SSD', '8-core GPU', '13.6\" Liquid Retina', 'macOS Sonoma', 99000.00, 95000.00, 4000.00, 3800.00, 60, 'Thin, light, and fanless design with incredible efficiency and speed.', 'lptp_macbook_air.png', 'active', '2025-12-11 09:44:00'),
(6, 'Asus', 'ROG Zephyrus G14', 'AMD Ryzen 9 7940HS', '16GB DDR5', '1TB NVMe SSD', 'NVIDIA GeForce RTX 4060', '14\" QHD+ 120Hz', 'Windows 11 Home', 150000.00, 142000.00, 5500.00, 5000.00, 10, 'Compact gaming powerhouse with high refresh rate display.', 'lptp_asus_rog.png', 'active', '2025-12-11 09:46:00'),
(7, 'Microsoft', 'Surface Laptop 5', 'Intel Core i5-1245U', '8GB LPDDR5X', '512GB SSD', 'Intel Iris Xe', '13.5\" PixelSense', 'Windows 11 Home', 72000.00, 68000.00, 3000.00, 2700.00, 25, 'Sleek design with touchscreen and Alcantara keyboard finish.', 'lptp_ms_surface.png', 'active', '2025-12-11 09:48:00'),
(8, 'Acer', 'Swift X', 'Intel Core i5-13500H', '16GB LPDDR4X', '512GB SSD', 'NVIDIA GeForce RTX 3050', '14\" FHD', 'Windows 11 Home', 65000.00, 60000.00, 2500.00, 2200.00, 22, 'Lightweight creator laptop balancing portability and power.', 'lptp_acer_swift.png', 'active', '2025-12-11 09:50:00'),
(9, 'HP', 'EliteBook 840 G10', 'Intel Core i7-1365U', '32GB DDR5', '1TB NVMe SSD', 'Intel Iris Xe', '14\" WUXGA Anti-Glare', 'Windows 11 Pro', 110000.00, 100000.00, 4500.00, 4000.00, 30, 'Enterprise-grade security and collaboration features.', 'lptp_hp_elitebook.png', 'active', '2025-12-11 09:52:00'),
(10, 'Dell', 'Latitude 5540', 'Intel Core i5-1335U', '16GB DDR4', '256GB SSD', 'Intel Iris Xe', '15.6\" FHD', 'Windows 10 Pro', 68000.00, 64000.00, 2800.00, 2500.00, 55, 'Reliable business laptop, easy to maintain and upgrade.', 'lptp_dell_latitude.png', 'active', '2025-12-11 09:54:00'),
(11, 'Lenovo', 'IdeaPad Slim 5', 'AMD Ryzen 5 7530U', '8GB DDR4', '512GB SSD', 'AMD Radeon Graphics', '14\" FHD IPS', 'Windows 11 Home', 48000.00, 45000.00, 1900.00, 1600.00, 75, 'Excellent value for money for everyday tasks and students.', 'lptp_lenovo_ideapad.png', 'active', '2025-12-11 09:56:00'),
(12, 'Apple', 'MacBook Pro 16', 'Apple M3 Pro Chip (12-Core)', '18GB Unified', '512GB SSD', '18-core GPU', '16.2\" Liquid Retina XDR', 'macOS Sonoma', 229000.00, 215000.00, 9500.00, 8500.00, 5, 'Ultimate performance for professional video editing and development.', 'lptp_macbook_pro16.png', 'active', '2025-12-11 09:58:00'),
(13, 'Razer', 'Blade 15', 'Intel Core i9-13950H', '32GB DDR5', '1TB NVMe SSD', 'NVIDIA GeForce RTX 4070', '15.6\" QHD 240Hz', 'Windows 11 Home', 195000.00, 180000.00, 7800.00, 7000.00, 8, 'Premium gaming laptop with a highly durable, slim chassis.', 'lptp_razer_blade.png', 'active', '2025-12-11 10:00:00'),
(14, 'LG', 'Gram 17', 'Intel Core i7-1360P', '16GB LPDDR5', '1TB NVMe SSD', 'Intel Iris Xe', '17\" WQXGA', 'Windows 11 Home', 105000.00, 98000.00, 4300.00, 3900.00, 18, 'Incredibly lightweight 17-inch laptop, perfect for mobility.', 'lptp_lg_gram.png', 'active', '2025-12-11 10:02:00'),
(15, 'HP', 'Omen 16', 'Intel Core i7-14900HX', '16GB DDR5', '1TB NVMe SSD', 'NVIDIA GeForce RTX 4080', '16.1\" FHD 165Hz', 'Windows 11 Home', 165000.00, 155000.00, 6500.00, 6000.00, 12, 'High-end gaming laptop with powerful cooling and performance.', 'lptp_hp_omen.png', 'active', '2025-12-11 10:04:00'),
(16, 'Dell', 'XPS 13 9315', 'Intel Core i7-1250U', '16GB LPDDR5', '512GB SSD', 'Intel Iris Xe', '13.4\" FHD+', 'Windows 11 Home', 90000.00, 85000.00, 3700.00, 3400.00, 28, 'Ultra-compact and modern design for premium mobile experience.', 'lptp_dell_xps13.png', 'active', '2025-12-11 10:06:00'),
(17, 'Lenovo', 'ThinkPad E16', 'Intel Core i3-1315U', '8GB DDR4', '256GB SSD', 'Intel UHD Graphics', '16\" WUXGA', 'Windows 11 Pro', 45000.00, 41000.00, 1800.00, 1500.00, 80, 'Budget-friendly business machine for large-scale deployments.', 'lptp_lenovo_e16.png', 'active', '2025-12-11 10:08:00'),
(18, 'Asus', 'Zenbook 14 Flip OLED', 'AMD Ryzen 5 7530U', '16GB LPDDR4X', '512GB SSD', 'AMD Radeon Graphics', '14\" 2.8K OLED Touch', 'Windows 11 Home', 78000.00, 72000.00, 3000.00, 2700.00, 16, 'Versatile 2-in-1 laptop with a vibrant OLED display.', 'lptp_asus_zenbook.png', 'active', '2025-12-11 10:10:00'),
(19, 'MSI', 'Creator Z17', 'Intel Core i9-13980HX', '64GB DDR5', '2TB NVMe SSD', 'NVIDIA RTX 4090', '17\" QHD+ Touch', 'Windows 11 Pro', 310000.00, 290000.00, 12000.00, 11000.00, 3, 'Extreme performance for professional 3D and media creation.', 'lptp_msi_creator.png', 'active', '2025-12-11 10:12:00'),
(20, 'Dell', 'G15 Gaming', 'Intel Core i5-13450HX', '16GB DDR5', '512GB SSD', 'NVIDIA GeForce RTX 4050', '15.6\" FHD 120Hz', 'Windows 11 Home', 75000.00, 70000.00, 3100.00, 2800.00, 40, 'Budget-focused gaming laptop with solid mid-range specs.', 'lptp_dell_g15.png', 'active', '2025-12-11 10:14:00'),
(21, 'Samsung', 'Galaxy Book3 Pro', 'Intel Core i7-1360P', '16GB LPDDR5', '512GB SSD', 'Intel Iris Xe', '14\" AMOLED 2.8K', 'Windows 11 Home', 92000.00, 85000.00, 3800.00, 3500.00, 19, 'Feather-light with a stunning AMOLED display and seamless Galaxy ecosystem integration.', 'lptp_samsung_book3.png', 'active', '2025-12-11 10:16:00'),
(22, 'Lenovo', 'Legion Pro 7i', 'Intel Core i9-14900HX', '32GB DDR5', '1TB NVMe SSD', 'NVIDIA GeForce RTX 4090', '16\" WQXGA 240Hz', 'Windows 11 Home', 250000.00, 235000.00, 10000.00, 9000.00, 7, 'Top-tier gaming performance with advanced thermal design.', 'lptp_lenovo_legion.png', 'active', '2025-12-11 10:18:00'),
(23, 'HP', 'ZBook Firefly 14', 'Intel Core i7-1355U', '32GB DDR5', '512GB NVMe SSD', 'NVIDIA RTX A500', '14\" FHD DreamColor', 'Windows 11 Pro', 140000.00, 130000.00, 5200.00, 4700.00, 14, 'Professional workstation laptop optimized for creative and technical software.', 'lptp_hp_zbook.png', 'active', '2025-12-11 10:20:00'),
(24, 'Acer', 'Predator Helios 18', 'Intel Core i9-14900HX', '64GB DDR5', '2TB NVMe SSD', 'NVIDIA GeForce RTX 4080', '18\" QHD+ 240Hz', 'Windows 11 Home', 205000.00, 190000.00, 8500.00, 7800.00, 6, 'Massive screen and liquid metal cooling for extreme gaming.', 'lptp_acer_predator.png', 'active', '2025-12-11 10:22:00'),
(25, 'Apple', 'MacBook Air M1', 'Apple M1 Chip (8-Core)', '8GB Unified', '256GB SSD', '7-core GPU', '13.3\" Retina', 'macOS Monterey', 75000.00, 70000.00, 3000.00, 2500.00, 35, 'Previous generation but still a great budget option for reliable performance.', 'lptp_macbook_air_m1.png', 'inactive', '2025-12-11 10:24:00'),
(26, 'Microsoft', 'Surface Pro 9', 'Intel Core i7-1255U', '16GB LPDDR5', '256GB SSD', 'Intel Iris Xe', '13\" PixelSense Flow', 'Windows 11 Pro', 105000.00, 98000.00, 4200.00, 3800.00, 11, 'Versatile 2-in-1 tablet that acts as a powerful laptop.', 'lptp_ms_surfacepro.png', 'active', '2025-12-11 10:26:00'),
(27, 'Dell', 'Alienware m18', 'AMD Ryzen 9 7945HX', '64GB DDR5', '4TB NVMe SSD', 'NVIDIA GeForce RTX 4090', '18\" QHD+ 165Hz', 'Windows 11 Home', 350000.00, 330000.00, 14000.00, 13000.00, 2, 'The largest and most powerful Alienware gaming machine.', '693aa99313650.jpg', 'active', '2025-12-11 10:28:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `laptops`
--
ALTER TABLE `laptops`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laptops`
--
ALTER TABLE `laptops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

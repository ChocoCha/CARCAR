-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               12.3.2-MariaDB - MariaDB Server
-- Server OS:                    Win64
-- HeidiSQL Version:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for car_booking_db
CREATE DATABASE IF NOT EXISTS `car_booking_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `car_booking_db`;

-- Dumping structure for table car_booking_db.bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vehicle_id` varchar(50) DEFAULT NULL,
  `vehicle_model` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `borrower` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` varchar(20) DEFAULT 'active',
  `destination` varchar(255) DEFAULT NULL,
  `returned_mileage` int(11) DEFAULT NULL,
  `start_mileage` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_bookings_vehicles` (`vehicle_id`),
  KEY `fk_bookings_users` (`borrower`),
  CONSTRAINT `fk_bookings_users` FOREIGN KEY (`borrower`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_vehicles` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table car_booking_db.bookings: ~35 rows (approximately)
INSERT INTO `bookings` (`id`, `vehicle_id`, `vehicle_model`, `start_date`, `end_date`, `borrower`, `created_at`, `status`, `destination`, `returned_mileage`, `start_mileage`) VALUES
	(82, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-19', '2026-10-19', 'ADMIN', '2026-10-19 08:07:20', 'returned', '1', 270, 255),
	(83, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-19', '2026-10-19', 'ADMIN', '2026-10-19 08:35:39', 'returned', '1', 10, 0),
	(84, 'v4', 'ทีม Sale (รถเก๋งสีเทา)', '2026-10-19', '2026-10-19', 'ADMIN', '2026-10-19 08:42:32', 'late_returned', '1', 512, 0),
	(85, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-19', '2026-10-19', 'ADMIN', '2026-10-19 08:42:41', 'late_returned', '1', 10555, 10),
	(86, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-19', '2026-10-19', 'ADMIN', '2026-10-19 08:52:06', 'late_returned', '2', 280, 270),
	(87, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 02:06:16', 'cancelled', '3', NULL, 270),
	(88, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 03:12:50', 'returned', 'gmujp;', 288, 280),
	(89, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 03:22:23', 'cancelled', 'เเ', NULL, 10555),
	(90, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-22', '2026-10-22', 'ADMIN', '2026-10-20 03:53:55', 'cancelled', 'ดดด', NULL, 288),
	(91, 'v4', 'ทีม Sale (รถเก๋งสีเทา)', '2026-10-22', '2026-10-22', 'ADMIN', '2026-10-20 03:54:37', 'cancelled', 'ggg', NULL, 512),
	(92, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-23', '2026-10-23', 'ADMIN', '2026-10-20 03:55:19', 'cancelled', 'gg', NULL, 288),
	(93, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 03:56:14', 'cancelled', 'vv', NULL, 288),
	(94, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-24', '2026-10-24', 'ADMIN', '2026-10-20 03:58:08', 'cancelled', 'fff', NULL, 10555),
	(95, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 03:59:48', 'cancelled', 'ดดด', NULL, 10555),
	(96, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-21', '2026-10-21', 'ADMIN', '2026-10-20 04:00:28', 'cancelled', 'กกก', NULL, 10555),
	(97, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-22', '2026-10-22', 'ADMIN', '2026-10-20 04:00:47', 'cancelled', 'กกก', NULL, 10555),
	(98, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-22', '2026-10-22', 'ADMIN', '2026-10-20 04:02:24', 'cancelled', 'หหห', NULL, 288),
	(99, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-21', '2026-10-21', 'ADMIN', '2026-10-20 04:03:52', 'cancelled', 'กก', NULL, 288),
	(100, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 04:07:43', 'cancelled', 'พพ', NULL, 288),
	(101, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 04:09:17', 'active', 'หหห', NULL, 288),
	(102, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-22', '2026-10-22', 'ADMIN', '2026-10-20 04:16:45', 'active', 'าา', NULL, 288),
	(103, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-23', '2026-10-23', 'ADMIN', '2026-10-20 04:17:11', 'active', 'เเเ', NULL, 288),
	(104, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-24', '2026-10-24', 'ADMIN', '2026-10-20 04:17:57', 'cancelled', 'เเเ', NULL, 10555),
	(105, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-24', '2026-10-24', 'ADMIN', '2026-10-20 04:19:27', 'active', '1', NULL, 288),
	(106, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-25', '2026-10-25', 'ADMIN', '2026-10-20 04:20:41', 'returned', '2', 289, 288),
	(107, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-26', '2026-10-26', 'ADMIN', '2026-10-20 04:21:24', 'cancelled', '2', NULL, 288),
	(108, 'v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '2026-10-21', '2026-10-21', 'ADMIN', '2026-10-20 05:00:06', 'active', '2', NULL, 288),
	(109, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-21', '2026-10-21', 'ADMIN', '2026-10-20 09:40:20', 'active', '2', NULL, 10555),
	(111, 'v4', 'ทีม Sale (รถเก๋งสีเทา)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 09:42:58', 'active', '2', NULL, 512),
	(112, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-20', '2026-10-20', 'ADMIN', '2026-10-20 09:48:17', 'cancelled', 'ว่างแล้วหายติดจองไหม', NULL, 10555),
	(113, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-11-05', '2026-12-10', 'TEST', '2026-10-20 10:13:36', 'cancelled', 'เที่ยว', NULL, 10555),
	(114, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-11-04', '2026-12-10', 'TEST', '2026-10-20 10:14:59', 'cancelled', '้้้้่่เที่ยว', NULL, 10555),
	(115, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-11-04', '2026-12-07', 'TEST', '2026-10-20 10:15:54', 'returned', 'เที่ว', 10555, 10555),
	(116, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-30', '2026-10-30', 'TEST', '2026-10-21 03:52:02', 'returned', 'NASA', 10888, 10555),
	(117, 'v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '2026-10-22', '2026-10-22', 'TEST', '2026-10-21 03:55:57', 'returned', 'คนละครึ่ง', 10888, 10888);

-- Dumping structure for table car_booking_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `dept` varchar(100) DEFAULT 'ไม่ระบุแผนก',
  `role` varchar(20) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table car_booking_db.users: ~3 rows (approximately)
INSERT INTO `users` (`username`, `password`, `name`, `dept`, `role`) VALUES
	('ADMIN', 'admin1234', 'ผู้ดูแลระบบ', 'ฝ่ายไอที', 'admin'),
	('TEST', '1234', 'User', 'test', 'employee');

-- Dumping structure for table car_booking_db.vehicles
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` varchar(50) NOT NULL,
  `model` varchar(100) NOT NULL,
  `plate` varchar(50) NOT NULL,
  `seats` int(11) NOT NULL,
  `image` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'available',
  `act_expiry_date` date DEFAULT NULL,
  `act_number` varchar(100) DEFAULT NULL,
  `mileage` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table car_booking_db.vehicles: ~4 rows (approximately)
INSERT INTO `vehicles` (`id`, `model`, `plate`, `seats`, `image`, `status`, `act_expiry_date`, `act_number`, `mileage`) VALUES
	('v1', 'ทีม Service (กระบะขาวมีหลังคา)', '3 ฒส 156', 5, 'http://localhost:5000/uploads/1783062687711-516965732.jpg', 'maintenance', '2026-11-11', '1114', 0),
	('v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '3 ฒส 154', 5, 'http://localhost:5000/uploads/1783062830293-938957789.jpg', 'available', '2027-05-18', '2222', 289),
	('v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '6 ขผ 5217', 5, 'http://localhost:5000/uploads/1783062851558-201955113.jpg', 'available', '2027-12-31', '3333', 10888),
	('v4', 'ทีม Sale (รถเก๋งสีเทา)', '5 ขธ 154', 5, 'http://localhost:5000/uploads/1783062870841-809457546.jpg', 'available', '2027-09-23', '', 512);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

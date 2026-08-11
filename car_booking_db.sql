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
  PRIMARY KEY (`id`),
  KEY `fk_bookings_vehicles` (`vehicle_id`),
  KEY `fk_bookings_users` (`borrower`),
  CONSTRAINT `fk_bookings_users` FOREIGN KEY (`borrower`) REFERENCES `users` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_vehicles` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table car_booking_db.bookings: ~0 rows (approximately)

-- Dumping structure for table car_booking_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `dept` varchar(100) DEFAULT 'ไม่ระบุแผนก',
  `role` varchar(20) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table car_booking_db.users: ~1 rows (approximately)
INSERT INTO `users` (`username`, `password`, `name`, `dept`, `role`) VALUES
	('ADMIN', 'admin1234', 'ผู้ดูแลระบบ', 'ฝ่ายไอที', 'admin');

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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table car_booking_db.vehicles: ~4 rows (approximately)
INSERT INTO `vehicles` (`id`, `model`, `plate`, `seats`, `image`, `status`, `act_expiry_date`, `act_number`) VALUES
	('v1', 'ทีม Service (กระบะขาวมีหลังคา)', '3 ฒส 156', 5, 'http://localhost:5000/uploads/1783062687711-516965732.jpg', 'maintenance', '2026-08-17', '1114'),
	('v2', 'ทีม Installer (กระบะขาวหลังคาสูง)', '3 ฒส 154', 5, 'http://localhost:5000/uploads/1783062830293-938957789.jpg', 'available', '2027-05-11', '2222'),
	('v3', 'ทีม Infra (กระบะสี่ประตูสีดำ)', '6 ขผ 5217', 5, 'http://localhost:5000/uploads/1783062851558-201955113.jpg', 'available', '2027-01-01', '3333'),
	('v4', 'ทีม Sale (รถเก๋งสีเทา)', '5 ขธ 154', 5, 'http://localhost:5000/uploads/1783062870841-809457546.jpg', 'available', '2026-09-24', '');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

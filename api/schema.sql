-- Database Schema for Shukan Packaging Expense Management ERP
-- Database Name: shukan_expense_db

CREATE DATABASE IF NOT EXISTS `shukan_expense_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `shukan_expense_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'Partner',
  `status` VARCHAR(20) DEFAULT 'Active',
  `avatar` VARCHAR(255) DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial Users Seed Data
INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `status`) VALUES
('vraj', 'Vraj', 'vraj', 'admin123', 'Partner', 'Active'),
('raj', 'Raj', 'raj', 'partner123', 'Partner', 'Active'),
('teerth', 'Teerth', 'teerth', 'partner123', 'Partner', 'Active'),
('mayank', 'Mayank', 'mayank', 'partner123', 'Partner', 'Active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `type` VARCHAR(20) NOT NULL, -- 'Cash In' / 'Cash Out' / 'Credit' / 'Debit'
  `userName` VARCHAR(100) NOT NULL,
  `depositTo` VARCHAR(100) DEFAULT 'My Hand',
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(100) DEFAULT 'General',
  `description` TEXT,
  `status` VARCHAR(20) DEFAULT 'Done', -- 'Done' / 'Due'
  `notes` TEXT,
  `createdBy` VARCHAR(100) DEFAULT 'Admin',
  `isAllocation` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Vault Deposits Table
CREATE TABLE IF NOT EXISTS `vault_deposits` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `userName` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  `txnId` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'Done',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Allocations History Table
CREATE TABLE IF NOT EXISTS `allocations_history` (
  `id` VARCHAR(50) PRIMARY KEY,
  `userName` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'User Transfer',
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `date` DATE NOT NULL,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. User Allocations Table
CREATE TABLE IF NOT EXISTS `user_allocations` (
  `userName` VARCHAR(100) PRIMARY KEY,
  `allocated` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `currency` VARCHAR(10) DEFAULT '₹',
  `currencyCode` VARCHAR(10) DEFAULT 'INR',
  `companyName` VARCHAR(150) DEFAULT 'Shukan Packaging',
  `lowBalanceAlert` DECIMAL(15,2) DEFAULT 5000.00,
  `approvalThreshold` DECIMAL(15,2) DEFAULT 20000.00,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `settings` (`id`, `currency`, `currencyCode`, `companyName`, `lowBalanceAlert`, `approvalThreshold`) VALUES
(1, '₹', 'INR', 'Shukan Packaging', 5000.00, 20000.00)
ON DUPLICATE KEY UPDATE `currency` = VALUES(`currency`);

-- 7. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `assignedTo` VARCHAR(100) DEFAULT 'All',
  `priority` VARCHAR(20) DEFAULT 'Medium',
  `category` VARCHAR(50) DEFAULT 'General',
  `status` VARCHAR(20) DEFAULT 'Pending',
  `dueDate` DATE DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

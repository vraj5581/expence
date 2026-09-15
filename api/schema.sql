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
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `status`) VALUES
('vraj', 'Vraj', 'vraj', 'vraj12', 'Partner', 'Active'),
('raj', 'Raj', 'raj', 'raj12', 'Partner', 'Active'),
('teerth', 'Teerth', 'teerth', 'teerth12', 'Partner', 'Active'),
('mayank', 'Mayank', 'mayank', 'mayank12', 'Partner', 'Active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Debit Transactions Table (Expenses / Cash Out)
CREATE TABLE IF NOT EXISTS `debit_transactions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `userName` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(100) DEFAULT 'General',
  `description` TEXT,
  `status` VARCHAR(20) DEFAULT 'Done',
  `notes` TEXT,
  `createdBy` VARCHAR(100) DEFAULT 'Admin',
  `depositTo` VARCHAR(100) DEFAULT 'My Hand',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_debit_date_created` (`date` DESC, `created_at` DESC),
  INDEX `idx_debit_user` (`userName`),
  INDEX `idx_debit_deposit` (`depositTo`),
  INDEX `idx_debit_status` (`status`),
  INDEX `idx_debit_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Credit Transactions Table (Inflows / Cash In)
CREATE TABLE IF NOT EXISTS `credit_transactions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `userName` VARCHAR(100) NOT NULL,
  `depositTo` VARCHAR(100) DEFAULT 'My Hand',
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `category` VARCHAR(100) DEFAULT 'General',
  `description` TEXT,
  `status` VARCHAR(20) DEFAULT 'Done',
  `notes` TEXT,
  `createdBy` VARCHAR(100) DEFAULT 'Admin',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_credit_date_created` (`date` DESC, `created_at` DESC),
  INDEX `idx_credit_user` (`userName`),
  INDEX `idx_credit_deposit` (`depositTo`),
  INDEX `idx_credit_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Vault Deposits Table
CREATE TABLE IF NOT EXISTS `vault_deposits` (
  `id` VARCHAR(50) PRIMARY KEY,
  `date` DATE NOT NULL,
  `userName` VARCHAR(100) NOT NULL,
  `depositTo` VARCHAR(100) DEFAULT 'Company Wallet',
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT,
  `txnId` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(20) DEFAULT 'Done',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vault_date_created` (`date` DESC, `created_at` DESC),
  INDEX `idx_vault_txnid` (`txnId`),
  INDEX `idx_vault_user` (`userName`),
  INDEX `idx_vault_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Allocations History Table
CREATE TABLE IF NOT EXISTS `allocations_history` (
  `id` VARCHAR(50) PRIMARY KEY,
  `userName` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'User Transfer',
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `date` DATE NOT NULL,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_alloc_date_created` (`date` DESC, `created_at` DESC),
  INDEX `idx_alloc_user` (`userName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `currency` VARCHAR(10) DEFAULT '₹',
  `currencyCode` VARCHAR(10) DEFAULT 'INR',
  `companyName` VARCHAR(150) DEFAULT 'Shukan Packaging',
  `lowBalanceAlert` DECIMAL(15,2) DEFAULT 5000.00,
  `approvalThreshold` DECIMAL(15,2) DEFAULT 20000.00,
  `banks` VARCHAR(255) DEFAULT 'IOB Bank, BOB Bank',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `settings` (`id`, `currency`, `currencyCode`, `companyName`, `lowBalanceAlert`, `approvalThreshold`, `banks`) VALUES
(1, '₹', 'INR', 'Shukan Packaging', 5000.00, 20000.00, 'IOB Bank, BOB Bank')
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
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tasks_created` (`created_at` DESC),
  INDEX `idx_tasks_status` (`status`),
  INDEX `idx_tasks_assigned` (`assignedTo`),
  INDEX `idx_tasks_due` (`dueDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Audit Logs Table (Entry modifications & edit history)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `editorName` VARCHAR(100) NOT NULL,
  `txnId` VARCHAR(50) DEFAULT NULL,
  `txnType` VARCHAR(50) DEFAULT 'Entry',
  `entrySummary` TEXT,
  `changeDetails` TEXT,
  `date` DATE NOT NULL,
  `time` VARCHAR(30) DEFAULT '',
  `oldData` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_created_id` (`created_at` DESC, `id` DESC),
  INDEX `idx_audit_txnid` (`txnId`),
  INDEX `idx_audit_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Box Calculations Table
CREATE TABLE IF NOT EXISTS `box_calculations` (
  `id` VARCHAR(50) PRIMARY KEY,
  `boxName` VARCHAR(255) DEFAULT '',
  `inputMode` VARCHAR(20) DEFAULT 'dimensions',
  `length` DECIMAL(10,2) DEFAULT 0.00,
  `width` DECIMAL(10,2) DEFAULT 0.00,
  `height` DECIMAL(10,2) DEFAULT 0.00,
  `decalSize` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cuttingSize` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `gsm1` DECIMAL(10,2) DEFAULT 0.00,
  `gsm2` DECIMAL(10,2) DEFAULT 0.00,
  `gsm3` DECIMAL(10,2) DEFAULT 0.00,
  `fluting` DECIMAL(10,2) DEFAULT 40.00,
  `formulaMode` VARCHAR(30) DEFAULT 'takeup',
  `linerWeight` DECIMAL(15,2) DEFAULT 0.00,
  `paperWeight` DECIMAL(15,2) DEFAULT 0.00,
  `totalWeight` DECIMAL(15,2) DEFAULT 0.00,
  `batchQuantity` INT DEFAULT 1,
  `batchWeight` DECIMAL(15,2) DEFAULT 0.00,
  `paperRate` DECIMAL(15,2) DEFAULT 0.00,
  `totalCost` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_box_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

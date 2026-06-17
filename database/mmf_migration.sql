-- ============================================================
-- MMF Migration: Fix request type code + add MMF data table
-- Run this against your mpc_ers database
-- ============================================================

-- 1. Fix the request type code from 'MMF-005493' to 'MMF'
UPDATE `tbl_request_types`
SET `code` = 'MMF',
    `name` = 'Material Maintenance Request Form'
WHERE `code` = 'MMF-005493';

-- 2. If the row doesn't exist yet, insert it
INSERT IGNORE INTO `tbl_request_types` (`id`, `code`, `name`, `description`, `is_active`)
VALUES (5, 'MMF', 'Material Maintenance Request Form', 'Material master data creation/modification/blocking', 1);

-- 3. Create the MMF-specific data table (mirrors pattern of other form tables)
CREATE TABLE IF NOT EXISTS `tbl_mmf_data` (
  `id`                    INT(11) NOT NULL AUTO_INCREMENT,
  `request_id`            INT(11) NOT NULL,

  -- Nature of Request
  `nature_of_request`     VARCHAR(50)   DEFAULT NULL,
  `material_no_flag`      VARCHAR(20)   DEFAULT NULL,
  `batch_no_flag`         VARCHAR(20)   DEFAULT NULL,
  `universal_blocking`    TINYINT(1)    DEFAULT 0,

  -- Material Type (comma-separated selections)
  `material_type`         VARCHAR(255)  DEFAULT NULL,

  -- Sales Organization (comma-separated)
  `sales_organization`    VARCHAR(255)  DEFAULT NULL,

  -- Pillar (comma-separated)
  `pillar`                VARCHAR(255)  DEFAULT NULL,

  -- General Data
  `material_no`           VARCHAR(100)  DEFAULT NULL,
  `brand_mother`          VARCHAR(100)  DEFAULT NULL,
  `item_code`             VARCHAR(100)  DEFAULT NULL,
  `brand_vendor`          VARCHAR(100)  DEFAULT NULL,
  `description`           VARCHAR(500)  DEFAULT NULL,
  `uom`                   VARCHAR(50)   DEFAULT NULL,
  `dimension`             VARCHAR(100)  DEFAULT NULL,
  `gross_weight`          VARCHAR(50)   DEFAULT NULL,
  `department`            VARCHAR(100)  DEFAULT NULL,
  `brand_category`        VARCHAR(50)   DEFAULT NULL,
  `sub_dept`              VARCHAR(100)  DEFAULT NULL,
  `matl_category`         VARCHAR(100)  DEFAULT NULL,
  `matl_sub_cat`          VARCHAR(100)  DEFAULT NULL,
  `class_assignment`      VARCHAR(100)  DEFAULT NULL,
  `price`                 VARCHAR(50)   DEFAULT NULL,

  -- Procurement / Purchasing Data
  `procurement_type`      VARCHAR(255)  DEFAULT NULL,

  -- Remarks
  `remarks_comments`      TEXT          DEFAULT NULL,
  `please_see_attachment` TINYINT(1)    DEFAULT 0,

  `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  CONSTRAINT `tbl_mmf_data_ibfk_1`
    FOREIGN KEY (`request_id`) REFERENCES `tbl_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

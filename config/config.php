<?php
// config/config.php - PHP 7.0+ Compatible

define('APP_NAME', 'MPC Electronic Request System');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost/mpc-ers/public');
define('BASE_PATH', dirname(__DIR__));

// JWT Configuration
define('JWT_SECRET', 'MPC_ERS_CBK_S3cur3_JWT_K3y_2025!@#');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRY', 3600 * 8);
define('JWT_REFRESH_EXPIRY', 3600 * 24 * 7);

// File Upload Configuration
// define('UPLOAD_PATH', BASE_PATH . '/storage/uploads/');
define('UPLOAD_PATH', __DIR__ . '/../storage/uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024);
define('ALLOWED_FILE_TYPES', ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

// Pagination
define('ITEMS_PER_PAGE', 15);

// Request Number Prefix
define('REQUEST_PREFIX', 'MDCU-ERS-');

// Environment
define('ENVIRONMENT', 'production');

// ─── Mail Configuration ───────────────────────────────────────────
// Uses PHP mail() by default. For SMTP, configure your server's
// sendmail / SMTP relay (e.g. via php.ini SMTP settings on Windows,
// or a local postfix/sendmail relay on Linux).
define('MAIL_FROM_NAME',    'MDCU-ERS System');
define('MAIL_FROM_ADDRESS', 'noreply@cobankiat.com.ph');
define('MAIL_ENABLED',      true);   // set false to disable all emails

// SMTP settings (used if you swap mail() for PHPMailer/SMTP)
define('MAIL_SMTP_HOST',     'smtp.gmail.com');
define('MAIL_SMTP_PORT',     587);
define('MAIL_SMTP_USERNAME', 'jayrrolloque16@gmail.com');
define('MAIL_SMTP_PASSWORD', 'harbpimrkadneshq');
define('MAIL_SMTP_SECURE',   'tls');  // tls or ssl
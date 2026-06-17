<?php
// public/index.php — Application Entry Point
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../storage/logs/php_errors.log');

ob_start();

// ── Load Config ──────────────────────────────────────────────────
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/ldap.php';

// ── Load Helpers ─────────────────────────────────────────────────
require_once __DIR__ . '/../app/Helpers/JWT.php';
require_once __DIR__ . '/../app/Helpers/LDAP.php';
require_once __DIR__ . '/../app/Helpers/Mailer.php';

// ── Load Middleware ───────────────────────────────────────────────
require_once __DIR__ . '/../app/Middleware/AuthMiddleware.php';

// ── Load Models ───────────────────────────────────────────────────
require_once __DIR__ . '/../app/Models/UserModel.php';
require_once __DIR__ . '/../app/Models/RequestModel.php';
require_once __DIR__ . '/../app/Models/NotificationModel.php';

// ── Load Controllers ─────────────────────────────────────────────
require_once __DIR__ . '/../app/Controllers/AuthController.php';
require_once __DIR__ . '/../app/Controllers/RequestController.php';
require_once __DIR__ . '/../app/Controllers/UserController.php';
require_once __DIR__ . '/../app/Controllers/NotificationController.php';
require_once __DIR__ . '/../app/Controllers/NotificationStreamController.php';

// ── Route Dispatch ───────────────────────────────────────────────
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/') ?: '/';

$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$relUri = '/' . ltrim(substr($uri, strlen($scriptDir)), '/');

// API requests → routes/api.php
if (strpos($relUri, '/api') === 0) {
    ob_end_clean();
    ob_start();
    require_once __DIR__ . '/../routes/api.php';
    $output = ob_get_clean();
    echo $output;
    exit;
}

// All other requests → render the main SPA view
ob_end_clean();
header('Content-Type: text/html; charset=UTF-8');
require __DIR__ . '/../resources/views/app.php';
exit;

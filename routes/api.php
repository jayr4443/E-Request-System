<?php
// routes/api.php

$method = $_SERVER['REQUEST_METHOD'];
$fullUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$relUri = '/' . ltrim(substr($fullUri, strlen($scriptDir)), '/');

$uri = preg_replace('#^/api#', '', $relUri);
$uri = rtrim($uri, '/') ?: '/';

// Set JSON headers first — before any output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Token Handling ──────────────────────────────────────────────
$token = null;
$headers = function_exists('getallheaders') ? getallheaders() : array();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization']
            : (isset($headers['authorization']) ? $headers['authorization'] : '');

if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = $matches[1];
}
// Also allow token in URL query (for file downloads / print)
if (!$token && isset($_GET['token'])) {
    $token = $_GET['token'];
}
if ($token) {
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
}

// ── Route Table ─────────────────────────────────────────────────
$routes = array(
    // Auth
    array('POST', '/auth/login',                    'AuthController',             'login'),
    array('POST', '/auth/logout',                   'AuthController',             'logout'),
    array('GET',  '/auth/me',                       'AuthController',             'me'),
    array('POST', '/auth/change-password',          'AuthController',             'changePassword'),
    // Users
    array('GET',    '/users',                       'UserController',             'index'),
    array('GET',    '/users/ldap',                  'UserController',             'ldapUsers'),
    array('POST',   '/users/ldap/import',           'UserController',             'importLdapUser'),
    array('POST',   '/users/assign-admin',          'UserController',             'assignAdmin'),
    array('GET',    '/users/{id}',                  'UserController',             'show'),
    array('POST',   '/users',                       'UserController',             'store'),
    array('PUT',    '/users/{id}',                  'UserController',             'update'),
    array('DELETE', '/users/{id}',                  'UserController',             'destroy'),
    // Add these routes after the users routes section
    array('POST',   '/users/{id}/deactivate',        'UserController',             'deactivate'),
    array('POST',   '/users/{id}/activate',          'UserController',             'activate'),
    // Requests — specific paths MUST come before parameterised ones
    array('GET',    '/requests/dashboard',          'RequestController',          'dashboard'),
    array('GET',    '/requests/types',              'RequestController',          'getRequestTypes'),
    array('POST',   '/requests/export/bulk',        'RequestController',          'bulkExport'),
    array('GET',    '/requests',                    'RequestController',          'index'),
    array('POST',   '/requests',                    'RequestController',          'store'),
    array('GET',    '/requests/{id}',               'RequestController',          'show'),
    array('PUT',    '/requests/{id}',               'RequestController',          'update'),
    array('POST',   '/requests/{id}/submit',        'RequestController',          'submit'),
    array('PUT',    '/requests/{id}/status',        'RequestController',          'updateStatus'),
    array('POST',   '/requests/{id}/post',          'RequestController',          'post'),
    array('POST',   '/requests/{id}/upload',        'RequestController',          'uploadDocument'),
    array('GET',    '/requests/{id}/print',         'RequestController',          'printRequest'),
    array('GET',    '/requests/{id}/export-excel',  'RequestController',          'exportExcel'),
    array('GET',    '/requests/{id}/signatories',   'RequestController',          'getSignatories'),
    array('POST',   '/requests/{id}/sign',          'RequestController',          'sign'),
    array('GET',    '/requests/{id}/print-form',    'RequestController',          'printOriginalForm'),
    array('GET',    '/requests/updates',            'RequestController',          'getUpdates'),

    // Documents
    array('GET',    '/documents/{id}/view',         'RequestController',          'viewDocument'),

    // Notifications — specific paths before parameterised
    array('GET',    '/notifications/unread',        'NotificationController',     'unreadCount'),
    array('GET',    '/notifications/recent',        'NotificationController',     'recent'),
    array('GET',    '/notifications/latest',        'NotificationController',     'latest'),
    array('GET',    '/notifications/new',           'NotificationController',     'newNotifications'),
    array('GET',    '/notifications/stream',        'NotificationStreamController','stream'),
    array('POST',   '/notifications/read-all',      'NotificationController',     'markAllAsRead'),
    array('GET',    '/notifications',               'NotificationController',     'index'),
    array('POST',   '/notifications/{id}/read',     'NotificationController',     'markAsRead'),
);

foreach ($routes as $route) {
    list($routeMethod, $routePath, $controller, $action) = $route;

    $pattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $routePath);
    if ($method === $routeMethod && preg_match("#^{$pattern}$#", $uri, $matches)) {
        array_shift($matches);
        $matches = array_map(function ($m) {
            return is_numeric($m) ? (int)$m : $m;
        }, $matches);

        try {
            $ctrl = new $controller();
            call_user_func_array(array($ctrl, $action), $matches);
        } catch (Exception $e) {
            error_log('API exception [' . $controller . '::' . $action . ']: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(array('success' => false, 'message' => 'Server error: ' . $e->getMessage()));
        }
        exit;
    }
}

http_response_code(404);
echo json_encode(array('success' => false, 'message' => 'Endpoint not found: ' . $method . ' ' . $uri));

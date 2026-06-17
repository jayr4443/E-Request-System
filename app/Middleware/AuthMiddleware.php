<?php
// app/Middleware/AuthMiddleware.php - PHP 7.0+ Compatible

class AuthMiddleware {

    public static function handle() {
        $token = self::extractToken();
        if (!$token) {
            self::unauthorized('No token provided.');
        }

        $payload = JWT::decode($token);
        if (!$payload) {
            self::unauthorized('Invalid or expired token.');
        }

        return $payload;
    }

    public static function authorize($allowedRoles) {
        $payload = self::handle();
        if (!in_array($payload['role'], $allowedRoles)) {
            http_response_code(403);
            die(json_encode(['success' => false, 'message' => 'Access denied. Insufficient permissions.']));
        }
        return $payload;
    }

    private static function extractToken() {
        $headers = function_exists('getallheaders') ? getallheaders() : self::getAllHeaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');

        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }

        if (isset($_COOKIE['mpc_token'])) {
            return $_COOKIE['mpc_token'];
        }

        return null;
    }
    
    private static function getAllHeaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }

    private static function unauthorized($message) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => $message]));
    }
}
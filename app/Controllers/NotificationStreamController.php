<?php
class NotificationStreamController {
    
    public function stream() {
        // Set headers for SSE
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no');
        
        // Disable output buffering
        if (ob_get_level()) ob_end_clean();
        ob_implicit_flush(true);
        
        // Verify token from URL parameter or header
        $token = $this->extractToken();
        
        if (!$token) {
            echo "event: error\ndata: " . json_encode(['message' => 'No token provided']) . "\n\n";
            flush();
            return;
        }
        
        // Decode JWT
        try {
            $payload = JWT::decode($token);
            if (!$payload || !isset($payload['user_id'])) {
                echo "event: error\ndata: " . json_encode(['message' => 'Invalid token']) . "\n\n";
                flush();
                return;
            }
            $userId = $payload['user_id'];
            $userRole = $payload['role'];
        } catch (Exception $e) {
            error_log("JWT decode error: " . $e->getMessage());
            echo "event: error\ndata: " . json_encode(['message' => 'Token decode failed']) . "\n\n";
            flush();
            return;
        }
        
        $lastCheck = time();
        $lastNotificationId = isset($_GET['lastId']) ? (int)$_GET['lastId'] : 0;
        $isManager = in_array($userRole, ['mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin']);
        
        // Set infinite execution time
        set_time_limit(0);
        ignore_user_abort(true);
        
        // Send initial connection message
        echo "event: connected\ndata: " . json_encode(['message' => 'Connected to notification stream', 'userId' => $userId]) . "\n\n";
        flush();
        
        $heartbeatCount = 0;
        
        // Keep connection alive and check for new notifications
        while (true) {
            // Check if client disconnected
            if (connection_aborted()) {
                break;
            }
            
            // Check for new notifications every 2 seconds (faster than polling)
            if (time() - $lastCheck >= 2) {
                try {
                    $db = Database::getInstance();
                    
                    // Get new notifications since last check
                    $stmt = $db->prepare("
                        SELECT n.*, r.request_no, r.status as request_status, r.subject as request_subject
                        FROM notifications n
                        LEFT JOIN tbl_requests r ON n.request_id = r.id
                        WHERE n.user_id = ? AND n.id > ?
                        ORDER BY n.id ASC
                        LIMIT 20
                    ");
                    $stmt->execute([$userId, $lastNotificationId]);
                    $notifications = $stmt->fetchAll();
                    
                    // Also check for status updates on requests the user cares about
                    if ($isManager) {
                        // Managers see all status updates
                        $statusStmt = $db->prepare("
                            SELECT r.id, r.request_no, r.status, r.updated_at, 
                                   CONCAT(u.first_name, ' ', u.last_name) as requester_name
                            FROM tbl_requests r
                            JOIN tbl_users u ON r.requester_id = u.id
                            WHERE r.updated_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
                            ORDER BY r.updated_at DESC
                            LIMIT 10
                        ");
                    } else {
                        // Regular users see only their own requests' status updates
                        $statusStmt = $db->prepare("
                            SELECT r.id, r.request_no, r.status, r.updated_at
                            FROM tbl_requests r
                            WHERE r.requester_id = ? AND r.updated_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
                            ORDER BY r.updated_at DESC
                            LIMIT 10
                        ");
                        $statusStmt->execute([$userId]);
                    }
                    
                    if ($isManager) {
                        $statusStmt->execute();
                    }
                    $statusUpdates = $statusStmt->fetchAll();
                    
                    foreach ($notifications as $notif) {
                        $lastNotificationId = max($lastNotificationId, $notif['id']);
                        echo "event: notification\ndata: " . json_encode($notif) . "\n\n";
                        flush();
                    }
                    
                    foreach ($statusUpdates as $update) {
                        echo "event: status_update\ndata: " . json_encode($update) . "\n\n";
                        flush();
                    }
                    
                    // Send heartbeat every 30 seconds
                    $heartbeatCount++;
                    if ($heartbeatCount >= 15) { // Every 30 seconds (2s * 15)
                        echo "event: heartbeat\ndata: " . json_encode(['time' => time()]) . "\n\n";
                        flush();
                        $heartbeatCount = 0;
                    }
                    
                } catch (Exception $e) {
                    error_log("SSE Notification error: " . $e->getMessage());
                    echo "event: error\ndata: " . json_encode(['message' => 'Database error']) . "\n\n";
                    flush();
                }
                
                $lastCheck = time();
            }
            
            // Sleep to prevent CPU overload
            usleep(1000000); // 1 second
        }
    }
    
    private function extractToken() {
        // Check URL parameter first
        if (isset($_GET['token'])) {
            return $_GET['token'];
        }
        
        // Check Authorization header
        $headers = function_exists('getallheaders') ? getallheaders() : $this->getAllHeaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : 
                     (isset($headers['authorization']) ? $headers['authorization'] : '');
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    private function getAllHeaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$headerName] = $value;
            }
        }
        return $headers;
    }
}
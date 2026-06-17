<?php
// app/Controllers/NotificationController.php - WITH PROPER PAGINATION

class NotificationController {
    private $model;
    
    public function __construct() {
        $this->model = new NotificationModel();
    }
    
    public function index() {
        $payload = AuthMiddleware::handle();
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : ITEMS_PER_PAGE;
        
        $notifications = $this->model->getByUser($payload['user_id'], $page, $limit);
        $total = $this->model->countByUser($payload['user_id']);
        
        $this->json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $this->model->getUnreadCount($payload['user_id']),
            'pagination' => [
                'total' => $total,
                'per_page' => $limit,
                'current_page' => $page,
                'last_page' => ceil($total / $limit)
            ]
        ]);
    }
    
    // Get recent notifications since a timestamp
    public function recent() {
        $payload = AuthMiddleware::handle();
        $since = isset($_GET['since']) ? (int)$_GET['since'] : null;
        
        if ($since) {
            // Convert timestamp to datetime
            $sinceDate = date('Y-m-d H:i:s', $since / 1000);
            $notifications = $this->model->getRecentByUser($payload['user_id'], $sinceDate);
        } else {
            // Return last 10 notifications
            $notifications = $this->model->getRecentByUser($payload['user_id'], null, 10);
        }
        
        $this->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $this->model->getUnreadCount($payload['user_id']),
            'timestamp' => time() * 1000
        ]);
    }
    
    public function unreadCount() {
        $payload = AuthMiddleware::handle();
        $count = $this->model->getUnreadCount($payload['user_id']);
        
        $this->json(['success' => true, 'unread_count' => $count]);
    }
    
    public function markAsRead($id) {
        $payload = AuthMiddleware::handle();
        $result = $this->model->markAsRead($id, $payload['user_id']);
        $this->json(['success' => true, 'message' => 'Notification marked as read.']);
    }
    
    public function markAllAsRead() {
        $payload = AuthMiddleware::handle();
        $result = $this->model->markAllAsRead($payload['user_id']);
        $this->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }
    
    public function latest() {
        $payload = AuthMiddleware::handle();
        $latestId = $this->model->getLatestId($payload['user_id']);
        
        $this->json([
            'success' => true,
            'latest_id' => $latestId
        ]);
    }
    
    public function newNotifications() {
        $payload = AuthMiddleware::handle();
        $after = isset($_GET['after']) ? (int)$_GET['after'] : 0;
        
        $notifications = $this->model->getNewNotifications($payload['user_id'], $after);
        
        $this->json([
            'success' => true,
            'notifications' => $notifications,
            'timestamp' => time()
        ]);
    }
    
    private function json($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
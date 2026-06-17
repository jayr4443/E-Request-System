<?php
// app/Models/NotificationModel.php

class NotificationModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function callProc(string $sql, array $params = []): \PDOStatement {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // ── Create ──────────────────────────────────────────────────────────

    public function create($userId, $requestId, $title, $message, $force = false) {
        $this->db->prepare("CALL sp_notification_create(?, ?, ?, ?, ?, @new_id)")
                 ->execute([$userId, $requestId, $title, $message, $force ? 1 : 0]);
        $row = $this->db->query("SELECT @new_id AS new_id")->fetch();
        return $row && $row['new_id'] ? (int)$row['new_id'] : null;
    }

    public function createBatch($userIds, $requestId, $title, $message) {
        if (empty($userIds)) return;
        foreach ($userIds as $userId) {
            $this->create($userId, $requestId, $title, $message);
        }
    }

    // ── Read ────────────────────────────────────────────────────────────

    public function getRecentByUser($userId, $sinceDate = null, $limit = 10) {
        return $this->callProc(
            "CALL sp_notification_get_recent(?, ?, ?)",
            [$userId, $sinceDate, $limit]
        )->fetchAll();
    }

    public function getByUser($userId, $page = 1, $limit = ITEMS_PER_PAGE) {
        return $this->callProc(
            "CALL sp_notification_get_by_user(?, ?, ?)",
            [$userId, $page, $limit]
        )->fetchAll();
    }

    public function getUnreadCount($userId) {
        $stmt = $this->db->prepare("SELECT fn_get_notification_unread_count(?) AS cnt");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    public function countByUser($userId) {
        $stmt = $this->db->prepare("SELECT fn_count_notifications_by_user(?) AS cnt");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    public function getLatestId($userId) {
        $stmt = $this->db->prepare("SELECT fn_get_notification_latest_id(?) AS lid");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    public function getNewNotifications($userId, $afterId) {
        return $this->callProc(
            "CALL sp_notification_get_new(?, ?)",
            [$userId, $afterId]
        )->fetchAll();
    }

    // ── Update ──────────────────────────────────────────────────────────

    public function markAsRead($notificationId, $userId) {
        return $this->callProc(
            "CALL sp_notification_mark_read(?, ?)",
            [$notificationId, $userId]
        );
    }

    public function markAllAsRead($userId) {
        return $this->callProc(
            "CALL sp_notification_mark_all_read(?)",
            [$userId]
        );
    }

    // ── Notify Helpers ──────────────────────────────────────────────────

    public function notifyRequester($requestId, $requesterId, $title, $message) {
        if (!$requesterId) return;
        $this->create($requesterId, $requestId, $title, $message);
    }

    public function notifyManagers($requestId, $title, $message, $excludeUserId = null) {
        $this->callProc(
            "CALL sp_notification_notify_managers(?, ?, ?, ?)",
            [$requestId, $title, $message, $excludeUserId]
        );
    }

    // ── Maintenance ─────────────────────────────────────────────────────

    public function cleanOldNotifications() {
        return $this->callProc("CALL sp_notification_clean_old()");
    }
}

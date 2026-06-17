<?php
// app/Helpers/JWT.php - PHP 7.0+ Compatible

class JWT {

    public static function encode($payload) {
        $header = self::base64UrlEncode(json_encode(['alg' => JWT_ALGORITHM, 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRY;
        $payload['jti'] = bin2hex(random_bytes(16));
        $encodedPayload = self::base64UrlEncode(json_encode($payload));
        $signature = self::base64UrlEncode(hash_hmac('sha256', "$header.$encodedPayload", JWT_SECRET, true));
        return "$header.$encodedPayload.$signature";
    }

    public static function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        list($header, $payload, $signature) = $parts;
        $validSig = self::base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

        if (!hash_equals($validSig, $signature)) return null;

        $data = json_decode(self::base64UrlDecode($payload), true);
        if (!$data) return null;

        if (isset($data['exp']) && $data['exp'] < time()) return null;

        if (isset($data['jti']) && self::isBlacklisted($data['jti'])) return null;

        return $data;
    }

    public static function blacklist($jti, $exp) {
        $db = Database::getInstance();
        $stmt = $db->prepare("INSERT IGNORE INTO tbl_token_blacklist (token_jti, expires_at) VALUES (?, FROM_UNIXTIME(?))");
        $stmt->execute([$jti, $exp]);
    }

    private static function isBlacklisted($jti) {
        $db = Database::getInstance();
        $stmt = $db->prepare("SELECT id FROM tbl_token_blacklist WHERE token_jti = ? AND expires_at > NOW()");
        $stmt->execute([$jti]);
        return (bool) $stmt->fetch();
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }
}
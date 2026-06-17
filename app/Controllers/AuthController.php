<?php
// app/Controllers/AuthController.php - ENHANCED WITH PROPER VALIDATION

class AuthController {
    private $userModel;

    public function __construct() {
        $this->userModel = new UserModel();
    }

    public function login() {
        // Enable error logging
        error_log("=== LOGIN ATTEMPT ===");
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['success' => false, 'message' => 'Method not allowed'], 405);
        }

        $data = $this->getJsonInput();
        error_log("Login data received: " . print_r($data, true));
        
        $username = trim(isset($data['email']) ? $data['email'] : (isset($data['username']) ? $data['username'] : ''));
        $password = isset($data['password']) ? $data['password'] : '';

        error_log("Username/Email input: " . $username);
        error_log("Password length: " . strlen($password));

        if (!$username || !$password) {
            $this->json(['success' => false, 'message' => 'Username/Email and password are required.'], 400);
        }

        // Determine if input is email or username
        $isEmail = strpos($username, '@') !== false;
        
        // STEP 1: Try local database authentication first
        $user = $this->authenticateLocal($username, $password);
        
        if ($user) {
            // Check if account is active for local users
            if ($user['is_active'] != 1) {
                error_log("Login blocked - account inactive for: " . $user['email']);
                $this->json([
                    'success' => false, 
                    'message' => '⚠️ Your account has been deactivated. Please contact the MPC Department to reactivate your account.\n\n📧 Email: mpc@cobankiat.com.ph\n📞 Phone: Local 1234'
                ], 401);
            }
            error_log("Local authentication successful for: " . $user['email']);
            return $this->generateLoginResponse($user);
        }

        // STEP 2: If LDAP is enabled, try LDAP authentication
        if (defined('LDAP_ENABLED') && LDAP_ENABLED) {
            error_log("Attempting LDAP authentication for: " . $username);
            
            $ldapUser = $this->authenticateLDAP($username, $password);
            
            if ($ldapUser) {
                $localUser = $this->userModel->findByEmail($ldapUser['email']);
                if ($localUser) {
                    if ($localUser['is_active'] != 1) {
                        error_log("Login blocked - LDAP account deactivated for: " . $localUser['email']);
                        $this->json([
                            'success' => false, 
                            'message' => '⚠️ Your account has been deactivated. Please contact the MPC Department to reactivate your account.\n\n📧 Email: mpc@cobankiat.com.ph\n📞 Phone: Local 1234'
                        ], 401);
                    }
                    $this->userModel->updateUserFromLDAP($localUser['id'], $ldapUser);
                    $updatedUser = $this->userModel->findById($localUser['id']);
                    return $this->generateLoginResponse($updatedUser ?: $localUser);
                } else {
                    $newUser = $this->userModel->createFromLDAP($ldapUser);
                    if ($newUser) {
                        error_log("New LDAP user created: " . $newUser['email']);
                        return $this->generateLoginResponse($newUser);
                    } else {
                        error_log("Failed to create LDAP user");
                        $this->json(['success' => false, 'message' => '⚠️ Your account has been deactivated. Please contact the MPC Department to reactivate your account.'], 500);
                    }
                }
            } else {
                error_log("LDAP authentication failed for: " . $username);
            }
        }

        // STEP 3: If we get here, authentication failed
        error_log("Authentication failed for: " . $username);
        $this->json(['success' => false, 'message' => '❌ Invalid username/email or password. Please try again.'], 401);
    }

    /**
     * Authenticate against local database
     * Supports login with email, username pattern, or employee_id
     */
    private function authenticateLocal($username, $password) {
        $isEmail = strpos($username, '@') !== false;
        
        if ($isEmail) {
            // Login with email - try exact email match
            error_log("Local auth: Trying email: " . $username);
            $user = $this->userModel->findByEmail($username);
            
            if ($user && password_verify($password, $user['password'])) {
                error_log("Local auth successful via email: " . $user['email']);
                return $user;
            }
            
            // If email not found locally, this might be an LDAP email
            // Don't return false yet - let LDAP handle it
            return false;
        } else {
            // Login with username (not email)
            error_log("Local auth: Trying username: " . $username);
            
            // 1. Try exact match on employee_id
            $stmt = $this->userModel->getDb()->prepare("SELECT * FROM tbl_users WHERE employee_id = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            
            if ($user && password_verify($password, $user['password'])) {
                error_log("Local auth successful via employee_id: " . $user['email']);
                return $user;
            }
            
            // 2. Try to find by constructing potential email patterns
            $possibleEmails = [
                $username . '@cobankiat.com.ph',
                $username . '@cbkhardware.com',
                $username . '@cbkhi.group.local'
            ];
            
            foreach ($possibleEmails as $email) {
                $user = $this->userModel->findByEmail($email);
                if ($user && $user['ldap_user'] != 1 && password_verify($password, $user['password'])) {
                    error_log("Local auth successful via constructed email: " . $email);
                    return $user;
                }
            }
            
            // 3. Try LIKE search on email (for partial matches)
            $stmt = $this->userModel->getDb()->prepare("
                SELECT * FROM tbl_users 
                WHERE (email LIKE ? OR employee_id = ?) 
                AND is_active = 1 
                AND ldap_user = 0
            ");
            $searchPattern = $username . '%';
            $stmt->execute([$searchPattern, $username]);
            $user = $stmt->fetch();
            
            if ($user && password_verify($password, $user['password'])) {
                error_log("Local auth successful via pattern match: " . $user['email']);
                return $user;
            }
            
            // 4. Last resort - search by first_name + last_name combination
            $nameParts = explode(' ', $username, 2);
            if (count($nameParts) == 2) {
                $stmt = $this->userModel->getDb()->prepare("
                    SELECT * FROM tbl_users 
                    WHERE first_name = ? AND last_name = ? 
                    AND is_active = 1 AND ldap_user = 0
                ");
                $stmt->execute([$nameParts[0], $nameParts[1]]);
                $user = $stmt->fetch();
                
                if ($user && password_verify($password, $user['password'])) {
                    error_log("Local auth successful via name match: " . $user['email']);
                    return $user;
                }
            }
        }
        
        return false;
    }

    /**
     * Authenticate against LDAP/Active Directory
     * Supports both username (sAMAccountName) and email (userPrincipalName/mail)
     */
    private function authenticateLDAP($username, $password) {
        try {
            require_once __DIR__ . '/../Helpers/LDAP.php';
            $ldap = new LDAP();
            
            $isEmail = strpos($username, '@') !== false;
            
            if ($isEmail) {
                error_log("LDAP: Attempting email authentication: " . $username);
            } else {
                error_log("LDAP: Attempting username authentication: " . $username);
            }
            
            // The LDAP class already handles both username and email
            $result = $ldap->authenticate($username, $password);
            
            if ($result) {
                error_log("LDAP auth result: " . print_r($result, true));
                return $result;
            }
            
            error_log("LDAP authentication returned false");
            return false;
        } catch (Exception $e) {
            error_log("LDAP authentication error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Generate login response with JWT token
     */
    private function generateLoginResponse($user) {
        // Ensure we have all necessary user data
        $firstName = $user['first_name'] ?? '';
        $lastName = $user['last_name'] ?? '';
        $email = $user['email'] ?? '';
        $role = $user['role'] ?? 'requester';
        
        $token = JWT::encode([
            'user_id' => $user['id'],
            'email'   => $email,
            'role'    => $role,
            'name'    => trim($firstName . ' ' . $lastName),
        ]);

        error_log("Login successful for: " . $email);
        error_log("Token generated: " . substr($token, 0, 50) . "...");
        
        // Log the login
        $this->logUserLogin($user['id'], $user['ldap_user'] ?? 0);
        
        $this->json([
            'success' => true,
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => [
                'id'          => $user['id'],
                'employee_id' => $user['employee_id'] ?? '',
                'name'        => trim($firstName . ' ' . $lastName),
                'email'       => $email,
                'role'        => $role,
                'department'  => $user['department'] ?? '',
            ]
        ]);
    }

    /**
     * Log user login to database
     */
    private function logUserLogin($userId, $isLdap = false) {
        try {
            $db = $this->userModel->getDb();
            $authType = $isLdap ? 'ldap' : 'local';
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
            
            $stmt = $db->prepare("
                INSERT INTO tbl_user_logins (user_id, login_time, ip_address, user_agent, auth_type) 
                VALUES (?, NOW(), ?, ?, ?)
            ");
            $stmt->execute([$userId, $ipAddress, $userAgent, $authType]);
        } catch (Exception $e) {
            error_log("Login logging error: " . $e->getMessage());
        }
    }

    /**
     * Logout - blacklist current token
     */
    public function logout() {
        $token = $this->extractToken();
        if (!$token) {
            $this->json(['success' => false, 'message' => 'No token provided.'], 400);
        }

        $payload = JWT::decode($token);
        if ($payload && isset($payload['jti']) && isset($payload['exp'])) {
            JWT::blacklist($payload['jti'], $payload['exp']);
        }

        $this->json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    /**
     * Get current user info
     */
    public function me() {
        $payload = AuthMiddleware::handle();
        $user = $this->userModel->findById($payload['user_id']);
        
        if (!$user) {
            $this->json(['success' => false, 'message' => 'User not found.'], 404);
        }

        $this->json([
            'success' => true,
            'user' => [
                'id'          => $user['id'],
                'employee_id' => $user['employee_id'] ?? '',
                'name'        => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
                'email'       => $user['email'],
                'role'        => $user['role'],
                'department'  => $user['department'] ?? '',
            ]
        ]);
    }

    /**
     * Change password (for local non-LDAP users only)
     */
    public function changePassword() {
        $payload = AuthMiddleware::handle();
        $data = $this->getJsonInput();
        
        $currentPassword = $data['current_password'] ?? '';
        $newPassword = $data['new_password'] ?? '';
        
        if (strlen($newPassword) < 8) {
            $this->json(['success' => false, 'message' => 'New password must be at least 8 characters.'], 400);
        }
        
        $user = $this->userModel->findIncludeInactive($payload['user_id']);
        if (!$user) {
            $this->json(['success' => false, 'message' => 'User not found.'], 404);
        }
        
        // LDAP users cannot change password locally
        if ($user['ldap_user'] == 1) {
            $this->json(['success' => false, 'message' => 'LDAP users cannot change password here. Please use your domain password.'], 400);
        }
        
        if (!password_verify($currentPassword, $user['password'])) {
            $this->json(['success' => false, 'message' => 'Current password is incorrect.'], 400);
        }
        
        $result = $this->userModel->updatePassword($payload['user_id'], $newPassword);
        
        if ($result) {
            $this->json(['success' => true, 'message' => 'Password changed successfully.']);
        } else {
            $this->json(['success' => false, 'message' => 'Failed to change password.'], 500);
        }
    }
    
    /**
     * Extract token from request
     */
    private function extractToken() {
        $headers = function_exists('getallheaders') ? getallheaders() : $this->getAllHeaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
        
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
    
    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        error_log("JSON input: " . print_r($input, true));
        return $input ?: array();
    }

    private function json($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        // Ensure error messages are always returned properly
        if (!isset($data['success'])) {
            $data['success'] = false;
        }
        echo json_encode($data);
        exit;
    }
}
<?php
// app/Controllers/UserController.php - WITH MPC_PERSONNEL PERMISSIONS

class UserController {
    private $userModel;
    
    public function __construct() {
        $this->userModel = new UserModel();
    }
    
    // Helper method to check if user has admin or mpc_personnel role
    private function authorizeAdminOrMpc() {
        $payload = AuthMiddleware::authorize(['admin', 'mpc_personnel']);
        return $payload;
    }
    
    public function index() {
        try {
            $payload = $this->authorizeAdminOrMpc();
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            
            $users = $this->userModel->getAll($page, $search);
            $total = $this->userModel->countAll($search);
            
            $this->json([
                'success' => true,
                'data' => $users,
                'pagination' => [
                    'total' => $total,
                    'per_page' => ITEMS_PER_PAGE,
                    'current_page' => $page,
                    'last_page' => ceil($total / ITEMS_PER_PAGE)
                ]
            ]);
        } catch (Exception $e) {
            error_log("UserController index error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to load users'], 500);
        }
    }
    
    public function show($id) {
        try {
            $payload = $this->authorizeAdminOrMpc();
            $user = $this->userModel->findByIdWithStatus($id);
            
            if (!$user) {
                $this->json(['success' => false, 'message' => 'User not found.'], 404);
            }
            
            $this->json(['success' => true, 'data' => $user]);
        } catch (Exception $e) {
            error_log("UserController show error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to load user'], 500);
        }
    }
    
    public function store() {
        try {
            $payload = $this->authorizeAdminOrMpc();
            $data = $this->getJsonInput();
            
            // Validate required fields
            $errors = $this->validateUserData($data, true);
            if (!empty($errors)) {
                $this->json(['success' => false, 'message' => 'Validation failed.', 'errors' => $errors], 400);
            }
            
            // Check if email already exists
            $existingEmail = $this->userModel->findByEmail($data['email']);
            if ($existingEmail) {
                $this->json(['success' => false, 'message' => 'Email already exists.'], 400);
            }
            
            // Check if employee ID already exists
            $existingEmp = $this->userModel->findByEmployeeId($data['employee_id']);
            if ($existingEmp) {
                $this->json(['success' => false, 'message' => 'Employee ID already exists.'], 400);
            }
            
            // Hash password
            if (!empty($data['password'])) {
                $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }
            
            $id = $this->userModel->create($data);
            $user = $this->userModel->findById($id);
            
            $this->json(['success' => true, 'message' => 'User created successfully.', 'data' => $user], 201);
        } catch (Exception $e) {
            error_log("UserController store error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to create user: ' . $e->getMessage()], 500);
        }
    }
    
    public function update($id) {
        try {
            $payload = $this->authorizeAdminOrMpc();
            $data = $this->getJsonInput();
            
            $existing = $this->userModel->findByIdWithStatus($id);
            if (!$existing) {
                $this->json(['success' => false, 'message' => 'User not found.'], 404);
            }
            
            // Prevent editing LDAP users
            if ($existing['ldap_user'] == 1) {
                $this->json(['success' => false, 'message' => 'LDAP users cannot be edited locally.'], 400);
            }
            
            // If email is being changed, check if it's already used by another user
            if (isset($data['email']) && $data['email'] !== $existing['email']) {
                $existingEmail = $this->userModel->findByEmail($data['email']);
                if ($existingEmail && $existingEmail['id'] != $id) {
                    $this->json(['success' => false, 'message' => 'Email already exists.'], 400);
                }
            }
            
            // If employee ID is being changed, check if it's already used
            if (isset($data['employee_id']) && $data['employee_id'] !== $existing['employee_id']) {
                $existingEmp = $this->userModel->findByEmployeeId($data['employee_id']);
                if ($existingEmp && $existingEmp['id'] != $id) {
                    $this->json(['success' => false, 'message' => 'Employee ID already exists.'], 400);
                }
            }
            
            $errors = $this->validateUserData($data, false);
            if (!empty($errors)) {
                $this->json(['success' => false, 'message' => 'Validation failed.', 'errors' => $errors], 400);
            }
            
            // Hash password if provided
            if (!empty($data['password'])) {
                $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            } else {
                unset($data['password']); // Don't update password if not provided
            }
            
            $this->userModel->update($id, $data);
            $user = $this->userModel->findById($id);
            
            $this->json(['success' => true, 'message' => 'User updated successfully.', 'data' => $user]);
        } catch (Exception $e) {
            error_log("UserController update error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to update user: ' . $e->getMessage()], 500);
        }
    }
    
    public function destroy($id) {
        try {
            // Only admin can delete users (not mpc_personnel for security)
            $payload = AuthMiddleware::authorize(['admin']);
            
            if ($id == $payload['user_id']) {
                $this->json(['success' => false, 'message' => 'Cannot delete your own account.'], 400);
            }
            
            $user = $this->userModel->findById($id);
            if ($user && $user['ldap_user'] == 1) {
                $this->json(['success' => false, 'message' => 'Cannot delete LDAP users.'], 400);
            }
            
            $this->userModel->delete($id);
            $this->json(['success' => true, 'message' => 'User deleted successfully.']);
        } catch (Exception $e) {
            error_log("UserController destroy error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to delete user'], 500);
        }
    }
    
    public function deactivate($id) {
        try {
            $payload = $this->authorizeAdminOrMpc();
            
            // Prevent self-deactivation
            if ($id == $payload['user_id']) {
                $this->json(['success' => false, 'message' => 'Cannot deactivate your own account.'], 400);
            }
            
            // Check if user is admin - prevent mpc_personnel from deactivating admin accounts
            $targetUser = $this->userModel->findById($id);
            if ($targetUser && $targetUser['role'] === 'admin' && $payload['role'] !== 'admin') {
                $this->json(['success' => false, 'message' => 'Only admin can deactivate other admin accounts.'], 403);
            }
            
            $result = $this->userModel->deactivateUser($id);
            
            if ($result) {
                $this->json(['success' => true, 'message' => 'User deactivated successfully.']);
            } else {
                $this->json(['success' => false, 'message' => 'Failed to deactivate user.'], 500);
            }
        } catch (Exception $e) {
            error_log("UserController deactivate error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to deactivate user: ' . $e->getMessage()], 500);
        }
    }
    
    public function activate($id) {
        try {
            $payload = $this->authorizeAdminOrMpc();
            
            // Check if user is admin - prevent mpc_personnel from activating admin accounts
            $targetUser = $this->userModel->findById($id);
            if ($targetUser && $targetUser['role'] === 'admin' && $payload['role'] !== 'admin') {
                $this->json(['success' => false, 'message' => 'Only admin can activate admin accounts.'], 403);
            }
            
            $result = $this->userModel->activateUser($id);
            
            if ($result) {
                $this->json(['success' => true, 'message' => 'User activated successfully.']);
            } else {
                $this->json(['success' => false, 'message' => 'Failed to activate user.'], 500);
            }
        } catch (Exception $e) {
            error_log("UserController activate error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to activate user: ' . $e->getMessage()], 500);
        }
    }
    
    public function ldapUsers() {
        try {
            $payload = $this->authorizeAdminOrMpc();
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            
            $users = $this->userModel->getLDAPUsersWithLocalStatus($search);
            
            $this->json([
                'success' => true,
                'data' => $users
            ]);
        } catch (Exception $e) {
            error_log("LDAP users error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to load LDAP users: ' . $e->getMessage()], 500);
        }
    }
    
    public function importLdapUser() {
        try {
            $payload = $this->authorizeAdminOrMpc();
            $data = $this->getJsonInput();
            
            $email = isset($data['email']) ? $data['email'] : '';
            $role = isset($data['role']) ? $data['role'] : 'requester';
            
            if (!$email) {
                $this->json(['success' => false, 'message' => 'Email is required'], 400);
            }
            
            $result = $this->userModel->importLDAPUser($email, $role);
            
            $this->json($result);
        } catch (Exception $e) {
            error_log("Import LDAP user error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to import user: ' . $e->getMessage()], 500);
        }
    }
    
    public function assignAdmin() {
        try {
            // Only super admin can assign admin roles (restricted for security)
            $payload = AuthMiddleware::authorize(['admin']);
            
            // Verify that the logged-in user is the super admin
            if (strpos($payload['email'], 'cbkadmin@') !== 0) {
                $this->json(['success' => false, 'message' => 'Only super admin can assign admin roles'], 403);
            }
            
            $data = $this->getJsonInput();
            $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
            $makeAdmin = isset($data['make_admin']) ? (bool)$data['make_admin'] : true;
            
            if (!$userId) {
                $this->json(['success' => false, 'message' => 'User ID is required'], 400);
            }
            
            $role = $makeAdmin ? 'admin' : 'requester';
            
            $stmt = $this->userModel->getDb()->prepare("UPDATE tbl_users SET role = ? WHERE id = ?");
            $stmt->execute([$role, $userId]);
            
            $action = $makeAdmin ? 'assigned admin role to' : 'removed admin role from';
            $this->json(['success' => true, 'message' => "Successfully {$action} user"]);
        } catch (Exception $e) {
            error_log("Assign admin error: " . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to assign admin role: ' . $e->getMessage()], 500);
        }
    }
    
    private function validateUserData($data, $isCreate) {
        $errors = [];
        
        if (empty($data['employee_id'])) {
            $errors['employee_id'] = 'Employee ID is required.';
        }
        if (empty($data['first_name'])) {
            $errors['first_name'] = 'First name is required.';
        }
        if (empty($data['last_name'])) {
            $errors['last_name'] = 'Last name is required.';
        }
        if (empty($data['email'])) {
            $errors['email'] = 'Email is required.';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format.';
        }
        if (empty($data['role'])) {
            $errors['role'] = 'Role is required.';
        }
        
        if ($isCreate && (empty($data['password']) || strlen($data['password']) < 8)) {
            $errors['password'] = 'Password must be at least 8 characters.';
        }
        
        // Validate role is valid
        $validRoles = ['requester', 'mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'];
        if (!empty($data['role']) && !in_array($data['role'], $validRoles)) {
            $errors['role'] = 'Invalid role selected.';
        }
        
        return $errors;
    }
    
    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($input === null && json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error in UserController: " . json_last_error_msg());
            return [];
        }
        return $input ?: [];
    }
    
    private function json($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
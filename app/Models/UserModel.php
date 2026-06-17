<?php
// app/Models/UserModel.php

class UserModel {
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

    // ── Find ────────────────────────────────────────────────────────────

    public function findByEmail($email) {
        return $this->callProc("CALL sp_user_find_by_email(?)", [$email])->fetch() ?: null;
    }

    public function findByEmployeeId($employeeId) {
        return $this->callProc("CALL sp_user_find_by_employee_id(?)", [$employeeId])->fetch() ?: null;
    }

    public function findById($id) {
        return $this->callProc("CALL sp_user_find_by_id(?)", [$id])->fetch() ?: null;
    }

    public function findByIdWithStatus($id) {
        return $this->callProc("CALL sp_user_find_by_id_with_status(?)", [$id])->fetch() ?: null;
    }

    public function findIncludeInactive($id) {
        return $this->callProc("CALL sp_user_find_include_inactive(?)", [$id])->fetch() ?: null;
    }

    /**
     * Check if a user is deactivated by email or username.
     * Business logic (LDAP pattern matching) stays in PHP.
     */
    public function isDeactivated($identifier) {
        $isEmail = strpos($identifier, '@') !== false;

        if ($isEmail) {
            $stmt = $this->db->prepare("SELECT is_active, ldap_user FROM tbl_users WHERE email = ?");
            $stmt->execute([$identifier]);
        } else {
            $stmt = $this->db->prepare(
                "SELECT is_active, ldap_user FROM tbl_users
                 WHERE employee_id = ? OR email LIKE ? OR email = ?"
            );
            $stmt->execute([$identifier, $identifier . '@%', $identifier . '@cobankiat.com.ph']);
        }

        $user = $stmt->fetch();
        if ($user) {
            return $user['is_active'] != 1;
        }
        return false; // Not in local DB yet (first-time LDAP user)
    }

    // ── LDAP — business logic stays in PHP; DB calls use procedures ─────

    public function getOrCreateFromLDAP($ldapUser) {
        $stmt = $this->db->prepare("SELECT * FROM tbl_users WHERE email = ?");
        $stmt->execute([$ldapUser['email']]);
        $user = $stmt->fetch();

        if ($user) {
            error_log("Found existing LDAP user: " . $ldapUser['email'] . " (ID: " . $user['id'] . ")");
            $needsUpdate = (
                ($user['first_name']  ?? '') !== ($ldapUser['first_name']  ?? '') ||
                ($user['last_name']   ?? '') !== ($ldapUser['last_name']   ?? '') ||
                ($user['department']  ?? '') !== ($ldapUser['department']  ?? '') ||
                ($user['job_title']   ?? '') !== ($ldapUser['title']       ?? '') ||
                ($user['company']     ?? '') !== ($ldapUser['company']     ?? '') ||
                ($user['office_phone']?? '') !== ($ldapUser['telephone']   ?? '')
            );

            if ($needsUpdate) {
                $this->updateUserFromLDAP($user['id'], $ldapUser);
                $stmt = $this->db->prepare("SELECT * FROM tbl_users WHERE id = ?");
                $stmt->execute([$user['id']]);
                $user = $stmt->fetch();
            }
            return $user;
        }

        error_log("Creating new LDAP user: " . $ldapUser['email']);
        return $this->createFromLDAP($ldapUser);
    }

    public function createFromLDAP($ldapUser) {
        // Check for existing user
        $stmt = $this->db->prepare("SELECT id, is_active, ldap_user FROM tbl_users WHERE email = ?");
        $stmt->execute([$ldapUser['email']]);
        $existing = $stmt->fetch();

        if ($existing) {
            error_log("LDAP user already exists in DB: " . $ldapUser['email']);
            $this->updateUserFromLDAP($existing['id'], $ldapUser);
            return $this->findById($existing['id']);
        }

        $randomPassword = bin2hex(random_bytes(16));
        $hashedPassword = password_hash($randomPassword, PASSWORD_DEFAULT);
        $role           = 'requester';

        $department = strtolower($ldapUser['department'] ?? '');
        $title      = strtolower($ldapUser['title']      ?? '');

        if (strpos($department, 'mpc') !== false ||
            strpos($department, 'master data planning') !== false ||
            strpos($department, 'mdcu') !== false ||
            strpos($title, 'mpc') !== false) {
            $role = 'mpc_personnel';
        }

        $firstName = $ldapUser['first_name'] ?? '';
        $lastName  = $ldapUser['last_name']  ?? '';
        if (empty($firstName) && !empty($ldapUser['name'])) {
            $parts     = explode(' ', $ldapUser['name'], 2);
            $firstName = $parts[0] ?? '';
            $lastName  = $parts[1] ?? '';
        }

        $email = $ldapUser['email'] ?? '';
        if (empty($email) && !empty($ldapUser['username'])) {
            $email = $ldapUser['username'] . '@cobankiat.com.ph';
        }
        if (empty($email)) {
            throw new Exception("Cannot create LDAP user: no email available");
        }

        $employeeId = $this->generateLdapEmployeeId($ldapUser);

        try {
            $newId = null;
            $this->callProc(
                "CALL sp_user_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, @new_id)",
                [
                    $employeeId, $firstName, $lastName, $email, $hashedPassword,
                    $role, $ldapUser['department'] ?? null, $ldapUser['title'] ?? null,
                    $ldapUser['company'] ?? null, $ldapUser['telephone'] ?? null,
                ]
            );
            $row = $this->db->query("SELECT @new_id AS new_id")->fetch();
            $id  = (int)$row['new_id'];
            error_log("LDAP user created with ID: $id, employee_id: $employeeId, role: $role");
            return $this->findById($id);

        } catch (PDOException $e) {
            error_log("Failed to create LDAP user: " . $e->getMessage());

            // Race-condition check
            $stmt = $this->db->prepare("SELECT id FROM tbl_users WHERE email = ?");
            $stmt->execute([$email]);
            $existing = $stmt->fetch();
            if ($existing) {
                return $this->findById($existing['id']);
            }

            // Duplicate employee_id? retry with suffix
            if ($e->getCode() == 23000) {
                $employeeId = substr($employeeId . '_' . substr(md5($email), 0, 4), 0, 20);
                $this->callProc(
                    "CALL sp_user_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, @new_id)",
                    [
                        $employeeId, $firstName, $lastName, $email, $hashedPassword,
                        $role, $ldapUser['department'] ?? null, $ldapUser['title'] ?? null,
                        $ldapUser['company'] ?? null, $ldapUser['telephone'] ?? null,
                    ]
                );
                $row = $this->db->query("SELECT @new_id AS new_id")->fetch();
                return $this->findById((int)$row['new_id']);
            }

            throw $e;
        }
    }

    private function generateLdapEmployeeId($ldapUser) {
        $employeeId = $ldapUser['employee_id'] ?? '';
        if (empty($employeeId)) {
            $email    = $ldapUser['email']    ?? '';
            $username = $ldapUser['username'] ?? '';
            if (!empty($email)) {
                $employeeId = 'LDAP_' . strtoupper(preg_replace('/[^A-Za-z0-9]/', '', explode('@', $email)[0]));
            } elseif (!empty($username)) {
                $employeeId = 'LDAP_' . strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $username));
            } else {
                $employeeId = 'LDAP_' . strtoupper(bin2hex(random_bytes(4)));
            }
        }
        $employeeId = preg_replace('/[^A-Za-z0-9_]/', '', $employeeId);
        return strlen($employeeId) > 20 ? substr($employeeId, 0, 20) : $employeeId;
    }

    public function updateUserFromLDAP($userId, $ldapUser) {
        $fn = isset($ldapUser['first_name'])  && !empty($ldapUser['first_name'])  ? $ldapUser['first_name']  : null;
        $ln = isset($ldapUser['last_name'])   && !empty($ldapUser['last_name'])   ? $ldapUser['last_name']   : null;
        $dp = isset($ldapUser['department'])  && !empty($ldapUser['department'])  ? $ldapUser['department']  : null;
        $jt = isset($ldapUser['title'])       && !empty($ldapUser['title'])       ? $ldapUser['title']       : null;
        $co = isset($ldapUser['company'])     && !empty($ldapUser['company'])     ? $ldapUser['company']     : null;
        $op = isset($ldapUser['telephone'])   && !empty($ldapUser['telephone'])   ? $ldapUser['telephone']   : null;
        $ei = isset($ldapUser['employee_id']) && !empty($ldapUser['employee_id']) ? $ldapUser['employee_id'] : null;

        // Handle display name fallback
        if (!$fn && !$ln && !empty($ldapUser['name'])) {
            $parts = explode(' ', $ldapUser['name'], 2);
            $fn = $parts[0] ?? null;
            $ln = $parts[1] ?? null;
        }

        try {
            $this->callProc(
                "CALL sp_user_update_from_ldap(?, ?, ?, ?, ?, ?, ?, ?)",
                [$userId, $fn, $ln, $dp, $jt, $co, $op, $ei]
            );
            return true;
        } catch (PDOException $e) {
            error_log("Failed to update LDAP user: " . $e->getMessage());
            return false;
        }
    }

    public function syncLDAPUsers($search = '', $limit = 100) {
        if (!LDAP_ENABLED) {
            return ['success' => false, 'message' => 'LDAP is not enabled'];
        }
        try {
            $ldap      = new LDAP();
            $ldapUsers = $ldap->searchUsers($search, $limit);
            $imported  = 0;
            $updated   = 0;

            foreach ($ldapUsers as $ldapUser) {
                $stmt = $this->db->prepare("SELECT id, ldap_user FROM tbl_users WHERE email = ?");
                $stmt->execute([$ldapUser['email']]);
                $existing = $stmt->fetch();

                if ($existing) {
                    if ($existing['ldap_user'] == 1) {
                        $this->updateUserFromLDAP($existing['id'], $ldapUser);
                        $updated++;
                    }
                } else {
                    $this->createFromLDAP($ldapUser);
                    $imported++;
                }
            }

            return [
                'success' => true, 'imported' => $imported, 'updated' => $updated,
                'total'   => count($ldapUsers),
                'message' => "Synced {$imported} new users, updated {$updated} existing users",
            ];
        } catch (Exception $e) {
            error_log("LDAP sync error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to sync LDAP users: ' . $e->getMessage()];
        }
    }

    public function getLDAPUsersWithLocalStatus($search = '') {
        if (!LDAP_ENABLED) return [];
        try {
            $ldap      = new LDAP();
            $ldapUsers = $ldap->searchUsers($search);
            $result    = [];

            foreach ($ldapUsers as $ldapUser) {
                $stmt = $this->db->prepare(
                    "SELECT id, role, is_active, created_at, department AS local_department
                     FROM tbl_users WHERE email = ?"
                );
                $stmt->execute([$ldapUser['email']]);
                $localUser = $stmt->fetch();

                $result[] = [
                    'id'         => $localUser['id']        ?? null,
                    'username'   => $ldapUser['username'],
                    'first_name' => $ldapUser['first_name'],
                    'last_name'  => $ldapUser['last_name'],
                    'name'       => $ldapUser['name'],
                    'email'      => $ldapUser['email'],
                    'department' => $ldapUser['department'],
                    'job_title'  => $ldapUser['title'],
                    'company'    => $ldapUser['company'],
                    'telephone'  => $ldapUser['telephone'],
                    'role'       => $localUser['role'] ?? 'not_in_system',
                    'is_active'  => $localUser['is_active'] ?? null,
                    'in_system'  => !empty($localUser),
                    'ldap_only'  => empty($localUser),
                ];
            }
            return $result;
        } catch (Exception $e) {
            error_log("Get LDAP users error: " . $e->getMessage());
            return [];
        }
    }

    public function importLDAPUser($email, $role = 'requester') {
        if (!LDAP_ENABLED) {
            return ['success' => false, 'message' => 'LDAP is not enabled'];
        }
        try {
            $ldap      = new LDAP();
            $ldapUsers = $ldap->searchUsers($email);
            $ldapUser  = null;

            foreach ($ldapUsers as $user) {
                if (strtolower($user['email']) === strtolower($email)) {
                    $ldapUser = $user;
                    break;
                }
            }
            if (!$ldapUser) {
                return ['success' => false, 'message' => 'LDAP user not found'];
            }

            $stmt = $this->db->prepare("SELECT id FROM tbl_users WHERE email = ?");
            $stmt->execute([$email]);
            $existing = $stmt->fetch();

            if ($existing) {
                $this->callProc(
                    "CALL sp_user_update(?, NULL, NULL, NULL, ?, NULL, 1, NULL, NULL)",
                    [$existing['id'], $role]
                );
                // Also stamp ldap_user = 1
                $this->db->prepare("UPDATE tbl_users SET ldap_user=1 WHERE id=?")->execute([$existing['id']]);
                return ['success' => true, 'message' => 'User updated successfully'];
            }

            $ldapUser['role'] = $role;
            $this->createFromLDAP($ldapUser);
            return ['success' => true, 'message' => 'User imported successfully'];
        } catch (Exception $e) {
            error_log("Import LDAP user error: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to import user: ' . $e->getMessage()];
        }
    }

    // ── CRUD ────────────────────────────────────────────────────────────

    public function assignAdminRole($userId, $isAdmin = true) {
        $role = $isAdmin ? 'admin' : 'requester';
        $this->callProc("CALL sp_user_assign_role(?, ?)", [$userId, $role]);
        return true;
    }

    public function deactivateUser($userId, $deactivatedBy) {
        $this->callProc("CALL sp_user_deactivate(?, ?)", [$userId, $deactivatedBy]);
        return true;
    }

    public function activateUser($userId) {
        $this->callProc("CALL sp_user_activate(?)", [$userId]);
        return true;
    }

    public function create($data) {
        // Generate employee_id for LDAP users if missing
        if (isset($data['ldap_user']) && $data['ldap_user'] == 1 && empty($data['employee_id'])) {
            $email    = $data['email']    ?? '';
            $username = $data['username'] ?? '';
            if (!empty($email)) {
                $parts              = explode('@', $email);
                $data['employee_id'] = substr('USER_' . strtoupper(preg_replace('/[^A-Za-z0-9_]/', '', $parts[0])), 0, 20);
            } elseif (!empty($username)) {
                $data['employee_id'] = substr('USER_' . strtoupper(preg_replace('/[^A-Za-z0-9_]/', '', $username)), 0, 20);
            } else {
                $data['employee_id'] = 'USER_' . bin2hex(random_bytes(4));
            }
        }

        $employeeId  = $data['employee_id']  ?? ('TEMP_' . bin2hex(random_bytes(4)));
        $firstName   = $data['first_name']   ?? '';
        $lastName    = $data['last_name']    ?? '';
        $email       = $data['email']        ?? null;
        $password    = isset($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT)
                                                : password_hash('Temp@123', PASSWORD_DEFAULT);
        $role        = $data['role']         ?? 'requester';
        $department  = !empty($data['department']) ? $data['department'] : null;
        $isActive    = isset($data['is_active']) ? (int)$data['is_active'] : 1;
        $ldapUser    = isset($data['ldap_user']) ? (int)$data['ldap_user'] : 0;
        $jobTitle    = $data['job_title']    ?? ($data['title']     ?? null);
        $company     = $data['company']      ?? null;
        $officePhone = $data['office_phone'] ?? ($data['telephone'] ?? null);

        if (!$email) throw new Exception("Email is required");

        try {
            $this->callProc(
                "CALL sp_user_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @new_id)",
                [$employeeId, $firstName, $lastName, $email, $password,
                 $role, $department, $jobTitle, $company, $officePhone, $isActive, $ldapUser]
            );
            $row = $this->db->query("SELECT @new_id AS new_id")->fetch();
            return (int)$row['new_id'];

        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                $employeeId = substr($employeeId . '_' . substr(md5($email), 0, 4), 0, 20);
                $this->callProc(
                    "CALL sp_user_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @new_id)",
                    [$employeeId, $firstName, $lastName, $email, $password,
                     $role, $department, $jobTitle, $company, $officePhone, $isActive, $ldapUser]
                );
                $row = $this->db->query("SELECT @new_id AS new_id")->fetch();
                return (int)$row['new_id'];
            }
            throw $e;
        }
    }

    public function update($id, $data) {
        $password = !empty($data['password'])
            ? password_hash($data['password'], PASSWORD_DEFAULT)
            : null;

        $this->callProc("CALL sp_user_update(?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            $id,
            $data['first_name']  ?? null,
            $data['last_name']   ?? null,
            $data['email']       ?? null,
            $data['role']        ?? null,
            $data['department']  ?? null,
            isset($data['is_active']) ? (int)$data['is_active'] : null,
            $password,
            $data['employee_id'] ?? null,
        ]);
        return true;
    }

    public function delete($id) {
        $this->callProc("CALL sp_user_delete(?)", [$id]);
        return true;
    }

    public function getAll($page = 1, $search = '') {
        return $this->callProc(
            "CALL sp_user_get_all(?, ?, ?)",
            [$page, ITEMS_PER_PAGE, $search]
        )->fetchAll();
    }

    public function countAll($search = '') {
        $stmt = $this->db->prepare("SELECT fn_count_users(?) AS cnt");
        $stmt->execute([$search]);
        return (int)$stmt->fetchColumn();
    }

    public function updatePassword($id, $newPassword) {
        $this->callProc(
            "CALL sp_user_update_password(?, ?)",
            [$id, password_hash($newPassword, PASSWORD_DEFAULT)]
        );
        // ROW_COUNT() = 0 means LDAP user (blocked in procedure)
        $affected = $this->db->query("SELECT ROW_COUNT() AS rc")->fetchColumn();
        return (int)$affected > 0;
    }

    public function getUsersByRole($role) {
        return $this->callProc("CALL sp_user_get_by_role(?)", [$role])->fetchAll();
    }

    public function getAllUsersWithLDAP($page = 1, $search = '', $includeLDAP = true) {
        $localUsers = $this->getAll($page, $search);
        if (!$includeLDAP || !LDAP_ENABLED) {
            return $localUsers;
        }
        $ldapUsers = $this->getLDAPUsersWithLocalStatus($search);
        $ldapOnly  = array_filter($ldapUsers, function ($u) { return !$u['in_system']; });
        return array_merge($localUsers, $ldapOnly);
    }

    public function getDb() {
        return $this->db;
    }
}

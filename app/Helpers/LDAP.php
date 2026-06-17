<?php
class LDAP {
    private $conn;
    private $bound = false;

    public function __construct() {
        if (!defined('LDAP_ENABLED') || !LDAP_ENABLED) {
            return;
        }
        
        if (!extension_loaded('ldap')) {
            error_log("LDAP extension is not loaded");
            return;
        }
        
        try {
            $this->conn = @ldap_connect(LDAP_HOST, LDAP_PORT);
            if (!$this->conn) {
                error_log("Cannot connect to LDAP server: " . LDAP_HOST);
                return;
            }
            
            ldap_set_option($this->conn, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($this->conn, LDAP_OPT_REFERRALS, 0);
            ldap_set_option($this->conn, LDAP_OPT_NETWORK_TIMEOUT, 5);
            
            error_log("LDAP connection established to: " . LDAP_HOST);
        } catch (Exception $e) {
            error_log("LDAP construct error: " . $e->getMessage());
            $this->conn = null;
        }
    }

    /**
     * Authenticate a user against Active Directory
     * Accepts either sAMAccountName (username) or email (mail/userPrincipalName)
     */
    public function authenticate($username, $password) {
        if (!defined('LDAP_ENABLED') || !LDAP_ENABLED || !$this->conn) {
            error_log("LDAP not available for authentication");
            return false;
        }
        
        if (empty($username) || empty($password)) {
            error_log("LDAP: Empty username or password");
            return false;
        }
        
        try {
            // Determine what format the username is in
            $isEmail = strpos($username, '@') !== false;
            
            if ($isEmail) {
                // User logged in with email - try to authenticate with email as UPN
                error_log("LDAP: Email login attempt: " . $username);
                
                // Try direct bind with email as UPN
                $bind = @ldap_bind($this->conn, $username, $password);
                
                if ($bind) {
                    error_log("LDAP: Bind successful with email UPN: " . $username);
                    $this->bound = true;
                    
                    // Search for user details by email
                    $userData = $this->findUserByEmail($username);
                    if ($userData) {
                        return $userData;
                    }
                    
                    // Fallback with minimal data
                    return $this->createMinimalUserData($username, $isEmail);
                }
                
                // If direct bind fails, try searching for user first
                error_log("LDAP: Direct email bind failed, trying search...");
                $userData = $this->findUserByEmail($username);
                
                if ($userData && isset($userData['upn'])) {
                    // Try bind with found UPN
                    $bind2 = @ldap_bind($this->conn, $userData['upn'], $password);
                    if ($bind2) {
                        error_log("LDAP: Bind successful with found UPN: " . $userData['upn']);
                        $this->bound = true;
                        return $userData;
                    }
                }
                
                // Try sAMAccountName extracted from email
                $emailParts = explode('@', $username);
                $samAccountName = $emailParts[0];
                error_log("LDAP: Trying sAMAccountName from email: " . $samAccountName);
                
                $upnAttempt = $samAccountName . '@' . LDAP_DOMAIN;
                $bind3 = @ldap_bind($this->conn, $upnAttempt, $password);
                
                if ($bind3) {
                    error_log("LDAP: Bind successful with constructed UPN: " . $upnAttempt);
                    $this->bound = true;
                    
                    // Get full user details
                    $userData = $this->findUserBySamAccountName($samAccountName);
                    if ($userData) {
                        return $userData;
                    }
                    
                    return $this->createMinimalUserData($samAccountName, false);
                }
                
            } else {
                // User logged in with username (sAMAccountName)
                error_log("LDAP: Username login attempt: " . $username);
                
                // Try multiple UPN formats
                $upnFormats = [
                    $username . '@' . LDAP_DOMAIN,                    // username@cbkhi.group.local
                    $username . '@cobankiat.com.ph',                  // username@cobankiat.com.ph
                    $username . '@cbkhardware.com',                   // username@cbkhardware.com
                ];
                
                foreach ($upnFormats as $upn) {
                    error_log("LDAP: Trying UPN: " . $upn);
                    $bind = @ldap_bind($this->conn, $upn, $password);
                    
                    if ($bind) {
                        error_log("LDAP: Bind successful with UPN: " . $upn);
                        $this->bound = true;
                        
                        // Get full user details
                        $userData = $this->findUserBySamAccountName($username);
                        if ($userData) {
                            return $userData;
                        }
                        
                        return $this->createMinimalUserData($username, false);
                    }
                }
                
                // Try direct sAMAccountName bind (some AD configs allow this)
                $bindDirect = @ldap_bind($this->conn, $username, $password);
                if ($bindDirect) {
                    error_log("LDAP: Bind successful with direct sAMAccountName: " . $username);
                    $this->bound = true;
                    
                    $userData = $this->findUserBySamAccountName($username);
                    if ($userData) {
                        return $userData;
                    }
                    
                    return $this->createMinimalUserData($username, false);
                }
            }
            
            $lastError = ldap_error($this->conn);
            error_log("LDAP: All authentication attempts failed for: " . $username . " - Error: " . $lastError);
            return false;
            
        } catch (Exception $e) {
            error_log("LDAP authentication error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Find user by email address
     */
    private function findUserByEmail($email) {
        // Try service account bind for searching
        if (defined('LDAP_SERVICE_USER') && LDAP_SERVICE_USER && !empty(LDAP_SERVICE_USER)) {
            @ldap_bind($this->conn, LDAP_SERVICE_USER, LDAP_SERVICE_PASS);
        }
        
        $filter = "(&(objectClass=user)(objectCategory=person)(mail=" . $this->ldapEscape($email) . "))";
        error_log("LDAP: Search filter for email: " . $filter);
        
        return $this->searchAndGetUser($filter);
    }
    
    /**
     * Find user by sAMAccountName
     */
    private function findUserBySamAccountName($username) {
        // Try service account bind for searching
        if (defined('LDAP_SERVICE_USER') && LDAP_SERVICE_USER && !empty(LDAP_SERVICE_USER)) {
            @ldap_bind($this->conn, LDAP_SERVICE_USER, LDAP_SERVICE_PASS);
        }
        
        $filter = "(&(objectClass=user)(objectCategory=person)(sAMAccountName=" . $this->ldapEscape($username) . "))";
        error_log("LDAP: Search filter for username: " . $filter);
        
        return $this->searchAndGetUser($filter);
    }
    
    /**
     * Search LDAP and get user details
     */
    private function searchAndGetUser($filter) {
        $search = @ldap_search($this->conn, LDAP_BASE_DN, $filter, [
            'sAMAccountName', 
            'userPrincipalName', 
            'mail', 
            'displayName',
            'givenName', 
            'sn', 
            'title', 
            'department', 
            'company',
            'telephoneNumber', 
            'employeeID', 
            'physicalDeliveryOfficeName',
            'streetAddress', 
            'l', 
            'st', 
            'postalCode', 
            'c'
        ]);
        
        if ($search) {
            $entries = ldap_get_entries($this->conn, $search);
            error_log("LDAP: Found " . $entries['count'] . " entries");
            
            if ($entries['count'] > 0) {
                $entry = $entries[0];
                
                $userData = [
                    'username' => $this->getLDAPValue($entry, 'samaccountname'),
                    'email' => $this->getLDAPValue($entry, 'mail') ?: $this->getLDAPValue($entry, 'userprincipalname'),
                    'upn' => $this->getLDAPValue($entry, 'userprincipalname'),
                    'name' => $this->getLDAPValue($entry, 'displayname'),
                    'first_name' => $this->getLDAPValue($entry, 'givenname'),
                    'last_name' => $this->getLDAPValue($entry, 'sn'),
                    'department' => $this->getLDAPValue($entry, 'department'),
                    'employee_id' => $this->getLDAPValue($entry, 'employeeid'),
                    'title' => $this->getLDAPValue($entry, 'title'),
                    'company' => $this->getLDAPValue($entry, 'company'),
                    'telephone' => $this->getLDAPValue($entry, 'telephonenumber'),
                    'from_ldap' => true
                ];
                
                error_log("LDAP: User data retrieved - Email: " . ($userData['email'] ?? 'none') . ", Name: " . ($userData['name'] ?? 'none'));
                return $userData;
            }
        } else {
            error_log("LDAP: Search failed - " . ldap_error($this->conn));
        }
        
        return false;
    }
    
    /**
     * Create minimal user data when search fails but bind succeeded
     */
    private function createMinimalUserData($username, $isEmail) {
        if ($isEmail) {
            $parts = explode('@', $username);
            $samName = $parts[0];
            return [
                'username' => $samName,
                'email' => $username,
                'name' => $samName,
                'first_name' => $samName,
                'last_name' => '',
                'department' => null,
                'employee_id' => null,
                'title' => null,
                'company' => null,
                'telephone' => null,
                'from_ldap' => true
            ];
        } else {
            return [
                'username' => $username,
                'email' => $username . '@cobankiat.com.ph',
                'name' => $username,
                'first_name' => $username,
                'last_name' => '',
                'department' => null,
                'employee_id' => null,
                'title' => null,
                'company' => null,
                'telephone' => null,
                'from_ldap' => true
            ];
        }
    }
    
    /**
     * Get value from LDAP entry
     */
    private function getLDAPValue($entry, $attribute) {
        $attr = strtolower($attribute);
        return isset($entry[$attr]) && isset($entry[$attr][0]) ? $entry[$attr][0] : null;
    }
    
    /**
     * Escape special characters for LDAP filter
     */
    private function ldapEscape($str) {
        $metaChars = ['\\', '*', '(', ')', "\0"];
        $replaceChars = ['\\5c', '\\2a', '\\28', '\\29', '\\00'];
        return str_replace($metaChars, $replaceChars, $str);
    }
    
    /**
     * Search for users in LDAP (for admin management)
     */
    public function searchUsers($searchTerm = '', $limit = 50) {
        if (!$this->conn) {
            return [];
        }
        
        try {
            // Try service account bind for searching
            if (defined('LDAP_SERVICE_USER') && LDAP_SERVICE_USER && !empty(LDAP_SERVICE_USER)) {
                @ldap_bind($this->conn, LDAP_SERVICE_USER, LDAP_SERVICE_PASS);
            }
            
            if (empty($searchTerm)) {
                $filter = LDAP_USER_FILTER;
            } else {
                $safeSearch = $this->ldapEscape($searchTerm);
                $filter = "(&" . LDAP_USER_FILTER . "(|(sAMAccountName=*" . $safeSearch . "*)(displayName=*" . $safeSearch . "*)(mail=*" . $safeSearch . "*)))";
            }
            
            error_log("LDAP search filter: " . $filter);
            
            $search = @ldap_search($this->conn, LDAP_BASE_DN, $filter, [
                'sAMAccountName', 'userPrincipalName', 'mail', 'displayName',
                'givenName', 'sn', 'title', 'department', 'company',
                'telephoneNumber', 'employeeID'
            ], 0, $limit);
            
            if ($search) {
                $entries = ldap_get_entries($this->conn, $search);
                $users = [];
                
                for ($i = 0; $i < $entries['count']; $i++) {
                    $entry = $entries[$i];
                    $users[] = [
                        'username' => $this->getLDAPValue($entry, 'samaccountname'),
                        'email' => $this->getLDAPValue($entry, 'mail') ?: $this->getLDAPValue($entry, 'userprincipalname'),
                        'name' => $this->getLDAPValue($entry, 'displayname'),
                        'first_name' => $this->getLDAPValue($entry, 'givenname'),
                        'last_name' => $this->getLDAPValue($entry, 'sn'),
                        'department' => $this->getLDAPValue($entry, 'department'),
                        'employee_id' => $this->getLDAPValue($entry, 'employeeid'),
                        'title' => $this->getLDAPValue($entry, 'title'),
                        'company' => $this->getLDAPValue($entry, 'company'),
                        'telephone' => $this->getLDAPValue($entry, 'telephonenumber'),
                        'from_ldap' => true
                    ];
                }
                
                return $users;
            }
        } catch (Exception $e) {
            error_log("LDAP search error: " . $e->getMessage());
        }
        
        return [];
    }
    
    public function __destruct() {
        if ($this->conn) {
            @ldap_close($this->conn);
        }
    }
}
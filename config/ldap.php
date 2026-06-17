<?php
// SET THIS TO true TO ENABLE LDAP LOGIN
define('LDAP_ENABLED', true);

define('LDAP_HOST', 'ldap://172.30.5.5');
define('LDAP_PORT', 389);

define('LDAP_BASE_DN', 'DC=cbkhi,DC=group,DC=local');
define('LDAP_DOMAIN', 'cbkhi.group.local');

// If left empty, only direct bind authentication will work
define('LDAP_SERVICE_USER', '');  // e.g., 'svc_ldap@cbkhi.group.local'
define('LDAP_SERVICE_PASS', '');

// LDAP Filter for users
define('LDAP_USER_FILTER', '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))');

// Admin email pattern (local admin bypass)
define('ADMIN_EMAIL_PATTERN', '/^cbkadmin@/i');
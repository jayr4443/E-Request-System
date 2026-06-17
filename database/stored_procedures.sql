-- ============================================================
--  MPC-ERS  —  Stored Procedures, Stored Functions & Views
--  Database : mpc_ers
--  Compatible: MySQL 5.7+ / MariaDB 10.1+
-- ============================================================

USE mpc_ers;
DELIMITER $$


-- ============================================================
--  SECTION 1 : STORED FUNCTIONS
--  (scalar helpers called inside procedures or SELECTs)
-- ============================================================

-- ------------------------------------------------------------
-- fn_get_user_full_name(user_id)
-- Returns CONCAT(first_name,' ',last_name) for a user
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_user_full_name $$
CREATE FUNCTION fn_get_user_full_name(p_user_id INT)
RETURNS VARCHAR(201)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_name VARCHAR(201);
    SELECT CONCAT(first_name, ' ', last_name)
    INTO   v_name
    FROM   tbl_users
    WHERE  id = p_user_id
    LIMIT  1;
    RETURN IFNULL(v_name, 'Unknown User');
END $$


-- ------------------------------------------------------------
-- fn_get_request_type_id_by_category(category)
-- Maps SUPPLIER→1, CUSTOMER→2, EMPLOYEE→3
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_request_type_id_by_category $$
CREATE FUNCTION fn_get_request_type_id_by_category(p_category VARCHAR(20))
RETURNS INT
NO SQL
DETERMINISTIC
BEGIN
    CASE UPPER(p_category)
        WHEN 'SUPPLIER' THEN RETURN 1;
        WHEN 'CUSTOMER' THEN RETURN 2;
        ELSE             RETURN 3;   -- EMPLOYEE default
    END CASE;
END $$


-- ------------------------------------------------------------
-- fn_get_category_by_request_type_id(request_type_id)
-- Reverse map: 1→SUPPLIER, 2→CUSTOMER, 3→EMPLOYEE
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_category_by_request_type_id $$
CREATE FUNCTION fn_get_category_by_request_type_id(p_type_id INT)
RETURNS VARCHAR(20)
NO SQL
DETERMINISTIC
BEGIN
    CASE p_type_id
        WHEN 1 THEN RETURN 'SUPPLIER';
        WHEN 2 THEN RETURN 'CUSTOMER';
        ELSE        RETURN 'EMPLOYEE';
    END CASE;
END $$


-- ------------------------------------------------------------
-- fn_generate_request_no()
-- Returns next request number: MDCU-ERS-YYYYMM-NNNN
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_generate_request_no $$
CREATE FUNCTION fn_generate_request_no()
RETURNS VARCHAR(30)
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_year  CHAR(4)   DEFAULT YEAR(NOW());
    DECLARE v_month CHAR(2)   DEFAULT LPAD(MONTH(NOW()), 2, '0');
    DECLARE v_count INT       DEFAULT 0;
    DECLARE v_seq   VARCHAR(4);

    SELECT COUNT(*) + 1
    INTO   v_count
    FROM   tbl_requests
    WHERE  YEAR(created_at)  = v_year
      AND  MONTH(created_at) = v_month;

    SET v_seq = LPAD(v_count, 4, '0');
    RETURN CONCAT('MDCU-ERS-', v_year, v_month, '-', v_seq);
END $$


-- ------------------------------------------------------------
-- fn_get_notification_unread_count(user_id)
-- Returns count of unread notifications for a user
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_notification_unread_count $$
CREATE FUNCTION fn_get_notification_unread_count(p_user_id INT)
RETURNS INT
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_count INT DEFAULT 0;
    SELECT COUNT(*) INTO v_count
    FROM   tbl_notifications
    WHERE  user_id = p_user_id
      AND  is_read = 0;
    RETURN v_count;
END $$


-- ------------------------------------------------------------
-- fn_get_notification_latest_id(user_id)
-- Returns MAX(id) of notifications for a user (0 if none)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_get_notification_latest_id $$
CREATE FUNCTION fn_get_notification_latest_id(p_user_id INT)
RETURNS INT
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_id INT DEFAULT 0;
    SELECT IFNULL(MAX(id), 0) INTO v_id
    FROM   tbl_notifications
    WHERE  user_id = p_user_id;
    RETURN v_id;
END $$


-- ------------------------------------------------------------
-- fn_count_users(search)
-- Total user count, optional search filter
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_count_users $$
CREATE FUNCTION fn_count_users(p_search VARCHAR(255))
RETURNS INT
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_like  VARCHAR(257);
    SET v_like = CONCAT('%', IFNULL(p_search, ''), '%');

    SELECT COUNT(*) INTO v_count
    FROM   tbl_users
    WHERE  first_name  LIKE v_like
       OR  last_name   LIKE v_like
       OR  email       LIKE v_like
       OR  employee_id LIKE v_like;

    RETURN v_count;
END $$


-- ------------------------------------------------------------
-- fn_count_notifications_by_user(user_id)
-- Total notification count for a user
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_count_notifications_by_user $$
CREATE FUNCTION fn_count_notifications_by_user(p_user_id INT)
RETURNS INT
READS SQL DATA
NOT DETERMINISTIC
BEGIN
    DECLARE v_count INT DEFAULT 0;
    SELECT COUNT(*) INTO v_count
    FROM   tbl_notifications
    WHERE  user_id = p_user_id;
    RETURN v_count;
END $$


-- ============================================================
--  SECTION 2 : DATABASE VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- vw_requests_list
-- Enriched request list used for pagination, search & exports
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_requests_list $$
CREATE VIEW vw_requests_list AS
    SELECT
        r.id,
        r.request_no,
        r.subject,
        r.status,
        r.priority,
        r.category,
        r.submitted_at,
        r.created_at,
        r.updated_at,
        r.posted_at,
        r.sap_reference,
        r.requester_id,
        rt.name   AS request_type_name,
        rt.code   AS request_type_code,
        CONCAT(u.first_name, ' ', u.last_name) AS requester_name,
        u.department  AS requester_department,
        u.employee_id AS requester_employee_id
    FROM  tbl_requests r
    JOIN  tbl_request_types rt ON r.request_type_id = rt.id
    JOIN  tbl_users         u  ON r.requester_id    = u.id $$


-- ------------------------------------------------------------
-- vw_request_detail
-- Full request detail including requester info (for findById)
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_request_detail $$
CREATE VIEW vw_request_detail AS
    SELECT
        r.*,
        rt.name   AS request_type_name,
        rt.code   AS request_type_code,
        CONCAT(u.first_name, ' ', u.last_name) AS requester_name,
        u.department  AS requester_department,
        u.employee_id AS requester_employee_id
    FROM  tbl_requests r
    JOIN  tbl_request_types rt ON r.request_type_id = rt.id
    JOIN  tbl_users         u  ON r.requester_id    = u.id $$


-- ------------------------------------------------------------
-- vw_approvals_with_signatories
-- Approvals with signer name & uploaded document info
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_approvals_with_signatories $$
CREATE VIEW vw_approvals_with_signatories AS
    SELECT
        a.*,
        CONCAT(u.first_name, ' ', u.last_name) AS signatory_name,
        d.filename      AS document_filename,
        d.original_name AS document_original_name
    FROM  tbl_approvals a
    LEFT JOIN tbl_users     u ON a.user_id              = u.id
    LEFT JOIN tbl_documents d ON a.uploaded_document_id = d.id $$


-- ------------------------------------------------------------
-- vw_documents_with_uploader
-- Documents with the name of the user who uploaded them
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_documents_with_uploader $$
CREATE VIEW vw_documents_with_uploader AS
    SELECT
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name
    FROM  tbl_documents d
    JOIN  tbl_users u ON d.uploaded_by = u.id $$


-- ------------------------------------------------------------
-- vw_audit_logs_with_user
-- Audit log entries enriched with actor name
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_audit_logs_with_user $$
CREATE VIEW vw_audit_logs_with_user AS
    SELECT
        al.*,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name
    FROM  tbl_audit_logs al
    LEFT JOIN tbl_users u ON al.user_id = u.id $$


-- ------------------------------------------------------------
-- vw_notifications_with_request
-- Notifications enriched with basic request data
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_notifications_with_request $$
CREATE VIEW vw_notifications_with_request AS
    SELECT
        n.*,
        r.request_no,
        r.status  AS request_status,
        r.subject AS request_subject
    FROM  tbl_notifications n
    LEFT JOIN tbl_requests r ON n.request_id = r.id $$


-- ------------------------------------------------------------
-- vw_users_list
-- Safe user listing (no password column)
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_users_list $$
CREATE VIEW vw_users_list AS
    SELECT
        id, employee_id, first_name, last_name, email,
        role, department, job_title, company, office_phone,
        is_active, ldap_user, created_at, ldap_synced_at
    FROM tbl_users $$


-- ------------------------------------------------------------
-- vw_dashboard_stats
-- Live status counts across all requests (for admin dashboard)
-- ------------------------------------------------------------
DROP VIEW IF EXISTS vw_dashboard_stats $$
CREATE VIEW vw_dashboard_stats AS
    SELECT
        SUM(status = 'draft')        AS draft,
        SUM(status = 'submitted')    AS submitted,
        SUM(status = 'under_review') AS under_review,
        SUM(status = 'for_signing')  AS for_signing,
        SUM(status = 'signed')       AS signed,
        SUM(status = 'posted')       AS posted,
        SUM(status = 'rejected')     AS rejected,
        COUNT(*)                     AS total
    FROM tbl_requests $$


-- ============================================================
--  SECTION 3 : STORED PROCEDURES — NOTIFICATIONS
-- ============================================================

-- ------------------------------------------------------------
-- sp_notification_create(user_id, request_id, title, message, force, OUT new_id)
-- Inserts a notification; skips duplicate within 5 minutes unless force=1
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_create $$
CREATE PROCEDURE sp_notification_create(
    IN  p_user_id    INT,
    IN  p_request_id INT,
    IN  p_title      VARCHAR(255),
    IN  p_message    TEXT,
    IN  p_force      TINYINT,
    OUT p_new_id     INT
)
BEGIN
    DECLARE v_dup INT DEFAULT 0;

    IF p_force = 0 THEN
        SELECT COUNT(*) INTO v_dup
        FROM   tbl_notifications
        WHERE  user_id    = p_user_id
          AND  request_id = p_request_id
          AND  title      = p_title
          AND  message    = p_message
          AND  created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
    END IF;

    IF v_dup > 0 THEN
        SET p_new_id = NULL;
    ELSE
        INSERT INTO tbl_notifications
            (user_id, request_id, title, message, is_read, created_at)
        VALUES
            (p_user_id, p_request_id, p_title, p_message, 0, NOW());
        SET p_new_id = LAST_INSERT_ID();
    END IF;
END $$


-- ------------------------------------------------------------
-- sp_notification_get_by_user(user_id, page, limit)
-- Paginated notifications for a user
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_get_by_user $$
CREATE PROCEDURE sp_notification_get_by_user(
    IN p_user_id INT,
    IN p_page    INT,
    IN p_limit   INT
)
BEGIN
    DECLARE v_offset INT DEFAULT (p_page - 1) * p_limit;
    SELECT *
    FROM   vw_notifications_with_request
    WHERE  user_id = p_user_id
    ORDER  BY created_at DESC
    LIMIT  p_limit OFFSET v_offset;
END $$


-- ------------------------------------------------------------
-- sp_notification_get_recent(user_id, since_date, limit)
-- Recent notifications; if since_date IS NOT NULL filters by date
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_get_recent $$
CREATE PROCEDURE sp_notification_get_recent(
    IN p_user_id    INT,
    IN p_since_date DATETIME,
    IN p_limit      INT
)
BEGIN
    IF p_since_date IS NOT NULL THEN
        SELECT *
        FROM   vw_notifications_with_request
        WHERE  user_id    = p_user_id
          AND  created_at > p_since_date
        ORDER  BY created_at DESC;
    ELSE
        SELECT *
        FROM   vw_notifications_with_request
        WHERE  user_id = p_user_id
        ORDER  BY created_at DESC
        LIMIT  p_limit;
    END IF;
END $$


-- ------------------------------------------------------------
-- sp_notification_get_new(user_id, after_id)
-- Notifications newer than after_id (for SSE polling)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_get_new $$
CREATE PROCEDURE sp_notification_get_new(
    IN p_user_id  INT,
    IN p_after_id INT
)
BEGIN
    SELECT *
    FROM   vw_notifications_with_request
    WHERE  user_id = p_user_id
      AND  id      > p_after_id
    ORDER  BY id ASC
    LIMIT  50;
END $$


-- ------------------------------------------------------------
-- sp_notification_mark_read(notification_id, user_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_mark_read $$
CREATE PROCEDURE sp_notification_mark_read(
    IN p_notification_id INT,
    IN p_user_id         INT
)
BEGIN
    UPDATE tbl_notifications
    SET    is_read = 1,
           read_at = NOW()
    WHERE  id      = p_notification_id
      AND  user_id = p_user_id;
END $$


-- ------------------------------------------------------------
-- sp_notification_mark_all_read(user_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_mark_all_read $$
CREATE PROCEDURE sp_notification_mark_all_read(IN p_user_id INT)
BEGIN
    UPDATE tbl_notifications
    SET    is_read = 1,
           read_at = NOW()
    WHERE  user_id = p_user_id
      AND  is_read = 0;
END $$


-- ------------------------------------------------------------
-- sp_notification_notify_managers(request_id, title, message, exclude_user_id)
-- Sends notification to all manager-role active users
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_notify_managers $$
CREATE PROCEDURE sp_notification_notify_managers(
    IN p_request_id      INT,
    IN p_title           VARCHAR(255),
    IN p_message         TEXT,
    IN p_exclude_user_id INT
)
BEGIN
    DECLARE v_done   INT DEFAULT 0;
    DECLARE v_mgr_id INT;
    DECLARE v_new_id INT;

    DECLARE cur CURSOR FOR
        SELECT id FROM tbl_users
        WHERE  role IN ('mpc_personnel','it_manager','senior_manager','vp_operations','admin')
          AND  is_active = 1
          AND  (p_exclude_user_id IS NULL OR id != p_exclude_user_id);

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    OPEN cur;
    mgr_loop: LOOP
        FETCH cur INTO v_mgr_id;
        IF v_done THEN LEAVE mgr_loop; END IF;
        CALL sp_notification_create(v_mgr_id, p_request_id, p_title, p_message, 0, v_new_id);
    END LOOP;
    CLOSE cur;
END $$


-- ------------------------------------------------------------
-- sp_notification_clean_old()
-- Deletes notifications older than 30 days
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_notification_clean_old $$
CREATE PROCEDURE sp_notification_clean_old()
BEGIN
    DELETE FROM tbl_notifications
    WHERE  created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END $$


-- ============================================================
--  SECTION 4 : STORED PROCEDURES — USERS
-- ============================================================

-- ------------------------------------------------------------
-- sp_user_find_by_email(email)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_find_by_email $$
CREATE PROCEDURE sp_user_find_by_email(IN p_email VARCHAR(255))
BEGIN
    SELECT * FROM tbl_users
    WHERE  email     = p_email
      AND  is_active = 1
    LIMIT  1;
END $$


-- ------------------------------------------------------------
-- sp_user_find_by_employee_id(employee_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_find_by_employee_id $$
CREATE PROCEDURE sp_user_find_by_employee_id(IN p_employee_id VARCHAR(50))
BEGIN
    SELECT * FROM tbl_users
    WHERE  employee_id = p_employee_id
    LIMIT  1;
END $$


-- ------------------------------------------------------------
-- sp_user_find_by_id(id)
-- Active users only, no password column
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_find_by_id $$
CREATE PROCEDURE sp_user_find_by_id(IN p_id INT)
BEGIN
    SELECT id, employee_id, first_name, last_name, email, role,
           department, is_active, created_at, ldap_user, job_title
    FROM   tbl_users
    WHERE  id        = p_id
      AND  is_active = 1
    LIMIT  1;
END $$


-- ------------------------------------------------------------
-- sp_user_find_by_id_with_status(id)
-- Includes inactive users
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_find_by_id_with_status $$
CREATE PROCEDURE sp_user_find_by_id_with_status(IN p_id INT)
BEGIN
    SELECT id, employee_id, first_name, last_name, email, role,
           department, is_active, created_at, ldap_user, job_title
    FROM   tbl_users
    WHERE  id = p_id
    LIMIT  1;
END $$


-- ------------------------------------------------------------
-- sp_user_find_include_inactive(id)
-- Returns all columns including password (for auth only)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_find_include_inactive $$
CREATE PROCEDURE sp_user_find_include_inactive(IN p_id INT)
BEGIN
    SELECT * FROM tbl_users WHERE id = p_id LIMIT 1;
END $$


-- ------------------------------------------------------------
-- sp_user_get_all(page, limit, search)
-- Paginated user list
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_get_all $$
CREATE PROCEDURE sp_user_get_all(
    IN p_page   INT,
    IN p_limit  INT,
    IN p_search VARCHAR(255)
)
BEGIN
    DECLARE v_offset INT DEFAULT (p_page - 1) * p_limit;
    DECLARE v_like   VARCHAR(257) DEFAULT CONCAT('%', IFNULL(p_search, ''), '%');

    SELECT id, employee_id, first_name, last_name, email, role,
           department, is_active, created_at, ldap_user
    FROM   tbl_users
    WHERE  first_name  LIKE v_like
       OR  last_name   LIKE v_like
       OR  email       LIKE v_like
       OR  employee_id LIKE v_like
    ORDER  BY created_at DESC
    LIMIT  p_limit OFFSET v_offset;
END $$


-- ------------------------------------------------------------
-- sp_user_get_by_role(role)
-- All active users of a given role
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_get_by_role $$
CREATE PROCEDURE sp_user_get_by_role(IN p_role VARCHAR(50))
BEGIN
    SELECT id, first_name, last_name, email
    FROM   tbl_users
    WHERE  role      = p_role
      AND  is_active = 1;
END $$


-- ------------------------------------------------------------
-- sp_user_create(employee_id, first_name, last_name, email,
--                hashed_password, role, department, job_title,
--                company, office_phone, is_active, ldap_user, OUT new_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_create $$
CREATE PROCEDURE sp_user_create(
    IN  p_employee_id  VARCHAR(50),
    IN  p_first_name   VARCHAR(100),
    IN  p_last_name    VARCHAR(100),
    IN  p_email        VARCHAR(255),
    IN  p_password     VARCHAR(255),
    IN  p_role         VARCHAR(50),
    IN  p_department   VARCHAR(100),
    IN  p_job_title    VARCHAR(100),
    IN  p_company      VARCHAR(100),
    IN  p_office_phone VARCHAR(50),
    IN  p_is_active    TINYINT,
    IN  p_ldap_user    TINYINT,
    OUT p_new_id       INT
)
BEGIN
    INSERT INTO tbl_users
        (employee_id, first_name, last_name, email, password,
         role, department, job_title, company, office_phone,
         is_active, ldap_user)
    VALUES
        (p_employee_id, p_first_name, p_last_name, p_email, p_password,
         p_role, p_department, p_job_title, p_company, p_office_phone,
         p_is_active, p_ldap_user);
    SET p_new_id = LAST_INSERT_ID();
END $$


-- ------------------------------------------------------------
-- sp_user_update(id, first_name, last_name, email, role,
--                department, is_active, hashed_password, employee_id)
-- NULL fields are left unchanged
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_update $$
CREATE PROCEDURE sp_user_update(
    IN p_id          INT,
    IN p_first_name  VARCHAR(100),
    IN p_last_name   VARCHAR(100),
    IN p_email       VARCHAR(255),
    IN p_role        VARCHAR(50),
    IN p_department  VARCHAR(100),
    IN p_is_active   TINYINT,
    IN p_password    VARCHAR(255),
    IN p_employee_id VARCHAR(50)
)
BEGIN
    UPDATE tbl_users
    SET
        first_name  = IFNULL(p_first_name,  first_name),
        last_name   = IFNULL(p_last_name,   last_name),
        email       = IFNULL(p_email,       email),
        role        = IFNULL(p_role,        role),
        department  = IFNULL(p_department,  department),
        is_active   = IFNULL(p_is_active,   is_active),
        password    = IFNULL(p_password,    password),
        employee_id = IFNULL(p_employee_id, employee_id)
    WHERE id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_user_update_password(id, hashed_password)
-- Refuses update for LDAP users (returns affected rows = 0)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_update_password $$
CREATE PROCEDURE sp_user_update_password(
    IN p_id       INT,
    IN p_password VARCHAR(255)
)
BEGIN
    UPDATE tbl_users
    SET    password = p_password
    WHERE  id       = p_id
      AND  ldap_user = 0;
END $$


-- ------------------------------------------------------------
-- sp_user_deactivate(id, deactivated_by)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_deactivate $$
CREATE PROCEDURE sp_user_deactivate(
    IN p_id              INT,
    IN p_deactivated_by  INT
)
BEGIN
    UPDATE tbl_users
    SET    is_active      = 0,
           deactivated_by = p_deactivated_by,
           deactivated_at = NOW()
    WHERE  id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_user_activate(id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_activate $$
CREATE PROCEDURE sp_user_activate(IN p_id INT)
BEGIN
    UPDATE tbl_users
    SET    is_active      = 1,
           deactivated_by = NULL,
           deactivated_at = NULL
    WHERE  id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_user_assign_role(id, role)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_assign_role $$
CREATE PROCEDURE sp_user_assign_role(
    IN p_id   INT,
    IN p_role VARCHAR(50)
)
BEGIN
    UPDATE tbl_users SET role = p_role WHERE id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_user_delete(id)
-- Hard delete (only used by admin; prefer deactivate)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_delete $$
CREATE PROCEDURE sp_user_delete(IN p_id INT)
BEGIN
    DELETE FROM tbl_users WHERE id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_user_update_from_ldap(id, first_name, last_name, department,
--                           job_title, company, office_phone, employee_id)
-- Updates only non-NULL fields + stamps ldap_synced_at
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_update_from_ldap $$
CREATE PROCEDURE sp_user_update_from_ldap(
    IN p_id           INT,
    IN p_first_name   VARCHAR(100),
    IN p_last_name    VARCHAR(100),
    IN p_department   VARCHAR(100),
    IN p_job_title    VARCHAR(100),
    IN p_company      VARCHAR(100),
    IN p_office_phone VARCHAR(50),
    IN p_employee_id  VARCHAR(50)
)
BEGIN
    UPDATE tbl_users
    SET
        first_name    = IFNULL(p_first_name,   first_name),
        last_name     = IFNULL(p_last_name,    last_name),
        department    = IFNULL(p_department,   department),
        job_title     = IFNULL(p_job_title,    job_title),
        company       = IFNULL(p_company,      company),
        office_phone  = IFNULL(p_office_phone, office_phone),
        employee_id   = IFNULL(p_employee_id,  employee_id),
        ldap_synced_at = NOW()
    WHERE id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_user_get_manager_emails(exclude_user_id)
-- Returns email + full name for all active manager-role users
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_get_manager_emails $$
CREATE PROCEDURE sp_user_get_manager_emails(IN p_exclude_user_id INT)
BEGIN
    SELECT email,
           CONCAT(first_name, ' ', last_name) AS name
    FROM   tbl_users
    WHERE  role IN ('mpc_personnel','it_manager','senior_manager','vp_operations','admin')
      AND  is_active = 1
      AND  (p_exclude_user_id IS NULL OR id != p_exclude_user_id);
END $$


-- ------------------------------------------------------------
-- sp_user_get_email_and_name(user_id)
-- Returns email + full name for a single user
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_get_email_and_name $$
CREATE PROCEDURE sp_user_get_email_and_name(IN p_user_id INT)
BEGIN
    SELECT email,
           CONCAT(first_name, ' ', last_name) AS name
    FROM   tbl_users
    WHERE  id = p_user_id
    LIMIT  1;
END $$


-- ============================================================
--  SECTION 5 : STORED PROCEDURES — REQUESTS
-- ============================================================

-- ------------------------------------------------------------
-- sp_request_get_all(page, limit, status_filter, search, user_id)
-- Paginated request list; user_id=NULL returns all (admin view)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_get_all $$
CREATE PROCEDURE sp_request_get_all(
    IN p_page    INT,
    IN p_limit   INT,
    IN p_status  VARCHAR(50),
    IN p_search  VARCHAR(255),
    IN p_user_id INT
)
BEGIN
    DECLARE v_offset INT DEFAULT (p_page - 1) * p_limit;

    SELECT id, request_no, subject, status, priority,
           submitted_at, created_at, request_type_name, requester_name
    FROM   vw_requests_list
    WHERE  (p_user_id IS NULL OR requester_id = p_user_id)
      AND  (p_status  IS NULL OR p_status = '' OR status = p_status)
      AND  (p_search  IS NULL OR p_search = ''
            OR request_no LIKE CONCAT('%', p_search, '%')
            OR subject     LIKE CONCAT('%', p_search, '%'))
    ORDER  BY created_at DESC
    LIMIT  p_limit OFFSET v_offset;
END $$


-- ------------------------------------------------------------
-- sp_request_count_all(status_filter, search, user_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_count_all $$
CREATE PROCEDURE sp_request_count_all(
    IN p_status  VARCHAR(50),
    IN p_search  VARCHAR(255),
    IN p_user_id INT
)
BEGIN
    SELECT COUNT(*) AS total
    FROM   tbl_requests r
    WHERE  (p_user_id IS NULL OR r.requester_id = p_user_id)
      AND  (p_status  IS NULL OR p_status = '' OR r.status = p_status)
      AND  (p_search  IS NULL OR p_search = ''
            OR r.request_no LIKE CONCAT('%', p_search, '%')
            OR r.subject     LIKE CONCAT('%', p_search, '%'));
END $$


-- ------------------------------------------------------------
-- sp_request_find_by_id(id)
-- Returns enriched single request row
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_find_by_id $$
CREATE PROCEDURE sp_request_find_by_id(IN p_id INT)
BEGIN
    SELECT * FROM vw_request_detail WHERE id = p_id LIMIT 1;
END $$


-- ------------------------------------------------------------
-- sp_request_get_for_print(id)
-- Returns request + requester name/dept/employee_id
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_get_for_print $$
CREATE PROCEDURE sp_request_get_for_print(IN p_id INT)
BEGIN
    SELECT r.*,
           CONCAT(u.first_name, ' ', u.last_name) AS requester_name,
           u.department AS requester_department,
           u.employee_id
    FROM   tbl_requests r
    JOIN   tbl_users    u ON r.requester_id = u.id
    WHERE  r.id = p_id
    LIMIT  1;
END $$


-- ------------------------------------------------------------
-- sp_request_create(category, subject, description, requester_id,
--                   status, priority, OUT new_id, OUT request_no)
-- Creates the main request row and returns the new ID + no.
-- (form data inserts handled by category-specific procedures below)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_create $$
CREATE PROCEDURE sp_request_create(
    IN  p_category     VARCHAR(20),
    IN  p_subject      VARCHAR(255),
    IN  p_description  TEXT,
    IN  p_requester_id INT,
    IN  p_status       VARCHAR(50),
    IN  p_priority     VARCHAR(20),
    OUT p_new_id       INT,
    OUT p_request_no   VARCHAR(30)
)
BEGIN
    DECLARE v_type_id    INT;
    DECLARE v_req_no     VARCHAR(30);
    DECLARE v_submitted  DATETIME DEFAULT NULL;

    SET v_type_id = fn_get_request_type_id_by_category(p_category);
    SET v_req_no  = fn_generate_request_no();

    IF p_status = 'submitted' THEN
        SET v_submitted = NOW();
    END IF;

    INSERT INTO tbl_requests
        (request_no, request_type_id, category, subject, description,
         requester_id, status, priority, submitted_at)
    VALUES
        (v_req_no, v_type_id, p_category, p_subject, p_description,
         p_requester_id, p_status, p_priority, v_submitted);

    SET p_new_id     = LAST_INSERT_ID();
    SET p_request_no = v_req_no;
END $$


-- ------------------------------------------------------------
-- sp_request_update(id, subject, priority, user_id)
-- Updates the main request header row
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_update $$
CREATE PROCEDURE sp_request_update(
    IN p_id       INT,
    IN p_subject  VARCHAR(255),
    IN p_priority VARCHAR(20),
    IN p_user_id  INT
)
BEGIN
    UPDATE tbl_requests
    SET    subject    = p_subject,
           priority   = p_priority,
           updated_at = NOW()
    WHERE  id = p_id;
END $$


-- ------------------------------------------------------------
-- sp_request_submit(id, requester_id)
-- Transitions a draft request to submitted
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_submit $$
CREATE PROCEDURE sp_request_submit(
    IN  p_id           INT,
    IN  p_requester_id INT,
    OUT p_success      TINYINT
)
BEGIN
    UPDATE tbl_requests
    SET    status       = 'submitted',
           submitted_at = NOW()
    WHERE  id           = p_id
      AND  requester_id = p_requester_id
      AND  status       = 'draft';

    SET p_success = IF(ROW_COUNT() > 0, 1, 0);
END $$


-- ------------------------------------------------------------
-- sp_request_update_status(id, new_status, user_id, notes)
-- Validates allowed transitions before updating
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_update_status $$
CREATE PROCEDURE sp_request_update_status(
    IN  p_id         INT,
    IN  p_new_status VARCHAR(50),
    IN  p_user_id    INT,
    IN  p_notes      TEXT,
    OUT p_success    TINYINT,
    OUT p_old_status VARCHAR(50),
    OUT p_requester  INT,
    OUT p_req_no     VARCHAR(30),
    OUT p_subject    VARCHAR(255)
)
BEGIN
    DECLARE v_cur_status VARCHAR(50);
    DECLARE v_allowed    TINYINT DEFAULT 0;

    SELECT status, requester_id, request_no, subject
    INTO   v_cur_status, p_requester, p_req_no, p_subject
    FROM   tbl_requests WHERE id = p_id LIMIT 1;

    SET p_old_status = v_cur_status;

    -- Validate allowed transitions
    SET v_allowed = CASE v_cur_status
        WHEN 'draft'        THEN IF(p_new_status IN ('submitted'),                              1, 0)
        WHEN 'submitted'    THEN IF(p_new_status IN ('under_review','rejected','cancelled'),    1, 0)
        WHEN 'under_review' THEN IF(p_new_status IN ('for_signing','rejected','cancelled'),     1, 0)
        WHEN 'for_signing'  THEN IF(p_new_status IN ('signed','rejected','cancelled'),          1, 0)
        WHEN 'signed'       THEN IF(p_new_status IN ('posted','rejected','cancelled'),          1, 0)
        ELSE 0
    END;

    IF v_allowed = 0 OR v_cur_status = p_new_status THEN
        SET p_success = 0;
    ELSE
        UPDATE tbl_requests
        SET    status     = p_new_status,
               updated_at = NOW()
        WHERE  id = p_id;

        SET p_success = 1;
    END IF;
END $$


-- ------------------------------------------------------------
-- sp_request_post(id, sap_reference, OUT success, OUT requester_id, OUT req_no, OUT subject)
-- Transitions signed → posted
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_post $$
CREATE PROCEDURE sp_request_post(
    IN  p_id          INT,
    IN  p_sap_ref     VARCHAR(100),
    OUT p_success     TINYINT,
    OUT p_requester   INT,
    OUT p_req_no      VARCHAR(30),
    OUT p_subject     VARCHAR(255)
)
BEGIN
    SELECT requester_id, request_no, subject
    INTO   p_requester, p_req_no, p_subject
    FROM   tbl_requests WHERE id = p_id LIMIT 1;

    UPDATE tbl_requests
    SET    status        = 'posted',
           posted_at     = NOW(),
           sap_reference = p_sap_ref
    WHERE  id     = p_id
      AND  status = 'signed';

    SET p_success = IF(ROW_COUNT() > 0, 1, 0);
END $$


-- ------------------------------------------------------------
-- sp_request_get_dashboard_stats(user_id)
-- Returns status counts; user_id=NULL returns global stats
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_get_dashboard_stats $$
CREATE PROCEDURE sp_request_get_dashboard_stats(IN p_user_id INT)
BEGIN
    SELECT
        SUM(status = 'draft')        AS draft,
        SUM(status = 'submitted')    AS submitted,
        SUM(status = 'under_review') AS under_review,
        SUM(status = 'for_signing')  AS for_signing,
        SUM(status = 'signed')       AS signed,
        SUM(status = 'posted')       AS posted,
        SUM(status = 'rejected')     AS rejected,
        COUNT(*)                     AS total
    FROM tbl_requests
    WHERE (p_user_id IS NULL OR requester_id = p_user_id);
END $$


-- ------------------------------------------------------------
-- sp_request_get_updates(since_datetime, user_id)
-- Returns recently updated requests (for realtime polling)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_get_updates $$
CREATE PROCEDURE sp_request_get_updates(
    IN p_since   DATETIME,
    IN p_user_id INT
)
BEGIN
    SELECT id, request_no, status, updated_at, submitted_at,
           requester_name, request_type_name
    FROM   vw_requests_list
    WHERE  (p_since   IS NULL OR updated_at > p_since)
      AND  (p_user_id IS NULL OR requester_id = p_user_id)
    ORDER  BY updated_at DESC
    LIMIT  50;
END $$


-- ------------------------------------------------------------
-- sp_request_get_types()
-- Returns all active request types
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_get_types $$
CREATE PROCEDURE sp_request_get_types()
BEGIN
    SELECT * FROM tbl_request_types WHERE is_active = 1 ORDER BY name;
END $$


-- ------------------------------------------------------------
-- sp_request_mark_printed(request_id, user_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_mark_printed $$
CREATE PROCEDURE sp_request_mark_printed(
    IN p_request_id INT,
    IN p_user_id    INT
)
BEGIN
    INSERT INTO tbl_printable_forms (request_id, printed_by)
    VALUES (p_request_id, p_user_id);
END $$


-- ============================================================
--  SECTION 6 : STORED PROCEDURES — SIGNATORIES / APPROVALS
-- ============================================================

-- ------------------------------------------------------------
-- sp_signatories_create_for_category(request_id, category)
-- Deletes existing signatories and recreates for the category
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_create_for_category $$
CREATE PROCEDURE sp_signatories_create_for_category(
    IN p_request_id INT,
    IN p_category   VARCHAR(20)
)
BEGIN
    DELETE FROM tbl_approvals WHERE request_id = p_request_id;

    CASE UPPER(p_category)
    WHEN 'SUPPLIER' THEN
        INSERT INTO tbl_approvals (request_id, signatory_role, signatory_label, sequence, status) VALUES
            (p_request_id, 'requested_by',   'REQUESTED BY',   1, 'pending'),
            (p_request_id, 'validated_by',   'VALIDATED BY',   2, 'pending'),
            (p_request_id, 'approved_by',    'APPROVED BY',    3, 'pending'),
            (p_request_id, 'executed_by',    'EXECUTED BY',    4, 'pending');
    WHEN 'CUSTOMER' THEN
        INSERT INTO tbl_approvals (request_id, signatory_role, signatory_label, sequence, status) VALUES
            (p_request_id, 'requested_by',         'REQUESTED BY',           1, 'pending'),
            (p_request_id, 'endorsed_approved_by', 'ENDORSED & APPROVED BY', 2, 'pending'),
            (p_request_id, 'screened_by',          'SCREENED BY',            3, 'pending'),
            (p_request_id, 'reviewed_by',          'REVIEWED BY',            4, 'pending'),
            (p_request_id, 'approved_by',          'APPROVED BY',            5, 'pending'),
            (p_request_id, 'reviewed_executed_by', 'REVIEWED & EXECUTED BY', 6, 'pending');
    ELSE -- EMPLOYEE
        INSERT INTO tbl_approvals (request_id, signatory_role, signatory_label, sequence, status) VALUES
            (p_request_id, 'requested_by',   'REQUESTED BY',   1, 'pending'),
            (p_request_id, 'endorsed_by',    'ENDORSED BY',    2, 'pending'),
            (p_request_id, 'checked_by',     'CHECKED BY',     3, 'pending'),
            (p_request_id, 'approved_by',    'APPROVED BY',    4, 'pending'),
            (p_request_id, 'facilitated_by', 'FACILITATED BY', 5, 'pending');
    END CASE;
END $$


-- ------------------------------------------------------------
-- sp_signatories_get(request_id)
-- Returns all approvals for a request ordered by sequence
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_get $$
CREATE PROCEDURE sp_signatories_get(IN p_request_id INT)
BEGIN
    SELECT * FROM vw_approvals_with_signatories
    WHERE  request_id = p_request_id
    ORDER  BY sequence ASC;
END $$


-- ------------------------------------------------------------
-- sp_signatories_sign(request_id, signatory_role, user_id, remarks,
--                     OUT success)
-- Marks a pending signatory slot as signed
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_sign $$
CREATE PROCEDURE sp_signatories_sign(
    IN  p_request_id     INT,
    IN  p_signatory_role VARCHAR(50),
    IN  p_user_id        INT,
    IN  p_remarks        TEXT,
    OUT p_success        TINYINT
)
BEGIN
    UPDATE tbl_approvals
    SET    status    = 'signed',
           signed_at = NOW(),
           user_id   = p_user_id,
           remarks   = p_remarks
    WHERE  request_id     = p_request_id
      AND  signatory_role = p_signatory_role
      AND  status         = 'pending';

    SET p_success = IF(ROW_COUNT() > 0, 1, 0);
END $$


-- ------------------------------------------------------------
-- sp_signatories_sign_all(request_id, user_id, document_id)
-- Marks all pending slots as signed (bulk document upload)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_sign_all $$
CREATE PROCEDURE sp_signatories_sign_all(
    IN p_request_id  INT,
    IN p_user_id     INT,
    IN p_document_id INT
)
BEGIN
    UPDATE tbl_approvals
    SET    status               = 'signed',
           signed_at            = NOW(),
           user_id              = p_user_id,
           uploaded_document_id = p_document_id
    WHERE  request_id = p_request_id
      AND  status     = 'pending';
END $$


-- ------------------------------------------------------------
-- sp_signatories_sign_role_by_doc(request_id, signatory_role, user_id, document_id)
-- Marks a single role as signed and links uploaded document
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_sign_role_by_doc $$
CREATE PROCEDURE sp_signatories_sign_role_by_doc(
    IN  p_request_id     INT,
    IN  p_signatory_role VARCHAR(50),
    IN  p_user_id        INT,
    IN  p_document_id    INT,
    OUT p_success        TINYINT
)
BEGIN
    UPDATE tbl_approvals
    SET    status               = 'signed',
           signed_at            = NOW(),
           user_id              = p_user_id,
           uploaded_document_id = p_document_id
    WHERE  request_id     = p_request_id
      AND  signatory_role = p_signatory_role
      AND  status         = 'pending';

    SET p_success = IF(ROW_COUNT() > 0, 1, 0);
END $$


-- ------------------------------------------------------------
-- sp_signatories_check_all_signed(request_id,
--   OUT all_signed, OUT current_status, OUT requester_id, OUT req_no)
-- Checks whether all slots are signed; used to auto-advance status
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_check_all_signed $$
CREATE PROCEDURE sp_signatories_check_all_signed(
    IN  p_request_id    INT,
    OUT p_all_signed    TINYINT,
    OUT p_cur_status    VARCHAR(50),
    OUT p_requester_id  INT,
    OUT p_req_no        VARCHAR(30)
)
BEGIN
    DECLARE v_total  INT DEFAULT 0;
    DECLARE v_signed INT DEFAULT 0;

    SELECT COUNT(*),
           SUM(status = 'signed')
    INTO   v_total, v_signed
    FROM   tbl_approvals
    WHERE  request_id = p_request_id;

    SELECT status, requester_id, request_no
    INTO   p_cur_status, p_requester_id, p_req_no
    FROM   tbl_requests WHERE id = p_request_id LIMIT 1;

    SET p_all_signed = IF(v_total > 0 AND v_signed = v_total, 1, 0);
END $$


-- ------------------------------------------------------------
-- sp_signatories_advance_to_signed(request_id)
-- Sets request status to 'signed' when all approvals are done
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_signatories_advance_to_signed $$
CREATE PROCEDURE sp_signatories_advance_to_signed(IN p_request_id INT)
BEGIN
    UPDATE tbl_requests
    SET    status = 'signed'
    WHERE  id     = p_request_id
      AND  status = 'for_signing';
END $$


-- ============================================================
--  SECTION 7 : STORED PROCEDURES — DOCUMENTS
-- ============================================================

-- ------------------------------------------------------------
-- sp_document_insert(request_id, filename, original_name, file_size,
--                    mime_type, uploaded_by, document_type,
--                    signatory_role, OUT new_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_document_insert $$
CREATE PROCEDURE sp_document_insert(
    IN  p_request_id    INT,
    IN  p_filename      VARCHAR(255),
    IN  p_original_name VARCHAR(255),
    IN  p_file_size     BIGINT,
    IN  p_mime_type     VARCHAR(100),
    IN  p_uploaded_by   INT,
    IN  p_document_type VARCHAR(100),
    IN  p_signatory_role VARCHAR(50),
    OUT p_new_id        INT
)
BEGIN
    INSERT INTO tbl_documents
        (request_id, filename, original_name, file_size, mime_type,
         uploaded_by, document_type, signatory_role)
    VALUES
        (p_request_id, p_filename, p_original_name, p_file_size, p_mime_type,
         p_uploaded_by, p_document_type, p_signatory_role);
    SET p_new_id = LAST_INSERT_ID();
END $$


-- ------------------------------------------------------------
-- sp_document_get_by_request(request_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_document_get_by_request $$
CREATE PROCEDURE sp_document_get_by_request(IN p_request_id INT)
BEGIN
    SELECT * FROM vw_documents_with_uploader
    WHERE  request_id = p_request_id
    ORDER  BY created_at DESC;
END $$


-- ------------------------------------------------------------
-- sp_document_get_file(doc_id)
-- Returns document + requester_id (for auth checks)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_document_get_file $$
CREATE PROCEDURE sp_document_get_file(IN p_doc_id INT)
BEGIN
    SELECT d.*, r.requester_id
    FROM   tbl_documents d
    JOIN   tbl_requests  r ON d.request_id = r.id
    WHERE  d.id = p_doc_id
    LIMIT  1;
END $$


-- ============================================================
--  SECTION 8 : STORED PROCEDURES — SELECTED DOCUMENTS
-- ============================================================

-- ------------------------------------------------------------
-- sp_selected_docs_get(request_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_selected_docs_get $$
CREATE PROCEDURE sp_selected_docs_get(IN p_request_id INT)
BEGIN
    SELECT document_name
    FROM   tbl_request_documents_selected
    WHERE  request_id = p_request_id;
END $$


-- ------------------------------------------------------------
-- sp_selected_docs_replace(request_id, doc_names_csv)
-- Replaces the selected documents list for a request.
-- Pass comma-separated names; empty string clears the list.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_selected_docs_replace $$
CREATE PROCEDURE sp_selected_docs_replace(
    IN p_request_id INT,
    IN p_docs_csv   TEXT
)
BEGIN
    DELETE FROM tbl_request_documents_selected
    WHERE  request_id = p_request_id;

    -- Bulk insert is done from PHP after calling this procedure
    -- because MySQL stored procedures lack array parameters.
    -- The PHP model calls DELETE here then inserts each row individually.
END $$


-- ============================================================
--  SECTION 9 : STORED PROCEDURES — AUDIT LOG
-- ============================================================

-- ------------------------------------------------------------
-- sp_audit_log_insert(request_id, user_id, action, details, ip)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_audit_log_insert $$
CREATE PROCEDURE sp_audit_log_insert(
    IN p_request_id INT,
    IN p_user_id    INT,
    IN p_action     VARCHAR(50),
    IN p_details    TEXT,
    IN p_ip         VARCHAR(45)
)
BEGIN
    INSERT INTO tbl_audit_logs
        (request_id, user_id, action, details, ip_address)
    VALUES
        (p_request_id, p_user_id, p_action, p_details, p_ip);
END $$


-- ------------------------------------------------------------
-- sp_audit_log_get_by_request(request_id)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_audit_log_get_by_request $$
CREATE PROCEDURE sp_audit_log_get_by_request(IN p_request_id INT)
BEGIN
    SELECT * FROM vw_audit_logs_with_user
    WHERE  request_id = p_request_id
    ORDER  BY created_at DESC;
END $$


-- ============================================================
--  SECTION 10 : STORED PROCEDURES — FORM DATA (SRRF/CRRF/EDMRF)
-- ============================================================

-- sp_srrf_get / sp_crrf_get / sp_edmrf_get
-- Simple SELECTs for form data retrieval

DROP PROCEDURE IF EXISTS sp_srrf_get $$
CREATE PROCEDURE sp_srrf_get(IN p_request_id INT)
BEGIN
    SELECT * FROM tbl_srrf_data WHERE request_id = p_request_id LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS sp_crrf_get $$
CREATE PROCEDURE sp_crrf_get(IN p_request_id INT)
BEGIN
    SELECT * FROM tbl_crrf_data WHERE request_id = p_request_id LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS sp_edmrf_get $$
CREATE PROCEDURE sp_edmrf_get(IN p_request_id INT)
BEGIN
    SELECT * FROM tbl_edmrf_data WHERE request_id = p_request_id LIMIT 1;
END $$

-- ------------------------------------------------------------
-- sp_srrf_check_exists(request_id, OUT exists)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_srrf_check_exists $$
CREATE PROCEDURE sp_srrf_check_exists(
    IN  p_request_id INT,
    OUT p_exists     TINYINT
)
BEGIN
    SELECT COUNT(*) INTO p_exists
    FROM tbl_srrf_data WHERE request_id = p_request_id;
END $$

DROP PROCEDURE IF EXISTS sp_crrf_check_exists $$
CREATE PROCEDURE sp_crrf_check_exists(
    IN  p_request_id INT,
    OUT p_exists     TINYINT
)
BEGIN
    SELECT COUNT(*) INTO p_exists
    FROM tbl_crrf_data WHERE request_id = p_request_id;
END $$

DROP PROCEDURE IF EXISTS sp_edmrf_check_exists $$
CREATE PROCEDURE sp_edmrf_check_exists(
    IN  p_request_id INT,
    OUT p_exists     TINYINT
)
BEGIN
    SELECT COUNT(*) INTO p_exists
    FROM tbl_edmrf_data WHERE request_id = p_request_id;
END $$


-- ============================================================
--  END OF SCRIPT
-- ============================================================

DELIMITER ;

-- ============================================================
--  QUICK REFERENCE
-- ============================================================
-- STORED FUNCTIONS (12)
--   fn_get_user_full_name(id)
--   fn_get_request_type_id_by_category(category)
--   fn_get_category_by_request_type_id(type_id)
--   fn_generate_request_no()
--   fn_get_notification_unread_count(user_id)
--   fn_get_notification_latest_id(user_id)
--   fn_count_users(search)
--   fn_count_notifications_by_user(user_id)
--
-- VIEWS (8)
--   vw_requests_list             — paginated/filtered request list
--   vw_request_detail            — full request row with joins
--   vw_approvals_with_signatories— approvals + signer name + doc
--   vw_documents_with_uploader   — documents + uploader name
--   vw_audit_logs_with_user      — audit logs + actor name
--   vw_notifications_with_request— notifications + request info
--   vw_users_list                — users without password column
--   vw_dashboard_stats           — live global status counts
--
-- STORED PROCEDURES (50+)
--   Notifications : sp_notification_create / get_by_user /
--                   get_recent / get_new / mark_read /
--                   mark_all_read / notify_managers / clean_old
--   Users         : sp_user_find_by_email / find_by_employee_id /
--                   find_by_id / find_by_id_with_status /
--                   find_include_inactive / get_all / get_by_role /
--                   create / update / update_password / deactivate /
--                   activate / assign_role / delete /
--                   update_from_ldap / get_manager_emails /
--                   get_email_and_name
--   Requests      : sp_request_get_all / count_all / find_by_id /
--                   get_for_print / create / update / submit /
--                   update_status / post / get_dashboard_stats /
--                   get_updates / get_types / mark_printed
--   Signatories   : sp_signatories_create_for_category / get /
--                   sign / sign_all / sign_role_by_doc /
--                   check_all_signed / advance_to_signed
--   Documents     : sp_document_insert / get_by_request /
--                   get_file
--   Selected Docs : sp_selected_docs_get / replace
--   Audit Log     : sp_audit_log_insert / get_by_request
--   Form Data     : sp_srrf_get / sp_crrf_get / sp_edmrf_get /
--                   sp_srrf_check_exists / sp_crrf_check_exists /
--                   sp_edmrf_check_exists

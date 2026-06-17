<?php
// app/Models/RequestModel.php

require_once BASE_PATH . '/app/Helpers/Mailer.php';

class RequestModel {
    private $db;
    private $notificationModel;

    public function __construct() {
        $this->db                = Database::getInstance();
        $this->notificationModel = new NotificationModel();
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function callProc(string $sql, array $params = []): \PDOStatement {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    private function getUserEmailAndName($userId) {
        return $this->callProc("CALL sp_user_get_email_and_name(?)", [$userId])->fetch()
               ?: ['email' => null, 'name' => 'User'];
    }

    private function getManagerEmailsAndNames($excludeUserId = null) {
        return $this->callProc(
            "CALL sp_user_get_manager_emails(?)",
            [$excludeUserId]
        )->fetchAll();
    }

    private function getUserName($userId) {
        $stmt = $this->db->prepare("SELECT fn_get_user_full_name(?) AS name");
        $stmt->execute([$userId]);
        return $stmt->fetchColumn() ?: 'User';
    }

    private function logAudit($requestId, $userId, $action, $details = '') {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
        $this->callProc(
            "CALL sp_audit_log_insert(?, ?, ?, ?, ?)",
            [$requestId, $userId, $action, $details, $ip]
        );
    }

    private function checkAndAdvanceRequestStatus($requestId) {
        $allSigned  = null; $curStatus = null;
        $requesterId = null; $reqNo    = null;

        $this->callProc(
            "CALL sp_signatories_check_all_signed(?, @all_signed, @cur_status, @requester_id, @req_no)",
            [$requestId]
        );
        $row = $this->db->query(
            "SELECT @all_signed AS all_signed, @cur_status AS cur_status,
                    @requester_id AS requester_id, @req_no AS req_no"
        )->fetch();

        if ($row && $row['all_signed'] && $row['cur_status'] === 'for_signing') {
            $this->callProc("CALL sp_signatories_advance_to_signed(?)", [$requestId]);
            $this->logAudit($requestId, null, 'ALL_SIGNED', 'All signatories have signed');
            $this->notificationModel->notifyRequester(
                $requestId, (int)$row['requester_id'],
                'Request Fully Signed',
                "All signatories have signed your request {$row['req_no']}. It is now ready for posting."
            );
            $this->notificationModel->notifyManagers(
                $requestId,
                'Request Fully Signed',
                "Request {$row['req_no']} has been fully signed and is ready for posting."
            );
        }
    }

    // ── Generate Request Number ──────────────────────────────────────────

    public function generateRequestNo() {
        $stmt = $this->db->query("SELECT fn_generate_request_no() AS no");
        return $stmt->fetchColumn();
    }

    // ── Create Request ───────────────────────────────────────────────────

    public function create($data, $userId) {
        $category = strtoupper(
            $data['category'] ?? $data['fields']['category'] ?? 'EMPLOYEE'
        );
        $subject      = $data['subject']     ?? "[{$category}] Request";
        $description  = $data['description'] ?? '';
        $priority     = $data['priority']    ?? 'normal';
        $status       = $data['status']      ?? 'draft';
        $formData     = $data['fields']      ?? $data;
        $requiredDocs = $formData['docs']    ?? ($data['docs'] ?? '');

        $this->db->beginTransaction();
        try {
            // Create main request row
            $this->callProc(
                "CALL sp_request_create(?, ?, ?, ?, ?, ?, @new_id, @req_no)",
                [$category, $subject, $description, $userId, $status, $priority]
            );
            $row       = $this->db->query("SELECT @new_id AS id, @req_no AS no")->fetch();
            $requestId = (int)$row['id'];
            $requestNo = $row['no'];

            $this->saveFormData($requestId, $category, $formData);

            if (!empty($requiredDocs)) {
                $this->saveSelectedDocuments($requestId, explode(',', $requiredDocs));
            }

            $this->callProc(
                "CALL sp_signatories_create_for_category(?, ?)",
                [$requestId, $category]
            );
            $this->logAudit($requestId, $userId, 'CREATED', "Request created as {$status}");

            if ($status === 'submitted') {
                $this->logAudit($requestId, $userId, 'SUBMITTED', 'Request submitted for review');
                $this->notificationModel->notifyRequester(
                    $requestId, $userId,
                    'Request Submitted',
                    "Your request {$requestNo} has been submitted for MPC review."
                );
                $this->notificationModel->notifyManagers(
                    $requestId,
                    'New Request Submitted',
                    "New {$requestNo} request has been submitted by " . $this->getUserName($userId),
                    $userId
                );
                if (defined('MAIL_ENABLED') && MAIL_ENABLED) {
                    $info = $this->getUserEmailAndName($userId);
                    Mailer::requestSubmitted($info['email'], $info['name'], $requestNo, $subject);
                    $requesterName = $this->getUserName($userId);
                    foreach ($this->getManagerEmailsAndNames($userId) as $mgr) {
                        Mailer::newRequestForManagers($mgr['email'], $mgr['name'], $requestNo, $subject, $requesterName);
                    }
                }
            }

            $this->db->commit();
            return $requestId;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // ── Form Data Routers ────────────────────────────────────────────────

    private function saveFormData($requestId, $category, $data) {
        if      ($category === 'SUPPLIER') $this->saveSRRFData($requestId, $data);
        elseif  ($category === 'CUSTOMER') $this->saveCRRFData($requestId, $data);
        else                               $this->saveEDMRFData($requestId, $data);
    }

    private function cb($data, $key) {
        return (isset($data[$key]) && ($data[$key] == 1 || $data[$key] === 'Yes' || $data[$key] === true)) ? 1 : 0;
    }

    // ── SRRF ─────────────────────────────────────────────────────────────
    private function saveSRRFData($requestId, $data) {
        $cb = function ($k) use ($data) { return $this->cb($data, $k); };
        $stmt = $this->db->prepare("
            INSERT INTO tbl_srrf_data (
                request_id,
                nature_of_request, vendor_type, company_purchasing_org,
                delivery_plant, incoterms, supplier_code, supplier_category, title,
                supplier_name, business_name, business_address, city, state_province,
                region, country, zip_code, tin, is_vat_registered,
                tel_no, mobile_no, fax_no, email_address, website,
                bank_name, bank_branch, account_name_number, bank_swift_code, bank_currency,
                payment_terms, payment_methods, order_currency, mm_purchasing_group,
                contact_person_name, contact_person_position, contact_person_mobile, contact_person_email,
                contact_person2_name, contact_person2_position, contact_person2_mobile, contact_person2_email,
                remarks_reason,
                has_business_permit, has_sec_registration, has_dti_registration
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            $requestId,
            $data['nature_of_request'] ?? null, $data['vendor_type'] ?? null, $data['company_purchasing_org'] ?? null,
            $data['delivery_plant'] ?? null, $data['incoterms'] ?? null, $data['supplier_code'] ?? null,
            $data['supplier_category'] ?? null, $data['title'] ?? null, $data['supplier_name'] ?? null,
            $data['business_name'] ?? null, $data['business_address'] ?? null, $data['city'] ?? null,
            $data['state_province'] ?? null, $data['region'] ?? null, $data['country'] ?? 'Philippines',
            $data['zip_code'] ?? null, $data['tin'] ?? null, $cb('is_vat_registered'),
            $data['tel_no'] ?? null, $data['mobile_no'] ?? null, $data['fax_no'] ?? null,
            $data['email_address'] ?? null, $data['website'] ?? null,
            $data['bank_name'] ?? null, $data['bank_branch'] ?? null, $data['account_name_number'] ?? null,
            $data['bank_swift_code'] ?? null, $data['bank_currency'] ?? null,
            $data['payment_terms'] ?? null, $data['payment_methods'] ?? null,
            $data['order_currency'] ?? 'PHP', $data['mm_purchasing_group'] ?? null,
            $data['contact_person_name'] ?? null, $data['contact_person_position'] ?? null,
            $data['contact_person_mobile'] ?? null, $data['contact_person_email'] ?? null,
            $data['contact_person2_name'] ?? null, $data['contact_person2_position'] ?? null,
            $data['contact_person2_mobile'] ?? null, $data['contact_person2_email'] ?? null,
            $data['remarks_reason'] ?? null,
            $cb('has_business_permit'), $cb('has_sec_registration'), $cb('has_dti_registration'),
        ]);
    }

    private function updateSRRFData($requestId, $data) {
        $this->callProc("CALL sp_srrf_check_exists(?, @ex)", [$requestId]);
        $row = $this->db->query("SELECT @ex AS ex")->fetch();
        if ($row['ex']) {
            $cb = function ($k) use ($data) { return $this->cb($data, $k); };
            $stmt = $this->db->prepare("
                UPDATE tbl_srrf_data SET
                    nature_of_request=?, vendor_type=?, company_purchasing_org=?,
                    delivery_plant=?, incoterms=?, supplier_code=?, supplier_category=?,
                    title=?, supplier_name=?, business_name=?, business_address=?,
                    city=?, state_province=?, region=?, country=?, zip_code=?,
                    tin=?, is_vat_registered=?,
                    tel_no=?, mobile_no=?, fax_no=?, email_address=?, website=?,
                    bank_name=?, bank_branch=?, account_name_number=?, bank_swift_code=?, bank_currency=?,
                    payment_terms=?, payment_methods=?, order_currency=?, mm_purchasing_group=?,
                    contact_person_name=?, contact_person_position=?, contact_person_mobile=?, contact_person_email=?,
                    contact_person2_name=?, contact_person2_position=?, contact_person2_mobile=?, contact_person2_email=?,
                    remarks_reason=?,
                    has_business_permit=?, has_sec_registration=?, has_dti_registration=?
                WHERE request_id=?
            ");
            $stmt->execute([
                $data['nature_of_request'] ?? null, $data['vendor_type'] ?? null, $data['company_purchasing_org'] ?? null,
                $data['delivery_plant'] ?? null, $data['incoterms'] ?? null, $data['supplier_code'] ?? null,
                $data['supplier_category'] ?? null, $data['title'] ?? null, $data['supplier_name'] ?? null,
                $data['business_name'] ?? null, $data['business_address'] ?? null, $data['city'] ?? null,
                $data['state_province'] ?? null, $data['region'] ?? null, $data['country'] ?? null,
                $data['zip_code'] ?? null, $data['tin'] ?? null, $cb('is_vat_registered'),
                $data['tel_no'] ?? null, $data['mobile_no'] ?? null, $data['fax_no'] ?? null,
                $data['email_address'] ?? null, $data['website'] ?? null,
                $data['bank_name'] ?? null, $data['bank_branch'] ?? null, $data['account_name_number'] ?? null,
                $data['bank_swift_code'] ?? null, $data['bank_currency'] ?? null,
                $data['payment_terms'] ?? null, $data['payment_methods'] ?? null,
                $data['order_currency'] ?? null, $data['mm_purchasing_group'] ?? null,
                $data['contact_person_name'] ?? null, $data['contact_person_position'] ?? null,
                $data['contact_person_mobile'] ?? null, $data['contact_person_email'] ?? null,
                $data['contact_person2_name'] ?? null, $data['contact_person2_position'] ?? null,
                $data['contact_person2_mobile'] ?? null, $data['contact_person2_email'] ?? null,
                $data['remarks_reason'] ?? null,
                $cb('has_business_permit'), $cb('has_sec_registration'), $cb('has_dti_registration'),
                $requestId,
            ]);
        } else {
            $this->saveSRRFData($requestId, $data);
        }
    }

    // ── CRRF ─────────────────────────────────────────────────────────────
    // (INSERT/UPDATE kept as direct SQL since CRRF has 95 columns — a stored
    //  procedure with that many parameters exceeds readability benefits.
    //  The SP sp_crrf_get / sp_crrf_check_exists are still used for reads.)

    private function saveCRRFData($requestId, $data) {
        $cb = function ($k) use ($data) { return $this->cb($data, $k); };
        $stmt = $this->db->prepare("
            INSERT INTO tbl_crrf_data (
                request_id, nature_of_request, nature_of_request_other,
                account_group_sold_to, account_group_ship_to, account_group_bill_to, account_group_payer,
                company_sales_org, pillar,
                sold_customer_no, sold_title, sold_store_area1, sold_store_area2, sold_store_size,
                sold_customer_name, sold_address, sold_city, sold_postal_code, sold_province, sold_region,
                sold_tel_no, sold_mobile_no, sold_email, sold_tin, sold_industry, sold_sector,
                ship_to_different,
                ship_to_customer_no, ship_to_title, ship_to_store_area1, ship_to_store_area2,
                ship_to_customer_name, ship_to_address, ship_to_city, ship_to_postal_code,
                ship_to_province, ship_to_region, ship_to_tel_no, ship_to_mobile_no, ship_to_email,
                ship_to_tin, ship_to_industry, ship_to_sector, ship_to_contact_person,
                bill_to_different,
                bill_to_customer_no, bill_to_title, bill_to_store_code,
                bill_to_customer_name, bill_to_address, bill_to_city, bill_to_postal_code,
                bill_to_province, bill_to_region, bill_to_tel_no, bill_to_mobile_no, bill_to_email,
                bill_to_tin, bill_to_industry, bill_to_sector,
                payer_different, payer_customer_no, payer_customer_name,
                tax_classification, payment_terms, sales_representative, profit_center,
                credit_limit, credit_limit_currency, area_manager, field_sales_coordinator,
                price_group, customer_price_list,
                contact_person_name, contact_person_title, contact_person_department,
                contact_person_tel_no, contact_person_mobile_no, contact_person_email,
                contact_person_owner, contact_person_others, contact_person_spec,
                contact_person2_name, contact_person2_title, contact_person2_mobile, contact_person2_email,
                recon_account, recon_account_other,
                recon_account_ar_trade, recon_account_ar_affiliated, recon_account_others,
                gl_account, sort_key, remarks_comments
            ) VALUES (
                ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
            )
        ");
        $stmt->execute([
            $requestId,
            $data['nature_of_request'] ?? null, $data['nature_of_request_other'] ?? null,
            $cb('account_group_sold_to'), $cb('account_group_ship_to'), $cb('account_group_bill_to'), $cb('account_group_payer'),
            $data['company_sales_org'] ?? null, $data['pillar'] ?? null,
            $data['sold_customer_no'] ?? null, $data['sold_title'] ?? null,
            $data['sold_store_area1'] ?? null, $data['sold_store_area2'] ?? null, $data['sold_store_size'] ?? null,
            $data['sold_customer_name'] ?? null, $data['sold_address'] ?? null, $data['sold_city'] ?? null,
            $data['sold_postal_code'] ?? null, $data['sold_province'] ?? null, $data['sold_region'] ?? null,
            $data['sold_tel_no'] ?? null, $data['sold_mobile_no'] ?? null, $data['sold_email'] ?? null,
            $data['sold_tin'] ?? null, $data['sold_industry'] ?? null, $data['sold_sector'] ?? null,
            $cb('ship_to_different'),
            $data['ship_to_customer_no'] ?? null, $data['ship_to_title'] ?? null,
            $data['ship_to_store_area1'] ?? null, $data['ship_to_store_area2'] ?? null,
            $data['ship_to_customer_name'] ?? null, $data['ship_to_address'] ?? null,
            $data['ship_to_city'] ?? null, $data['ship_to_postal_code'] ?? null,
            $data['ship_to_province'] ?? null, $data['ship_to_region'] ?? null,
            $data['ship_to_tel_no'] ?? null, $data['ship_to_mobile_no'] ?? null, $data['ship_to_email'] ?? null,
            $data['ship_to_tin'] ?? null, $data['ship_to_industry'] ?? null, $data['ship_to_sector'] ?? null,
            $data['ship_to_contact_person'] ?? null,
            $cb('bill_to_different'),
            $data['bill_to_customer_no'] ?? null, $data['bill_to_title'] ?? null, $data['bill_to_store_code'] ?? null,
            $data['bill_to_customer_name'] ?? null, $data['bill_to_address'] ?? null,
            $data['bill_to_city'] ?? null, $data['bill_to_postal_code'] ?? null,
            $data['bill_to_province'] ?? null, $data['bill_to_region'] ?? null,
            $data['bill_to_tel_no'] ?? null, $data['bill_to_mobile_no'] ?? null, $data['bill_to_email'] ?? null,
            $data['bill_to_tin'] ?? null, $data['bill_to_industry'] ?? null, $data['bill_to_sector'] ?? null,
            $cb('payer_different'), $data['payer_customer_no'] ?? null, $data['payer_customer_name'] ?? null,
            $data['tax_classification'] ?? null, $data['payment_terms'] ?? null,
            $data['sales_representative'] ?? null, $data['profit_center'] ?? null,
            $data['credit_limit'] ?? null, $data['credit_limit_currency'] ?? 'PHP',
            $data['area_manager'] ?? null, $data['field_sales_coordinator'] ?? null,
            $data['price_group'] ?? null, $data['customer_price_list'] ?? null,
            $data['contact_person_name'] ?? null, $data['contact_person_title'] ?? null,
            $data['contact_person_department'] ?? null,
            $data['contact_person_tel_no'] ?? null, $data['contact_person_mobile_no'] ?? null,
            $data['contact_person_email'] ?? null,
            $cb('contact_person_owner'), $cb('contact_person_others'), $data['contact_person_spec'] ?? null,
            $data['contact_person2_name'] ?? null, $data['contact_person2_title'] ?? null,
            $data['contact_person2_mobile'] ?? null, $data['contact_person2_email'] ?? null,
            $data['recon_account'] ?? null, $data['recon_account_other'] ?? null,
            $cb('recon_account_ar_trade'), $cb('recon_account_ar_affiliated'), $cb('recon_account_others'),
            $data['gl_account'] ?? null, $data['sort_key'] ?? null,
            $data['remarks_comments'] ?? null,
        ]);
    }

    private function updateCRRFData($requestId, $data) {
        $this->callProc("CALL sp_crrf_check_exists(?, @ex)", [$requestId]);
        $row = $this->db->query("SELECT @ex AS ex")->fetch();
        if ($row['ex']) {
            $cb = function ($k) use ($data) { return $this->cb($data, $k); };
            $stmt = $this->db->prepare("
                UPDATE tbl_crrf_data SET
                    nature_of_request=?, nature_of_request_other=?,
                    account_group_sold_to=?, account_group_ship_to=?, account_group_bill_to=?, account_group_payer=?,
                    company_sales_org=?, pillar=?,
                    sold_customer_no=?, sold_title=?, sold_store_area1=?, sold_store_area2=?, sold_store_size=?,
                    sold_customer_name=?, sold_address=?, sold_city=?, sold_postal_code=?, sold_province=?, sold_region=?,
                    sold_tel_no=?, sold_mobile_no=?, sold_email=?, sold_tin=?, sold_industry=?, sold_sector=?,
                    ship_to_different=?,
                    ship_to_customer_no=?, ship_to_title=?, ship_to_store_area1=?, ship_to_store_area2=?,
                    ship_to_customer_name=?, ship_to_address=?, ship_to_city=?, ship_to_postal_code=?,
                    ship_to_province=?, ship_to_region=?, ship_to_tel_no=?, ship_to_mobile_no=?, ship_to_email=?,
                    ship_to_tin=?, ship_to_industry=?, ship_to_sector=?, ship_to_contact_person=?,
                    bill_to_different=?,
                    bill_to_customer_no=?, bill_to_title=?, bill_to_store_code=?,
                    bill_to_customer_name=?, bill_to_address=?, bill_to_city=?, bill_to_postal_code=?,
                    bill_to_province=?, bill_to_region=?, bill_to_tel_no=?, bill_to_mobile_no=?, bill_to_email=?,
                    bill_to_tin=?, bill_to_industry=?, bill_to_sector=?,
                    payer_different=?, payer_customer_no=?, payer_customer_name=?,
                    tax_classification=?, payment_terms=?, sales_representative=?, profit_center=?,
                    credit_limit=?, credit_limit_currency=?, area_manager=?, field_sales_coordinator=?,
                    price_group=?, customer_price_list=?,
                    contact_person_name=?, contact_person_title=?, contact_person_department=?,
                    contact_person_tel_no=?, contact_person_mobile_no=?, contact_person_email=?,
                    contact_person_owner=?, contact_person_others=?, contact_person_spec=?,
                    contact_person2_name=?, contact_person2_title=?, contact_person2_mobile=?, contact_person2_email=?,
                    recon_account=?, recon_account_other=?,
                    recon_account_ar_trade=?, recon_account_ar_affiliated=?, recon_account_others=?,
                    gl_account=?, sort_key=?, remarks_comments=?
                WHERE request_id=?
            ");
            $stmt->execute([
                $data['nature_of_request'] ?? null, $data['nature_of_request_other'] ?? null,
                $cb('account_group_sold_to'), $cb('account_group_ship_to'), $cb('account_group_bill_to'), $cb('account_group_payer'),
                $data['company_sales_org'] ?? null, $data['pillar'] ?? null,
                $data['sold_customer_no'] ?? null, $data['sold_title'] ?? null,
                $data['sold_store_area1'] ?? null, $data['sold_store_area2'] ?? null, $data['sold_store_size'] ?? null,
                $data['sold_customer_name'] ?? null, $data['sold_address'] ?? null, $data['sold_city'] ?? null,
                $data['sold_postal_code'] ?? null, $data['sold_province'] ?? null, $data['sold_region'] ?? null,
                $data['sold_tel_no'] ?? null, $data['sold_mobile_no'] ?? null, $data['sold_email'] ?? null,
                $data['sold_tin'] ?? null, $data['sold_industry'] ?? null, $data['sold_sector'] ?? null,
                $cb('ship_to_different'),
                $data['ship_to_customer_no'] ?? null, $data['ship_to_title'] ?? null,
                $data['ship_to_store_area1'] ?? null, $data['ship_to_store_area2'] ?? null,
                $data['ship_to_customer_name'] ?? null, $data['ship_to_address'] ?? null,
                $data['ship_to_city'] ?? null, $data['ship_to_postal_code'] ?? null,
                $data['ship_to_province'] ?? null, $data['ship_to_region'] ?? null,
                $data['ship_to_tel_no'] ?? null, $data['ship_to_mobile_no'] ?? null, $data['ship_to_email'] ?? null,
                $data['ship_to_tin'] ?? null, $data['ship_to_industry'] ?? null, $data['ship_to_sector'] ?? null,
                $data['ship_to_contact_person'] ?? null,
                $cb('bill_to_different'),
                $data['bill_to_customer_no'] ?? null, $data['bill_to_title'] ?? null, $data['bill_to_store_code'] ?? null,
                $data['bill_to_customer_name'] ?? null, $data['bill_to_address'] ?? null,
                $data['bill_to_city'] ?? null, $data['bill_to_postal_code'] ?? null,
                $data['bill_to_province'] ?? null, $data['bill_to_region'] ?? null,
                $data['bill_to_tel_no'] ?? null, $data['bill_to_mobile_no'] ?? null, $data['bill_to_email'] ?? null,
                $data['bill_to_tin'] ?? null, $data['bill_to_industry'] ?? null, $data['bill_to_sector'] ?? null,
                $cb('payer_different'), $data['payer_customer_no'] ?? null, $data['payer_customer_name'] ?? null,
                $data['tax_classification'] ?? null, $data['payment_terms'] ?? null,
                $data['sales_representative'] ?? null, $data['profit_center'] ?? null,
                $data['credit_limit'] ?? null, $data['credit_limit_currency'] ?? 'PHP',
                $data['area_manager'] ?? null, $data['field_sales_coordinator'] ?? null,
                $data['price_group'] ?? null, $data['customer_price_list'] ?? null,
                $data['contact_person_name'] ?? null, $data['contact_person_title'] ?? null,
                $data['contact_person_department'] ?? null,
                $data['contact_person_tel_no'] ?? null, $data['contact_person_mobile_no'] ?? null,
                $data['contact_person_email'] ?? null,
                $cb('contact_person_owner'), $cb('contact_person_others'), $data['contact_person_spec'] ?? null,
                $data['contact_person2_name'] ?? null, $data['contact_person2_title'] ?? null,
                $data['contact_person2_mobile'] ?? null, $data['contact_person2_email'] ?? null,
                $data['recon_account'] ?? null, $data['recon_account_other'] ?? null,
                $cb('recon_account_ar_trade'), $cb('recon_account_ar_affiliated'), $cb('recon_account_others'),
                $data['gl_account'] ?? null, $data['sort_key'] ?? null,
                $data['remarks_comments'] ?? null,
                $requestId,
            ]);
        } else {
            $this->saveCRRFData($requestId, $data);
        }
    }

    // ── EDMRF ────────────────────────────────────────────────────────────

    private function saveEDMRFData($requestId, $data) {
        $cb = function ($k) use ($data) { return $this->cb($data, $k); };
        $stmt = $this->db->prepare("
            INSERT INTO tbl_edmrf_data (
                request_id,
                nature_of_request, company_purchasing_org, sales_pillar,
                bp_role_employee_receivable, bp_role_employee_payable,
                bp_role_oec_seller_id, bp_role_sales_agent,
                company_employee_no, system_employee_code, oec_seller_id,
                tin, sss_no, pagibig_no, philhealth_no,
                title, full_name, preferred_name, birth_date, gender, civil_status,
                address, permanent_address, province, region, postal_code,
                bank_name, bank_branch, bank_account_name_number, bank_account_type,
                department, group_team, cost_center, profit_center,
                payment_terms, salary_basis,
                email_address, company_email, mobile_number, telephone_number,
                emergency_contact_name, emergency_contact_number,
                position, job_grade, date_hired, date_regularized,
                employment_status, supervisor_name, supervisor_employee_no,
                remarks_reason
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            $requestId,
            $data['nature_of_request'] ?? null, $data['company_purchasing_org'] ?? null, $data['sales_pillar'] ?? null,
            $cb('bp_role_employee_receivable'), $cb('bp_role_employee_payable'),
            $cb('bp_role_oec_seller_id'), $cb('bp_role_sales_agent'),
            $data['company_employee_no'] ?? null, $data['system_employee_code'] ?? null, $data['oec_seller_id'] ?? null,
            $data['tin'] ?? null, $data['sss_no'] ?? null, $data['pagibig_no'] ?? null, $data['philhealth_no'] ?? null,
            $data['title'] ?? null, $data['full_name'] ?? null, $data['preferred_name'] ?? null,
            !empty($data['birth_date']) ? $data['birth_date'] : null,
            $data['gender'] ?? null, $data['civil_status'] ?? null,
            $data['address'] ?? null, $data['permanent_address'] ?? null,
            $data['province'] ?? null, $data['region'] ?? null, $data['postal_code'] ?? null,
            $data['bank_name'] ?? null, $data['bank_branch'] ?? null,
            $data['bank_account_name_number'] ?? null, $data['bank_account_type'] ?? null,
            $data['department'] ?? null, $data['group_team'] ?? null,
            $data['cost_center'] ?? null, $data['profit_center'] ?? null,
            $data['payment_terms'] ?? null, $data['salary_basis'] ?? null,
            $data['email_address'] ?? null, $data['company_email'] ?? null,
            $data['mobile_number'] ?? null, $data['telephone_number'] ?? null,
            $data['emergency_contact_name'] ?? null, $data['emergency_contact_number'] ?? null,
            $data['position'] ?? null, $data['job_grade'] ?? null,
            !empty($data['date_hired'])        ? $data['date_hired']        : null,
            !empty($data['date_regularized'])  ? $data['date_regularized']  : null,
            $data['employment_status'] ?? null,
            $data['supervisor_name'] ?? null, $data['supervisor_employee_no'] ?? null,
            $data['remarks_reason'] ?? null,
        ]);
    }

    private function updateEDMRFData($requestId, $data) {
        $this->callProc("CALL sp_edmrf_check_exists(?, @ex)", [$requestId]);
        $row = $this->db->query("SELECT @ex AS ex")->fetch();
        if ($row['ex']) {
            $cb = function ($k) use ($data) { return $this->cb($data, $k); };
            $stmt = $this->db->prepare("
                UPDATE tbl_edmrf_data SET
                    nature_of_request=?, company_purchasing_org=?, sales_pillar=?,
                    bp_role_employee_receivable=?, bp_role_employee_payable=?,
                    bp_role_oec_seller_id=?, bp_role_sales_agent=?,
                    company_employee_no=?, system_employee_code=?, oec_seller_id=?,
                    tin=?, sss_no=?, pagibig_no=?, philhealth_no=?,
                    title=?, full_name=?, preferred_name=?, birth_date=?, gender=?, civil_status=?,
                    address=?, permanent_address=?, province=?, region=?, postal_code=?,
                    bank_name=?, bank_branch=?, bank_account_name_number=?, bank_account_type=?,
                    department=?, group_team=?, cost_center=?, profit_center=?,
                    payment_terms=?, salary_basis=?,
                    email_address=?, company_email=?, mobile_number=?, telephone_number=?,
                    emergency_contact_name=?, emergency_contact_number=?,
                    position=?, job_grade=?, date_hired=?, date_regularized=?,
                    employment_status=?, supervisor_name=?, supervisor_employee_no=?,
                    remarks_reason=?
                WHERE request_id=?
            ");
            $stmt->execute([
                $data['nature_of_request'] ?? null, $data['company_purchasing_org'] ?? null, $data['sales_pillar'] ?? null,
                $cb('bp_role_employee_receivable'), $cb('bp_role_employee_payable'),
                $cb('bp_role_oec_seller_id'), $cb('bp_role_sales_agent'),
                $data['company_employee_no'] ?? null, $data['system_employee_code'] ?? null, $data['oec_seller_id'] ?? null,
                $data['tin'] ?? null, $data['sss_no'] ?? null, $data['pagibig_no'] ?? null, $data['philhealth_no'] ?? null,
                $data['title'] ?? null, $data['full_name'] ?? null, $data['preferred_name'] ?? null,
                !empty($data['birth_date']) ? $data['birth_date'] : null,
                $data['gender'] ?? null, $data['civil_status'] ?? null,
                $data['address'] ?? null, $data['permanent_address'] ?? null,
                $data['province'] ?? null, $data['region'] ?? null, $data['postal_code'] ?? null,
                $data['bank_name'] ?? null, $data['bank_branch'] ?? null,
                $data['bank_account_name_number'] ?? null, $data['bank_account_type'] ?? null,
                $data['department'] ?? null, $data['group_team'] ?? null,
                $data['cost_center'] ?? null, $data['profit_center'] ?? null,
                $data['payment_terms'] ?? null, $data['salary_basis'] ?? null,
                $data['email_address'] ?? null, $data['company_email'] ?? null,
                $data['mobile_number'] ?? null, $data['telephone_number'] ?? null,
                $data['emergency_contact_name'] ?? null, $data['emergency_contact_number'] ?? null,
                $data['position'] ?? null, $data['job_grade'] ?? null,
                !empty($data['date_hired'])       ? $data['date_hired']       : null,
                !empty($data['date_regularized']) ? $data['date_regularized'] : null,
                $data['employment_status'] ?? null,
                $data['supervisor_name'] ?? null, $data['supervisor_employee_no'] ?? null,
                $data['remarks_reason'] ?? null,
                $requestId,
            ]);
        } else {
            $this->saveEDMRFData($requestId, $data);
        }
    }

    // ── Selected Documents ────────────────────────────────────────────────

    private function saveSelectedDocuments($requestId, $documents) {
        // Clear then insert individually (MySQL SPs can't accept arrays)
        $del = $this->db->prepare("DELETE FROM tbl_request_documents_selected WHERE request_id = ?");
        $del->execute([$requestId]);
        $ins = $this->db->prepare("INSERT INTO tbl_request_documents_selected (request_id, document_name) VALUES (?, ?)");
        foreach ($documents as $doc) {
            $doc = trim($doc);
            if ($doc !== '') $ins->execute([$requestId, $doc]);
        }
    }

    private function updateSelectedDocuments($requestId, $docsString) {
        $documents = array_filter(array_map('trim', explode(',', (string)$docsString)));
        $this->saveSelectedDocuments($requestId, $documents);
        return true;
    }

    // ── Submit ────────────────────────────────────────────────────────────
    public function submit($id, $userId) {
        $checkStmt = $this->db->prepare("SELECT status, requester_id, request_no, subject FROM tbl_requests WHERE id = ?");
        $checkStmt->execute([$id]);
        $request = $checkStmt->fetch();
        if (!$request || $request['status'] !== 'draft') return false;

        $this->db->beginTransaction();
        try {
            $this->callProc("CALL sp_request_submit(?, ?, @ok)", [$id, $userId]);
            $row = $this->db->query("SELECT @ok AS ok")->fetch();
            if (!$row['ok']) { $this->db->rollBack(); return false; }

            $this->logAudit($id, $userId, 'SUBMITTED', 'Request submitted for review');
            $this->notificationModel->notifyRequester($id, $request['requester_id'],
                'Request Submitted',
                "Your request {$request['request_no']} has been submitted for MPC review."
            );
            $this->notificationModel->notifyManagers($id,
                'New Request Submitted',
                "New {$request['request_no']} request has been submitted by " . $this->getUserName($userId),
                $userId
            );

            if (defined('MAIL_ENABLED') && MAIL_ENABLED) {
                $info = $this->getUserEmailAndName($request['requester_id']);
                Mailer::requestSubmitted($info['email'], $info['name'], $request['request_no'], $request['subject']);
                $requesterName = $this->getUserName($userId);
                foreach ($this->getManagerEmailsAndNames($userId) as $mgr) {
                    Mailer::newRequestForManagers($mgr['email'], $mgr['name'], $request['request_no'], $request['subject'], $requesterName);
                }
            }

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Submit error: " . $e->getMessage());
            return false;
        }
    }

    // ── Upload Document ───────────────────────────────────────────────────
    public function uploadDocument($requestId, $userId, $file, $documentType, $signatoryRole = null, $signatureType = 'single') {
        $uploadPath = UPLOAD_PATH;
        if (!is_dir($uploadPath)) mkdir($uploadPath, 0755, true);

        $ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = uniqid("doc_{$requestId}_") . '.' . $ext;
        $dest     = $uploadPath . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) return null;

        $reqInfo = $this->db->prepare("SELECT requester_id, request_no, subject FROM tbl_requests WHERE id = ?");
        $reqInfo->execute([$requestId]);
        $request = $reqInfo->fetch();

        $this->db->beginTransaction();
        try {
            $this->callProc(
                "CALL sp_document_insert(?, ?, ?, ?, ?, ?, ?, ?, @doc_id)",
                [$requestId, $filename, $file['name'], $file['size'], $file['type'], $userId, $documentType, $signatoryRole]
            );
            $docId = (int)$this->db->query("SELECT @doc_id AS id")->fetchColumn();

            if ($signatureType === 'all') {
                $this->callProc("CALL sp_signatories_sign_all(?, ?, ?)", [$requestId, $userId, $docId]);
                $this->logAudit($requestId, $userId, 'ALL_SIGNED', 'All signatories marked as signed via document upload');
                $this->notificationModel->notifyRequester($requestId, $request['requester_id'], 'Request Fully Signed', "Your request {$request['request_no']} has been fully signed and is complete.");
                $this->notificationModel->notifyManagers($requestId, 'Request Fully Signed', "Request {$request['request_no']} has been fully signed.", $userId);

            } elseif ($signatoryRole) {
                $this->callProc("CALL sp_signatories_sign_role_by_doc(?, ?, ?, ?, @ok)", [$requestId, $signatoryRole, $userId, $docId]);
                $ok = (int)$this->db->query("SELECT @ok AS ok")->fetchColumn();
                if ($ok) {
                    $this->logAudit($requestId, $userId, 'SIGNED', "Signed as {$signatoryRole} via document upload");
                    $this->notificationModel->notifyRequester($requestId, $request['requester_id'], 'Signature Completed', "The {$signatoryRole} has signed your request {$request['request_no']}.");
                }
            }

            $this->checkAndAdvanceRequestStatus($requestId);
            $this->logAudit($requestId, $userId, 'DOCUMENT_UPLOADED', "Uploaded {$file['name']}");

            if (defined('MAIL_ENABLED') && MAIL_ENABLED) {
                $requesterInfo = $this->getUserEmailAndName($request['requester_id']);
                $uploaderInfo  = $this->getUserEmailAndName($userId);
                Mailer::documentUploaded($requesterInfo['email'], $requesterInfo['name'], $request['request_no'], $file['name'], $uploaderInfo['name']);
            }

            $this->db->commit();
            return ['id' => $docId, 'filename' => $filename, 'original_name' => $file['name']];
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Upload error: " . $e->getMessage());
            return null;
        }
    }

    // ── Sign ─────────────────────────────────────────────────────────────

    public function sign($id, $userId, $role, $remarks = null) {
        $reqInfo = $this->db->prepare("SELECT requester_id, request_no, subject FROM tbl_requests WHERE id = ?");
        $reqInfo->execute([$id]);
        $request = $reqInfo->fetch();

        $this->db->beginTransaction();
        try {
            $this->callProc("CALL sp_signatories_sign(?, ?, ?, ?, @ok)", [$id, $role, $userId, $remarks]);
            $ok = (int)$this->db->query("SELECT @ok AS ok")->fetchColumn();
            if (!$ok) { $this->db->rollBack(); return false; }

            $this->logAudit($id, $userId, 'SIGNED', "Signed as {$role}" . ($remarks ? " Remarks: {$remarks}" : ""));
            $this->notificationModel->notifyRequester($id, $request['requester_id'], 'Request Signed', "The {$role} has signed your request {$request['request_no']}.");
            $this->checkAndAdvanceRequestStatus($id);
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    // ── Update Status ─────────────────────────────────────────────────────

    public function updateStatus($id, $status, $userId, $notes = null) {
        $this->callProc(
            "CALL sp_request_update_status(?, ?, ?, ?, @ok, @old_status, @requester, @req_no, @subject)",
            [$id, $status, $userId, $notes]
        );
        $row = $this->db->query("SELECT @ok AS ok, @old_status AS old_status, @requester AS requester, @req_no AS req_no, @subject AS subject")->fetch();

        if (!$row || !$row['ok']) return false;

        $statusLabels = [
            'submitted' => 'Submitted', 'under_review' => 'Under Review',
            'for_signing' => 'For Signing', 'signed' => 'Signed',
            'rejected' => 'Rejected', 'cancelled' => 'Cancelled', 'posted' => 'Posted',
        ];
        $statusLabel = $statusLabels[$status] ?? ucfirst($status);
        $this->logAudit($id, $userId, strtoupper($status), $notes ?? "Status changed from {$row['old_status']} to $status");

        $message = "Your request {$row['req_no']} status has been updated from " . ucfirst($row['old_status']) . " to: {$statusLabel}";
        if ($notes) $message .= ". Notes: {$notes}";

        $this->notificationModel->notifyRequester($id, (int)$row['requester'], "Request Status Update: {$statusLabel}", $message);
        if (in_array($status, ['under_review', 'for_signing', 'signed', 'posted'])) {
            $this->notificationModel->notifyManagers($id, "Request Status: {$statusLabel}",
                "Request {$row['req_no']} is now {$statusLabel}." . ($notes ? " Notes: {$notes}" : ""), $userId);
        }

        if (defined('MAIL_ENABLED') && MAIL_ENABLED) {
            $info = $this->getUserEmailAndName((int)$row['requester']);
            Mailer::statusUpdated($info['email'], $info['name'], $row['req_no'], $row['subject'] ?? $row['req_no'], $row['old_status'], $status, $notes);
        }

        return true;
    }

    // ── Post to SAP ───────────────────────────────────────────────────────

    public function post($id, $userId, $sapRef = null) {
        $this->callProc("CALL sp_request_post(?, ?, @ok, @requester, @req_no, @subject)", [$id, $sapRef]);
        $row = $this->db->query("SELECT @ok AS ok, @requester AS requester, @req_no AS req_no, @subject AS subject")->fetch();

        if (!$row || !$row['ok']) return false;

        $this->logAudit($id, $userId, 'POSTED', "Posted. SAP Ref: $sapRef");
        $sapMsg = $sapRef ? " Reference: {$sapRef}" : "";
        $this->notificationModel->notifyRequester($id, (int)$row['requester'], 'Request Posted to SAP', "Your request {$row['req_no']} has been posted to SAP.{$sapMsg}");
        $this->notificationModel->notifyManagers($id, 'Request Posted to SAP', "Request {$row['req_no']} has been posted to SAP.{$sapMsg}");

        if (defined('MAIL_ENABLED') && MAIL_ENABLED) {
            $info = $this->getUserEmailAndName((int)$row['requester']);
            Mailer::requestPosted($info['email'], $info['name'], $row['req_no'], $row['subject'] ?? $row['req_no'], $sapRef);
        }

        return true;
    }

    // ── Find / Read ───────────────────────────────────────────────────────

    public function findById($id) {
        $request = $this->callProc("CALL sp_request_find_by_id(?)", [$id])->fetch();
        if (!$request) return null;

        $request['docs_selected'] = $this->getSelectedDocuments($id);
        $request['documents']     = $this->getDocuments($id);
        $request['approvals']     = $this->getApprovals($id);
        $request['audit_logs']    = $this->getAuditLogs($id);
        $request['form_data']     = $this->getFormData($id, (int)$request['request_type_id']);

        return $request;
    }

    private function getFormData($id, $typeId) {
        if      ($typeId == 1) $data = $this->callProc("CALL sp_srrf_get(?)",  [$id])->fetch();
        elseif  ($typeId == 2) $data = $this->callProc("CALL sp_crrf_get(?)",  [$id])->fetch();
        else                   $data = $this->callProc("CALL sp_edmrf_get(?)", [$id])->fetch();
        return is_array($data) ? $data : [];
    }

    public function getDocuments($requestId) {
        return $this->callProc("CALL sp_document_get_by_request(?)", [$requestId])->fetchAll();
    }

    public function getApprovals($requestId) {
        return $this->callProc("CALL sp_signatories_get(?)", [$requestId])->fetchAll();
    }

    public function getSignatories($requestId) {
        return $this->callProc("CALL sp_signatories_get(?)", [$requestId])->fetchAll();
    }

    public function getSelectedDocuments($requestId) {
        $rows = $this->callProc("CALL sp_selected_docs_get(?)", [$requestId])->fetchAll();
        return array_map(function ($r) { return $r['document_name']; }, $rows);
    }

    public function getDocumentFile($docId) {
        return $this->callProc("CALL sp_document_get_file(?)", [$docId])->fetch();
    }

    public function getRequestDataForPrint($id) {
        return $this->callProc("CALL sp_request_get_for_print(?)", [$id])->fetch();
    }

    private function getAuditLogs($requestId) {
        return $this->callProc("CALL sp_audit_log_get_by_request(?)", [$requestId])->fetchAll();
    }

    public function markAsPrinted($requestId, $userId) {
        $this->callProc("CALL sp_request_mark_printed(?, ?)", [$requestId, $userId]);
        $this->logAudit($requestId, $userId, 'PRINTED', 'Printable form generated');
    }

    // ── Pagination / Dashboard ────────────────────────────────────────────

    public function getAll($page = 1, $filters = [], $userId = null) {
        return $this->callProc("CALL sp_request_get_all(?, ?, ?, ?, ?)", [
            $page,
            ITEMS_PER_PAGE,
            $filters['status'] ?? null,
            $filters['search'] ?? null,
            $userId,
        ])->fetchAll();
    }

    public function countAll($filters = [], $userId = null) {
        return (int)$this->callProc("CALL sp_request_count_all(?, ?, ?)", [
            $filters['status'] ?? null,
            $filters['search'] ?? null,
            $userId,
        ])->fetchColumn();
    }

    public function getDashboardStats($userId = null) {
        $row = $this->callProc("CALL sp_request_get_dashboard_stats(?)", [$userId])->fetch();
        if (!$row) {
            return array_fill_keys(['draft','submitted','under_review','for_signing','signed','posted','rejected','total'], 0);
        }
        $row['total'] = array_sum(array_intersect_key($row, array_flip(['draft','submitted','under_review','for_signing','signed','posted','rejected'])));
        return $row;
    }

    public function getRequestTypes() {
        return $this->callProc("CALL sp_request_get_types()")->fetchAll();
    }

    public function getUpdates($since = null, $userId = null) {
        return $this->callProc("CALL sp_request_get_updates(?, ?)", [$since, $userId])->fetchAll();
    }

    // ── Update Request (edit draft) ───────────────────────────────────────

    public function updateRequest($id, $data, $userId) {
        $this->db->beginTransaction();
        try {
            $this->callProc("CALL sp_request_update(?, ?, ?, ?)", [
                $id,
                $data['subject']  ?? null,
                $data['priority'] ?? 'normal',
                $userId,
            ]);

            $typeRow  = $this->db->prepare("SELECT request_type_id FROM tbl_requests WHERE id = ?");
            $typeRow->execute([$id]);
            $row      = $typeRow->fetch();
            $category = $this->getCategoryByRequestTypeId((int)$row['request_type_id']);
            $fields   = $data['fields'] ?? [];

            if (!empty($fields)) {
                if      ($category === 'SUPPLIER') $this->updateSRRFData($id, $fields);
                elseif  ($category === 'CUSTOMER') $this->updateCRRFData($id, $fields);
                else                               $this->updateEDMRFData($id, $fields);
            }

            if (isset($fields['docs'])) {
                $this->updateSelectedDocuments($id, $fields['docs']);
            } elseif (isset($data['fields']['docs'])) {
                $this->updateSelectedDocuments($id, $data['fields']['docs']);
            }

            $this->logAudit($id, $userId, 'UPDATED', 'Request details edited');
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Update request error: " . $e->getMessage());
            return false;
        }
    }

    private function getCategoryByRequestTypeId($typeId) {
        $stmt = $this->db->prepare("SELECT fn_get_category_by_request_type_id(?) AS cat");
        $stmt->execute([$typeId]);
        return $stmt->fetchColumn() ?: 'EMPLOYEE';
    }

    // ── PDF Content ───────────────────────────────────────────────────────

    public function generatePDFContent($requestId) {
        $request = $this->findById($requestId);
        if (!$request) return '<p>Request not found</p>';
        ob_start(); ?>
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <title><?= $request['request_no'] ?></title>
        <style>
            body{font-family:Arial;margin:20px;}
            .header{text-align:center;border-bottom:2px solid #1a228f;padding-bottom:10px;}
            .section{border:1px solid #ddd;margin-bottom:20px;}
            .section-title{background:#1a228f;color:white;padding:8px;}
            .section-content{padding:12px;}
        </style></head><body>
        <div class="header">
            <h1>Co Ban Kiat Hardware Inc.</h1>
            <h2>MPC Electronic Request System</h2>
            <p><?= $request['request_no'] ?> | Status: <?= $request['status'] ?></p>
        </div>
        <div class="section">
            <div class="section-title">Request Details</div>
            <div class="section-content">
                Subject: <?= htmlspecialchars($request['subject']) ?><br>
                Requester: <?= htmlspecialchars($request['requester_name']) ?><br>
                Department: <?= htmlspecialchars($request['requester_department']) ?>
            </div>
        </div>
        </body></html>
        <?php return ob_get_clean();
    }
}

<?php
// app/Helpers/PrintFormGenerator.php - CUSTOMER FORM SINGLE PAGE OPTIMIZED

class PrintFormGenerator {
    
    private static function normalizeCRRF(array $raw): array {
        $toBool = function($val) {
            if ($val === null || $val === '') return 0;
            if (is_bool($val)) return $val ? 1 : 0;
            if (is_numeric($val)) return (int)$val;
            $str = strtolower(trim((string)$val));
            return ($str === '1' || $str === 'yes' || $str === 'on' || $str === 'true') ? 1 : 0;
        };
        return [
            'nature_of_request'          => $raw['nature_of_request']          ?? '',
            'nature_of_request_other'    => $raw['nature_of_request_other']    ?? '',
            'account_group_sold_to'      => $toBool($raw['account_group_sold_to'] ?? 0),
            'account_group_ship_to'      => $toBool($raw['account_group_ship_to'] ?? 0),
            'account_group_bill_to'      => $toBool($raw['account_group_bill_to'] ?? 0),
            'account_group_payer'        => $toBool($raw['account_group_payer'] ?? 0),
            'company_sales_org'          => $raw['company_sales_org']          ?? '',
            'pillar'                     => $raw['pillar']                     ?? '',
            'sold_customer_no'           => $raw['sold_customer_no']           ?? '',
            'sold_title'                 => $raw['sold_title']                 ?? '',
            'sold_store_area1'           => $raw['sold_store_area1']           ?? '',
            'sold_store_area2'           => $raw['sold_store_area2']           ?? '',
            'sold_store_size'            => $raw['sold_store_size']            ?? '',
            'sold_customer_name'         => $raw['sold_customer_name']         ?? '',
            'sold_address'               => $raw['sold_address']               ?? '',
            'sold_city'                  => $raw['sold_city']                  ?? '',
            'sold_postal_code'           => $raw['sold_postal_code']           ?? '',
            'sold_province'              => $raw['sold_province']              ?? '',
            'sold_region'                => $raw['sold_region']                ?? '',
            'sold_tel_no'                => $raw['sold_tel_no']                ?? '',
            'sold_mobile_no'             => $raw['sold_mobile_no']             ?? '',
            'sold_email'                 => $raw['sold_email']                 ?? '',
            'sold_tin'                   => $raw['sold_tin']                   ?? '',
            'sold_industry'              => $raw['sold_industry']              ?? '',
            'sold_sector'                => $raw['sold_sector']                ?? '',
            'ship_to_different'          => $toBool($raw['ship_to_different'] ?? 0),
            'ship_customer_no'           => $raw['ship_to_customer_no']        ?? '',
            'ship_title'                 => $raw['ship_to_title']              ?? '',
            'ship_store_area1'           => $raw['ship_to_store_area1']        ?? '',
            'ship_store_area2'           => $raw['ship_to_store_area2']        ?? '',
            'ship_customer_name'         => $raw['ship_to_customer_name']      ?? '',
            'ship_address'               => $raw['ship_to_address']            ?? '',
            'ship_city'                  => $raw['ship_to_city']               ?? '',
            'ship_postal_code'           => $raw['ship_to_postal_code']        ?? '',
            'ship_province'              => $raw['ship_to_province']           ?? '',
            'ship_region'                => $raw['ship_to_region']             ?? '',
            'ship_tel_no'                => $raw['ship_to_tel_no']             ?? '',
            'ship_mobile_no'             => $raw['ship_to_mobile_no']          ?? '',
            'ship_email'                 => $raw['ship_to_email']              ?? '',
            'ship_tin'                   => $raw['ship_to_tin']                ?? '',
            'ship_industry'              => $raw['ship_to_industry']           ?? '',
            'ship_sector'                => $raw['ship_to_sector']             ?? '',
            'ship_contact_person'        => $raw['ship_to_contact_person']     ?? '',
            'bill_to_different'          => $toBool($raw['bill_to_different'] ?? 0),
            'bill_customer_no'           => $raw['bill_to_customer_no']        ?? '',
            'bill_title'                 => $raw['bill_to_title']              ?? '',
            'bill_store_code'            => $raw['bill_to_store_code']         ?? '',
            'bill_customer_name'         => $raw['bill_to_customer_name']      ?? '',
            'bill_address'               => $raw['bill_to_address']            ?? '',
            'bill_city'                  => $raw['bill_to_city']               ?? '',
            'bill_postal_code'           => $raw['bill_to_postal_code']        ?? '',
            'bill_province'              => $raw['bill_to_province']           ?? '',
            'bill_region'                => $raw['bill_to_region']             ?? '',
            'bill_tel_no'                => $raw['bill_to_tel_no']             ?? '',
            'bill_mobile_no'             => $raw['bill_to_mobile_no']          ?? '',
            'bill_email'                 => $raw['bill_to_email']              ?? '',
            'bill_tin'                   => $raw['bill_to_tin']                ?? '',
            'bill_industry'              => $raw['bill_to_industry']           ?? '',
            'bill_sector'                => $raw['bill_to_sector']             ?? '',
            'payer_different'            => $toBool($raw['payer_different'] ?? 0),
            'payer_customer_no'          => $raw['payer_customer_no']          ?? '',
            'payer_customer_name'        => $raw['payer_customer_name']        ?? '',
            'tax_classification'         => $raw['tax_classification']         ?? '',
            'tax_classification_vat_inc' => (isset($raw['tax_classification']) && stripos((string)$raw['tax_classification'], 'vat') !== false) ? 1 : 0,
            'billing_payment_terms'      => $raw['payment_terms']              ?? '',
            'sales_representative'       => $raw['sales_representative']       ?? '',
            'profit_center'              => $raw['profit_center']              ?? '',
            'credit_limit'               => $raw['credit_limit']               ?? '',
            'credit_limit_currency'      => $raw['credit_limit_currency']      ?? '',
            'area_manager'               => $raw['area_manager']               ?? '',
            'field_sales_coordinator'    => $raw['field_sales_coordinator']    ?? '',
            'price_group'                => $raw['price_group']                ?? '',
            'customer_price_list'        => $raw['customer_price_list']        ?? '',
            'contact_person_name'        => $raw['contact_person_name']        ?? '',
            'contact_person_title'       => $raw['contact_person_title']       ?? '',
            'contact_person_department'  => $raw['contact_person_department']  ?? '',
            'contact_person_tel_no'      => $raw['contact_person_tel_no']      ?? '',
            'contact_person_mobile_no'   => $raw['contact_person_mobile_no']   ?? '',
            'contact_person_email'       => $raw['contact_person_email']       ?? '',
            'contact_person_owner'       => $toBool($raw['contact_person_owner'] ?? 0),
            'contact_person_others'      => $toBool($raw['contact_person_others'] ?? 0),
            'contact_person_spec'        => $raw['contact_person_spec']        ?? '',
            'contact_person2_name'       => $raw['contact_person2_name']       ?? '',
            'contact_person2_title'      => $raw['contact_person2_title']      ?? '',
            'contact_person2_mobile'     => $raw['contact_person2_mobile']     ?? '',
            'contact_person2_email'      => $raw['contact_person2_email']      ?? '',
            'recon_account'              => $raw['recon_account']              ?? '',
            'recon_account_other'        => $raw['recon_account_other']        ?? '',
            'recon_account_ar_trade'     => $toBool($raw['recon_account_ar_trade'] ?? 0),
            'recon_account_ar_affiliated'=> $toBool($raw['recon_account_ar_affiliated'] ?? 0),
            'recon_account_others'       => $toBool($raw['recon_account_others'] ?? 0),
            'gl_account'                 => $raw['gl_account']                 ?? '',
            'sort_key'                   => $raw['sort_key']                   ?? '',
            'remarks_comments'           => $raw['remarks_comments']           ?? ($raw['remarks_reason'] ?? ''),
        ];
    }

    private static function normalizeSRRF(array $raw): array {
        $toBool = function($val) {
            if ($val === null || $val === '') return 0;
            if (is_bool($val)) return $val ? 1 : 0;
            if (is_numeric($val)) return (int)$val;
            $str = strtolower(trim((string)$val));
            return ($str === '1' || $str === 'yes' || $str === 'on' || $str === 'true') ? 1 : 0;
        };
        return [
            'nature_of_request'      => $raw['nature_of_request']      ?? '',
            'vendor_type'            => $raw['vendor_type']            ?? '',
            'company_purchasing_org' => $raw['company_purchasing_org'] ?? '',
            'delivery_plant'         => $raw['delivery_plant']         ?? '',
            'incoterms'              => $raw['incoterms']              ?? '',
            'supplier_code'          => $raw['supplier_code']          ?? '',
            'supplier_category'      => $raw['supplier_category']      ?? '',
            'title'                  => $raw['title']                  ?? '',
            'supplier_name'          => $raw['supplier_name']          ?? '',
            'business_name'          => $raw['business_name']          ?? '',
            'business_address'       => $raw['business_address']       ?? '',
            'city'                   => $raw['city']                   ?? '',
            'state_province'         => $raw['state_province']         ?? '',
            'region'                 => $raw['region']                 ?? '',
            'country'                => $raw['country']                ?? 'Philippines',
            'zip_code'               => $raw['zip_code']               ?? '',
            'tin'                    => $raw['tin']                    ?? '',
            'is_vat_registered'      => $toBool($raw['is_vat_registered'] ?? 0),
            'tel_no'                 => $raw['tel_no']                 ?? '',
            'mobile_no'              => $raw['mobile_no']              ?? '',
            'fax_no'                 => $raw['fax_no']                 ?? '',
            'email_address'          => $raw['email_address']          ?? '',
            'website'                => $raw['website']                ?? '',
            'bank_name'              => $raw['bank_name']              ?? '',
            'bank_branch'            => $raw['bank_branch']            ?? '',
            'account_name_number'    => $raw['account_name_number']    ?? '',
            'bank_swift_code'        => $raw['bank_swift_code']        ?? '',
            'bank_currency'          => $raw['bank_currency']          ?? '',
            'payment_terms'          => $raw['payment_terms']          ?? '',
            'payment_methods'        => $raw['payment_methods']        ?? '',
            'order_currency'         => $raw['order_currency']         ?? 'PHP',
            'mm_purchasing_group'    => $raw['mm_purchasing_group']    ?? '',
            'contact_person_name'    => $raw['contact_person_name']    ?? '',
            'contact_person_position'=> $raw['contact_person_position']?? '',
            'contact_person_mobile'  => $raw['contact_person_mobile']  ?? '',
            'contact_person_email'   => $raw['contact_person_email']   ?? '',
            'contact_person2_name'   => $raw['contact_person2_name']   ?? '',
            'contact_person2_position'=> $raw['contact_person2_position'] ?? '',
            'contact_person2_mobile' => $raw['contact_person2_mobile'] ?? '',
            'contact_person2_email'  => $raw['contact_person2_email']  ?? '',
            'remarks_reason'         => $raw['remarks_reason']         ?? '',
            'has_business_permit'    => $toBool($raw['has_business_permit'] ?? 0),
            'has_sec_registration'   => $toBool($raw['has_sec_registration'] ?? 0),
            'has_dti_registration'   => $toBool($raw['has_dti_registration'] ?? 0),
        ];
    }

    private static function normalizeEDMRF(array $raw): array {
        $toBool = function($val) {
            if ($val === null || $val === '') return 0;
            if (is_bool($val)) return $val ? 1 : 0;
            if (is_numeric($val)) return (int)$val;
            $str = strtolower(trim((string)$val));
            return ($str === '1' || $str === 'yes' || $str === 'on' || $str === 'true') ? 1 : 0;
        };
        $oecSeller = $toBool($raw['bp_role_oec_seller_id'] ?? 0);
        return [
            'nature_of_request'           => $raw['nature_of_request']           ?? '',
            'company_purchasing_org'      => $raw['company_purchasing_org']      ?? '',
            'sales_pillar'                => $raw['sales_pillar']                ?? '',
            'bp_role_employee_receivable' => $toBool($raw['bp_role_employee_receivable'] ?? 0),
            'bp_role_employee_payable'    => $toBool($raw['bp_role_employee_payable']    ?? 0),
            'bp_role_sales_agent'         => $toBool($raw['bp_role_sales_agent']         ?? 0),
            'bp_role_oec_seller_vendor'   => $oecSeller,
            'bp_role_oec_seller_sales'    => $oecSeller,
            'company_employee_no'         => $raw['company_employee_no']         ?? '',
            'system_employee_code'        => $raw['system_employee_code']        ?? '',
            'oec_seller_id'               => $raw['oec_seller_id']               ?? '',
            'tin'                         => $raw['tin']                         ?? '',
            'sss_no'                      => $raw['sss_no']                      ?? '',
            'pagibig_no'                  => $raw['pagibig_no']                  ?? '',
            'philhealth_no'               => $raw['philhealth_no']               ?? '',
            'title'                       => $raw['title']                       ?? '',
            'full_name'                   => $raw['full_name']                   ?? '',
            'preferred_name'              => $raw['preferred_name']              ?? '',
            'birth_date'                  => $raw['birth_date']                  ?? '',
            'gender'                      => $raw['gender']                      ?? '',
            'civil_status'                => $raw['civil_status']                ?? '',
            'address'                     => $raw['address']                     ?? '',
            'permanent_address'           => $raw['permanent_address']           ?? '',
            'province'                    => $raw['province']                    ?? '',
            'region'                      => $raw['region']                      ?? '',
            'postal_code'                 => $raw['postal_code']                 ?? '',
            'bank_name'                   => $raw['bank_name']                   ?? '',
            'bank_branch'                 => $raw['bank_branch']                 ?? '',
            'bank_account_name_number'    => $raw['bank_account_name_number']    ?? '',
            'bank_account_type'           => $raw['bank_account_type']           ?? '',
            'department'                  => $raw['department']                  ?? '',
            'group_team'                  => $raw['group_team']                  ?? '',
            'cost_center'                 => $raw['cost_center']                 ?? '',
            'profit_center'               => $raw['profit_center']               ?? '',
            'payment_terms'               => $raw['payment_terms']               ?? '',
            'salary_basis'                => $raw['salary_basis']                ?? '',
            'email_address'               => $raw['email_address']               ?? '',
            'company_email'               => $raw['company_email']               ?? '',
            'mobile_number'               => $raw['mobile_number']               ?? '',
            'telephone_number'            => $raw['telephone_number']            ?? '',
            'emergency_contact_name'      => $raw['emergency_contact_name']      ?? '',
            'emergency_contact_number'    => $raw['emergency_contact_number']    ?? '',
            'position'                    => $raw['position']                    ?? '',
            'job_grade'                   => $raw['job_grade']                   ?? '',
            'date_hired'                  => $raw['date_hired']                  ?? '',
            'date_regularized'            => $raw['date_regularized']            ?? '',
            'employment_status'           => $raw['employment_status']           ?? '',
            'supervisor_name'             => $raw['supervisor_name']             ?? '',
            'supervisor_employee_no'      => $raw['supervisor_employee_no']      ?? '',
            'doc_company_id'              => 0,
            'doc_enrolment_form'          => 0,
            'remarks_reason'              => $raw['remarks_reason']              ?? '',
        ];
    }

    private static function normalizeDocs(array &$formData, array $docsSelected, string $type): void {
        $cleanedDocs = array_map('trim', $docsSelected);
        $formData['docs'] = implode(',', $cleanedDocs);
        if ($type === 'EMPLOYEE') {
            foreach ($cleanedDocs as $doc) {
                $lower = strtolower(trim($doc));
                if (strpos($lower, 'company identification') !== false ||
                    strpos($lower, 'company id') !== false ||
                    strpos($lower, 'identification card') !== false) {
                    $formData['doc_company_id'] = 1;
                }
                if (strpos($lower, 'enrolment') !== false ||
                    strpos($lower, 'enrollment') !== false) {
                    $formData['doc_enrolment_form'] = 1;
                }
            }
        }
    }

    public static function generate($request, $type) {
        $rawFormData = isset($request['form_data']) && is_array($request['form_data'])
            ? $request['form_data'] : [];

        if ($type === 'SUPPLIER')       $formData = self::normalizeSRRF($rawFormData);
        elseif ($type === 'CUSTOMER')   $formData = self::normalizeCRRF($rawFormData);
        else                            $formData = self::normalizeEDMRF($rawFormData);

        $docsSelected = [];
        if (!empty($request['docs_selected']) && is_array($request['docs_selected'])) {
            foreach ($request['docs_selected'] as $item) {
                if (is_string($item))       $docsSelected[] = $item;
                elseif (is_array($item))    $docsSelected[] = $item['document_name'] ?? ($item['name'] ?? '');
            }
        }
        self::normalizeDocs($formData, $docsSelected, $type);

        $requestNo = htmlspecialchars($request['request_no'] ?? 'FORM-00000');
        $status    = $request['status'] ?? 'draft';

        $getVal = function($key, $default = '') use ($formData) {
            if (!is_array($formData)) return $default;
            $value = $formData[$key] ?? '';
            return ($value !== '' && $value !== null) ? htmlspecialchars((string)$value) : $default;
        };
        $isChecked = function($key, $value) use ($formData) {
            if (!is_array($formData)) return false;
            $val = $formData[$key] ?? '';
            return strtolower(trim((string)$val)) === strtolower((string)$value);
        };
        $isCheckedBool = function($key) use ($formData) {
            if (!is_array($formData)) return false;
            $val = $formData[$key] ?? 0;
            return $val == 1 || $val === '1' || $val === true;
        };
        $isDocSelected = function($docLabel) use ($formData) {
            if (empty($formData['docs'])) return false;
            $selectedDocs = array_map('trim', explode(',', (string)$formData['docs']));
            $searchLabel  = trim($docLabel);
            foreach ($selectedDocs as $selected) {
                if (strcasecmp($selected, $searchLabel) === 0)      return true;
                if (stripos($selected, $searchLabel) !== false)     return true;
                if (stripos($searchLabel, $selected) !== false)     return true;
            }
            return false;
        };

        $supplierDocsList = [
            'Certificate of Business Registration/Incorporation',
            'Articles of Incorporation / Memorandum of Association',
            'Tax ID No./ Vat Registration (Certified Copy)',
            'Proof Business Permit (Current Year)',
            'SEC Registration (If Corporation)',
            'DTI Registration (If Sole Proprietorship)',
            'Latest Audit Financial Statement (AFS)',
            'Credit References (Min.2)',
            "Corporate Secretary's Certificate/Board Resolution",
            "Gov't-Issued ID of Authorized Signatory (2 Valid IDs)",
            'Specimen Signature of Authorized Signatory',
            'Special Power of Attorney (SPA)',
            'Supplier Profile / Company Brochure',
            'Product/Service List With List Price',
            'ISO/Quality Certifications',
            'PCAB/PCAP License',
            'FDA Certificate',
            'Sanitation Permit',
            'Signed Code of Conduct Acknowledgement',
            'Anti Bribery / Non-Conflict of Interest Declaration',
        ];
        $customerDocsList = [
            'Certificate of Business Registration/Incorporation',
            'Articles of Incorporation / Memorandum of Association',
            'Tax ID No./ Vat Registration (Certified Copy)',
            'Proof Business Permit (Current Year)',
            'SEC Registration (If Corporation)',
            'DTI Registration (If Sole Proprietorship)',
            'Latest Audit Financial Statement (AFS)',
            'Credit References (Min.2)',
            'Bank Certification',
            "Corporate Secretary's Certificate/Board Resolution",
            "Gov't-Issued ID of Authorized Signatory (2 Valid IDs)",
            'Specimen Signature of Authorized Signatory',
            'Special Power of Attorney (SPA)',
            'Signed Customer Terms & Conditions',
            'Anti Bribery / Non-Conflict of Interest Declaration',
        ];

        ob_start();
        ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo $type; ?> Registration Form - <?php echo $requestNo; ?></title>
<style>
    /* RESET & BASE */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        background: #e0e0e0;
        padding: 8px;
        font-size: 9px;
    }
    
    /* CRITICAL: SINGLE PAGE PRINT OPTIMIZATION FOR CUSTOMER FORM */
    @media print {
        body {
            background: white;
            padding: 0;
            margin: 0;
        }
        .no-print { display: none !important; }
        @page {
            size: A4 portrait;
            margin: 0.2cm;
        }
        .form-container {
            margin: 0;
            padding: 0;
            width: 100%;
        }
        .form-wrapper {
            border: 1px solid #000;
            margin: 0;
            padding: 2px;
        }
        /* Force all sections to stay within page */
        .section-block, .split-block, .party-section, .signature-section {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        /* EXTREME COMPACT FOR CUSTOMER FORM - SINGLE PAGE */
        .field-row { padding: 0px 4px; }
        .field-label { font-size: 6.5px; min-width: 65px; }
        .field-value { font-size: 6.5px; min-width: 80px; }
        .section-title { font-size: 7px; padding: 1px 4px; }
        .checkbox-item { font-size: 6.5px; }
        .checkbox-box { width: 7px; height: 7px; }
        .checkbox-box.checked::after { font-size: 6px; }
        .docs-grid { gap: 1px 8px; padding: 3px 6px; }
        .doc-item { font-size: 6px; }
        .doc-box { width: 6px; height: 6px; }
        .doc-box.checked::after { font-size: 5px; }
        .remarks-box { min-height: 20px; padding: 2px 5px; font-size: 6.5px; margin: 2px 4px; }
        .cert-line { padding: 2px; font-size: 6px; margin: 2px 4px 0; }
        .signature-section { padding: 3px 6px; margin-top: 2px; }
        .signature-row { gap: 10px; margin-bottom: 4px; }
        .signature-role { font-size: 6.5px; }
        .signature-line { min-height: 12px; }
        .signature-caption { font-size: 5px; }
        .form-header { padding: 3px 8px; }
        .title-main { font-size: 11px; }
        .title-sub { font-size: 7px; }
        .ref-section { font-size: 9px; }
        .logo-cbk { font-size: 12px; padding: 1px 5px; }
        .logo-c { font-size: 11px; padding: 1px 4px; }
    }
    
    /* MAIN CONTAINER */
    .form-container {
        max-width: 1100px;
        margin: 0 auto;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .form-wrapper {
        background: white;
        border: 2px solid #333;
    }
    
    /* HEADER - More compact */
    .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #cc0000;
        padding: 5px 10px;
        background: #f8f8f8;
    }
    .logo-section {
        display: flex;
        align-items: center;
        gap: 3px;
    }
    .logo-cbk {
        background: #cc0000;
        color: white;
        font-weight: bold;
        font-size: 16px;
        font-family: 'Arial Black', sans-serif;
        padding: 1px 6px;
        border-radius: 3px;
    }
    .logo-c {
        background: #1a228f;
        color: white;
        font-weight: bold;
        font-size: 14px;
        font-family: 'Arial Black', sans-serif;
        padding: 1px 5px;
        border-radius: 3px;
    }
    .title-section {
        text-align: center;
    }
    .title-main {
        font-size: 13px;
        font-weight: bold;
        font-family: 'Arial Black', sans-serif;
        color: #1a228f;
    }
    .title-sub {
        font-size: 8px;
        font-weight: bold;
        color: #cc0000;
        letter-spacing: 1px;
    }
    .ref-section {
        text-align: right;
        font-weight: bold;
        color: #cc0000;
        font-size: 11px;
    }
    .status-badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 7px;
        margin-left: 5px;
    }
    .status-draft { background: #e2e8f0; color: #475569; }
    .status-submitted { background: #dbeafe; color: #1e40af; }
    .status-under_review { background: #fef3c7; color: #92400e; }
    .status-for_signing { background: #f3e8ff; color: #6b21a5; }
    .status-signed { background: #d1fae5; color: #065f46; }
    .status-posted { background: #bbf7d0; color: #166534; }
    
    /* SECTION BLOCKS - Tighter margins */
    .section-block {
        border: 1px solid #cc0000;
        margin: 4px;
    }
    .section-title {
        background: #cc0000;
        color: white;
        font-weight: bold;
        padding: 3px 8px;
        font-size: 9px;
        font-family: 'Arial Black', sans-serif;
    }
    .section-title.blue {
        background: #1a228f;
    }
    
    /* TWO COLUMN SPLIT */
    .split-block {
        display: flex;
        gap: 4px;
        margin: 4px;
    }
    .split-block .col {
        flex: 1;
        border: 1px solid #cc0000;
    }
    .split-block .col .section-title {
        margin: 0;
    }
    
    /* FIELD ROWS - Compact */
    .field-row {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        padding: 1px 5px;
        border-bottom: 0.5px solid #eee;
        gap: 3px 8px;
    }
    .field-label {
        font-weight: 600;
        font-size: 8px;
        color: #555;
        min-width: 75px;
    }
    .field-value {
        border-bottom: 1px solid #333;
        min-width: 90px;
        padding: 0 2px;
        font-size: 8px;
        font-family: 'Courier New', monospace;
    }
    .field-value-inline {
        border-bottom: 1px solid #333;
        padding: 0 2px;
        font-size: 8px;
        display: inline-block;
        min-width: 60px;
    }
    
    /* CHECKBOX GROUP */
    .checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        padding: 3px 6px;
        align-items: center;
    }
    .checkbox-item {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 8px;
    }
    .checkbox-box {
        width: 8px;
        height: 8px;
        border: 1px solid #333;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: white;
    }
    .checkbox-box.checked {
        background: #1a228f;
        color: white;
    }
    .checkbox-box.checked::after {
        content: "\2713";
        font-size: 7px;
    }
    
    /* DOCUMENTS GRID - Compact 2 columns */
    .docs-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2px 10px;
        padding: 4px 8px;
    }
    .doc-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 7px;
    }
    .doc-box {
        width: 7px;
        height: 7px;
        border: 1px solid #333;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .doc-box.checked {
        background: #1a228f;
        color: white;
    }
    .doc-box.checked::after {
        content: "\2713";
        font-size: 6px;
    }
    
    /* REMARKS */
    .remarks-box {
        border: 1px solid #aaa;
        min-height: 30px;
        margin: 3px 6px;
        padding: 3px 6px;
        background: #fefef5;
        font-size: 8px;
    }
    
    /* CERTIFICATION */
    .cert-line {
        text-align: center;
        font-style: italic;
        padding: 3px;
        border-top: 1px solid #ccc;
        margin: 3px 6px 0;
        font-size: 7px;
    }
    
    /* SIGNATURES */
    .signature-section {
        border-top: 1px solid #cc0000;
        padding: 4px 8px;
        margin-top: 3px;
    }
    .signature-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 6px;
    }
    .signature-box {
        display: flex;
        flex-direction: column;
    }
    .signature-role {
        font-weight: bold;
        font-size: 7px;
        color: #1a228f;
    }
    .signature-line {
        border-bottom: 1px solid #333;
        min-height: 14px;
        margin: 1px 0;
    }
    .signature-caption {
        font-size: 5.5px;
        text-align: center;
        color: #666;
    }
    
    /* UTILITIES */
    .no-border { border-bottom: none !important; }
    .text-bold { font-weight: bold; }
    .text-red { color: #cc0000; }
    .text-blue { color: #1a228f; }
    .bg-soft { background: #f5f5f5; }
    
    /* BUTTONS */
    .print-buttons {
        text-align: center;
        margin-bottom: 10px;
        position: sticky;
        top: 5px;
        z-index: 100;
    }
    .print-btn {
        background: #1a228f;
        color: white;
        border: none;
        padding: 6px 15px;
        margin: 0 3px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 10px;
        font-weight: bold;
    }
    .print-btn:hover { background: #cc0000; }
    
    /* RESPONSIVE */
    @media (max-width: 800px) {
        body { padding: 3px; }
        .field-label { min-width: 60px; }
        .field-value { min-width: 70px; }
        .docs-grid { grid-template-columns: 1fr; }
    }
</style>
</head>
<body>

<div class="print-buttons no-print">
    <button class="print-btn" onclick="window.print();">🖨️ PRINT / SAVE AS PDF</button>
    <button class="print-btn" onclick="window.close();">✕ CLOSE</button>
</div>

<div class="form-container">
<?php if ($type === 'SUPPLIER'): ?>
<!-- ==================== SUPPLIER REGISTRATION FORM ==================== -->
<div class="form-wrapper">
    <div class="form-header">
        <div class="logo-section">
            <span class="logo-c">C</span>
            <span class="logo-cbk">BK</span>
        </div>
        <div class="title-section">
            <div class="title-main">SUPPLIER REGISTRATION</div>
            <div class="title-sub">REQUEST FORM</div>
        </div>
        <div class="ref-section">
            SRRF-<?php echo ltrim(str_replace('SRRF', '', $requestNo), '-'); ?>
            <span class="status-badge status-<?php echo $status; ?>"><?php echo ucfirst($status); ?></span>
        </div>
    </div>

    <!-- NATURE OF REQUEST & VENDOR TYPE -->
    <div class="split-block">
        <div class="col">
            <div class="section-title">NATURE OF REQUEST</div>
            <div class="checkbox-group" style="flex-direction:column; align-items:flex-start; gap:2px;">
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','CREATION')?'checked':''; ?>"></span> CREATION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','MODIFICATION')?'checked':''; ?>"></span> MODIFICATION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','BLOCKING')?'checked':''; ?>"></span> BLOCKING</div>
            </div>
        </div>
        <div class="col">
            <div class="section-title">VENDOR TYPE</div>
            <?php $vt = strtolower(trim($formData['vendor_type'] ?? '')); ?>
            <div class="checkbox-group" style="flex-direction:column; align-items:flex-start; gap:2px;">
                <div class="checkbox-item">
                    <span class="checkbox-box <?php echo (strpos($vt,'domestic')!==false && strpos($vt,'non-trade')===false)?'checked':''; ?>"></span>
                    DOMESTIC – TRADE
                    <span style="margin-left:5px;">CO. &amp; PURCH. ORG.: <span class="field-value-inline"><?php echo $getVal('company_purchasing_org'); ?></span></span>
                </div>
                <div class="checkbox-item">
                    <span class="checkbox-box <?php echo (strpos($vt,'non-trade')!==false)?'checked':''; ?>"></span>
                    DOMESTIC – NON-TRADE
                    <span style="margin-left:5px;">DELIVERY PLANT: <span class="field-value-inline"><?php echo $getVal('delivery_plant'); ?></span></span>
                </div>
                <div class="checkbox-item">
                    <span class="checkbox-box <?php echo (strpos($vt,'foreign')!==false)?'checked':''; ?>"></span>
                    FOREIGN – TRADE
                    <span style="margin-left:5px;">INCOTERMS: <span class="field-value-inline"><?php echo $getVal('incoterms'); ?></span></span>
                </div>
            </div>
        </div>
    </div>

    <!-- GENERAL DATA -->
    <div class="section-block">
        <div class="section-title">GENERAL DATA</div>
        <div class="field-row">
            <span class="field-label">SUPPLIER CODE:</span>
            <span class="field-value"><?php echo $getVal('supplier_code'); ?></span>
            <span class="field-label">CATEGORY:</span>
            <span class="field-value"><?php echo $getVal('supplier_category'); ?></span>
            <span class="field-label">TITLE:</span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('title','COMPANY')?'checked':''; ?>"></span> COMPANY</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('title','Mr')?'checked':''; ?>"></span> Mr</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('title','Ms')?'checked':''; ?>"></span> Ms</div>
        </div>
        <div class="field-row"><span class="field-label">SUPPLIER NAME:</span><span class="field-value" style="font-weight:bold; border-bottom:2px solid #333;"><?php echo $getVal('supplier_name'); ?></span></div>
        <div class="field-row"><span class="field-label">BUSINESS NAME:</span><span class="field-value"><?php echo $getVal('business_name'); ?></span></div>
        <div class="field-row"><span class="field-label">BUSINESS ADDRESS:</span><span class="field-value"><?php echo $getVal('business_address'); ?></span></div>
        <div class="field-row">
            <span class="field-label">CITY:</span><span class="field-value"><?php echo $getVal('city'); ?></span>
            <span class="field-label">STATE/PROVINCE:</span><span class="field-value"><?php echo $getVal('state_province'); ?></span>
            <span class="field-label">REGION:</span><span class="field-value"><?php echo $getVal('region'); ?></span>
            <span class="field-label">COUNTRY:</span><span class="field-value"><?php echo $getVal('country','Philippines'); ?></span>
            <span class="field-label">ZIP CODE:</span><span class="field-value"><?php echo $getVal('zip_code'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">TIN:</span><span class="field-value"><?php echo $getVal('tin'); ?></span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('is_vat_registered')?'checked':''; ?>"></span> VAT REGISTERED</div>
            <span class="field-label">TEL NO:</span><span class="field-value"><?php echo $getVal('tel_no'); ?></span>
            <span class="field-label">MOBILE NO:</span><span class="field-value"><?php echo $getVal('mobile_no'); ?></span>
            <span class="field-label">FAX NO:</span><span class="field-value"><?php echo $getVal('fax_no'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('email_address'); ?></span>
            <span class="field-label">WEBSITE:</span><span class="field-value"><?php echo $getVal('website'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">BANK NAME:</span><span class="field-value"><?php echo $getVal('bank_name'); ?></span>
            <span class="field-label">BANK BRANCH:</span><span class="field-value"><?php echo $getVal('bank_branch'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">ACCOUNT NAME &amp; NUMBER:</span><span class="field-value"><?php echo $getVal('account_name_number'); ?></span>
            <span class="field-label">SWIFT CODE:</span><span class="field-value"><?php echo $getVal('bank_swift_code'); ?></span>
            <span class="field-label">CURRENCY:</span><span class="field-value"><?php echo $getVal('bank_currency'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">PAYMENT TERMS:</span><span class="field-value"><?php echo $getVal('payment_terms'); ?></span>
            <span class="field-label">PAYMENT METHODS:</span><span class="field-value"><?php echo $getVal('payment_methods'); ?></span>
            <span class="field-label">ORDER CURRENCY:</span><span class="field-value"><?php echo $getVal('order_currency','PHP'); ?></span>
        </div>
        <div class="field-row no-border">
            <span class="field-label">MM PURCHASING GROUP:</span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('mm_purchasing_group','Trade Local')?'checked':''; ?>"></span> Trade Local</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('mm_purchasing_group','Office Supplies')?'checked':''; ?>"></span> Office Supplies</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('mm_purchasing_group','Stock Transfer')?'checked':''; ?>"></span> Stock Transfer</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('mm_purchasing_group','Importation')?'checked':''; ?>"></span> Importation</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('mm_purchasing_group','Direct Expenses')?'checked':''; ?>"></span> Direct Expenses</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('mm_purchasing_group','Claims Group')?'checked':''; ?>"></span> Claims Group</div>
        </div>
    </div>

    <!-- CONTACT PERSON -->
    <div class="section-block">
        <div class="section-title">CONTACT PERSON</div>
        <div class="field-row">
            <span class="field-label">NAME:</span><span class="field-value"><?php echo $getVal('contact_person_name'); ?></span>
            <span class="field-label">POSITION:</span><span class="field-value"><?php echo $getVal('contact_person_position'); ?></span>
            <span class="field-label">MOBILE:</span><span class="field-value"><?php echo $getVal('contact_person_mobile'); ?></span>
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('contact_person_email'); ?></span>
        </div>
        <div class="field-row no-border">
            <span class="field-label">NAME 2:</span><span class="field-value"><?php echo $getVal('contact_person2_name'); ?></span>
            <span class="field-label">POSITION:</span><span class="field-value"><?php echo $getVal('contact_person2_position'); ?></span>
            <span class="field-label">MOBILE:</span><span class="field-value"><?php echo $getVal('contact_person2_mobile'); ?></span>
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('contact_person2_email'); ?></span>
        </div>
    </div>

    <!-- REQUIRED DOCUMENTS -->
    <div class="section-block">
        <div class="section-title">REQUIRED DOCUMENTS</div>
        <div class="docs-grid">
            <?php foreach ($supplierDocsList as $d): ?>
            <div class="doc-item"><span class="doc-box <?php echo $isDocSelected($d)?'checked':''; ?>"></span> <?php echo htmlspecialchars($d); ?></div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- REMARKS -->
    <div class="section-block">
        <div class="section-title">REMARKS / REASON</div>
        <div class="remarks-box"><?php echo nl2br($getVal('remarks_reason')); ?></div>
    </div>

    <div class="cert-line">I hereby certify that the information provided in this form is complete, true and correct.</div>

    <!-- SIGNATURES -->
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">REQUESTED BY</div><div class="signature-line"></div><div class="signature-caption">Signature over printed name / Date</div></div>
            <div class="signature-box"><div class="signature-role">VALIDATED BY</div><div class="signature-line"></div><div class="signature-caption">Signature over printed name / Date<br>MDCU HEAD</div></div>
        </div>
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">APPROVED BY</div><div class="signature-line"></div><div class="signature-caption">Signature over printed name / Date<br>(FINANCE)</div></div>
            <div class="signature-box"><div class="signature-role">EXECUTED BY</div><div class="signature-line"></div><div class="signature-caption">Signature over printed name / Date<br>(MDCU)</div></div>
        </div>
    </div>
</div>

<?php elseif ($type === 'CUSTOMER'): ?>
<!-- ==================== CUSTOMER REGISTRATION FORM - SINGLE PAGE OPTIMIZED ==================== -->
<div class="form-wrapper">
    <!-- Header -->
    <div class="form-header">
        <div class="logo-section">
            <span class="logo-c">C</span>
            <span class="logo-cbk">BK</span>
        </div>
        <div class="title-section">
            <div class="title-main">CUSTOMER REGISTRATION</div>
            <div class="title-sub">REQUEST FORM</div>
        </div>
        <div class="ref-section">
            CRRF-<?php echo ltrim(str_replace('CRRF-', '', $requestNo), '-'); ?>
            <span class="status-badge status-<?php echo $status; ?>"><?php echo ucfirst($status); ?></span>
        </div>
    </div>

    <!-- NATURE OF REQUEST & ACCOUNT GROUP - More compact row -->
    <div class="split-block">
        <div class="col">
            <div class="section-title">NATURE OF REQUEST</div>
            <div class="checkbox-group" style="flex-wrap:wrap; gap:3px 8px;">
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','CREATION')?'checked':''; ?>"></span> CREATION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','MODIFICATION')?'checked':''; ?>"></span> MODIFICATION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','EXTENSION OF ACCOUNT')?'checked':''; ?>"></span> EXTENSION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','BLOCKING')?'checked':''; ?>"></span> BLOCKING</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','LISTING/DPSDCL')?'checked':''; ?>"></span> LISTING</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','OTHERS')?'checked':''; ?>"></span> OTHERS</div>
            </div>
            <?php if ($getVal('nature_of_request_other')): ?>
            <div class="field-row no-border"><span class="field-label">Other Spec:</span><span class="field-value"><?php echo $getVal('nature_of_request_other'); ?></span></div>
            <?php endif; ?>
        </div>
        <div class="col">
            <div class="section-title">ACCOUNT GROUP &amp; SALES ORG</div>
            <div style="display:flex; gap:10px; padding:3px 6px;">
                <div>
                    <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('account_group_sold_to')?'checked':''; ?>"></span> SOLD-TO</div>
                    <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('account_group_ship_to')?'checked':''; ?>"></span> SHIP-TO</div>
                    <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('account_group_bill_to')?'checked':''; ?>"></span> BILL-TO</div>
                    <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('account_group_payer')?'checked':''; ?>"></span> PAYER</div>
                </div>
                <div>
                    <div class="field-row no-border"><span class="field-label">SALES ORG.:</span><span class="field-value"><?php echo $getVal('company_sales_org'); ?></span></div>
                    <div class="field-row no-border"><span class="field-label">PILLAR:</span><span class="field-value"><?php echo $getVal('pillar'); ?></span></div>
                </div>
            </div>
        </div>
    </div>

    <!-- SOLD-TO PARTY - Compact -->
    <div class="section-block">
        <div class="section-title blue">SOLD-TO PARTY</div>
        <div class="field-row">
            <span class="field-label">CUSTOMER NO.:</span><span class="field-value"><?php echo $getVal('sold_customer_no'); ?></span>
            <span class="field-label">TITLE:</span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('sold_title','COMPANY')?'checked':''; ?>"></span> COMPANY</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('sold_title','Mr')?'checked':''; ?>"></span> Mr</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('sold_title','Ms')?'checked':''; ?>"></span> Ms</div>
        </div>
        <div class="field-row"><span class="field-label">CUSTOMER NAME:</span><span class="field-value" style="font-weight:bold;"><?php echo $getVal('sold_customer_name'); ?></span></div>
        <div class="field-row">
            <span class="field-label">STORE AREA 1:</span><span class="field-value"><?php echo $getVal('sold_store_area1'); ?></span>
            <span class="field-label">STORE AREA 2:</span><span class="field-value"><?php echo $getVal('sold_store_area2'); ?></span>
            <span class="field-label">STORE SIZE:</span><span class="field-value"><?php echo $getVal('sold_store_size'); ?></span>
        </div>
        <div class="field-row"><span class="field-label">ADDRESS:</span><span class="field-value"><?php echo $getVal('sold_address'); ?></span></div>
        <div class="field-row">
            <span class="field-label">CITY:</span><span class="field-value"><?php echo $getVal('sold_city'); ?></span>
            <span class="field-label">POSTAL CODE:</span><span class="field-value"><?php echo $getVal('sold_postal_code'); ?></span>
            <span class="field-label">PROVINCE:</span><span class="field-value"><?php echo $getVal('sold_province'); ?></span>
            <span class="field-label">REGION:</span><span class="field-value"><?php echo $getVal('sold_region'); ?></span>
        </div>
        <div class="field-row no-border">
            <span class="field-label">TEL NO:</span><span class="field-value"><?php echo $getVal('sold_tel_no'); ?></span>
            <span class="field-label">MOBILE:</span><span class="field-value"><?php echo $getVal('sold_mobile_no'); ?></span>
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('sold_email'); ?></span>
            <span class="field-label">TIN:</span><span class="field-value"><?php echo $getVal('sold_tin'); ?></span>
        </div>
    </div>

    <!-- SHIP-TO PARTY - Compact -->
    <div class="section-block">
        <div class="section-title">SHIP-TO PARTY</div>
        <div class="checkbox-group">
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('ship_to_different')?'checked':''; ?>"></span> DIFFERENT FROM SOLD-TO PARTY</div>
        </div>
        <?php if ($isCheckedBool('ship_to_different') || $getVal('ship_customer_name')): ?>
        <div class="field-row">
            <span class="field-label">CUSTOMER NO.:</span><span class="field-value"><?php echo $getVal('ship_customer_no'); ?></span>
            <span class="field-label">TITLE:</span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('ship_title','COMPANY')?'checked':''; ?>"></span> COMPANY</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('ship_title','Mr')?'checked':''; ?>"></span> Mr</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('ship_title','Ms')?'checked':''; ?>"></span> Ms</div>
        </div>
        <div class="field-row"><span class="field-label">CUSTOMER NAME:</span><span class="field-value"><?php echo $getVal('ship_customer_name'); ?></span></div>
        <div class="field-row"><span class="field-label">ADDRESS:</span><span class="field-value"><?php echo $getVal('ship_address'); ?></span></div>
        <div class="field-row">
            <span class="field-label">CITY:</span><span class="field-value"><?php echo $getVal('ship_city'); ?></span>
            <span class="field-label">POSTAL CODE:</span><span class="field-value"><?php echo $getVal('ship_postal_code'); ?></span>
            <span class="field-label">PROVINCE:</span><span class="field-value"><?php echo $getVal('ship_province'); ?></span>
        </div>
        <div class="field-row no-border">
            <span class="field-label">TEL NO:</span><span class="field-value"><?php echo $getVal('ship_tel_no'); ?></span>
            <span class="field-label">MOBILE:</span><span class="field-value"><?php echo $getVal('ship_mobile_no'); ?></span>
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('ship_email'); ?></span>
            <span class="field-label">CONTACT PERSON:</span><span class="field-value"><?php echo $getVal('ship_contact_person'); ?></span>
        </div>
        <?php else: ?>
        <div class="field-row no-border"><span class="field-value" style="color:#999;">Same as Sold-To Party</span></div>
        <?php endif; ?>
    </div>

    <!-- BILL-TO PARTY & PAYER - Combined row for space saving -->
    <div class="split-block">
        <div class="col">
            <div class="section-title">BILL-TO PARTY</div>
            <div class="checkbox-group">
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('bill_to_different')?'checked':''; ?>"></span> DIFFERENT FROM SOLD-TO</div>
            </div>
            <?php if ($isCheckedBool('bill_to_different') || $getVal('bill_customer_name')): ?>
            <div class="field-row"><span class="field-label">CUSTOMER NO.:</span><span class="field-value"><?php echo $getVal('bill_customer_no'); ?></span></div>
            <div class="field-row"><span class="field-label">CUSTOMER NAME:</span><span class="field-value"><?php echo $getVal('bill_customer_name'); ?></span></div>
            <div class="field-row"><span class="field-label">ADDRESS:</span><span class="field-value"><?php echo $getVal('bill_address'); ?></span></div>
            <div class="field-row no-border">
                <span class="field-label">CITY:</span><span class="field-value"><?php echo $getVal('bill_city'); ?></span>
                <span class="field-label">TEL NO:</span><span class="field-value"><?php echo $getVal('bill_tel_no'); ?></span>
            </div>
            <?php else: ?>
            <div class="field-row no-border"><span class="field-value" style="color:#999;">Same as Sold-To Party</span></div>
            <?php endif; ?>
        </div>
        <div class="col">
            <div class="section-title">PAYER</div>
            <div class="checkbox-group">
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('payer_different')?'checked':''; ?>"></span> DIFFERENT FROM SOLD-TO</div>
            </div>
            <?php if ($isCheckedBool('payer_different') || $getVal('payer_customer_name')): ?>
            <div class="field-row"><span class="field-label">CUSTOMER NO.:</span><span class="field-value"><?php echo $getVal('payer_customer_no'); ?></span></div>
            <div class="field-row no-border"><span class="field-label">CUSTOMER NAME:</span><span class="field-value"><?php echo $getVal('payer_customer_name'); ?></span></div>
            <?php else: ?>
            <div class="field-row no-border"><span class="field-value" style="color:#999;">Same as Sold-To Party</span></div>
            <?php endif; ?>
        </div>
    </div>

    <!-- SALES AREA & ACCOUNTING DATA - Combined row -->
    <div class="split-block">
        <div class="col">
            <div class="section-title">SALES AREA</div>
            <div class="field-row">
                <span class="field-label text-red">TAX CLASS:</span>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('tax_classification_vat_inc')?'checked':''; ?>"></span> VAT INC</div>
                <span class="field-value"><?php echo $getVal('tax_classification'); ?></span>
            </div>
            <div class="field-row"><span class="field-label">PAYMENT TERMS:</span><span class="field-value"><?php echo $getVal('billing_payment_terms'); ?></span></div>
            <div class="field-row"><span class="field-label">SALES REP:</span><span class="field-value"><?php echo $getVal('sales_representative'); ?></span></div>
            <div class="field-row"><span class="field-label">PROFIT CENTER:</span><span class="field-value"><?php echo $getVal('profit_center'); ?></span></div>
            <div class="field-row"><span class="field-label">CREDIT LIMIT:</span><span class="field-value"><?php echo $getVal('credit_limit').' '.$getVal('credit_limit_currency'); ?></span></div>
            <div class="field-row no-border"><span class="field-label">PRICE GROUP:</span><span class="field-value"><?php echo $getVal('price_group'); ?></span></div>
        </div>
        <div class="col">
            <div class="section-title">ACCOUNTING DATA</div>
            <div class="field-row">
                <span class="field-label">RECON ACCT:</span>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('recon_account_ar_trade')?'checked':''; ?>"></span> AR TRADE</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('recon_account_ar_affiliated')?'checked':''; ?>"></span> AFFILIATED</div>
            </div>
            <div class="field-row"><span class="field-label">GL ACCOUNT:</span><span class="field-value"><?php echo $getVal('gl_account'); ?></span></div>
            <div class="field-row no-border"><span class="field-label">SORT KEY:</span><span class="field-value"><?php echo $getVal('sort_key'); ?></span></div>
        </div>
    </div>

    <!-- CONTACT PERSON - Compact -->
    <div class="section-block">
        <div class="section-title">CONTACT PERSON</div>
        <div class="field-row">
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('contact_person_owner')?'checked':''; ?>"></span> OWNER</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('contact_person_others')?'checked':''; ?>"></span> OTHERS</div>
            <span class="field-value"><?php echo $getVal('contact_person_spec'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">NAME:</span><span class="field-value"><?php echo $getVal('contact_person_name'); ?></span>
            <span class="field-label">TITLE:</span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('contact_person_title','Mr')?'checked':''; ?>"></span> Mr</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('contact_person_title','Ms')?'checked':''; ?>"></span> Ms</div>
        </div>
        <div class="field-row no-border">
            <span class="field-label">TEL/MOBILE:</span><span class="field-value"><?php echo $getVal('contact_person_tel_no'); ?> / <?php echo $getVal('contact_person_mobile_no'); ?></span>
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('contact_person_email'); ?></span>
        </div>
        <?php if ($getVal('contact_person2_name')): ?>
        <div class="field-row" style="border-top:1px dashed #ccc; margin-top:2px; padding-top:2px;">
            <span class="field-label">CONTACT 2:</span><span class="field-value"><?php echo $getVal('contact_person2_name'); ?></span>
            <span class="field-label">MOBILE:</span><span class="field-value"><?php echo $getVal('contact_person2_mobile'); ?></span>
        </div>
        <?php endif; ?>
    </div>

    <!-- REQUIRED DOCUMENTS - Compact 2 columns -->
    <div class="section-block">
        <div class="section-title">REQUIRED DOCUMENTS</div>
        <div class="docs-grid">
            <?php foreach ($customerDocsList as $d): ?>
            <div class="doc-item">
                <span class="doc-box <?php echo $isDocSelected($d)?'checked':''; ?>"></span>
                <?php echo htmlspecialchars(substr($d, 0, 45)); ?>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- REMARKS -->
    <div class="section-block">
        <div class="section-title">REMARKS / COMMENTS</div>
        <div class="remarks-box"><?php echo nl2br($getVal('remarks_comments')); ?></div>
    </div>

    <div class="cert-line">I hereby certify that the information provided in this form is complete, true and correct.</div>

    <!-- SIGNATURES - Compact -->
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">REQUESTED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date (SALES ADMIN)</div></div>
            <div class="signature-box"><div class="signature-role">ENDORSED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date (DEPT HEAD)</div></div>
        </div>
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">SCREENED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date (COMPLIANCE)</div></div>
            <div class="signature-box"><div class="signature-role">REVIEWED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date (FINANCE)</div></div>
        </div>
        <div class="signature-row no-border">
            <div class="signature-box"><div class="signature-role">APPROVED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date (MDCU HEAD)</div></div>
            <div class="signature-box"><div class="signature-role">EXECUTED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date (MDCU)</div></div>
        </div>
        <div style="text-align:right; font-size:6px; margin-top:2px;">
            SAP Record Number: ___________ &nbsp; SAP Date: ___________
        </div>
    </div>
</div>

<?php else: ?>
<!-- ==================== EMPLOYEE DATA MAINTENANCE FORM ==================== -->
<div class="form-wrapper">
    <div class="form-header">
        <div class="logo-section">
            <span class="logo-c">C</span>
            <span class="logo-cbk">BK</span>
        </div>
        <div class="title-section">
            <div class="title-main">EMPLOYEE DATA</div>
            <div class="title-sub">MAINTENANCE REQUEST FORM</div>
        </div>
        <div class="ref-section">
            EDMRF-<?php echo ltrim(str_replace('EDMRF-', '', $requestNo), '-'); ?>
            <span class="status-badge status-<?php echo $status; ?>"><?php echo ucfirst($status); ?></span>
        </div>
    </div>

    <!-- NATURE OF REQUEST & BP ROLE -->
    <div class="split-block">
        <div class="col bg-soft">
            <div class="section-title">NATURE OF REQUEST</div>
            <div class="checkbox-group" style="flex-direction:column; align-items:flex-start;">
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','CREATION')?'checked':''; ?>"></span> CREATION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','MODIFICATION')?'checked':''; ?>"></span> MODIFICATION</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','BLOCKING')?'checked':''; ?>"></span> BLOCKING</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('nature_of_request','UNBLOCKING')?'checked':''; ?>"></span> UNBLOCKING</div>
            </div>
        </div>
        <div class="col bg-soft">
            <div class="section-title">BP ROLE</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:3px; padding:5px;">
                <div><strong>CUSTOMER</strong></div><div><strong>VENDOR</strong></div><div><strong>SALES COORD</strong></div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('bp_role_employee_receivable')?'checked':''; ?>"></span> EMP RECEIVABLE</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('bp_role_employee_payable')?'checked':''; ?>"></span> EMP PAYABLE</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('bp_role_sales_agent')?'checked':''; ?>"></span> SALES AGENT</div>
                <div></div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('bp_role_oec_seller_vendor')?'checked':''; ?>"></span> OEC SELLER</div>
                <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('bp_role_oec_seller_sales')?'checked':''; ?>"></span> OEC SELLER</div>
            </div>
        </div>
    </div>

    <div class="section-block bg-soft">
        <div class="field-row no-border">
            <span class="field-label text-bold text-blue">COMPANY / PURCHASING ORG.:</span>
            <span class="field-value"><?php echo $getVal('company_purchasing_org'); ?></span>
            <span class="field-label text-bold text-blue">SALES PILLAR:</span>
            <span class="field-value"><?php echo $getVal('sales_pillar'); ?></span>
        </div>
    </div>

    <!-- GENERAL DATA -->
    <div class="section-block">
        <div class="section-title">GENERAL DATA</div>
        <div class="field-row">
            <span class="field-label">COMPANY EMP NO:</span><span class="field-value"><?php echo $getVal('company_employee_no'); ?></span>
            <span class="field-label">SYSTEM EMP CODE:</span><span class="field-value"><?php echo $getVal('system_employee_code'); ?></span>
            <span class="field-label">OEC SELLER ID:</span><span class="field-value"><?php echo $getVal('oec_seller_id'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">TITLE:</span>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('title','MR')?'checked':''; ?>"></span> MR</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isChecked('title','MS')?'checked':''; ?>"></span> MS</div>
            <span class="field-label">FULL NAME:</span><span class="field-value" style="font-weight:bold;"><?php echo $getVal('full_name'); ?></span>
            <span class="field-label">PREFERRED NAME:</span><span class="field-value"><?php echo $getVal('preferred_name'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">BIRTH DATE:</span><span class="field-value"><?php echo $getVal('birth_date'); ?></span>
            <span class="field-label">GENDER:</span><span class="field-value"><?php echo $getVal('gender'); ?></span>
            <span class="field-label">CIVIL STATUS:</span><span class="field-value"><?php echo $getVal('civil_status'); ?></span>
        </div>
        <div class="field-row"><span class="field-label">ADDRESS:</span><span class="field-value"><?php echo $getVal('address'); ?></span></div>
        <div class="field-row"><span class="field-label">PERMANENT ADDRESS:</span><span class="field-value"><?php echo $getVal('permanent_address'); ?></span></div>
        <div class="field-row">
            <span class="field-label">DEPARTMENT:</span><span class="field-value"><?php echo $getVal('department'); ?></span>
            <span class="field-label">POSITION:</span><span class="field-value"><?php echo $getVal('position'); ?></span>
            <span class="field-label">EMPLOYMENT STATUS:</span><span class="field-value"><?php echo $getVal('employment_status'); ?></span>
        </div>
        <div class="field-row">
            <span class="field-label">EMAIL:</span><span class="field-value"><?php echo $getVal('email_address'); ?></span>
            <span class="field-label">COMPANY EMAIL:</span><span class="field-value"><?php echo $getVal('company_email'); ?></span>
            <span class="field-label">MOBILE:</span><span class="field-value"><?php echo $getVal('mobile_number'); ?></span>
        </div>
    </div>

    <!-- REQUIRED DOCUMENTS -->
    <div class="section-block">
        <div class="section-title">REQUIRED DOCUMENTS</div>
        <div class="checkbox-group">
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('doc_company_id')?'checked':''; ?>"></span> PHOTOCOPY OF COMPANY IDENTIFICATION CARD</div>
            <div class="checkbox-item"><span class="checkbox-box <?php echo $isCheckedBool('doc_enrolment_form')?'checked':''; ?>"></span> SIGNED ENROLMENT FORM</div>
        </div>
    </div>

    <!-- REMARKS -->
    <div class="section-block">
        <div class="section-title">REMARKS / REASON</div>
        <div class="remarks-box"><?php echo nl2br($getVal('remarks_reason')); ?></div>
    </div>

    <div class="cert-line">I hereby certify that the information provided in this form is complete, true and correct.</div>

    <!-- SIGNATURES -->
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">REQUEST BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date<br>(HR)</div></div>
            <div class="signature-box"><div class="signature-role">ENDORSED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date<br>(HR MANAGER)</div></div>
        </div>
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">CHECKED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date<br>(ACCOUNTING)</div></div>
            <div class="signature-box"><div class="signature-role">APPROVED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date<br>(MDCU HEAD)</div></div>
        </div>
        <div class="signature-row">
            <div class="signature-box"><div class="signature-role">FACILITATED BY</div><div class="signature-line"></div><div class="signature-caption">Signature / Date<br>(MDCU)</div></div>
            <div class="signature-box"><div>SAP Entry Number: ___________</div><div style="margin-top:3px;">SAP Entry Date: ___________</div></div>
        </div>
    </div>
</div>
<?php endif; ?>
</div>

<script>
    if (window.location.search.includes('print=1')) {
        setTimeout(function(){ window.print(); setTimeout(function(){ window.close(); },500); },500);
    }
</script>
</body>
</html>
        <?php
        return ob_get_clean();
    }
}
?>
<?php
// app/Controllers/RequestController.php - PHP 7.0+ Compatible

class RequestController {
    private $model;
    
    public function __construct() {
        $this->model = new RequestModel();
    }
    
    public function index() {
        $payload = AuthMiddleware::handle();
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $filters = array(
            'status' => isset($_GET['status']) ? $_GET['status'] : '',
            'type'   => isset($_GET['type']) ? $_GET['type'] : '',
            'search' => isset($_GET['search']) ? $_GET['search'] : '',
        );
        
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        $userId = $isManager ? null : $payload['user_id'];
        
        // Check for user_only parameter
        if (isset($_GET['user_only']) && $_GET['user_only'] == 1) {
            $userId = $payload['user_id'];
        }
        
        $requests = $this->model->getAll($page, $filters, $userId);
        $total = $this->model->countAll($filters, $userId);
        
        $this->json([
            'success' => true,
            'data' => $requests,
            'pagination' => [
                'total' => $total,
                'per_page' => ITEMS_PER_PAGE,
                'current_page' => $page,
                'last_page' => ceil($total / ITEMS_PER_PAGE)
            ]
        ]);
    }
    
    public function export($id) {
        $payload = AuthMiddleware::handle();
        $format = isset($_GET['format']) ? $_GET['format'] : 'csv';
        
        $request = $this->model->findById($id);
        if (!$request) {
            http_response_code(404);
            echo "Request not found.";
            exit;
        }
        
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        if ($request['requester_id'] != $payload['user_id'] && !$isManager) {
            http_response_code(403);
            echo "Access denied.";
            exit;
        }
        
        $this->exportSingleRequestAsFormat($request, $format);
    }
    
    public function show($id) {
        $payload = AuthMiddleware::handle();
        $request = $this->model->findById($id);
        
        if (!$request) {
            $this->json(['success' => false, 'message' => 'Request not found.'], 404);
        }
        
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        if ($request['requester_id'] !== $payload['user_id'] && !$isManager) {
            $this->json(['success' => false, 'message' => 'Access denied.'], 403);
        }
        
        $this->json(['success' => true, 'data' => $request]);
    }
    
    public function store() {
        $payload = AuthMiddleware::handle();
        $data = $this->getJsonInput();

        if (empty($data['subject'])) {
            $this->json(['success' => false, 'message' => 'Subject is required.'], 400);
        }

        // Derive category / request_type_id if not sent
        if (empty($data['category'])) {
            $typeId = isset($data['request_type_id']) ? (int)$data['request_type_id'] : 3;
            $map = array(1 => 'SUPPLIER', 2 => 'CUSTOMER', 3 => 'EMPLOYEE');
            $data['category'] = isset($map[$typeId]) ? $map[$typeId] : 'EMPLOYEE';
        }

        try {
            $id = $this->model->create($data, $payload['user_id']);
            $request = $this->model->findById($id);
            $this->json(['success' => true, 'message' => 'Request created.', 'data' => $request], 201);
        } catch (Exception $e) {
            error_log('store() error: ' . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to create request: ' . $e->getMessage()], 500);
        }
    }
    
    public function submit($id) {
        $payload = AuthMiddleware::handle();
        try {
            $result = $this->model->submit($id, $payload['user_id']);
            if (!$result) {
                $this->json(['success' => false, 'message' => 'Unable to submit. Request may not be in draft status or you are not the requester.'], 400);
            }
            $this->json(['success' => true, 'message' => 'Request submitted for review.']);
        } catch (Exception $e) {
            error_log('submit() error: ' . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to submit request: ' . $e->getMessage()], 500);
        }
    }
    
public function updateStatus($id) {
    $payload = AuthMiddleware::authorize(array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
    $data = $this->getJsonInput();
    $status = isset($data['status']) ? $data['status'] : '';

    $request = $this->model->findById($id);
    if (!$request) {
        $this->json(['success' => false, 'message' => 'Request not found.'], 404);
    }

    $fullyLockedStatuses = array('posted', 'rejected', 'cancelled');
    if (in_array($request['status'], $fullyLockedStatuses)) {
        $this->json(['success' => false, 'message' => 'This request is fully locked and its status cannot be changed.'], 400);
    }

    $allowed = array('under_review', 'for_signing', 'signed', 'rejected', 'cancelled');
    if (!in_array($status, $allowed)) {
        $this->json(['success' => false, 'message' => 'Invalid status.'], 400);
    }

    $notes = isset($data['notes']) ? $data['notes'] : null;

    try {
        $result = $this->model->updateStatus($id, $status, $payload['user_id'], $notes);
        if (!$result) {
            $this->json(['success' => false, 'message' => 'Failed to update status.'], 500);
        }
        $this->json(['success' => true, 'message' => 'Request status updated.']);
    } catch (Exception $e) {
        error_log('updateStatus() error: ' . $e->getMessage());
        $this->json(['success' => false, 'message' => 'Failed to update status: ' . $e->getMessage()], 500);
    }
}

    public function sign($id) {
        $payload = AuthMiddleware::handle();
        $data = $this->getJsonInput();
        $role = isset($data['role']) ? $data['role'] : '';
        $remarks = isset($data['remarks']) ? $data['remarks'] : null;
        
        $allowedRoles = array('requested_by', 'prepared_by', 'checked_by', 'noted_by', 'approved_by', 'validated_by', 'executed_by', 'endorsed_approved_by', 'screened_by', 'reviewed_by', 'reviewed_executed_by', 'endorsed_by', 'facilitated_by');
        if (!in_array($role, $allowedRoles)) {
            $this->json(['success' => false, 'message' => 'Invalid signatory role.'], 400);
        }
        
        $result = $this->model->sign($id, $payload['user_id'], $role, $remarks);
        
        if (!$result) {
            $this->json(['success' => false, 'message' => 'Unable to sign. You may not be authorized or the request is already signed.'], 400);
        }
        
        $this->json(['success' => true, 'message' => 'Request signed successfully.']);
    }
    
    public function getSignatories($id) {
        $payload = AuthMiddleware::handle();
        $request = $this->model->findById($id);
        
        if (!$request) {
            $this->json(['success' => false, 'message' => 'Request not found.'], 404);
        }
        
        $signatories = $this->model->getSignatories($id);
        $this->json(['success' => true, 'data' => $signatories]);
    }
    
    public function post($id) {
        $payload = AuthMiddleware::authorize(array('mpc_personnel', 'it_manager', 'admin'));
        $data = $this->getJsonInput();
        $sapRef = isset($data['sap_reference']) ? $data['sap_reference'] : null;

        try {
            $result = $this->model->post($id, $payload['user_id'], $sapRef);
            if (!$result) {
                $this->json(['success' => false, 'message' => 'Failed to post request.'], 500);
            }
            $this->json(['success' => true, 'message' => 'Request posted successfully.']);
        } catch (Exception $e) {
            error_log('post() error: ' . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Failed to post request: ' . $e->getMessage()], 500);
        }
    }
    
    public function dashboard() {
        $payload = AuthMiddleware::handle();
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        $userId = $isManager ? null : $payload['user_id'];
        
        $stats = $this->model->getDashboardStats($userId);
        $recentRequests = $this->model->getAll(1, array(), $userId);
        
        $this->json([
            'success' => true, 
            'stats' => $stats, 
            'recent_requests' => array_slice($recentRequests, 0, 5)
        ]);
    }
    
    public function uploadDocument($id) {
        $payload = AuthMiddleware::handle();

        if (empty($_FILES['document'])) {
            $this->json(['success' => false, 'message' => 'No file uploaded.'], 400);
        }

        $file = $_FILES['document'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->json(['success' => false, 'message' => 'Upload error code: ' . $file['error']], 400);
        }
        if ($file['size'] > MAX_FILE_SIZE) {
            $this->json(['success' => false, 'message' => 'File too large. Max 10MB.'], 400);
        }

        $allowedTypes = array('application/pdf', 'image/jpeg', 'image/png', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        if (function_exists('finfo_open')) {
            $finfo    = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            if (!in_array($mimeType, $allowedTypes)) {
                $this->json(['success' => false, 'message' => 'Invalid file type. PDF, JPG, PNG, DOC, XLS only.'], 400);
            }
        }

        $documentType  = isset($_POST['document_type'])  ? $_POST['document_type']  : 'signed_form';
        $signatoryRole = isset($_POST['signatory_role'])  ? $_POST['signatory_role'] : null;
        $signatureType = isset($_POST['signature_type'])  ? $_POST['signature_type'] : 'single';

        try {
            $result = $this->model->uploadDocument($id, $payload['user_id'], $file, $documentType, $signatoryRole, $signatureType);
            if (!$result) {
                $this->json(['success' => false, 'message' => 'Failed to save file.'], 500);
            }
            $this->json(['success' => true, 'message' => 'Document uploaded successfully.', 'data' => $result]);
        } catch (Exception $e) {
            error_log('uploadDocument() error: ' . $e->getMessage());
            $this->json(['success' => false, 'message' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }
    
    public function printRequest($id) {
        $payload = AuthMiddleware::handle();
        $request = $this->model->getRequestDataForPrint($id);
        
        if (!$request) {
            http_response_code(404);
            echo "Request not found.";
            exit;
        }
        
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        if ($request['requester_id'] !== $payload['user_id'] && !$isManager) {
            http_response_code(403);
            echo "Access denied.";
            exit;
        }
        
        $this->renderPrintView($request);
    }
    
    public function exportExcel($id) {
        $payload = AuthMiddleware::handle();
        $request = $this->model->getRequestDataForPrint($id);
        
        if (!$request) {
            http_response_code(404);
            echo "Request not found.";
            exit;
        }
        
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        if ($request['requester_id'] !== $payload['user_id'] && !$isManager) {
            http_response_code(403);
            echo "Access denied.";
            exit;
        }
        
        $this->exportToExcel($request);
    }
    
    public function bulkExport() {
        $payload = AuthMiddleware::handle();
        $data = $this->getJsonInput();
        
        $requestIds = isset($data['request_ids']) ? $data['request_ids'] : array();
        $format = isset($data['format']) ? $data['format'] : 'csv';
        
        if (empty($requestIds)) {
            $this->json(['success' => false, 'message' => 'No requests selected.'], 400);
        }
        
        $requests = array();
        foreach ($requestIds as $id) {
            $request = $this->model->findById($id);
            if ($request) {
                $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
                if ($request['requester_id'] == $payload['user_id'] || $isManager) {
                    $requests[] = $request;
                }
            }
        }
        
        if (empty($requests)) {
            $this->json(['success' => false, 'message' => 'No valid requests found.'], 404);
        }
        
        $this->exportRequestsToFormat($requests, $format);
    }
    
    public function getRequestTypes() {
        AuthMiddleware::handle();
        $types = $this->model->getRequestTypes();
        $this->json(['success' => true, 'data' => $types]);
    }
    
    public function uploadSignatoryDocument($id) {
        $payload = AuthMiddleware::handle();
        $data = $this->getJsonInput();
        $role = isset($data['signatory_role']) ? $data['signatory_role'] : null;
        if (!$role) $this->json(['success'=>false,'message'=>'Missing signatory role'],400);

        if (empty($_FILES['document'])) $this->json(['success'=>false,'message'=>'No file uploaded'],400);
        $file = $_FILES['document'];
        if ($file['error'] !== UPLOAD_ERR_OK) $this->json(['success'=>false,'message'=>'Upload failed'],400);
        if ($file['size'] > MAX_FILE_SIZE) $this->json(['success'=>false,'message'=>'File too large, max 10MB'],400);

        $allowed = ['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $allowed)) $this->json(['success'=>false,'message'=>'Invalid file type'],400);

        $result = $this->model->uploadDocument($id, $payload['user_id'], $file, 'signed_form', $role);
        if (!$result) $this->json(['success'=>false,'message'=>'Failed to save document'],500);
        $this->json(['success'=>true,'message'=>"Document uploaded for $role", 'data'=>$result]);
    }

    public function printPDF($id) {
        $token = null;
        
        $headers = function_exists('getallheaders') ? getallheaders() : $this->getAllHeaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
        
        if (!$token && isset($_GET['token'])) {
            $token = $_GET['token'];
        }
        
        if ($token) {
            $payload = $this->validateToken($token);
            if (!$payload) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Invalid token']);
                exit;
            }
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'No token provided']);
            exit;
        }
        
        $request = $this->model->findById($id);
        if (!$request) { 
            http_response_code(404); 
            echo json_encode(['success' => false, 'message' => 'Request not found']);
            exit; 
        }
        
        $isManager = in_array($payload['role'], ['mpc_personnel','it_manager','senior_manager','vp_operations','admin']);
        if ($request['requester_id'] != $payload['user_id'] && !$isManager) { 
            http_response_code(403); 
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            exit; 
        }
        
        $this->model->markAsPrinted($id, $payload['user_id']);
        
        // Export as PDF using the same detailed format
        $this->exportSingleRequestAsFormat($request, 'pdf');
    }
    
    // =============================================
    // NEW: Single request export with full details
    // =============================================
    
    private function exportSingleRequestAsFormat($request, $format) {
        switch ($format) {
            case 'csv':
                $this->exportSingleDetailedCSV($request);
                break;
            case 'excel':
                $this->exportSingleDetailedExcel($request);
                break;
            case 'json':
                $this->exportSingleDetailedJSON($request);
                break;
            case 'pdf':
                $this->exportSingleDetailedPDF($request);
                break;
            default:
                $this->exportSingleDetailedCSV($request);
        }
    }
    
    private function exportSingleDetailedCSV($request) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="request_' . $request['request_no'] . '.csv"');
        
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM for Excel
        
        // Section 1: Request Details
        fputcsv($output, ['=== REQUEST DETAILS ===']);
        fputcsv($output, ['Request No', $request['request_no']]);
        fputcsv($output, ['Subject', $request['subject']]);
        fputcsv($output, ['Type', $request['request_type_name']]);
        fputcsv($output, ['Status', $request['status']]);
        fputcsv($output, ['Priority', $request['priority']]);
        fputcsv($output, ['Requester', $request['requester_name']]);
        fputcsv($output, ['Department', $request['requester_department']]);
        fputcsv($output, ['Email', $request['email'] ?? '']);
        fputcsv($output, ['Created', $request['created_at']]);
        fputcsv($output, ['Submitted', $request['submitted_at'] ?? '']);
        fputcsv($output, ['SAP Reference', $request['sap_reference'] ?? '']);
        fputcsv($output, []);
        
        // Section 2: Form Data
        if (!empty($request['form_data'])) {
            fputcsv($output, ['=== FORM DATA ===']);
            fputcsv($output, ['Field', 'Value']);
            foreach ($request['form_data'] as $key => $value) {
                $exclude = ['id', 'request_id', 'created_at', 'updated_at'];
                if (!in_array($key, $exclude) && $value !== null && $value !== '') {
                    $label = ucwords(str_replace('_', ' ', $key));
                    $display = ($value === 1) ? 'Yes' : (($value === 0) ? 'No' : $value);
                    fputcsv($output, [$label, $display]);
                }
            }
            fputcsv($output, []);
        }
        
        // Section 3: Signatories
        if (!empty($request['approvals'])) {
            fputcsv($output, ['=== SIGNATORIES ===']);
            fputcsv($output, ['Role', 'Status', 'Signed By', 'Signed At', 'Remarks']);
            foreach ($request['approvals'] as $a) {
                fputcsv($output, [
                    $a['signatory_label'],
                    $a['status'],
                    $a['signatory_name'] ?? '',
                    $a['signed_at'] ?? '',
                    $a['remarks'] ?? ''
                ]);
            }
            fputcsv($output, []);
        }
        
        // Section 4: Documents
        if (!empty($request['documents'])) {
            fputcsv($output, ['=== ATTACHED DOCUMENTS ===']);
            fputcsv($output, ['File Name', 'Uploaded By', 'Uploaded At']);
            foreach ($request['documents'] as $doc) {
                fputcsv($output, [
                    $doc['original_name'],
                    $doc['uploaded_by_name'] ?? '',
                    $doc['created_at']
                ]);
            }
            fputcsv($output, []);
        }
        
        // Section 5: Activity Log
        if (!empty($request['audit_logs'])) {
            fputcsv($output, ['=== ACTIVITY LOG ===']);
            fputcsv($output, ['Action', 'User', 'Details', 'Date']);
            foreach ($request['audit_logs'] as $log) {
                fputcsv($output, [
                    $log['action'],
                    $log['user_name'] ?? '',
                    $log['details'] ?? '',
                    $log['created_at']
                ]);
            }
        }
        
        fclose($output);
        exit;
    }
    
    private function exportSingleDetailedExcel($request) {
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="request_' . $request['request_no'] . '.xls"');
        
        echo '<html><head><meta charset="UTF-8"><title>Request Export</title></head><body>';
        
        // Style
        echo '<style>
            th { background: #4472C4; color: white; padding: 8px; }
            td { padding: 6px; border: 1px solid #ddd; }
            .section-title { background: #2E75B6; color: white; padding: 8px; font-size: 14px; font-weight: bold; }
        </style>';
        
        // Request Details
        echo '<h2>REQUEST DETAILS</h2>';
        echo '<table border="1" cellpadding="5" cellspacing="0">';
        echo '<tr><th width="30%">Field</th><th>Value</th></tr>';
        echo '<tr><td>Request No</td><td>' . htmlspecialchars($request['request_no']) . '</td></tr>';
        echo '<tr><td>Subject</td><td>' . htmlspecialchars($request['subject']) . '</td></tr>';
        echo '<tr><td>Type</td><td>' . htmlspecialchars($request['request_type_name']) . '</td></tr>';
        echo '<tr><td>Status</td><td>' . htmlspecialchars($request['status']) . '</td></tr>';
        echo '<tr><td>Priority</td><td>' . htmlspecialchars($request['priority']) . '</td></tr>';
        echo '<tr><td>Requester</td><td>' . htmlspecialchars($request['requester_name']) . '</td></tr>';
        echo '<tr><td>Department</td><td>' . htmlspecialchars($request['requester_department']) . '</td></tr>';
        echo '<tr><td>Email</td><td>' . htmlspecialchars($request['email'] ?? '') . '</td></tr>';
        echo '<tr><td>Created</td><td>' . htmlspecialchars($request['created_at']) . '</td></tr>';
        echo '<tr><td>Submitted</td><td>' . htmlspecialchars($request['submitted_at'] ?? '') . '</td></tr>';
        if (!empty($request['sap_reference'])) {
            echo '<tr><td>SAP Reference</td><td>' . htmlspecialchars($request['sap_reference']) . '</td></tr>';
        }
        echo '</table><br>';
        
        // Form Data
        if (!empty($request['form_data'])) {
            echo '<h2>FORM DATA</h2>';
            echo '<table border="1" cellpadding="5" cellspacing="0">';
            echo '<tr><th width="35%">Field</th><th>Value</th></tr>';
            foreach ($request['form_data'] as $key => $value) {
                $exclude = ['id', 'request_id', 'created_at', 'updated_at'];
                if (!in_array($key, $exclude) && $value !== null && $value !== '') {
                    $label = ucwords(str_replace('_', ' ', $key));
                    $display = ($value === 1) ? 'Yes' : (($value === 0) ? 'No' : htmlspecialchars($value));
                    echo '<tr><td>' . $label . '</td><td>' . $display . '</td></tr>';
                }
            }
            echo '</table><br>';
        }
        
        // Signatories
        if (!empty($request['approvals'])) {
            echo '<h2>SIGNATORIES</h2>';
            echo '<table border="1" cellpadding="5" cellspacing="0">';
            echo '<tr><th>Role</th><th>Status</th><th>Signed By</th><th>Signed At</th><th>Remarks</th></tr>';
            foreach ($request['approvals'] as $a) {
                echo '<tr>';
                echo '<td>' . htmlspecialchars($a['signatory_label']) . '</td>';
                echo '<td>' . htmlspecialchars($a['status']) . '</td>';
                echo '<td>' . htmlspecialchars($a['signatory_name'] ?? '') . '</td>';
                echo '<td>' . htmlspecialchars($a['signed_at'] ?? '') . '</td>';
                echo '<td>' . htmlspecialchars($a['remarks'] ?? '') . '</td>';
                echo '</tr>';
            }
            echo '</table><br>';
        }
        
        // Documents
        if (!empty($request['documents'])) {
            echo '<h2>ATTACHED DOCUMENTS</h2>';
            echo '<table border="1" cellpadding="5" cellspacing="0">';
            echo '<tr><th>File Name</th><th>Uploaded By</th><th>Uploaded At</th></tr>';
            foreach ($request['documents'] as $doc) {
                echo '<tr>';
                echo '<td>' . htmlspecialchars($doc['original_name']) . '</td>';
                echo '<td>' . htmlspecialchars($doc['uploaded_by_name'] ?? '') . '</td>';
                echo '<td>' . htmlspecialchars($doc['created_at']) . '</td>';
                echo '</tr>';
            }
            echo '</table><br>';
        }
        
        // Activity Log
        if (!empty($request['audit_logs'])) {
            echo '<h2>ACTIVITY LOG</h2>';
            echo '<table border="1" cellpadding="5" cellspacing="0">';
            echo '<tr><th>Action</th><th>User</th><th>Details</th><th>Date</th></tr>';
            foreach ($request['audit_logs'] as $log) {
                echo '<tr>';
                echo '<td>' . htmlspecialchars($log['action']) . '</td>';
                echo '<td>' . htmlspecialchars($log['user_name'] ?? '') . '</td>';
                echo '<td>' . htmlspecialchars($log['details'] ?? '') . '</td>';
                echo '<td>' . htmlspecialchars($log['created_at']) . '</td>';
                echo '</tr>';
            }
            echo '</table>';
        }
        
        echo '<p><small>Generated on ' . date('Y-m-d H:i:s') . ' | MPC Electronic Request System</small></p>';
        echo '</body></html>';
        exit;
    }
    
    private function exportSingleDetailedJSON($request) {
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="request_' . $request['request_no'] . '.json"');
        
        $export = [
            'export_info' => [
                'generated_at' => date('Y-m-d H:i:s'),
                'system' => 'MPC Electronic Request System',
                'version' => '1.0'
            ],
            'request' => [
                'request_no' => $request['request_no'],
                'subject' => $request['subject'],
                'type' => $request['request_type_name'],
                'status' => $request['status'],
                'priority' => $request['priority'],
                'requester' => $request['requester_name'],
                'department' => $request['requester_department'],
                'email' => $request['email'] ?? '',
                'created_at' => $request['created_at'],
                'submitted_at' => $request['submitted_at'],
                'sap_reference' => $request['sap_reference'] ?? ''
            ],
            'form_data' => $request['form_data'],
            'signatories' => $request['approvals'],
            'documents' => $request['documents'],
            'activity_log' => $request['audit_logs']
        ];
        
        echo json_encode($export, JSON_PRETTY_PRINT);
        exit;
    }
    
    private function exportSingleDetailedPDF($request) {
        $html = $this->generatePDFHTML($request);
        $this->outputPrintFriendlyPDF($html, $request['request_no']);
    }
    
    private function generatePDFHTML($request) {
        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title><?php echo htmlspecialchars($request['request_no']); ?></title>
            <style>
                @page { size: A4; margin: 1.5cm; }
                body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #1a228f; padding-bottom: 10px; margin-bottom: 15px; }
                .header h1 { font-size: 18px; color: #1a228f; margin: 0; }
                .header h2 { font-size: 12px; color: #666; font-weight: normal; margin: 5px 0; }
                .section { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
                .section-title { background: #1a228f; color: white; padding: 6px 10px; font-size: 11px; font-weight: bold; }
                .section-content { padding: 10px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th, td { border: 1px solid #ddd; padding: 5px; text-align: left; vertical-align: top; }
                th { background: #f5f5f5; font-weight: bold; }
                .info-row { margin-bottom: 5px; }
                .info-label { font-weight: bold; display: inline-block; width: 30%; }
                .info-value { display: inline-block; width: 68%; }
                .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; }
                .badge-draft { background: #f1f5f9; color: #475569; }
                .badge-submitted { background: #dbeafe; color: #1e40af; }
                .badge-under_review { background: #fef3c7; color: #92400e; }
                .badge-for_signing { background: #ede9fe; color: #5b21b6; }
                .badge-signed { background: #d1fae5; color: #065f46; }
                .badge-posted { background: #bbf7d0; color: #14532d; }
                .badge-rejected { background: #fee2e2; color: #991b1b; }
                .footer { text-align: center; font-size: 8px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Co Ban Kiat Hardware Inc.</h1>
                <h2>MPC Electronic Request System</h2>
                <p><?php echo htmlspecialchars($request['request_no']); ?> | 
                   <span class="badge badge-<?php echo $request['status']; ?>"><?php echo ucfirst($request['status']); ?></span>
                </p>
            </div>
            
            <!-- Request Details -->
            <div class="section">
                <div class="section-title">REQUEST DETAILS</div>
                <div class="section-content">
                    <div class="info-row"><span class="info-label">Subject:</span><span class="info-value"><?php echo htmlspecialchars($request['subject']); ?></span></div>
                    <div class="info-row"><span class="info-label">Type:</span><span class="info-value"><?php echo htmlspecialchars($request['request_type_name']); ?></span></div>
                    <div class="info-row"><span class="info-label">Priority:</span><span class="info-value"><?php echo ucfirst($request['priority']); ?></span></div>
                    <div class="info-row"><span class="info-label">Requester:</span><span class="info-value"><?php echo htmlspecialchars($request['requester_name']); ?></span></div>
                    <div class="info-row"><span class="info-label">Department:</span><span class="info-value"><?php echo htmlspecialchars($request['requester_department']); ?></span></div>
                    <div class="info-row"><span class="info-label">Email:</span><span class="info-value"><?php echo htmlspecialchars($request['email']); ?></span></div>
                    <div class="info-row"><span class="info-label">Created:</span><span class="info-value"><?php echo htmlspecialchars($request['created_at']); ?></span></div>
                    <?php if ($request['submitted_at']): ?>
                    <div class="info-row"><span class="info-label">Submitted:</span><span class="info-value"><?php echo htmlspecialchars($request['submitted_at']); ?></span></div>
                    <?php endif; ?>
                    <?php if ($request['sap_reference']): ?>
                    <div class="info-row"><span class="info-label">SAP Reference:</span><span class="info-value"><?php echo htmlspecialchars($request['sap_reference']); ?></span></div>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Form Data -->
            <?php if (!empty($request['form_data'])): ?>
            <div class="section">
                <div class="section-title">FORM DATA</div>
                <div class="section-content">
                    <table>
                        <?php foreach ($request['form_data'] as $key => $value): ?>
                        <?php 
                        $exclude = ['id', 'request_id', 'created_at', 'updated_at'];
                        if (!in_array($key, $exclude) && $value !== null && $value !== ''):
                            $label = ucwords(str_replace('_', ' ', $key));
                            $display = ($value === 1) ? 'Yes' : (($value === 0) ? 'No' : htmlspecialchars($value));
                        ?>
                        <tr>
                            <th width="35%"><?php echo $label; ?></th>
                            <td><?php echo $display; ?></td>
                        </tr>
                        <?php endif; endforeach; ?>
                    </table>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- Signatories -->
            <?php if (!empty($request['approvals'])): ?>
            <div class="section">
                <div class="section-title">SIGNATORIES</div>
                <div class="section-content">
                    <table>
                        <tr>
                            <th>Role</th><th>Status</th><th>Signed By</th><th>Signed At</th>
                        </tr>
                        <?php foreach ($request['approvals'] as $a): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($a['signatory_label']); ?></td>
                            <td><?php echo ucfirst($a['status']); ?></td>
                            <td><?php echo htmlspecialchars($a['signatory_name'] ?? '—'); ?></td>
                            <td><?php echo htmlspecialchars($a['signed_at'] ?? '—'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- Attached Documents -->
            <?php if (!empty($request['documents'])): ?>
            <div class="section">
                <div class="section-title">ATTACHED DOCUMENTS</div>
                <div class="section-content">
                    <table>
                        <tr><th>File Name</th><th>Uploaded By</th><th>Date</th></tr>
                        <?php foreach ($request['documents'] as $doc): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($doc['original_name']); ?></td>
                            <td><?php echo htmlspecialchars($doc['uploaded_by_name'] ?? '—'); ?></td>
                            <td><?php echo htmlspecialchars($doc['created_at']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- Activity Log -->
            <?php if (!empty($request['audit_logs'])): ?>
            <div class="section">
                <div class="section-title">ACTIVITY LOG</div>
                <div class="section-content">
                    <table>
                        <tr><th>Action</th><th>User</th><th>Details</th><th>Date</th></tr>
                        <?php foreach ($request['audit_logs'] as $log): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($log['action']); ?></td>
                            <td><?php echo htmlspecialchars($log['user_name'] ?? '—'); ?></td>
                            <td><?php echo htmlspecialchars($log['details'] ?? ''); ?></td>
                            <td><?php echo htmlspecialchars($log['created_at']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            </div>
            <?php endif; ?>
            
            <div class="footer">
                Generated on <?php echo date('Y-m-d H:i:s'); ?> | MPC Electronic Request System
            </div>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }
    
    private function outputPrintFriendlyPDF($html, $requestNo) {
        $fullHtml = '<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Request ' . $requestNo . '</title>
            <style>
                @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
                .no-print { background: #1a228f; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 20px; font-size: 14px; }
                .no-print:hover { background: #131660; }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align:center">
                <button onclick="window.print();setTimeout(function(){window.close();},1000);" style="background:#1a228f;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer">
                    🖨️ Print / Save as PDF
                </button>
            </div>
            ' . $html . '
            <script>
                if (window.location.search.indexOf("auto=true") > -1) {
                    setTimeout(function() { window.print(); setTimeout(function(){ window.close(); }, 1000); }, 500);
                }
            </script>
        </body>
        </html>';
        
        header('Content-Type: text/html');
        echo $fullHtml;
        exit;
    }
    
    // private function exportRequestsToFormat($requests, $format) {
    //     // For bulk export, use simple format
    //     switch ($format) {
    //         case 'csv':
    //             $this->exportRequestAsCSV($requests);
    //             break;
    //         case 'excel':
    //             $this->exportRequestAsExcel($requests);
    //             break;
    //         case 'json':
    //             $this->exportRequestAsJSON($requests);
    //             break;
    //         default:
    //             $this->exportRequestAsCSV($requests);
    //     }
    // }

    private function exportRequestsToFormat($requests, $format) {
    // Only CSV and Excel for bulk export
    switch ($format) {
        case 'csv':
            $this->exportRequestAsCSV($requests);
            break;
        case 'excel':
            $this->exportRequestAsExcel($requests);
            break;
        default:
            $this->exportRequestAsCSV($requests);
    }
}
    
    private function exportRequestAsCSV($requests) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="requests_export_' . date('Y-m-d_His') . '.csv"');
        
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        fputcsv($output, array('Request No', 'Subject', 'Type', 'Status', 'Priority', 'Requester', 'Created Date', 'Submitted Date', 'SAP Reference'));
        
        foreach ($requests as $request) {
            fputcsv($output, array(
                $request['request_no'],
                $request['subject'],
                $request['request_type_name'],
                $request['status'],
                $request['priority'],
                $request['requester_name'],
                $request['created_at'],
                $request['submitted_at'] ?? '',
                $request['sap_reference'] ?? ''
            ));
        }
        
        fclose($output);
        exit;
    }
    
    private function exportRequestAsExcel($requests) {
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="requests_export_' . date('Y-m-d_His') . '.xls"');
        
        echo '<html><head><meta charset="UTF-8"></head><body>';
        echo '<table border="1">';
        echo '<tr><th>Request No</th><th>Subject</th><th>Type</th><th>Status</th><th>Priority</th><th>Requester</th><th>Created Date</th><th>Submitted Date</th><th>SAP Reference</th></tr>';
        
        foreach ($requests as $request) {
            echo '<tr>';
            echo '<td>' . htmlspecialchars($request['request_no']) . '</td>';
            echo '<td>' . htmlspecialchars($request['subject']) . '</td>';
            echo '<td>' . htmlspecialchars($request['request_type_name']) . '</td>';
            echo '<td>' . htmlspecialchars($request['status']) . '</td>';
            echo '<td>' . htmlspecialchars($request['priority']) . '</td>';
            echo '<td>' . htmlspecialchars($request['requester_name']) . '</td>';
            echo '<td>' . htmlspecialchars($request['created_at']) . '</td>';
            echo '<td>' . htmlspecialchars($request['submitted_at'] ?? '') . '</td>';
            echo '</td>' . htmlspecialchars($request['sap_reference'] ?? '') . '</td>';
            echo '</tr>';
        }
        
        echo '</table>';
        echo '</body></html>';
        exit;
    }
    
    private function getAllHeaders() {
        $headers = array();
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
    
    public function viewDocument($id) {
        try {
            $payload = AuthMiddleware::handle();
            $document = $this->model->getDocumentFile($id);
            
            if (!$document) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Document not found']);
                exit;
            }
            
            $request = $this->model->findById($document['request_id']);
            $isManager = in_array($payload['role'], ['mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin']);
            
            if ($request['requester_id'] != $payload['user_id'] && !$isManager) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Access denied']);
                exit;
            }
            
            $filePath = UPLOAD_PATH . $document['filename'];
            
            if (!file_exists($filePath)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'File not found']);
                exit;
            }
            
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $filePath);
            finfo_close($finfo);
            
            header('Content-Type: ' . $mimeType);
            header('Content-Disposition: inline; filename="' . $document['original_name'] . '"');
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
            
            readfile($filePath);
            exit;
        } catch (Exception $e) {
            error_log("View document error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error']);
            exit;
        }
    }
    
    private function validateToken($token) {
        try {
            return JWT::decode($token);
        } catch (Exception $e) {
            error_log("Token validation error: " . $e->getMessage());
            return null;
        }
    }
    
    private function getJsonInput() { 
        return json_decode(file_get_contents('php://input'), true) ?: array(); 
    }
    
    private function json($data, $code=200) { 
        http_response_code($code); 
        header('Content-Type: application/json'); 
        echo json_encode($data); 
        exit; 
    }
    
public function update($id) {
    $payload = AuthMiddleware::handle();
    $data = $this->getJsonInput();

    $request = $this->model->findById($id);
    if (!$request) {
        $this->json(['success' => false, 'message' => 'Request not found.'], 404);
    }

    $isManager = in_array($payload['role'], ['mpc_personnel','it_manager','senior_manager','vp_operations','admin']);
    
    // Check access
    if ($request['requester_id'] != $payload['user_id'] && !$isManager) {
        $this->json(['success' => false, 'message' => 'Access denied.'], 403);
    }
    
    // LOCKED: Normal users cannot edit after submitted
    // Only admins/managers can edit, and only if not fully locked
    $fullyLockedStatuses = ['posted', 'rejected', 'cancelled'];
    if (in_array($request['status'], $fullyLockedStatuses)) {
        $this->json(['success' => false, 'message' => 'This request is locked and cannot be edited anymore.'], 400);
    }
    
    // For non-manager requesters: only draft and submitted can be edited
    if (!$isManager && !in_array($request['status'], ['draft', 'submitted'])) {
        $this->json(['success' => false, 'message' => 'Request cannot be edited once submitted for review.'], 400);
    }

    try {
        $result = $this->model->updateRequest($id, $data, $payload['user_id']);
        if (!$result) {
            $this->json(['success' => false, 'message' => 'Failed to update request.'], 500);
        }
        $this->json(['success' => true, 'message' => 'Request updated successfully.']);
    } catch (Exception $e) {
        error_log('update() error: ' . $e->getMessage());
        $this->json(['success' => false, 'message' => 'Failed to update request: ' . $e->getMessage()], 500);
    }
}

    public function printOriginalForm($id) {
        // Token validation
        $token = null;
        $headers = function_exists('getallheaders') ? getallheaders() : $this->getAllHeaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : (isset($headers['authorization']) ? $headers['authorization'] : '');
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }
        
        if (!$token && isset($_GET['token'])) {
            $token = $_GET['token'];
        }
        
        if ($token) {
            try {
                $payload = JWT::decode($token);
                if (!$payload) {
                    http_response_code(401);
                    echo "Invalid token";
                    exit;
                }
            } catch (Exception $e) {
                http_response_code(401);
                echo "Token validation failed: " . $e->getMessage();
                exit;
            }
        } else {
            http_response_code(401);
            echo "No token provided";
            exit;
        }
        
        // Fetch request using findById (includes all form_data)
        $request = $this->model->findById($id);
        
        if (!$request) { 
            http_response_code(404); 
            echo "Request not found";
            exit; 
        }
        
        // Check authorization
        $isManager = in_array($payload['role'], ['mpc_personnel','it_manager','senior_manager','vp_operations','admin']);
        if ($request['requester_id'] != $payload['user_id'] && !$isManager) { 
            http_response_code(403); 
            echo "Access denied";
            exit; 
        }
        
        // Get selected documents for the request
        $request['docs_selected'] = $this->model->getSelectedDocuments($id);
        
        // Determine form type
        $requestTypeId = $request['request_type_id'] ?? 0;
        if ($requestTypeId == 1) {
            $type = 'SUPPLIER';
        } elseif ($requestTypeId == 2) {
            $type = 'CUSTOMER';
        } else {
            $type = 'EMPLOYEE';
        }
        
        // Debug logging to verify data
        error_log("=== PRINT ORIGINAL FORM ===");
        error_log("Request ID: $id, Type: $type");
        error_log("Form Data: " . print_r($request['form_data'] ?? [], true));
        
        // Include the PrintFormGenerator helper
        require_once __DIR__ . '/../Helpers/PrintFormGenerator.php';
        
        // Generate and output the form
        $html = PrintFormGenerator::generate($request, $type);
        
        header('Content-Type: text/html; charset=UTF-8');
        echo $html;
        exit;
    }

    public function getUpdates() {
        $payload = AuthMiddleware::handle();
        $since = isset($_GET['since']) ? $_GET['since'] : null;
        
        $isManager = in_array($payload['role'], array('mpc_personnel', 'it_manager', 'senior_manager', 'vp_operations', 'admin'));
        $userId = $isManager ? null : $payload['user_id'];
        
        $updates = $this->model->getUpdates($since, $userId);
        
        $this->json([
            'success' => true,
            'updates' => $updates,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}


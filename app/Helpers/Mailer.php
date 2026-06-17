<?php
// app/Helpers/Mailer.php - Native PHP Mail Version (No Composer required)

class Mailer {

    private static function config() {
        return [
            'from_name'    => defined('MAIL_FROM_NAME')    ? MAIL_FROM_NAME    : 'MDCU-ERS System',
            'from_address' => defined('MAIL_FROM_ADDRESS') ? MAIL_FROM_ADDRESS : 'noreply@cobankiat.com.ph',
            'app_name'     => defined('APP_NAME')          ? APP_NAME          : 'MPC Electronic Request System',
            'app_url'      => defined('APP_URL')           ? APP_URL           : 'http://localhost/mpc-ers/public',
        ];
    }

    // ─── Low-level send using native PHP mail() ─────────────────────
    public static function send($toEmail, $toName, $subject, $htmlBody) {
        // Check if mail is enabled
        if (defined('MAIL_ENABLED') && !MAIL_ENABLED) {
            error_log("[Mailer] Mail is disabled by configuration");
            return false;
        }

        if (empty($toEmail)) {
            error_log("[Mailer] Empty recipient email");
            return false;
        }

        $cfg = self::config();

        // Prepare headers
        $from = "{$cfg['from_name']} <{$cfg['from_address']}>";
        $to = $toName ? "{$toName} <{$toEmail}>" : $toEmail;
        
        $headers = [
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "From: {$from}",
            "Reply-To: {$cfg['from_address']}",
            "X-Mailer: MDCU-ERS/PHP",
            "X-Priority: 3"
        ];
        
        $headersStr = implode("\r\n", $headers);
        
        // Suppress warnings and handle errors gracefully
        $result = @mail($to, $subject, $htmlBody, $headersStr);
        
        if (!$result) {
            error_log("[Mailer] Failed to send to {$toEmail} | Subject: {$subject}");
            error_log("[Mailer] Last PHP mail error: " . error_get_last()['message'] ?? 'Unknown');
        } else {
            error_log("[Mailer] Email sent successfully to {$toEmail} | Subject: {$subject}");
        }
        
        return $result;
    }

    // ─── Email builders (keep these the same) ───────────────────────

    public static function requestSubmitted($toEmail, $toName, $requestNo, $subject) {
        $emailSubject = "[MDCU-ERS] Request Submitted – {$requestNo}";
        $body = self::template(
            "Request Submitted for Review",
            "Hi {$toName},",
            "Your request has been successfully submitted and is now pending MDCU review.",
            [
                'Request No'  => $requestNo,
                'Subject'     => $subject,
                'Status'      => 'Submitted',
            ],
            "You will be notified as your request progresses through the approval workflow."
        );
        return self::send($toEmail, $toName, $emailSubject, $body);
    }

    public static function newRequestForManagers($toEmail, $toName, $requestNo, $subject, $requesterName) {
        $emailSubject = "[MDCU-ERS] New Request – {$requestNo}";
        $body = self::template(
            "New Request Submitted",
            "Hi {$toName},",
            "A new request has been submitted and requires your attention.",
            [
                'Request No'  => $requestNo,
                'Subject'     => $subject,
                'Submitted By' => $requesterName,
                'Status'      => 'Submitted',
            ],
            "Please log in to MDCU-ERS to review the request."
        );
        return self::send($toEmail, $toName, $emailSubject, $body);
    }

    public static function statusUpdated($toEmail, $toName, $requestNo, $subject, $oldStatus, $newStatus, $notes = null) {
        $statusLabels = [
            'submitted'    => 'Submitted',
            'under_review' => 'Under Review',
            'for_signing'  => 'For Signing',
            'signed'       => 'Signed',
            'rejected'     => 'Rejected',
            'cancelled'    => 'Cancelled',
            'posted'       => 'Posted to SAP',
        ];
        $newLabel = $statusLabels[$newStatus] ?? ucfirst($newStatus);
        $oldLabel = $statusLabels[$oldStatus] ?? ucfirst($oldStatus);

        $emailSubject = "[MDCU-ERS] Status Update – {$requestNo}";
        $fields = [
            'Request No' => $requestNo,
            'Subject'    => $subject,
            'Previous'   => $oldLabel,
            'New Status' => $newLabel,
        ];
        if ($notes) $fields['Notes'] = $notes;

        $body = self::template(
            "Request Status Updated",
            "Hi {$toName},",
            "The status of your request has been updated.",
            $fields,
            "Log in to MDCU-ERS to view the full details of your request."
        );
        return self::send($toEmail, $toName, $emailSubject, $body);
    }

    public static function documentUploaded($toEmail, $toName, $requestNo, $fileName, $uploadedByName) {
        $emailSubject = "[MDCU-ERS] Document Uploaded – {$requestNo}";
        $body = self::template(
            "Document Uploaded",
            "Hi {$toName},",
            "A document has been uploaded to your request.",
            [
                'Request No'   => $requestNo,
                'File'         => $fileName,
                'Uploaded By'  => $uploadedByName,
            ],
            "Log in to MDCU-ERS to view or download the document."
        );
        return self::send($toEmail, $toName, $emailSubject, $body);
    }

    public static function requestPosted($toEmail, $toName, $requestNo, $subject, $sapRef = null) {
        $emailSubject = "[MDCU-ERS] Request Posted – {$requestNo}";
        $fields = [
            'Request No' => $requestNo,
            'Subject'    => $subject,
            'Status'     => 'Posted to SAP',
        ];
        if ($sapRef) $fields['SAP Reference'] = $sapRef;

        $body = self::template(
            "Request Posted to SAP",
            "Hi {$toName},",
            "Your request has been posted to SAP and is now complete.",
            $fields,
            "Thank you for using the MDCU Electronic Request System."
        );
        return self::send($toEmail, $toName, $emailSubject, $body);
    }

    // ─── HTML template ───────────────────────────────────────────────
    private static function template($heading, $greeting, $intro, array $fields, $footer) {
        $cfg   = self::config();
        $year  = date('Y');
        $rows  = '';

        foreach ($fields as $label => $value) {
            $rows .= "
            <tr>
                <td style='padding:8px 12px;font-weight:600;color:#475569;white-space:nowrap;width:140px;'>{$label}</td>
                <td style='padding:8px 12px;color:#1e293b;'>: " . htmlspecialchars((string)$value) . "</td>
            </tr>";
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#1a228f;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:8px;padding:6px 14px;color:#fff;font-weight:700;font-size:14px;letter-spacing:1px;">CBK</span>
                </td>
                <td align="right">
                  <span style="color:rgba(255,255,255,0.7);font-size:12px;">{$cfg['app_name']}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 0;">
            <h2 style="margin:0 0 8px;color:#1a228f;font-size:20px;">{$heading}</h2>
            <p style="margin:0 0 20px;color:#64748b;font-size:14px;">{$greeting}</p>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;">{$intro}</p>
          </td>
        </tr>

        <!-- Fields table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;">
              {$rows}
            </table>
          </td>
        </tr>

        <!-- Footer note -->
        <tr>
          <td style="padding:0 32px 32px;">
            <p style="margin:0;color:#94a3b8;font-size:13px;">{$footer}</p>
          </td>
        </tr>

        <!-- Bottom bar -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© {$year} Co Ban Kiat Hardware Inc. · MDCU-ERS · This is an automated message, please do not reply.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    }
}
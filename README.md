# MPC Electronic Request System (MPC-ERS)

Co Ban Kiat Hardware Inc. — MVC-structured PHP + MySQL application.

## Folder Structure

```
MPC-ERS/
├── app/                              # APPLICATION LAYER
│   ├── Controllers/                  # [C] Handle HTTP requests → call Models → return JSON
│   │   ├── AuthController.php
│   │   ├── NotificationController.php
│   │   ├── NotificationStreamController.php
│   │   ├── RequestController.php
│   │   └── UserController.php
│   ├── Models/                       # [M] Business logic — calls stored procedures/functions
│   │   ├── NotificationModel.php
│   │   ├── RequestModel.php
│   │   └── UserModel.php
│   ├── Helpers/                      # Utility classes
│   │   ├── JWT.php
│   │   ├── LDAP.php
│   │   ├── Mailer.php
│   │   └── PrintFormGenerator.php
│   └── Middleware/                   # Request interceptors
│       └── AuthMiddleware.php
│
├── config/                           # Configuration
│   ├── config.php                    # App constants (JWT secret, mail, upload path, env)
│   ├── database.php                  # PDO singleton
│   └── ldap.php                      # Active Directory / LDAP settings
│
├── routes/                           # Route definitions
│   └── api.php                       # URI → Controller method mappings
│
├── resources/                        # SOURCE VIEW templates (PHP includes these server-side)
│   └── views/                        # [V] HTML templates
│       ├── app.php                   # Main layout assembler (includes all partials)
│       ├── partials/                 # Reusable layout sections
│       │   ├── head.html             # <head> — meta, CSS links
│       │   ├── login.html            # Login page markup
│       │   ├── sidebar.html          # Navigation sidebar
│       │   ├── navbar.html           # Top header bar
│       │   ├── body.html             # Main content container (#page-content)
│       │   └── footer.html           # Script tags, toast container
│       └── modals/                   # Modal dialog templates
│           ├── status-requests-modal.html
│           ├── request-detail-modal.html
│           ├── new-request-modal.html
│           ├── user-modal.html
│           └── deactivate-modal.html
│
├── public/                           # WEB ROOT — point Apache/Nginx here
│   ├── index.php                     # Front controller (entry point)
│   ├── .htaccess                     # Apache rewrite rules
│   ├── css/
│   │   └── styles.css                # Compiled stylesheet (browser-served)
│   └── js/                           # JavaScript (browser-served)
│       ├── formConfigs.js
│       ├── core/                     # App bootstrap (state, auth, navigation, init)
│       ├── pages/                    # Page renderers (dashboard, requests, users)
│       ├── modals/                   # Modal controllers
│       ├── components/               # Reusable UI components
│       └── services/                 # Realtime SSE service
│
├── database/
│   └── stored_procedures.sql         # ALL stored procedures, functions & views
│
├── storage/                          # Runtime file storage (must be writable)
│   ├── uploads/                      # User-uploaded documents
│   ├── image/                        # Generated images
│   └── logs/                         # PHP error logs
│
├── .htaccess                         # Root redirect → public/
├── composer.json
├── latest.sql                        # Database schema + seed data
└── README.md
```

## MVC + Stored Procedure Flow

```
Browser Request
      ↓
public/.htaccess        rewrites all requests → index.php
      ↓
public/index.php        Front Controller
      ↓
  /api/* ? ──yes──→  routes/api.php
                          ↓
                     Controller           (validates input, calls Model)
                          ↓
                       Model              (calls CALL sp_* or SELECT fn_*)
                          ↓
                     MySQL SP/Fn/View     (executes SQL, returns result set)
                          ↓
                     JSON Response
      ↓ no
resources/views/app.php  (PHP includes each partial → full HTML)
      ↓
Browser renders SPA + loads public/js/**
```

## Database Objects (database/stored_procedures.sql)

Run this file AFTER importing latest.sql.

| Type | Count | Prefix | Purpose |
|---|---|---|---|
| Stored Functions | 8 | `fn_` | Scalar helpers (name lookup, ID map, request no gen, counts) |
| Views | 8 | `vw_` | Pre-joined read queries (requests list, approvals, audit logs, etc.) |
| Stored Procedures | 50+ | `sp_` | All INSERT / UPDATE / DELETE / complex SELECTs |

### Key Objects

**Functions**
- `fn_generate_request_no()` — generates next `MDCU-ERS-YYYYMM-NNNN`
- `fn_get_user_full_name(id)` — returns full name string
- `fn_get_notification_unread_count(user_id)` — unread badge count
- `fn_count_users(search)` — paginated user count

**Views**
- `vw_requests_list` — paginated/filtered request list with joins
- `vw_request_detail` — full request row for detail/print
- `vw_approvals_with_signatories` — approvals with signer name + doc
- `vw_notifications_with_request` — notifications with request info
- `vw_dashboard_stats` — live global status counts

**Procedure Groups**
- `sp_notification_*` — create, paginate, mark read, notify managers, clean old
- `sp_user_*` — find, create, update, deactivate, activate, LDAP sync
- `sp_request_*` — create, submit, update status, post to SAP, dashboard stats
- `sp_signatories_*` — create per category, sign, sign all, auto-advance status
- `sp_document_*` — insert, get by request, get file for download
- `sp_audit_log_*` — insert, get by request
- `sp_srrf/crrf/edmrf_*` — form data get + existence check

## Setup

1. Point Apache/Nginx web root to `public/`
2. Import schema: `mysql -u root -p mpc_ers < latest.sql`
3. Import DB objects: `mysql -u root -p mpc_ers < database/stored_procedures.sql`
4. Update credentials in `config/config.php`, `config/database.php`, `config/ldap.php`
5. Ensure `storage/uploads/` and `storage/logs/` are writable (`chmod 755`)
6. Enable `mod_rewrite` (Apache) or equivalent nginx rewrite rules

## Requirements

- PHP >= 7.0
- MySQL 5.7+ / MariaDB 10.1+
- Apache with `mod_rewrite` enabled

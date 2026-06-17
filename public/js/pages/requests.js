// ─── Request Table Helper Functions ───────────────
// Toggle select all checkboxes
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  if (!selectAllCheckbox) return;

  const checkboxes = document.querySelectorAll(
    '#requests-tbody input[type="checkbox"]',
  );

  // Only select/deselect visible checkboxes (from filtered results)
  checkboxes.forEach(function (checkbox) {
    checkbox.checked = selectAllCheckbox.checked;
    const requestId = parseInt(checkbox.getAttribute("data-id"));
    if (selectAllCheckbox.checked) {
      if (!window.selectedRequests.includes(requestId)) {
        window.selectedRequests.push(requestId);
      }
    } else {
      window.selectedRequests = window.selectedRequests.filter(function (id) {
        return id !== requestId;
      });
    }
  });

  updateBulkExportButton();
}

function toggleSelectRequest(id, checked) {
  window.selectedRequests = window.selectedRequests || [];

  if (checked) {
    if (!window.selectedRequests.includes(id)) {
      window.selectedRequests.push(id);
    }
  } else {
    window.selectedRequests = window.selectedRequests.filter(function (item) {
      return item !== id;
    });
    const selectAllCheckbox = document.getElementById("select-all-checkbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }
  }

  updateBulkExportButton();
}

function updateBulkExportButton() {
  const bulkBtn = document.getElementById("bulk-export-btn");
  const selectedCountSpan = document.getElementById("selected-count");

  if (bulkBtn && selectedCountSpan) {
    const count = window.selectedRequests ? window.selectedRequests.length : 0;
    selectedCountSpan.textContent = count;
    if (count > 0) {
      bulkBtn.classList.remove("hidden");
    } else {
      bulkBtn.classList.add("hidden");
    }
  }
}

function toggleExportMenu(id) {
  const menu = document.getElementById(`export-menu-${id}`);
  if (menu) {
    document.querySelectorAll('[id^="export-menu-"]').forEach(function (m) {
      if (m.id !== `export-menu-${id}`) {
        m.classList.add("hidden");
      }
    });
    menu.classList.toggle("hidden");
  }
}

// async function exportAsPDF(id) {
//   const token = localStorage.getItem("mpc_token");
//   if (!token) {
//     showToast("You must be logged in to export.", "error");
//     return;
//   }

//   showToast("Generating PDF. Please wait...", "info");

//   try {
//     const response = await fetch(`${API}/requests/${id}/pdf`, {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     if (response.status === 401) {
//       showToast("Your session has expired. Please log in again.", "error");
//       handleLogout();
//       return;
//     }

//     if (response.ok) {
//       // Get the filename from Content-Disposition header if available
//       const contentDisposition = response.headers.get("Content-Disposition");
//       let filename = `request_${id}.pdf`;
//       if (contentDisposition) {
//         const match = contentDisposition.match(
//           /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
//         );
//         if (match && match[1]) {
//           filename = match[1].replace(/['"]/g, "");
//         }
//       }

//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = filename;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       window.URL.revokeObjectURL(url);
//       showToast("PDF downloaded successfully!", "success");
//     } else {
//       const errorText = await response.text();
//       console.error("PDF export error:", errorText);
//       showToast("Failed to generate PDF. Please try again.", "error");
//     }
//   } catch (error) {
//     console.error("PDF export error:", error);
//     showToast("Failed to generate PDF. Please try again.", "error");
//   }
// }

async function bulkExport() {
  if (!window.selectedRequests || window.selectedRequests.length === 0) {
    showToast("Please select at least one request to export.", "error");
    return;
  }

  const format = document.getElementById("export-format").value;
  const requestIds = window.selectedRequests;
  const token = localStorage.getItem("mpc_token");

  if (!token) {
    showToast("You must be logged in to export.", "error");
    return;
  }

  showToast(
    `Exporting ${requestIds.length} request(s) as ${format.toUpperCase()}...`,
    "info",
  );

  try {
    const response = await fetch(`${API}/requests/export/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        request_ids: requestIds,
        format: format,
      }),
    });

    if (response.status === 401) {
      showToast("Your session has expired. Please log in again.", "error");
      handleLogout();
      return;
    }

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = format === "excel" ? "xls" : "csv";
      a.download = `requests_export_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("Export completed!", "success");
    } else {
      const errorData = await response.json();
      showToast(
        errorData?.message || "Export failed. Please try again.",
        "error",
      );
    }
  } catch (error) {
    console.error("Export error:", error);
    showToast("Export failed. Please try again.", "error");
  }
}

document.addEventListener("click", function (e) {
  if (
    !e.target.closest('[onclick*="toggleExportMenu"]') &&
    !e.target.closest('[id^="export-menu-"]')
  ) {
    document.querySelectorAll('[id^="export-menu-"]').forEach(function (menu) {
      menu.classList.add("hidden");
    });
  }
});

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Update submitRequest function with confirmation dialog
// async function submitRequest(id) {
//   // Use custom confirmation dialog
//   const confirmed = await showConfirmDialog({
//     title: "Submit Request",
//     message:
//       "Are you sure you want to submit this request for MPC review? Once submitted, it will be sent to MPC personnel for processing.",
//     type: "info",
//     confirmText: "Yes, Submit",
//     cancelText: "Cancel",
//     countdown: 3,
//   });

//   if (!confirmed) return;

//   const data = await api(`/requests/${id}/submit`, { method: "POST" });
//   if (data?.success) {
//     showToast("Request submitted successfully!", "success");
//     if (typeof renderRequests === "function") {
//       await renderRequests(window._showAll || false);
//     }
//     if (typeof RequestModal !== "undefined" && RequestModal.hide) {
//       RequestModal.hide();
//     }
//   } else {
//     showToast(data?.message || "Error submitting request.", "error");
//   }
// }

// ─── Utilities ────────────────────────────────────
// ─── Status Badge Function ────────────────────────────────────
function statusBadge(status) {
  const normalizedStatus = (status || "").toLowerCase();

  const config = {
    draft: {
      label: "Draft",
      class: "badge-draft",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>',
    },
    submitted: {
      label: "Submitted",
      class: "badge-submitted",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    },
    under_review: {
      label: "Under Review",
      class: "badge-under_review",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
    },
    for_signing: {
      label: "For Signing",
      class: "badge-for_signing",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>',
    },
    signed: {
      label: "Signed",
      class: "badge-signed",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    },
    posted: {
      label: "Posted",
      class: "badge-posted",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>',
    },
    rejected: {
      label: "Rejected",
      class: "badge-rejected",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    },
    cancelled: {
      label: "Cancelled",
      class: "badge-cancelled",
      icon: '<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>',
    },
  };

  const badge = config[normalizedStatus] || {
    label:
      (status || "Unknown").charAt(0).toUpperCase() +
      (status || "unknown").slice(1),
    class: "badge-draft",
    icon: "",
  };

  return `<span class="badge ${badge.class} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium">
    ${badge.icon}
    ${badge.label}
  </span>`;
}

// ─── Requests List ────────────────────────────────
// ─── Requests List with DataTables Pagination ────────────────────────────────
// ─── Requests List with DataTables Pagination (Fixed for Zoom) ───
async function renderRequests(showAll = false) {
  const url = showAll ? "/requests" : `/requests?user_only=1`;
  const data = await api(url);

  window.selectedRequests = window.selectedRequests || [];
  window.selectedRequests = [];

  const requests = data?.data || [];
  const isEmpty = requests.length === 0;

  // Destroy existing DataTable if it exists
  if ($.fn.DataTable && $.fn.DataTable.isDataTable("#requests-table")) {
    $("#requests-table").DataTable().destroy();
  }

  document.getElementById("page-content").innerHTML = `
    <div class="animate-fade space-y-4">
      <!-- Search and Filter Bar -->
      <div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div class="flex flex-wrap gap-3 items-center flex-1">
          <select id="dt-status-filter" class="form-input w-48 py-2">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="for_signing">For Signing</option>
            <option value="signed">Signed</option>
            <option value="posted">Posted</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div class="relative">
            <input type="text" id="custom-search-input" placeholder="Search requests..." class="form-input py-2 pl-9 w-64">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600">Export:</span>
            <select id="export-format" class="form-input py-2 w-32 text-sm">
              <option value="csv">CSV</option>
              <option value="excel">Excel (XLS)</option>
            </select>
            <button id="bulk-export-btn" onclick="bulkExport()" class="btn btn-primary btn-sm hidden">📥 Export (<span id="selected-count">0</span>)</button>
          </div>
          <button onclick="showNewRequestModal()" class="btn btn-primary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
            New Request
          </button>
        </div>
      </div>

      <!-- DataTable Container with improved overflow handling -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="datatable-container" style="overflow-x: auto; overflow-y: visible;">
          <table id="requests-table" class="display responsive nowrap" style="width:100%">
            <thead class="bg-slate-50">
              <tr>
                <th class="w-10 text-center"><input type="checkbox" id="select-all-checkbox" onchange="toggleSelectAll()" class="rounded border-slate-300 w-4 h-4"></th>
                <th>Request No.</th>
                <th>Subject / Type</th>
                ${showAll ? "<th>Requester</th>" : ""}
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="requests-tbody">
              ${renderRequestRowsWithCheckbox(requests, showAll)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  window._allRequests = requests;
  window._showAll = showAll;

  // Initialize DataTable with improved settings for zoom support
  setTimeout(() => {
    if ($.fn.DataTable) {
      const dt = $("#requests-table").DataTable({
        responsive: {
          details: {
            display: $.fn.dataTable.Responsive.display.childRowImmediate,
            type: "inline",
          },
        },
        pageLength: 10,
        lengthMenu: [
          [5, 10, 25, 50, 100, -1],
          [5, 10, 25, 50, 100, "All"],
        ],
        language: {
          search: "🔍 Search:",
          searchPlaceholder: "Type to filter...",
          lengthMenu: "Show _MENU_ entries",
          info: "Showing _START_ to _END_ of _TOTAL_ entries",
          infoEmpty: "Showing 0 to 0 of 0 entries",
          infoFiltered: "(filtered from _MAX_ total entries)",
          zeroRecords: `
            <div class="text-center py-12">
              <div class="text-5xl mb-3">🔍</div>
              <p class="text-slate-500 font-medium">No matching records found</p>
              <p class="text-slate-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
            </div>
          `,
          emptyTable: `
            <div class="text-center py-12">
              <div class="text-5xl mb-3">📋</div>
              <p class="text-slate-500 font-medium">No requests found</p>
              <p class="text-slate-400 text-sm mt-1">${showAll ? "No requests have been submitted yet." : "You haven't created any requests yet."}</p>
              <button onclick="showNewRequestModal()" class="btn btn-primary btn-sm mt-4">Create your first request</button>
            </div>
          `,
          paginate: {
            first: "« First",
            last: "Last »",
            next: "Next →",
            previous: "← Previous",
          },
        },
        order: [[1, "desc"]],
        columnDefs: [
          { orderable: false, targets: [0, -1] },
          { className: "text-center", targets: [0] },
          { responsivePriority: 1, targets: 0 },
          { responsivePriority: 2, targets: 1 },
          { responsivePriority: 3, targets: -1 },
        ],
        drawCallback: function () {
          updateBulkExportButton();
        },
        // Fix for zoom issues - ensure controls are visible
        initComplete: function () {
          // Move length menu to a more visible location and style it properly
          const wrapper = $("#requests-table").closest(".dataTables_wrapper");

          // Ensure the length menu is properly styled and visible
          wrapper.find(".dataTables_length select").css({
            padding: "6px 12px",
            "border-radius": "8px",
            border: "1.5px solid #e2e8f0",
            background: "white",
            "font-size": "13px",
            "min-width": "70px",
            cursor: "pointer",
          });

          wrapper.find(".dataTables_length label").css({
            display: "flex",
            "align-items": "center",
            gap: "8px",
            "font-size": "13px",
            color: "#64748b",
          });

          // Style the search input
          wrapper.find(".dataTables_filter input").css({
            padding: "6px 12px",
            "border-radius": "8px",
            border: "1.5px solid #e2e8f0",
            "margin-left": "8px",
            "font-size": "13px",
          });

          // Add custom class for better responsiveness
          wrapper.addClass("datatable-responsive");
        },
      });

      // Connect custom search input to DataTable search
      const customSearch = document.getElementById("custom-search-input");
      if (customSearch) {
        customSearch.addEventListener("keyup", function () {
          dt.search(this.value).draw();
        });
      }

      // Connect status filter
      const statusFilter = document.getElementById("dt-status-filter");
      if (statusFilter) {
        statusFilter.addEventListener("change", function () {
          const status = this.value;
          if (status) {
            dt.column(5).search(status.replace(/_/g, " ")).draw();
          } else {
            dt.column(5).search("").draw();
          }
        });
      }

      state.dataTable = dt;
    } else {
      console.warn("DataTables library not loaded - pagination will not work");
      showToast("Loading table features...", "info", "Please wait", 2000);
    }
  }, 100);
}

function renderRequestRowsWithCheckbox(rows, showAll) {
  if (!rows || rows.length === 0) {
    return "";
  }

  return rows
    .map((r) => {
      const isChecked =
        window.selectedRequests && window.selectedRequests.includes(r.id);
      const priorityDisplay = r.priority
        ? r.priority.charAt(0).toUpperCase() + r.priority.slice(1)
        : "Normal";
      const priorityClass = `priority-${r.priority || "normal"}`;
      const isLocked =
        r.status === "posted" ||
        r.status === "rejected" ||
        r.status === "cancelled";
      const canSubmit = r.status === "draft" && !isLocked;

      return `
            <tr class="hover:bg-slate-50 transition-colors" data-request-id="${r.id}" data-request-status="${r.status}" onclick="if(event.target.tagName !== 'BUTTON' && event.target.tagName !== 'INPUT' && !event.target.closest('.btn')) showRequestDetail(${r.id})">
                <td class="px-4 py-3 text-center w-10" onclick="event.stopPropagation()">
                    <input type="checkbox" data-id="${r.id}" onchange="toggleSelectRequest(${r.id}, this.checked)" ${isChecked ? "checked" : ""} class="rounded border-slate-300 w-4 h-4">
                </td>
                <td class="px-4 py-3 font-mono text-xs font-medium text-slate-600 whitespace-nowrap">
                    <span class="cursor-pointer hover:text-blue-600" onclick="showRequestDetail(${r.id})">${escapeHtml(r.request_no)}</span>
                </td>
                <td class="px-4 py-3" onclick="showRequestDetail(${r.id})">
                    <div class="font-medium text-slate-800 line-clamp-2">${escapeHtml(r.subject)}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${escapeHtml(r.request_type_name)}</div>
                </td>
                ${showAll ? `<td class="px-4 py-3 text-sm text-slate-600 whitespace-nowrap" onclick="showRequestDetail(${r.id})">${escapeHtml(r.requester_name)}</td>` : ""}
                <td class="px-4 py-3" onclick="showRequestDetail(${r.id})">
                    <span class="${priorityClass} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">${priorityDisplay}</span>
                </td>
                <td class="px-4 py-3 status-cell" onclick="showRequestDetail(${r.id})">
                    ${statusBadge(r.status)}
                </td>
                <td class="px-4 py-3 text-sm text-slate-400 whitespace-nowrap" onclick="showRequestDetail(${r.id})">
                    ${r.submitted_at ? formatDate(r.submitted_at) : "—"}
                </td>
                <td class="px-4 py-3 actions-cell" onclick="event.stopPropagation()">
                    <div class="table-actions">
                        <button onclick="showRequestDetail(${r.id})" class="btn btn-secondary btn-sm" title="View Details">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            <span class="btn-text">View</span>
                        </button>
                        ${
                          canSubmit
                            ? `
                        <button onclick="submitRequest(${r.id})" class="btn btn-primary btn-sm" title="Submit for Review">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span class="btn-text">Submit</span>
                        </button>
                        `
                            : !isLocked && r.status !== "draft"
                              ? `
                        <span class="text-xs text-slate-400 flex items-center gap-1 px-2">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Pending
                        </span>
                        `
                              : isLocked
                                ? `
                        <span class="text-xs text-slate-400 flex items-center gap-1 px-2">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                            Locked
                        </span>
                        `
                                : ""
                        }
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

// ─── Render Request Rows (without checkbox - for filtered view) ─────────────────────────
function renderRequestRows(rows, showAll) {
  // if (!rows || rows.length === 0) {
  //   return '<tr><td colspan="8" class="text-center text-slate-400 py-8">No requests found.</td></tr>';
  // }

  return rows
    .map(function (r) {
      const priorityDisplay = r.priority
        ? r.priority.charAt(0).toUpperCase() + r.priority.slice(1)
        : "Normal";
      const priorityClass = `priority-${r.priority || "normal"}`;

      return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 font-mono text-xs font-medium text-slate-600 whitespace-nowrap">
          ${escapeHtml(r.request_no)}
        </td>
        <td class="px-4 py-3">
          <div class="font-medium text-slate-800 truncate max-w-xs">${escapeHtml(r.subject)}</div>
          <div class="text-xs text-slate-400 mt-0.5">${escapeHtml(r.request_type_name)}</div>
        </td>
        <td class="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
          ${escapeHtml(r.request_type_name)}
        </td>
        ${showAll ? `<td class="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">${escapeHtml(r.requester_name)}</td>` : ""}
        <td class="px-4 py-3">
          <span class="${priorityClass} inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">${priorityDisplay}</span>
        </td>
        <td class="px-4 py-3">
          ${statusBadge(r.status)}
        </td>
        <td class="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
          ${r.submitted_at ? formatDate(r.submitted_at) : "—"}
        </td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <button onclick="showRequestDetail(${r.id})" class="btn btn-secondary btn-sm">View</button>
            ${r.status === "draft" ? `<button onclick="submitRequest(${r.id})" class="btn btn-primary btn-sm">Submit</button>` : ""}
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ─── Filter Requests ─────────────────────────────────────────────
function filterRequests() {
  const search =
    document.getElementById("search-input")?.value.toLowerCase() || "";
  const status = document.getElementById("filter-status")?.value || "";
  const filtered = (window._allRequests || []).filter(
    (r) =>
      (!search ||
        r.request_no.toLowerCase().includes(search) ||
        r.subject.toLowerCase().includes(search)) &&
      (!status || r.status === status),
  );
  const tbody = document.getElementById("requests-tbody");
  if (tbody) {
    // IMPORTANT: Use the same function that was used to render the original table
    // Check if we're in "showAll" mode or regular mode
    tbody.innerHTML = renderRequestRowsWithCheckbox(
      filtered,
      window._showAll || false,
    );
  }
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// Update showToast function for better visual feedback
function showToast(message, type = "info", title = null, duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const meta = TOAST_META[type] || TOAST_META.info;
  const heading = title || meta.title;
  const durSec = (duration / 1000).toFixed(1) + "s";

  const toast = document.createElement("div");
  toast.className = `gooey-toast gooey-${type}`;
  toast.style.setProperty("--bar-dur", durSec);

  toast.innerHTML = `
    <div class="gooey-toast-icon">${meta.icon}</div>
    <div class="gooey-toast-body">
      <div class="gooey-toast-title">${escapeHtml(heading)}</div>
      <div class="gooey-toast-msg">${escapeHtml(message)}</div>
    </div>
    <button class="gooey-toast-close" aria-label="Dismiss">✕</button>
    <div class="gooey-toast-bar"></div>
  `;

  let timeoutId;

  function dismiss() {
    clearTimeout(timeoutId);
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 320);
  }

  toast.querySelector(".gooey-toast-close").addEventListener("click", (e) => {
    e.stopPropagation();
    dismiss();
  });

  toast.addEventListener("click", dismiss);

  container.appendChild(toast);

  timeoutId = setTimeout(dismiss, duration);

  toast.addEventListener("mouseenter", () => {
    clearTimeout(timeoutId);
    toast.querySelector(".gooey-toast-bar").style.animationPlayState = "paused";
  });

  toast.addEventListener("mouseleave", () => {
    toast.querySelector(".gooey-toast-bar").style.animationPlayState =
      "running";
    timeoutId = setTimeout(dismiss, 1500);
  });
}

// document.querySelectorAll(".modal-overlay").forEach((overlay) => {
//   overlay.addEventListener("click", (e) => {
//     if (e.target === overlay) overlay.classList.add("hidden");
//   });
// });

// Expose submitRequest globally so other modules (e.g. newRequestModal) can call it
// window.submitRequest = submitRequest;

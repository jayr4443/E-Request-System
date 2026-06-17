async function showStatusRequests(status) {
  window.currentStatusFilter = status;
  const modal = document.getElementById("status-requests-modal");
  const modalTitle = document.getElementById("status-modal-title");
  const modalSubtitle = document.getElementById("status-modal-subtitle");

  const statusLabels = {
    draft: "Draft Requests",
    submitted: "Submitted Requests",
    under_review: "Under Review Requests",
    for_signing: "For Signing Requests",
    signed: "Signed Requests",
    posted: "Posted Requests",
    rejected: "Rejected Requests",
    cancelled: "Cancelled Requests",
  };

  const statusColors = {
    draft: "#64748b",
    submitted: "#3b82f6",
    under_review: "#f59e0b",
    for_signing: "#8b5cf6",
    signed: "#10b981",
    posted: "#22c55e",
    rejected: "#ef4444",
    cancelled: "#6b7280",
  };

  modalTitle.innerHTML = `${statusLabels[status] || status} <span class="ml-2 px-2 py-0.5 rounded-full text-xs" style="background: ${statusColors[status] || "#64748b"}20; color: ${statusColors[status] || "#64748b"}">${status.replace("_", " ")}</span>`;
  modalSubtitle.textContent = `Showing all requests with status: ${statusLabels[status] || status}`;

  const content = document.getElementById("status-requests-content");
  content.innerHTML =
    '<div class="flex items-center justify-center h-40"><div class="animate-spin w-8 h-8 border-3 border-navy-700 border-t-transparent rounded-full"></div><span class="ml-3 text-slate-500">Loading requests...</span></div>';

  modal.classList.remove("hidden");

  await loadStatusRequests(status);
}

async function loadStatusRequests(status) {
  try {
    const isManager =
      state.user &&
      [
        "mpc_personnel",
        "it_manager",
        "senior_manager",
        "vp_operations",
        "admin",
      ].includes(state.user.role);
    const url = isManager ? "/requests" : "/requests?user_only=1";
    const data = await api(url);

    if (data?.success && data.data) {
      const filteredRequests = data.data.filter((r) => r.status === status);
      renderStatusRequestsTable(filteredRequests, status);
    } else {
      document.getElementById("status-requests-content").innerHTML = `
                <div class="text-center text-slate-400 py-12">
                    <div class="text-6xl mb-4">📋</div>
                    <p class="font-medium">No requests found</p>
                    <p class="text-sm mt-1">No ${status} requests available.</p>
                    <button onclick="closeModal('status-requests-modal')" class="btn btn-secondary btn-sm mt-4">Close</button>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error loading status requests:", error);
    document.getElementById("status-requests-content").innerHTML = `
            <div class="text-center text-red-500 py-12">
                <p>Failed to load requests. Please try again.</p>
                <button onclick="loadStatusRequests('${status}')" class="btn btn-primary btn-sm mt-3">Retry</button>
            </div>
        `;
  }
}

function renderStatusRequestsTable(requests, status) {
  const container = document.getElementById("status-requests-content");

  if (!requests || requests.length === 0) {
    container.innerHTML = `
            <div class="text-center text-slate-400 py-12">
                <div class="text-6xl mb-4">📋</div>
                <p class="font-medium">No requests found</p>
                <p class="text-sm mt-1">No ${status} requests available.</p>
                <button onclick="closeModal('status-requests-modal')" class="btn btn-secondary btn-sm mt-4">Close</button>
            </div>
        `;
    return;
  }

  const tableHtml = `
        <table id="status-requests-table" class="display responsive nowrap" style="width:100%">
            <thead>
                <tr>
                    <th>Request No.</th>
                    <th>Subject / Requester</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${requests
                  .map(
                    (r) => `
                    <tr>
                        <td class="font-mono text-xs font-medium">
                            <a href="javascript:void(0)" onclick="showRequestDetailFromStatus(${r.id})" class="text-blue-600 hover:text-blue-800 hover:underline">${escapeHtml(r.request_no)}</a>
                        </td>
                        <td>
                            <div class="font-medium text-slate-800">${escapeHtml(r.subject)}</div>
                            <div class="text-xs text-slate-400 mt-0.5">by ${escapeHtml(r.requester_name)}</div>
                        </td>
                        <td class="text-sm">${escapeHtml(r.request_type_name)}</td>
                        <td><span class="priority-${r.priority || "normal"} inline-flex px-2 py-0.5 rounded-full text-xs font-medium">${(r.priority || "normal").toUpperCase()}</span></td>
                        <td class="text-sm whitespace-nowrap">${formatDate(r.created_at)}</td>
                        <td>
                            <div class="flex gap-2">
                                <button onclick="showRequestDetailFromStatus(${r.id})" class="btn btn-secondary btn-sm">View</button>
                                ${r.status === "draft" ? `<button onclick="submitRequestFromStatus(${r.id})" class="btn btn-primary btn-sm">Submit</button>` : ""}
                            </div>
                        </td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>
    `;

  container.innerHTML = tableHtml;

  // Initialize DataTable
  setTimeout(() => {
    if ($.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#status-requests-table")) {
        $("#status-requests-table").DataTable().destroy();
      }

      $("#status-requests-table").DataTable({
        responsive: true,
        pageLength: 10,
        lengthMenu: [
          [5, 10, 25, 50, -1],
          [5, 10, 25, 50, "All"],
        ],
        language: {
          search: "Search:",
          lengthMenu: "Show _MENU_ entries",
          info: "Showing _START_ to _END_ of _TOTAL_ entries",
          infoEmpty: "Showing 0 to 0 of 0 entries",
          zeroRecords: "No matching records found",
          paginate: {
            first: "First",
            last: "Last",
            next: "Next",
            previous: "Previous",
          },
        },
        order: [[4, "desc"]],
        columnDefs: [{ orderable: false, targets: -1 }],
      });
    } else {
      console.warn("DataTable library not loaded");
    }
  }, 50);
}

async function showRequestDetailFromStatus(id) {
  // closeModal("status-requests-modal");
  await showRequestDetail(id);
}

async function submitRequestFromStatus(id) {
  if (!confirm("Submit this request for MPC review?")) return;

  const data = await api(`/requests/${id}/submit`, { method: "POST" });

  if (data?.success) {
    showToast("Request submitted successfully!", "success");
    closeModal("status-requests-modal");
    if (window.currentStatusFilter) {
      await loadStatusRequests(window.currentStatusFilter);
    }
    await renderDashboard();
    if (window._showAll !== undefined) {
      await renderRequests(window._showAll);
    }
  } else {
    showToast(data?.message || "Error submitting request.", "error");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "m") {
    e.preventDefault();
    window.DraggableModals?.resetPosition("status-requests-modal");
    window.DraggableModals?.resetPosition("request-detail-modal");
    showToast("Modal positions reset to center", "info");
  }

  if (e.key === "Escape") {
    const requestModal = document.getElementById("request-detail-modal");
    if (requestModal && !requestModal.classList.contains("hidden")) {
      closeModal("request-detail-modal", e);
    } else {
      const statusModal = document.getElementById("status-requests-modal");
      if (statusModal && !statusModal.classList.contains("hidden")) {
        closeModal("status-requests-modal", e);
      }
    }
  }
});

// Make functions global
window.showStatusRequests = showStatusRequests;
window.showRequestDetailFromStatus = showRequestDetailFromStatus;
window.submitRequestFromStatus = submitRequestFromStatus;

// Make functions available globally
window.api = api;
window.navigate = navigate;
window.filterRequests = filterRequests;
window.submitRequest = submitRequest;
// window.updateRequestStatus = updateRequestStatus;
// window.postRequest = postRequest;
// window.uploadDocument = uploadDocument;
// window.selectSignatureType = selectSignatureType;
// window.toggleSignatorySelect = toggleSignatorySelect;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.statusBadge = statusBadge;
window.showToast = showToast;
// window.renderUsersTable = renderUsersTable;
window.closeModal = closeModal;
// window.toggleSidebar = toggleSidebar;
// window.togglePassword = togglePassword;
// window.handleLogin = handleLogin;
// window.handleLogout = handleLogout;
window.toggleSelectAll = toggleSelectAll;
window.toggleSelectRequest = toggleSelectRequest;
window.toggleExportMenu = toggleExportMenu;
window.bulkExport = bulkExport;
// window.exportAsPDF = exportAsPDF;
// window.exportRequest = exportRequest;
// window.markNotificationRead = markNotificationRead;
// window.markAllNotificationsRead = markAllNotificationsRead;
// window.fetchUnreadNotificationCount = fetchUnreadNotificationCount;
// window.printOriginalForm = printOriginalForm;
// // Make functions available globally
// window.markNotificationRead = markNotificationRead;
// window.markAllNotificationsRead = markAllNotificationsRead;
// window.fetchUnreadNotificationCount = fetchUnreadNotificationCount;
// // Make functions global
// window.showConfirmDialog = showConfirmDialog;

window.FORM_CONFIGS = FORM_CONFIGS;
window.BOOLEAN_FIELDS = BOOLEAN_FIELDS;

// ─── Init ─────────────────────────────────────────
if (state.token && state.user) {
  showApp();
} else {
  document.getElementById("login-page").classList.remove("hidden");
}

// ─── Request Status Actions ───────────────────────

// ─── Confirm Dialog (single definition) ──────────────────────────────────────
function showConfirmDialog({
  title,
  message,
  type = "warning",
  confirmText = "Confirm",
  cancelText = "Cancel",
  countdown = 0,
}) {
  return new Promise((resolve) => {
    let confirmModal = document.getElementById("confirm-dialog-modal");
    if (!confirmModal) {
      confirmModal = document.createElement("div");
      confirmModal.id = "confirm-dialog-modal";
      confirmModal.className =
        "modal-overlay hidden fixed inset-0 z-50 flex items-center justify-center p-4";
      confirmModal.style.background = "rgba(0,0,0,0.6)";
      confirmModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style="animation: fadeInScale 0.2s ease">
          <div class="p-6">
            <div class="flex items-start gap-4 mb-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" id="confirm-icon-bg">
                <svg id="confirm-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-display font-bold text-slate-800 text-lg" id="confirm-title">Confirm Action</h3>
                <p class="text-slate-500 text-sm mt-1" id="confirm-message">Are you sure?</p>
              </div>
            </div>
            <div id="confirm-countdown-bar" class="hidden mb-4">
              <div class="h-1 rounded-full bg-slate-100 overflow-hidden">
                <div id="confirm-countdown-fill" class="h-full rounded-full transition-all" style="width:100%"></div>
              </div>
              <p class="text-xs text-slate-400 mt-1 text-right" id="confirm-countdown-label"></p>
            </div>
            <div class="flex gap-3 mt-2">
              <button id="confirm-cancel-btn" class="btn btn-secondary flex-1 justify-center">Cancel</button>
              <button id="confirm-ok-btn" class="btn flex-1 justify-center">Confirm</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    }

    // Inject animation keyframe once
    if (!document.getElementById("confirm-dialog-style")) {
      const style = document.createElement("style");
      style.id = "confirm-dialog-style";
      style.textContent = `
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    const typeConfig = {
      warning: { bg: "#fef3c7", iconColor: "#d97706", btnClass: "btn-warning", barColor: "#d97706",
        icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" },
      error:   { bg: "#fee2e2", iconColor: "#dc2626", btnClass: "btn-danger",   barColor: "#dc2626",
        icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" },
      info:    { bg: "#dbeafe", iconColor: "#3b82f6", btnClass: "btn-primary",  barColor: "#3b82f6",
        icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" },
      success: { bg: "#d1fae5", iconColor: "#10b981", btnClass: "btn-success",  barColor: "#10b981",
        icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    };

    const config = typeConfig[type] || typeConfig.warning;

    const iconBg = confirmModal.querySelector("#confirm-icon-bg");
    iconBg.style.background = config.bg;

    const icon = confirmModal.querySelector("#confirm-icon");
    icon.style.color = config.iconColor;
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.icon}"/>`;

    const okBtn = confirmModal.querySelector("#confirm-ok-btn");
    okBtn.className = `btn ${config.btnClass} flex-1 justify-center`;

    confirmModal.querySelector("#confirm-title").textContent = title;
    confirmModal.querySelector("#confirm-message").textContent = message;
    confirmModal.querySelector("#confirm-cancel-btn").textContent = cancelText;

    const countdownBar   = confirmModal.querySelector("#confirm-countdown-bar");
    const countdownFill  = confirmModal.querySelector("#confirm-countdown-fill");
    const countdownLabel = confirmModal.querySelector("#confirm-countdown-label");
    let countdownTimer = null;
    let remaining = countdown;

    if (countdown > 0) {
      okBtn.disabled = true;
      okBtn.style.opacity = "0.5";
      okBtn.style.cursor = "not-allowed";
      okBtn.textContent = `${confirmText} (${countdown}s)`;
      countdownBar.classList.remove("hidden");
      countdownFill.style.background = config.barColor;
      countdownFill.style.width = "100%";
      countdownFill.style.transition = `width ${countdown}s linear`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => { countdownFill.style.width = "0%"; });
      });

      countdownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownTimer);
          okBtn.disabled = false;
          okBtn.style.opacity = "1";
          okBtn.style.cursor = "pointer";
          okBtn.textContent = confirmText;
          countdownLabel.textContent = "";
          countdownBar.classList.add("hidden");
        } else {
          okBtn.textContent = `${confirmText} (${remaining}s)`;
          countdownLabel.textContent = `Please wait ${remaining}s...`;
        }
      }, 1000);
    } else {
      okBtn.disabled = false;
      okBtn.style.opacity = "1";
      okBtn.style.cursor = "pointer";
      okBtn.textContent = confirmText;
      countdownBar.classList.add("hidden");
    }

    confirmModal.classList.remove("hidden");

    const cleanup = () => {
      if (countdownTimer) clearInterval(countdownTimer);
      confirmModal.querySelector("#confirm-cancel-btn").removeEventListener("click", handleCancel);
      confirmModal.querySelector("#confirm-ok-btn").removeEventListener("click", handleConfirm);
      confirmModal.removeEventListener("click", handleBackdrop);
    };

    const handleCancel  = () => { confirmModal.classList.add("hidden"); cleanup(); resolve(false); };
    const handleConfirm = () => { if (okBtn.disabled) return; confirmModal.classList.add("hidden"); cleanup(); resolve(true); };
    const handleBackdrop = (e) => { if (e.target === confirmModal) handleCancel(); };

    confirmModal.querySelector("#confirm-cancel-btn").addEventListener("click", handleCancel);
    confirmModal.querySelector("#confirm-ok-btn").addEventListener("click", handleConfirm);
    confirmModal.addEventListener("click", handleBackdrop);
  });
}

// ─── Update table row status immediately ──────────────────────────────────────
async function updateRequestRowStatus(requestId, newStatus) {
  if (typeof RealtimeService !== "undefined" && RealtimeService.updateTableRowStatus) {
    await RealtimeService.updateTableRowStatus(requestId, newStatus);
    return true;
  }
  const rows = document.querySelectorAll("#requests-tbody tr");
  for (const row of rows) {
    const requestNoCell = row.querySelector("td:nth-child(2)");
    if (requestNoCell && requestNoCell.textContent.includes(requestId)) {
      const statusCell = row.querySelector("td:nth-child(6)");
      if (statusCell && typeof statusBadge === "function") {
        statusCell.innerHTML = statusBadge(newStatus);
        statusCell.style.transition = "background-color 0.5s ease";
        statusCell.style.backgroundColor = "#d1fae5";
        setTimeout(() => { if (statusCell) statusCell.style.backgroundColor = ""; }, 1000);
        break;
      }
    }
  }
  return false;
}

// ─── Update status ────────────────────────────────────────────────────────────
async function updateRequestStatus(id) {
  const status = document.getElementById("detail-status-select")?.value;
  if (!status) return showToast("Please select a status first.", "info");

  try {
    const requestData = await api(`/requests/${id}`);
    if (requestData?.success) {
      const fullyLockedStatuses = ["posted", "rejected", "cancelled"];
      if (fullyLockedStatuses.includes(requestData.data.status)) {
        showToast("This request is fully locked and its status cannot be changed.", "error");
        return;
      }
    }
  } catch (error) {
    console.error("Error checking request status:", error);
  }

  const statusConfigs = {
    under_review: { title: "Set to Under Review",  message: "Mark this request as Under Review? It will be moved to the review queue.", type: "info",    confirmText: "Yes, Set Under Review", countdown: 0 },
    for_signing:  { title: "Set to For Signing",   message: "Mark this request as For Signing? This will notify relevant signatories.",  type: "info",    confirmText: "Yes, Set For Signing",  countdown: 0 },
    signed:       { title: "Set to Signed",         message: "Mark this request as Signed? This indicates all signatures have been collected.", type: "success", confirmText: "Yes, Mark as Signed",   countdown: 0 },
    rejected:     { title: "Reject Request",         message: "WARNING: Rejecting this request will lock it permanently. This action cannot be undone. Are you sure?", type: "error",   confirmText: "Yes, Reject",           countdown: 3 },
    cancelled:    { title: "Cancel Request",         message: "WARNING: Cancelling this request will lock it permanently. This action cannot be undone. Are you sure?", type: "warning", confirmText: "Yes, Cancel",           countdown: 3 },
  };

  const config = statusConfigs[status];
  if (config) {
    const confirmed = await showConfirmDialog({ ...config, cancelText: "Cancel" });
    if (!confirmed) return;
  }

  const updateBtn = document.querySelector("#request-detail-modal .btn-secondary");
  const originalBtnText = updateBtn?.innerHTML;
  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Updating...';
  }

  const data = await api(`/requests/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

  if (updateBtn && originalBtnText) {
    updateBtn.disabled = false;
    updateBtn.innerHTML = originalBtnText;
  }

  if (data.success) {
    showToast("Status updated successfully!", "success");
    await updateRequestRowStatus(id, status);
    if (typeof RequestModal !== "undefined" && RequestModal.render) {
      await RequestModal.render(id);
    } else if (typeof showRequestDetail === "function") {
      await showRequestDetail(id);
    }
    if (state.currentPage === "dashboard" && typeof renderDashboard === "function") {
      renderDashboard();
    }
  } else {
    showToast(data.message || "Error updating status.", "error");
  }
}

// ─── Upload document ──────────────────────────────────────────────────────────
async function uploadDocument(id) {
  const fileInput = document.getElementById("doc-upload");
  const signatorySelect = document.getElementById("signatory-role-select");
  const signatureTypeRadios = document.querySelectorAll('input[name="signature_type"]');

  if (!fileInput?.files[0]) return showToast("Please select a file first.", "info");

  let signatureType = "single";
  for (let radio of signatureTypeRadios) {
    if (radio.checked) { signatureType = radio.value; break; }
  }

  const formData = new FormData();
  formData.append("document", fileInput.files[0]);
  formData.append("document_type", "signed_form");
  formData.append("signature_type", signatureType);

  if (signatureType === "single" && signatorySelect && signatorySelect.value) {
    formData.append("signatory_role", signatorySelect.value);
  }

  showToast("Uploading document...", "info");

  const data = await api(`/requests/${id}/upload`, { method: "POST", body: formData });

  if (data.success) {
    showToast(
      signatureType === "all"
        ? "Fully signed document uploaded! All signatories marked as signed."
        : "Document uploaded successfully!",
      "success"
    );
    if (typeof RequestModal !== "undefined" && RequestModal.render) {
      await RequestModal.render(id);
    } else if (typeof showRequestDetail === "function") {
      await showRequestDetail(id);
    }
  } else {
    showToast(data.message || "Upload failed.", "error");
  }
}

function selectSignatureType(type) {
  const allOption    = document.querySelector('input[name="signature_type"][value="all"]');
  const singleOption = document.querySelector('input[name="signature_type"][value="single"]');
  if (type === "all") {
    if (allOption)    allOption.checked    = true;
    if (singleOption) singleOption.checked = false;
    toggleSignatorySelect(false);
  } else {
    if (allOption)    allOption.checked    = false;
    if (singleOption) singleOption.checked = true;
    toggleSignatorySelect(true);
  }
}

function toggleSignatorySelect(show) {
  const container = document.getElementById("signatory-select-container");
  if (container) container.style.display = show ? "block" : "none";
}

async function loadRequestTypes() {
  const data = await api("/requests/types");
  if (data?.success) state.requestTypes = data.data;
}

// ─── View Document ────────────────────────────────────────────────────────────
async function viewDocument(docId) {
  const token = localStorage.getItem("mpc_token");
  if (!token) { showToast("You must be logged in to view documents.", "error"); return; }

  try {
    const response = await fetch(`${API}/documents/${docId}/view`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      showToast("Your session has expired. Please log in again.", "error");
      handleLogout();
      return;
    }

    if (response.ok) {
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");
      if (!newWindow) {
        const a = document.createElement("a");
        a.href = url; a.download = "document";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } else {
      showToast("Failed to load document. Please try again.", "error");
    }
  } catch (error) {
    console.error("View document error:", error);
    showToast("Failed to load document. Please try again.", "error");
  }
}

// ─── Print Form ───────────────────────────────────────────────────────────────
async function printOriginalForm(id) {
  const token = localStorage.getItem("mpc_token");
  if (!token) { showToast("You must be logged in to print.", "error"); return; }

  showToast("Opening printable form...", "info");

  try {
    const response = await fetch(`${API}/requests/${id}/print-form`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      showToast("Your session has expired. Please log in again.", "error");
      handleLogout();
      return;
    }

    if (response.ok) {
      const html = await response.text();
      // Open in new window and write HTML directly so relative resources aren't needed
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(html);
        newWindow.document.close();
      } else {
        // Popup blocked — fallback to blob
        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = `form-${id}.html`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        showToast("Popup blocked — form downloaded as HTML file.", "info");
      }
    } else {
      showToast("Failed to open printable form.", "error");
    }
  } catch (error) {
    console.error("Print error:", error);
    showToast("Failed to open printable form.", "error");
  }
}

// ─── Post to SAP ──────────────────────────────────────────────────────────────
async function postRequest(id) {
  try {
    const requestData = await api(`/requests/${id}`);

    if (requestData?.success && requestData.data.status === "posted") {
      showToast("This request has already been posted to SAP.", "info", "Already Posted", 3000);
      return;
    }
    if (requestData?.success && requestData.data.status !== "signed") {
      showToast("Request must be fully signed before posting to SAP.", "warning", "Cannot Post", 3000);
      return;
    }

    let promptModal = document.getElementById("sap-prompt-modal");
    if (!promptModal) {
      promptModal = document.createElement("div");
      promptModal.id = "sap-prompt-modal";
      promptModal.className = "modal-overlay hidden fixed inset-0 z-50 flex items-center justify-center p-4";
      promptModal.style.background = "rgba(0,0,0,0.5)";
      promptModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-display font-bold text-gray-800 text-lg">Post Request to SAP</h3>
              <p class="text-sm text-gray-500">Enter SAP Reference Number (optional)</p>
            </div>
          </div>
          <div class="p-5">
            <label class="form-label text-sm font-semibold text-gray-700">SAP Reference Number</label>
            <input type="text" id="sap-reference-input" class="form-input w-full mt-1" placeholder="e.g., SAP-2024-00123">
            <p class="text-xs text-gray-400 mt-2">This reference will be stored for future reference.</p>
          </div>
          <div class="p-5 border-t border-gray-100 flex gap-3">
            <button onclick="closeModal('sap-prompt-modal'); window._sapResolve(null)" class="btn btn-secondary flex-1 justify-center">Cancel</button>
            <button onclick="closeModal('sap-prompt-modal'); window._sapResolve(document.getElementById('sap-reference-input').value)" class="btn btn-primary flex-1 justify-center">Submit</button>
          </div>
        </div>
      `;
      document.body.appendChild(promptModal);
    }

    promptModal.classList.remove("hidden");

    const sapRef = await new Promise((resolve) => {
      window._sapResolve = resolve;
      const input = document.getElementById("sap-reference-input");
      if (input) {
        input.value = "";
        input.focus();
        const handleEnter = (e) => {
          if (e.key === "Enter") {
            closeModal("sap-prompt-modal");
            window._sapResolve(input.value);
            document.removeEventListener("keydown", handleEnter);
          }
        };
        document.addEventListener("keydown", handleEnter);
        const observer = new MutationObserver(() => {
          if (promptModal.classList.contains("hidden")) {
            document.removeEventListener("keydown", handleEnter);
            observer.disconnect();
          }
        });
        observer.observe(promptModal, { attributes: true, attributeFilter: ["class"] });
      }
    });

    if (sapRef === null) { showToast("Posting cancelled.", "info", "Cancelled", 2000); return; }

    const confirmed = await showConfirmDialog({
      title: "Confirm Posting to SAP",
      message: "Are you sure you want to post this request to SAP? This action will lock the request and cannot be undone.",
      type: "warning",
      confirmText: "Yes, Post to SAP",
      cancelText: "Cancel",
      countdown: 3,
    });

    if (!confirmed) { showToast("Posting cancelled.", "info", "Cancelled", 2000); return; }

    const postBtn = document.querySelector("#request-detail-modal .btn-success");
    const originalBtnText = postBtn?.innerHTML;
    if (postBtn) {
      postBtn.disabled = true;
      postBtn.innerHTML = '<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Posting to SAP...';
    }

    const data = await api(`/requests/${id}/post`, {
      method: "POST",
      body: JSON.stringify({ sap_reference: sapRef || null }),
    });

    if (postBtn && originalBtnText) {
      postBtn.disabled = false;
      postBtn.innerHTML = originalBtnText;
    }

    if (data.success) {
      showToast(sapRef ? `Posted with reference: ${sapRef}` : "Posted successfully!", "success", "Posted to SAP", 4000);
      if (typeof RequestModal !== "undefined" && RequestModal.render) {
        await RequestModal.render(id);
      } else if (typeof showRequestDetail === "function") {
        await showRequestDetail(id);
      }
      if (state.currentPage === "dashboard" && typeof renderDashboard === "function") renderDashboard();
      if (typeof renderRequests === "function") await renderRequests(state.currentPage === "all-requests");
    } else {
      showToast(data.message || "Error posting request.", "error", "Post Failed", 4000);
    }
  } catch (error) {
    console.error("Error posting request:", error);
    showToast("Something went wrong while posting.", "error", "Error", 4000);
  }
}

// ─── Submit helpers ───────────────────────────────────────────────────────────
async function updateRequestRowOnSubmit(requestId) {
  if (typeof RealtimeService !== "undefined" && RealtimeService.updateTableRowStatus) {
    await RealtimeService.updateTableRowStatus(requestId, "submitted");
    return true;
  }
  const rows = document.querySelectorAll("#requests-tbody tr");
  for (const row of rows) {
    const requestNoCell = row.querySelector("td:nth-child(2)");
    const checkbox = row.querySelector('input[type="checkbox"]');
    const dataId = checkbox ? checkbox.getAttribute("data-id") : null;
    if ((requestNoCell && requestNoCell.textContent.includes(requestId)) ||
        (dataId && parseInt(dataId) === requestId)) {
      const statusCell = row.querySelector("td:nth-child(6)");
      if (statusCell && typeof statusBadge === "function") {
        statusCell.innerHTML = statusBadge("submitted");
        statusCell.style.transition = "background-color 0.5s ease";
        statusCell.style.backgroundColor = "#dbeafe";
        setTimeout(() => { if (statusCell) statusCell.style.backgroundColor = ""; }, 1000);
      }
      const actionsCell = row.querySelector("td:last-child");
      if (actionsCell) {
        const submitBtn = actionsCell.querySelector(".btn-primary");
        if (submitBtn) {
          submitBtn.outerHTML = `<span class="text-xs text-slate-400 flex items-center gap-1 px-2">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg> Pending</span>`;
        }
      }
      break;
    }
  }
  return false;
}

async function submitRequest(id) {
  const submitBtn = document.querySelector(`button[onclick*="submitRequest(${id})"]`);
  const originalBtnText = submitBtn?.innerHTML;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></div> Submitting...';
  }

  const data = await api(`/requests/${id}/submit`, { method: "POST" });

  if (submitBtn && originalBtnText) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }

  if (data?.success) {
    showToast("Request submitted successfully!", "success");
    if (typeof RequestModal !== "undefined" && RequestModal.hide) RequestModal.hide();
    const currentPage = state.currentPage;
    if (currentPage === "dashboard" && typeof renderDashboard === "function") {
      renderDashboard();
    } else if ((currentPage === "requests" || currentPage === "all-requests") && typeof renderRequests === "function") {
      await renderRequests(currentPage === "all-requests");
    }
  } else {
    showToast(data?.message || "Error submitting request.", "error");
  }
}

// submitRequestModal — single definitive version with confirmation + immediate refresh
async function submitRequestModal(id) {
  const confirmed = await showConfirmDialog({
    title: "Submit Request",
    message: "Are you sure you want to submit this request for MPC review? Once submitted, it will be sent to MPC personnel for processing.",
    type: "info",
    confirmText: "Yes, Submit",
    cancelText: "Cancel",
    countdown: 3,
  });

  if (!confirmed) return;

  const submitBtn = document.querySelector("#request-detail-modal .btn-success");
  const originalBtnText = submitBtn?.innerHTML;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></div>';
  }

  const data = await api(`/requests/${id}/submit`, { method: "POST" });

  if (submitBtn && originalBtnText) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }

  if (data.success) {
    showToast("Request submitted successfully!", "success");
    await updateRequestRowOnSubmit(id);
    RequestModal.hide();

    if (state.currentPage === "dashboard" && typeof renderDashboard === "function") {
      renderDashboard();
    }
    if (typeof renderRequests === "function") {
      setTimeout(() => renderRequests(window._showAll || false), 1000);
    }
  } else {
    showToast(data?.message || "Error submitting request.", "error");
  }
}

// Make functions available globally
window.updateRequestRowOnSubmit = updateRequestRowOnSubmit;
window.submitRequestModal = submitRequestModal;
window.showConfirmDialog = showConfirmDialog;

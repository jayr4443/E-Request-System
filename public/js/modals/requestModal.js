// js/modals/requestModal.js - COMPLETE FIXED VERSION WITH WORKFLOW BANNER & DOCUMENT UPLOAD

const RequestModal = {
  elements: {
    modal: null,
    content: null,
    reqNo: null,
    reqSubject: null,
  },
  currentTab: "details",
  currentStatus: null,

  init() {
    this.elements.modal = document.getElementById("request-detail-modal");
    this.elements.content = document.getElementById("request-detail-content");
    this.elements.reqNo = document.getElementById("modal-req-no");
    this.elements.reqSubject = document.getElementById("modal-req-subject");
  },

  show() {
    if (this.elements.modal) {
      this.elements.modal.classList.remove("hidden");
      this.setLoading();
    }
  },

  hide() {
    if (this.elements.modal) {
      this.elements.modal.classList.add("hidden");
    }
  },

  setLoading() {
    if (this.elements.content) {
      this.elements.content.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin w-12 h-12 border-4 border-navy-700 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-slate-500">Loading request details...</p>
          </div>
        </div>
      `;
    }
  },

  setError(message) {
    if (this.elements.content) {
      this.elements.content.innerHTML = `
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="text-red-600 font-medium">${this.escapeHtml(message)}</p>
            <button onclick="RequestModal.hide()" class="btn btn-secondary mt-4">Close</button>
          </div>
        </div>
      `;
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  },

  async render(requestId) {
    this.show();

    const data = await api(`/requests/${requestId}`);

    if (!data?.success) {
      this.setError(data?.message || "Failed to load request details.");
      return;
    }

    const r = data.data;
    this.currentStatus = r.status;

    if (this.elements.reqNo) this.elements.reqNo.textContent = r.request_no;
    if (this.elements.reqSubject)
      this.elements.reqSubject.textContent = r.subject;

    const isManager =
      state.user &&
      [
        "mpc_personnel",
        "it_manager",
        "senior_manager",
        "vp_operations",
        "admin",
      ].includes(state.user.role);

    const editLocked = !["draft", "submitted"].includes(r.status);
    const canEdit = !editLocked;
    const canSubmit = r.status === "draft";

    const html = this.buildRequestHTML(r, isManager, canEdit, canSubmit);
    if (this.elements.content) {
      this.elements.content.innerHTML = html;
      this.attachTabListeners();
    }
  },

  attachTabListeners() {
    const tabs = document.querySelectorAll(".detail-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabId = tab.getAttribute("data-tab");
        this.switchTab(tabId);
      });
    });
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    document.querySelectorAll(".detail-tab").forEach((tab) => {
      if (tab.getAttribute("data-tab") === tabId) {
        tab.classList.add("active-tab");
        tab.classList.remove("inactive-tab");
      } else {
        tab.classList.remove("active-tab");
        tab.classList.add("inactive-tab");
      }
    });

    document.querySelectorAll(".tab-pane").forEach((pane) => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.remove("hidden");
      } else {
        pane.classList.add("hidden");
      }
    });
  },

  // ============================================
  // WORKFLOW INFO BANNER
  // ============================================
  renderWorkflowInfo(r, isManager) {
    const workflowSteps = {
      draft: {
        currentStep: 1,
        nextAction: "Submit for Review",
        nextStatus: "submitted",
        message: "Complete the form and submit your request for MPC review.",
        instructions:
          "Review all information, then click the Submit button below to send this request to MPC personnel.",
        requesterMessage:
          "Your request is ready to be submitted. Please review all information before submitting.",
        requesterInstructions:
          'Click the "Submit Request" button to send this for MPC review.',
        color: "blue",
      },
      submitted: {
        currentStep: 2,
        nextAction: "Start Review",
        nextStatus: "under_review",
        message: "This request is pending MPC review.",
        instructions:
          'MPC personnel should review the request details and change status to "Under Review" to begin processing.',
        requesterMessage:
          "Your request has been submitted and is waiting for MPC review.",
        requesterInstructions:
          "MPC personnel will review your request shortly. You will be notified when the status changes.",
        color: "blue",
        requiresManager: true,
      },
      under_review: {
        currentStep: 3,
        nextAction: "Send for Signing",
        nextStatus: "for_signing",
        message: "Request is currently under review by MPC.",
        instructions:
          'After verification, change status to "For Signing" to route the request to signatories for approval.',
        requesterMessage:
          "Your request is currently being reviewed by MPC personnel.",
        requesterInstructions:
          "MPC is reviewing your request. You will be notified once it moves to the signing stage.",
        color: "amber",
        requiresManager: true,
      },
      for_signing: {
        currentStep: 4,
        nextAction: "Mark as Signed",
        nextStatus: "signed",
        message: "Request is waiting for signatories to sign.",
        instructions:
          'After all signatories have signed, either upload the fully signed document or change status to "Signed".',
        requesterMessage:
          "Your request has been approved and is now waiting for signatures from authorized signatories.",
        requesterInstructions:
          "The request has been sent to signatories. You can upload the fully signed document once available.",
        color: "purple",
        requiresManager: false, // Allow requester to upload document
      },
      signed: {
        currentStep: 5,
        nextAction: "Post to SAP",
        nextStatus: "posted",
        message: "All signatures have been collected.",
        instructions:
          "MPC personnel should post this request to SAP to complete the process.",
        requesterMessage:
          "All required signatures have been collected for your request.",
        requesterInstructions:
          "Your request is complete and ready for final posting to SAP. You will be notified once posted.",
        color: "green",
        requiresManager: true,
      },
      posted: {
        currentStep: 6,
        nextAction: null,
        nextStatus: null,
        message: "Request has been successfully posted to SAP.",
        instructions: "This request is complete and cannot be modified.",
        requesterMessage: "Your request has been successfully posted to SAP.",
        requesterInstructions:
          "This request is now complete. Thank you for using MPC Electronic Request System.",
        color: "gray",
        isFinal: true,
      },
      rejected: {
        currentStep: null,
        nextAction: null,
        nextStatus: null,
        message: "This request has been rejected.",
        instructions:
          "Please contact MPC for more information about the rejection reason.",
        requesterMessage: "Your request has been rejected.",
        requesterInstructions:
          "Please contact MPC for more information about why your request was rejected.",
        color: "red",
        isFinal: true,
        isError: true,
      },
      cancelled: {
        currentStep: null,
        nextAction: null,
        nextStatus: null,
        message: "This request has been cancelled.",
        instructions: "This request is closed and cannot be modified.",
        requesterMessage: "Your request has been cancelled.",
        requesterInstructions:
          "This request is closed. Please contact MPC if you have questions.",
        color: "gray",
        isFinal: true,
      },
    };

    const step = workflowSteps[r.status];
    if (!step) return "";

    // Use different messages based on user role
    const displayMessage = isManager ? step.message : step.requesterMessage;
    const displayInstructions = isManager
      ? step.instructions
      : step.requesterInstructions;
    const showActionHint = step.requiresManager ? isManager : true;

    // Progress bar width calculation
    const stepOrder = [
      "draft",
      "submitted",
      "under_review",
      "for_signing",
      "signed",
      "posted",
    ];
    const currentIndex = stepOrder.indexOf(r.status);
    const progressPercent =
      currentIndex >= 0 ? (currentIndex / (stepOrder.length - 1)) * 100 : 0;

    // Color mapping
    const colorClasses = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-800",
        light: "text-blue-700",
        icon: "bg-blue-100",
        iconSvg: "text-blue-600",
        progress: "#4f46e5",
      },
      amber: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-800",
        light: "text-amber-700",
        icon: "bg-amber-100",
        iconSvg: "text-amber-600",
        progress: "#f59e0b",
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-800",
        light: "text-purple-700",
        icon: "bg-purple-100",
        iconSvg: "text-purple-600",
        progress: "#8b5cf6",
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-800",
        light: "text-green-700",
        icon: "bg-green-100",
        iconSvg: "text-green-600",
        progress: "#10b981",
      },
      red: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-800",
        light: "text-red-700",
        icon: "bg-red-100",
        iconSvg: "text-red-600",
        progress: "#ef4444",
      },
      gray: {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-800",
        light: "text-gray-600",
        icon: "bg-gray-100",
        iconSvg: "text-gray-600",
        progress: "#6b7280",
      },
    };

    const colors = colorClasses[step.color] || colorClasses.blue;

    // Get role-specific icon
    const getIcon = () => {
      if (step.isError) {
        return `<div class="w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center"><svg class="w-5 h-5 ${colors.iconSvg}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`;
      }
      if (step.isFinal) {
        return `<div class="w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center"><svg class="w-5 h-5 ${colors.iconSvg}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`;
      }
      if (r.status === "for_signing") {
        return `<div class="w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center animate-pulse"><svg class="w-5 h-5 ${colors.iconSvg}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg></div>`;
      }
      if (r.status === "submitted") {
        return `<div class="w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center"><svg class="w-5 h-5 ${colors.iconSvg}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`;
      }
      return `<div class="w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center"><svg class="w-5 h-5 ${colors.iconSvg}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>`;
    };

    return `
      <div class="workflow-banner rounded-xl overflow-hidden mb-6 shadow-sm">
        <!-- Progress Bar -->
        <div class="bg-gray-100 h-1.5">
          <div class="workflow-progress h-full transition-all duration-500" style="width: ${progressPercent}%; background: linear-gradient(90deg, ${colors.progress}, #10b981);"></div>
        </div>
        
        <!-- Status Info -->
        <div class="p-4 ${colors.bg} border-t ${colors.border}">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              ${getIcon()}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-semibold ${colors.text}">${displayMessage}</h4>
                ${step.currentStep ? `<span class="text-xs px-2 py-0.5 rounded-full bg-white/50 ${colors.text}">Step ${step.currentStep} of 6</span>` : ""}
              </div>
              <p class="text-sm ${colors.light} mt-1">${displayInstructions}</p>
              
              ${
                showActionHint && step.nextAction
                  ? `
                <div class="mt-3 flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-medium ${colors.text}">Next step:</span>
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white shadow-sm">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    ${step.nextAction}
                  </span>
                  <button onclick="showWorkflowHelp('${r.status}')" class="text-xs text-blue-600 hover:text-blue-800 underline">
                    How to proceed?
                  </button>
                </div>
              `
                  : ""
              }
              <!-- Additional info for requester when request is under_review -->
              ${
                !isManager && r.status === "under_review"
                  ? `
                <div class="mt-3 text-xs text-amber-600 bg-amber-50/50 rounded-lg p-2 inline-block">
                  🔍 MPC is currently reviewing your request. You will be notified once the review is complete.
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // DOCUMENT UPLOAD SECTION - FOR BOTH REQUESTER AND MANAGER
  // ============================================
  renderDocumentUpload(r) {
    // Get pending signatories for info display
    const pendingSignatories = r.approvals
      ? r.approvals
          .filter((a) => a.status === "pending")
          .map((a) => a.signatory_label)
      : [];

    return `
      <div class="mt-6 border-2 border-dashed border-purple-300 rounded-xl p-5 bg-purple-50/30">
        <h4 class="font-semibold text-purple-700 text-sm mb-3 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Upload Signed Document
        </h4>
        
        <!-- Info about pending signatories -->
        ${
          pendingSignatories.length > 0 && r.status === "for_signing"
            ? `
          <div class="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <div class="text-sm text-yellow-800">
                <span class="font-medium">Waiting for signatures from:</span>
                <span class="ml-1">${pendingSignatories.join(", ")}</span>
              </div>
            </div>
          </div>
        `
            : ""
        }
        
        ${
          r.status === "signed"
            ? `
          <div class="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="text-sm text-green-800">
                <span class="font-medium">All signatures have been collected!</span>
                <span class="ml-1">You can now upload the fully signed document.</span>
              </div>
            </div>
          </div>
        `
            : ""
        }
        
        <div class="mb-4">
          <label class="form-label text-sm font-semibold">Select Document Type</label>
          <div class="flex flex-col gap-3 mt-2">
            <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 transition-all hover:border-purple-300 border-slate-200"
                   onclick="selectSignatureType('all')">
              <input type="radio" name="signature_type" value="all" class="mt-0.5 accent-purple-600" onchange="toggleSignatorySelect(false)" checked>
              <div class="flex-1">
                <div class="font-medium text-slate-800">📄 Fully Signed Document (Recommended)</div>
                <div class="text-xs text-slate-500 mt-0.5">Upload a single PDF/Excel that contains ALL signatures from ALL signatories</div>
              </div>
              <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </label>
          </div>
        </div>
        
        <div class="flex gap-3 items-center mt-4">
          <div class="flex-1">
            <input type="file" id="doc-upload" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx" class="form-input text-sm" />
          </div>
          <button onclick="uploadDocument(${r.id})" class="btn btn-primary btn-sm flex-shrink-0 bg-purple-600 hover:bg-purple-700">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
            Upload Signed Document
          </button>
        </div>
        
        <div class="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Accepted formats: PDF, JPG, PNG, Excel — Max 10MB</span>
        </div>
        
        <div class="mt-3 text-xs text-purple-600 bg-purple-50 rounded-lg p-2">
          <span class="font-medium">💡 Tip:</span> Once uploaded, all signatories will be automatically marked as signed and the request will move to "Signed" status.
        </div>
      </div>
    `;
  },

  buildRequestHTML(r, isManager, canEdit, canSubmit) {
    // FULLY LOCKED STATUSES - No actions for anyone
    const fullyLocked =
      r.status === "posted" ||
      r.status === "rejected" ||
      r.status === "cancelled";

    // Requesters cannot edit after submitted
    const requesterCannotEdit =
      !isManager && r.status !== "draft" && r.status !== "submitted";

    // Show edit button?
    const showEdit = canEdit && !requesterCannotEdit && !fullyLocked;

    // Show submit button?
    const showSubmit = canSubmit && !fullyLocked && r.status === "draft";

    // Show admin actions (status dropdown) - ONLY if admin AND not fully locked
    const showAdminActions = isManager && !fullyLocked;

    // Show post button - only if admin AND status is signed AND not fully locked
    const showPostButton = isManager && r.status === "signed" && !fullyLocked;

    // ============================================
    // FIXED: Show document upload for BOTH requester AND manager
    // when status is for_signing or signed, and not fully locked
    // ============================================
    const showDocumentUpload =
      !fullyLocked && (r.status === "for_signing" || r.status === "signed");

    return `
      <style>
        .detail-tab {
          transition: all 0.2s ease;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          padding: 10px 16px;
          font-weight: 500;
          font-size: 13px;
        }
        .detail-tab.active-tab {
          color: #1a228f;
          border-bottom-color: #1a228f;
          background: #f0f4ff;
        }
        .detail-tab.inactive-tab {
          color: #64748b;
          border-bottom-color: transparent;
        }
        .detail-tab.inactive-tab:hover {
          color: #1a228f;
          background: #f8fafc;
        }
        .tab-pane {
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .info-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px 16px;
        }
        .status-select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          background: white;
        }
        .locked-banner {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px 16px;
          border-radius: 12px;
        }
        .info-banner {
          background: #dbeafe;
          border-left: 4px solid #3b82f6;
          padding: 12px 16px;
          border-radius: 12px;
        }
        .workflow-banner {
          animation: slideDown 0.3s ease-out;
        }
        .workflow-progress {
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      
      <div class="space-y-6">
        <!-- Header with status and actions -->
        <div class="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div class="flex flex-wrap gap-3 items-center">
            ${window.statusBadge ? window.statusBadge(r.status) : `<span class="badge badge-${r.status}">${r.status}</span>`}
            <span class="badge" style="background:#f1f5f9;color:#475569">${this.escapeHtml(r.request_type_name)}</span>
            <span class="font-semibold text-sm priority-${r.priority} px-2 py-1 rounded-full bg-slate-100">${r.priority.toUpperCase()}</span>
            ${showEdit ? this.renderEditButton(r.id) : !fullyLocked && !showEdit && r.status !== "draft" ? this.renderRequesterLockedMessage() : ""}
            ${showSubmit ? this.renderSubmitButton(r.id) : ""}
            ${this.renderPrintButton(r.id)}
          </div>
          ${showAdminActions ? this.renderAdminActions(r, showPostButton) : fullyLocked ? this.renderLockedAdminMessage(r.status) : ""}
        </div>
        
        <!-- WORKFLOW INFO BANNER -->
        ${this.renderWorkflowInfo(r, isManager)}
        
        <!-- Status Info Banner (for non-admin when request is under review or for signing) -->
        ${
          !isManager &&
          (r.status === "under_review" ||
            r.status === "for_signing" ||
            r.status === "signed") &&
          !fullyLocked
            ? `
          <div class="info-banner flex items-center gap-3">
            <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-800">Request is under processing</p>
              <p class="text-xs text-blue-700">Your request is currently ${r.status.replace("_", " ")}. You cannot edit it at this stage.</p>
            </div>
          </div>
        `
            : ""
        }
        
        <!-- Fully Locked Banner -->
        ${
          fullyLocked
            ? `
          <div class="locked-banner flex items-center gap-3">
            <svg class="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <div>
              <p class="text-sm font-medium text-amber-800">This request is locked</p>
              <p class="text-xs text-amber-700">
                ${
                  r.status === "posted"
                    ? "This request has been posted to SAP and cannot be modified."
                    : r.status === "rejected"
                      ? "This request has been rejected and cannot be modified."
                      : "This request has been cancelled and cannot be modified."
                }
              </p>
            </div>
          </div>
        `
            : ""
        }

        <!-- Request Info Cards -->
        <div class="info-grid">
          <div class="info-card">
            <div class="text-xs text-slate-400 font-semibold uppercase mb-1">Requester</div>
            <div class="text-sm font-medium text-slate-800">${this.escapeHtml(r.requester_name)}</div>
          </div>
          <div class="info-card">
            <div class="text-xs text-slate-400 font-semibold uppercase mb-1">Email</div>
            <div class="text-sm font-medium text-slate-800 overflow-x-auto whitespace-normal break-all md:whitespace-normal">
              ${this.escapeHtml(r.email || "—")}
            </div>
          </div>
          <div class="info-card">
            <div class="text-xs text-slate-400 font-semibold uppercase mb-1">Department</div>
            <div class="text-sm font-medium text-slate-800">${this.escapeHtml(r.requester_department || "—")}</div>
          </div>
          <div class="info-card">
            <div class="text-xs text-slate-400 font-semibold uppercase mb-1">Created</div>
            <div class="text-sm font-medium text-slate-800">${window.formatDateTime ? window.formatDateTime(r.created_at) : r.created_at || "—"}</div>
          </div>
          <div class="info-card">
            <div class="text-xs text-slate-400 font-semibold uppercase mb-1">Submitted</div>
            <div class="text-sm font-medium text-slate-800">${r.submitted_at ? (window.formatDateTime ? window.formatDateTime(r.submitted_at) : r.submitted_at) : "—"}</div>
          </div>
          ${
            r.sap_reference
              ? `
          <div class="info-card">
            <div class="text-xs text-slate-400 font-semibold uppercase mb-1">SAP Reference</div>
            <div class="text-sm font-mono font-medium text-green-700">${this.escapeHtml(r.sap_reference)}</div>
          </div>
          `
              : ""
          }
        </div>

        <!-- TABS -->
        <div class="border-b border-slate-200">
          <div class="flex gap-1">
            <button class="detail-tab active-tab" data-tab="details">📋 Form Details</button>
            <button class="detail-tab inactive-tab" data-tab="documents">📎 Documents</button>
            <button class="detail-tab inactive-tab" data-tab="history">🕐 History</button>
          </div>
        </div>

        <!-- TAB: Form Details -->
        <div id="tab-details" class="tab-pane">
          ${this.renderFormData(r.form_data)}
          ${showDocumentUpload ? this.renderDocumentUpload(r) : fullyLocked ? this.renderLockedDocumentMessage() : ""}
        </div>

        <!-- TAB: Documents -->
        <div id="tab-documents" class="tab-pane hidden">
          ${this.renderDocuments(r.documents)}
        </div>

        <!-- TAB: History -->
        <div id="tab-history" class="tab-pane hidden">
          ${this.renderAuditTrail(r.audit_logs)}
        </div>
      </div>
    `;
  },

  renderEditButton(id) {
    return `
      <button onclick="openEditRequestModal(${id})" 
        class="btn btn-sm flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
        </svg>
        Edit Request
      </button>
    `;
  },

  renderSubmitButton(id) {
    return `
      <button onclick="submitRequestModal(${id})" 
        class="btn btn-success btn-sm flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Submit Request
      </button>
    `;
  },

  renderPrintButton(id) {
    return `
      <button onclick="printOriginalForm(${id})" 
        class="btn btn-sm flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.72 13.829m7.288-2.509c-.24-.03-.48-.063-.72-.097m.72.097c.24.03.48.062.72.097m0 0c.24.03.48.062.72.097m-7.288 2.509c-.24.03-.48.062-.72.096m.72-.096v.096m.72-2.509c.24.03.48.062.72.097m0 0c.24.03.48.062.72.097m-2.16 2.421a42.415 42.415 0 0110.56 0m-10.56 0v.096m0 0H4.5l2.5-2.5m8.5 2.5l2.5-2.5m-2.5 2.5v.096m-7.288-2.509v.096m10.56 0v.096m-10.56 0v.096m10.56 0v.096"/>
        </svg>
        Print Form
      </button>
    `;
  },

  renderRequesterLockedMessage() {
    return `
      <div class="flex items-center gap-2 text-xs text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Editing locked — request is under review
      </div>
    `;
  },

  renderAdminActions(r, showPostButton) {
    return `
      <div class="flex gap-2 flex-wrap">
        <select id="detail-status-select" class="status-select">
          <option value="">Change Status...</option>
          <option value="under_review" ${r.status === "under_review" ? "selected" : ""}>Under Review</option>
          <option value="for_signing" ${r.status === "for_signing" ? "selected" : ""}>For Signing</option>
          <option value="signed" ${r.status === "signed" ? "selected" : ""}>Signed</option>
          <option value="rejected" ${r.status === "rejected" ? "selected" : ""}>Rejected</option>
          <option value="cancelled" ${r.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
        <button onclick="updateRequestStatus(${r.id})" class="btn btn-secondary btn-sm">Update</button>
        ${showPostButton ? `<button onclick="postRequest(${r.id})" class="btn btn-success btn-sm">Post to SAP</button>` : ""}
      </div>
    `;
  },

  renderLockedAdminMessage(status) {
    let message = "";
    if (status === "posted") message = "posted to SAP";
    else if (status === "rejected") message = "rejected";
    else if (status === "cancelled") message = "cancelled";

    return `
      <div class="flex gap-2 flex-wrap items-center">
        <div class="flex items-center gap-2 text-xs text-amber-600 px-3 py-2 bg-amber-50 rounded-lg">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <span>Request is locked — ${message}</span>
        </div>
      </div>
    `;
  },

  renderLockedDocumentMessage() {
    return `
      <div class="mt-6 border border-slate-200 rounded-xl p-5 bg-slate-50">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <div>
            <p class="text-sm font-medium text-slate-700">Document upload is locked</p>
            <p class="text-xs text-slate-500">This request is locked and cannot accept new document uploads.</p>
          </div>
        </div>
      </div>
    `;
  },

  renderFormData(formData) {
    if (!formData || typeof formData !== "object")
      return `
      <div class="text-center text-slate-400 py-8">
        <div class="text-4xl mb-2">📝</div>
        <p>No form data available.</p>
      </div>
    `;

    const EXCLUDED_KEYS = new Set([
      "id",
      "request_id",
      "created_at",
      "updated_at",
      "description",
      "docs",
      "category",
      "form_code",
      "email ",
      "requester_name",
    ]);
    const entries = Object.entries(formData).filter(
      ([k, v]) => !EXCLUDED_KEYS.has(k) && v !== null && v !== "" && v !== 0,
    );

    if (entries.length === 0)
      return `
      <div class="text-center text-slate-400 py-8">
        <div class="text-4xl mb-2">📝</div>
        <p>No form data available.</p>
      </div>
    `;

    const fieldLabel = (key) =>
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return `
      <div>
        <h4 class="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
          </svg>
          Form Data
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
          ${entries
            .map(([k, v]) => {
              const display = v === 1 ? "Yes" : v === 0 ? "No" : v;
              return `
              <div class="py-2 border-b border-slate-100 last:border-0">
                <div class="text-xs font-semibold text-slate-400 uppercase mb-0.5">${fieldLabel(k)}</div>
                <div class="text-sm text-slate-800">${this.escapeHtml(String(display))}</div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  },

  renderDocuments(documents) {
    if (!documents?.length)
      return `
      <div class="text-center text-slate-400 py-8">
        <div class="text-4xl mb-2">📎</div>
        <p>No documents attached.</p>
      </div>
    `;

    return `
      <div>
        <h4 class="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
          </svg>
          Attached Documents
        </h4>
        <div class="space-y-2">
          ${documents
            .map(
              (d) => `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div class="flex items-center gap-3">
                <span class="text-2xl">${d.mime_type?.includes("pdf") ? "📄" : d.mime_type?.includes("image") ? "🖼️" : "📎"}</span>
                <div>
                  <div class="text-sm font-medium text-slate-800">${this.escapeHtml(d.original_name)}</div>
                  <div class="text-xs text-slate-400">${this.escapeHtml(d.uploaded_by_name)} · ${window.formatDateTime ? window.formatDateTime(d.created_at) : d.created_at}</div>
                </div>
              </div>
              <button onclick="viewDocument(${d.id})" class="btn btn-secondary btn-sm">View</button>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  },

  renderAuditTrail(logs) {
    if (!logs?.length)
      return `
      <div class="text-center text-slate-400 py-8">
        <div class="text-4xl mb-2">🕐</div>
        <p>No activity recorded.</p>
      </div>
    `;

    return `
      <div>
        <h4 class="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Activity Timeline
        </h4>
        <div class="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-4">
          ${logs
            .map(
              (log) => `
            <div class="relative">
              <div class="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow"></div>
              <div class="bg-slate-50 rounded-lg p-3">
                <div class="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span class="font-semibold text-slate-800 text-sm">${this.escapeHtml(log.action)}</span>
                    <span class="text-slate-400 text-sm ml-2">by ${this.escapeHtml(log.user_name)}</span>
                    ${log.details ? `<p class="text-sm text-slate-500 mt-1">${this.escapeHtml(log.details)}</p>` : ""}
                  </div>
                  <span class="text-xs text-slate-400 whitespace-nowrap">${window.formatDateTime ? window.formatDateTime(log.created_at) : log.created_at}</span>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  },
};

// ============================================
// WORKFLOW HELP FUNCTION
// ============================================
function showWorkflowHelp(currentStatus) {
  const helpMessages = {
    draft: {
      title: "How to Submit a Request",
      steps: [
        "Review all filled information in the form",
        'Click the "Submit Request" button below',
        "Your request will be sent to MPC personnel for review",
        "You will receive notifications about the progress",
      ],
      tip: "Make sure all required fields are filled before submitting.",
    },
    submitted: {
      title: "Request Under Review Process",
      steps: [
        "MPC personnel will review your request details",
        "They may contact you for additional information if needed",
        'Once reviewed, status will change to "Under Review"',
        "You will be notified of any updates via email and notifications",
      ],
      tip: "You cannot edit the request once submitted. Contact MPC if changes are needed.",
    },
    under_review: {
      title: "How to Send for Signing",
      steps: [
        "Review the request details thoroughly",
        "Verify all information is correct and complete",
        'Select "For Signing" from the status dropdown',
        'Click "Update" to change the status',
        "The request will be routed to the configured signatories",
      ],
      tip: 'Only MPC personnel can change status to "For Signing".',
    },
    for_signing: {
      title: "How to Complete the Signing Process",
      steps: [
        "Option 1: Upload the fully signed document (PDF/Excel)",
        'Option 2: MPC personnel can change status to "Signed" from dropdown',
        "All signatories must sign before proceeding",
        "Once signed, the request can be posted to SAP",
      ],
      tip: 'Use the "Fully Signed Document" option to upload one file containing all signatures.',
    },
    signed: {
      title: "How to Post to SAP",
      steps: [
        'Click the "Post to SAP" button',
        "Enter the SAP Reference Number (optional)",
        "Confirm the posting",
        "The request will be marked as complete and locked",
      ],
      tip: "Once posted, the request cannot be modified.",
    },
  };

  const help = helpMessages[currentStatus] || helpMessages["draft"];

  // Create modal if not exists
  let helpModal = document.getElementById("workflow-help-modal");
  if (!helpModal) {
    helpModal = document.createElement("div");
    helpModal.id = "workflow-help-modal";
    helpModal.className =
      "modal-overlay hidden fixed inset-0 z-50 flex items-center justify-center p-4";
    helpModal.style.background = "rgba(0,0,0,0.5)";
    helpModal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-gray-800" id="help-title">Workflow Guide</h3>
          </div>
          <button onclick="closeModal('workflow-help-modal')" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="p-5 space-y-4">
          <div id="help-content"></div>
          <div class="pt-3 border-t border-gray-100">
            <button onclick="closeModal('workflow-help-modal')" class="btn btn-primary w-full justify-center">Got it</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(helpModal);
  }

  // Add animation style if not exists
  if (!document.getElementById("workflow-help-style")) {
    const style = document.createElement("style");
    style.id = "workflow-help-style";
    style.textContent = `
      @keyframes scale {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-scale {
        animation: scale 0.2s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  document.getElementById("help-title").textContent = help.title;
  document.getElementById("help-content").innerHTML = `
    <div class="space-y-4">
      <div class="bg-blue-50 rounded-lg p-3">
        <p class="text-sm text-blue-800">💡 ${help.tip}</p>
      </div>
      <div>
        <h4 class="font-semibold text-gray-800 text-sm mb-2">Steps to follow:</h4>
        <div class="space-y-2">
          ${help.steps
            .map(
              (step, idx) => `
            <div class="flex items-start gap-2">
              <div class="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">${idx + 1}</div>
              <p class="text-sm text-gray-700">${step}</p>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  helpModal.classList.remove("hidden");
}

// Override the existing showRequestDetail function
if (typeof window.showRequestDetail === "undefined") {
  window.showRequestDetail = async function (id) {
    await RequestModal.render(id);
  };
}

// Make functions available globally
window.submitRequestModal = submitRequestModal;
window.showWorkflowHelp = showWorkflowHelp;

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      RequestModal.init();
    }, 200);
  });
} else {
  setTimeout(function () {
    RequestModal.init();
  }, 200);
}

// js/modals/editRequestModal.js - FULLY FIXED

const EditRequestModal = {
  currentRequestId: null,
  currentCategory: null,
  currentRequestData: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    this.createModal();
    this.initialized = true;
  },

  createModal() {
    if (document.getElementById("edit-request-modal")) return;

    const modalHTML = `
      <div id="edit-request-modal" class="modal-overlay hidden fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5)">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col" style="max-height: 90vh">
          <div class="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <span id="erm-badge" class="text-xs font-bold px-2 py-1 rounded-full text-white" style="background: #1e28b4">SRRF</span>
              <div>
                <h2 class="font-display font-bold text-slate-800 text-lg">Edit Request</h2>
                <p id="erm-request-no" class="text-sm text-slate-400 mt-0.5"></p>
              </div>
            </div>
            <button onclick="EditRequestModal.close()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 text-lg">✕</button>
          </div>

          <div class="overflow-y-auto flex-1 p-5 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div class="md:col-span-2">
                <label class="form-label">Subject <span class="text-red-500">*</span></label>
                <input type="text" id="erm-subject" class="form-input" placeholder="Request subject">
              </div>
              <div>
                <label class="form-label">Priority</label>
                <select id="erm-priority" class="form-input">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div id="erm-form-body"></div>
          </div>

          <div class="flex items-center justify-between gap-3 p-5 border-t border-slate-100 flex-shrink-0">
            <p class="text-xs text-slate-400">Fields marked <span class="text-red-500">*</span> are required</p>
            <div class="flex gap-3">
              <button onclick="EditRequestModal.close()" class="btn btn-secondary">Cancel</button>
              <button onclick="EditRequestModal.save()" class="btn btn-primary">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.5 12.75l6 6 9-13.5"/>
                </svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modal = document.getElementById("edit-request-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.close();
      });
    }
  },

  async open(requestId) {
    if (!requestId) {
      showToast("Invalid request ID.", "error");
      return;
    }

    this.currentRequestId = requestId;

    const response = await api(`/requests/${requestId}`);
    if (!response?.success) {
      showToast("Could not load request data.", "error");
      return;
    }

    const request = response.data;
    this.currentRequestData = request;

    if (!["draft", "submitted"].includes(request.status)) {
      showToast("This request can no longer be edited.", "error");
      return;
    }

    const categoryMap = { 1: "SUPPLIER", 2: "CUSTOMER", 3: "EMPLOYEE" };
    this.currentCategory = categoryMap[request.request_type_id] || "EMPLOYEE";

    if (typeof window.FORM_CONFIGS === "undefined") {
      showToast(
        "System configuration error. Please refresh the page.",
        "error",
      );
      return;
    }

    const cfg = window.FORM_CONFIGS[this.currentCategory];
    if (!cfg) {
      showToast("Form configuration not found.", "error");
      return;
    }

    const badge = document.getElementById("erm-badge");
    const requestNoEl = document.getElementById("erm-request-no");
    const subjectEl = document.getElementById("erm-subject");
    const priorityEl = document.getElementById("erm-priority");

    if (badge) {
      badge.textContent = cfg.code;
      badge.style.background = cfg.color;
    }
    if (requestNoEl) requestNoEl.textContent = request.request_no;
    if (subjectEl) subjectEl.value = request.subject || "";
    if (priorityEl) priorityEl.value = request.priority || "normal";

    // ── FIX 1: Merge form_data + docs_selected into one data object ──────────
    // docs_selected is [{document_name: "..."}, ...] from tbl_request_documents_selected
    // We need to turn it into a comma-separated string keyed as 'docs'
    // so renderCheckboxField can find it under existingData['docs']
    const formData = request.form_data || {};

    const docsSelected = Array.isArray(request.docs_selected)
      ? request.docs_selected
          .map((d) => (typeof d === "object" ? d.document_name : d))
          .map((d) => (d || "").trim())
          .filter(Boolean)
      : [];

    // Build merged data: spread form_data, then add 'docs' key
    const mergedData = Object.assign({}, formData, {
      docs: docsSelected.join(", "),
    });

    this.renderForm(cfg, mergedData);

    const modal = document.getElementById("edit-request-modal");
    if (modal) modal.classList.remove("hidden");
  },

  renderForm(cfg, existingData) {
    const container = document.getElementById("erm-form-body");
    if (!container) return;

    let html = "";

    cfg.sections.forEach((section, sectionIdx) => {
      html += `
        <div class="mb-6 rounded-xl overflow-hidden border border-slate-200">
          <div class="px-4 py-3" style="background: ${cfg.bgColor}; border-bottom: 2px solid ${cfg.color}">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background: ${cfg.color}">${sectionIdx + 1}</span>
              <h3 class="font-semibold text-slate-800">${section.heading}</h3>
            </div>
          </div>
          <div class="p-4 space-y-4">
      `;

      section.fields.forEach((field) => {
        let currentValue = existingData[field.id];

        // Fallback aliases for known column name differences
        if (currentValue === undefined || currentValue === null) {
          const aliases = {
            remarks_comments: ["remarks_reason", "remarks_comments"],
            remarks_reason: ["remarks_comments", "remarks_reason"],
            payment_terms: ["billing_payment_terms", "payment_terms"],
          };
          const fallbacks = aliases[field.id];
          if (fallbacks) {
            for (const key of fallbacks) {
              if (
                existingData[key] !== undefined &&
                existingData[key] !== null
              ) {
                currentValue = existingData[key];
                break;
              }
            }
          }
        }

        if (field.type === "radio-group") {
          html += this.renderRadioField(field, currentValue);
        } else if (field.type === "checkbox-group") {
          html += this.renderCheckboxField(field, currentValue);
        } else if (field.type === "select") {
          html += this.renderSelectField(field, currentValue);
        } else if (field.type === "textarea") {
          html += this.renderTextareaField(field, currentValue);
        } else {
          html += this.renderInputField(field, currentValue);
        }
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;
  },

  renderRadioField(field, currentValue) {
    const requiredStar = field.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";

    // Normalise to uppercase string for case-insensitive comparison
    const normalizedCurrent =
      currentValue != null ? String(currentValue).toUpperCase().trim() : "";

    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${field.label}${requiredStar}</label>
        <div class="flex flex-wrap gap-4">
          ${field.options
            .map((opt) => {
              const isChecked =
                normalizedCurrent !== "" &&
                normalizedCurrent === String(opt).toUpperCase().trim();
              return `
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="erm_${field.id}" value="${this.escapeHtml(opt)}"
                    ${isChecked ? "checked" : ""}
                    ${field.required ? "required" : ""}
                    class="accent-blue-600 w-4 h-4">
                  <span class="text-sm text-slate-700">${this.escapeHtml(opt)}</span>
                </label>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  },

  renderCheckboxField(field, currentValue) {
    const booleanFields = [
      "account_group_sold_to",
      "account_group_ship_to",
      "account_group_bill_to",
      "account_group_payer",
      "bp_role_employee_receivable",
      "bp_role_employee_payable",
      "bp_role_oec_seller_id",
      "bp_role_sales_agent",
      "ship_to_different",
      "bill_to_different",
      "payer_different",
      "contact_person_owner",
      "contact_person_others",
      "recon_account_ar_trade",
      "recon_account_ar_affiliated",
      "recon_account_others",
      "has_business_permit",
      "has_sec_registration",
      "has_dti_registration",
      "is_vat_registered",
    ];

    // ── Boolean single-checkbox ───────────────────────────────────────────────
    if (booleanFields.includes(field.id)) {
      const isChecked =
        currentValue === 1 ||
        currentValue === "1" ||
        currentValue === true ||
        String(currentValue).toLowerCase() === "yes" ||
        String(currentValue).toLowerCase() === "on";

      return `
        <div class="form-field-group">
          <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-blue-400 transition-colors">
            <input type="checkbox" name="erm_${field.id}" value="Yes"
              ${isChecked ? "checked" : ""}
              class="accent-blue-600 w-4 h-4 mt-0.5">
            <div>
              <span class="text-sm font-medium text-slate-700">${field.label}</span>
              ${field.helper ? `<p class="text-xs text-slate-400 mt-0.5">${field.helper}</p>` : ""}
            </div>
          </label>
        </div>
      `;
    }

    // ── Multi-select checkbox (e.g. Required Documents) ───────────────────────
    // FIX 2: Build a normalised set of selected values (trimmed, lowercase)
    // so we match regardless of leading/trailing spaces stored in the DB
    let selectedNorm = new Set();

    if (currentValue) {
      let rawList = [];
      if (Array.isArray(currentValue)) {
        rawList = currentValue.map((v) =>
          typeof v === "object" ? v.document_name || "" : String(v),
        );
      } else if (typeof currentValue === "string" && currentValue.trim()) {
        rawList = currentValue.split(",");
      }
      rawList.forEach((v) => {
        const t = v.trim().toLowerCase();
        if (t) selectedNorm.add(t);
      });
    }

    const midIndex = Math.ceil(field.options.length / 2);
    const leftColumn = field.options.slice(0, midIndex);
    const rightColumn = field.options.slice(midIndex);

    const renderOption = (opt) => {
      // FIX 3: Compare trimmed lowercase so DB spaces don't break matching
      const isChecked = selectedNorm.has(opt.trim().toLowerCase());
      return `
        <label class="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" name="erm_${field.id}" value="${this.escapeHtml(opt)}"
            ${isChecked ? "checked" : ""}
            class="accent-blue-600 w-4 h-4 mt-0.5">
          <span class="text-sm text-slate-700">${this.escapeHtml(opt)}</span>
        </label>
      `;
    };

    return `
      <div class="form-field-group">
        ${field.label ? `<label class="form-label block mb-2 font-semibold text-slate-700">${field.label}</label>` : ""}
        ${field.helper ? `<p class="text-xs text-slate-400 mb-2">${field.helper}</p>` : ""}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/30">
          <div class="space-y-2">${leftColumn.map(renderOption).join("")}</div>
          <div class="space-y-2">${rightColumn.map(renderOption).join("")}</div>
        </div>
      </div>
    `;
  },

  renderSelectField(field, currentValue) {
    const requiredStar = field.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";

    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${field.label}${requiredStar}</label>
        <select id="erm_${field.id}" name="${field.id}" class="form-input" ${field.required ? "required" : ""}>
          <option value="">Select ${field.label}...</option>
          ${field.options
            .map(
              (opt) => `
              <option value="${this.escapeHtml(opt)}"
                ${String(currentValue || "").trim() === String(opt).trim() ? "selected" : ""}>
                ${this.escapeHtml(opt)}
              </option>
            `,
            )
            .join("")}
        </select>
      </div>
    `;
  },

  renderTextareaField(field, currentValue) {
    const requiredStar = field.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";
    const rows = field.rows || 3;
    const displayValue =
      currentValue !== null &&
      currentValue !== undefined &&
      currentValue !== "0"
        ? currentValue
        : "";

    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${field.label}${requiredStar}</label>
        <textarea id="erm_${field.id}" name="${field.id}" rows="${rows}"
          class="form-input resize-vertical"
          placeholder="${field.placeholder || ""}"
          ${field.required ? "required" : ""}>${this.escapeHtml(String(displayValue))}</textarea>
      </div>
    `;
  },

  renderInputField(field, currentValue) {
    const requiredStar = field.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";
    const inputType =
      field.type === "email"
        ? "email"
        : field.type === "date"
          ? "date"
          : "text";

    const displayValue =
      currentValue !== null &&
      currentValue !== undefined &&
      currentValue !== "0" &&
      currentValue !== 0
        ? currentValue
        : "";

    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${field.label}${requiredStar}</label>
        <input type="${inputType}" id="erm_${field.id}" name="${field.id}"
          class="form-input"
          value="${this.escapeHtml(String(displayValue))}"
          placeholder="${field.placeholder || ""}"
          ${field.required ? "required" : ""}>
      </div>
    `;
  },

  collectData() {
    const cfg = window.FORM_CONFIGS[this.currentCategory];
    if (!cfg) return {};

    const booleanFields = [
      "account_group_sold_to",
      "account_group_ship_to",
      "account_group_bill_to",
      "account_group_payer",
      "bp_role_employee_receivable",
      "bp_role_employee_payable",
      "bp_role_oec_seller_id",
      "bp_role_sales_agent",
      "ship_to_different",
      "bill_to_different",
      "payer_different",
      "contact_person_owner",
      "contact_person_others",
      "recon_account_ar_trade",
      "recon_account_ar_affiliated",
      "recon_account_others",
      "has_business_permit",
      "has_sec_registration",
      "has_dti_registration",
      "is_vat_registered",
    ];

    const fields = {};

    cfg.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type === "radio-group") {
          const checked = document.querySelector(
            `input[name="erm_${field.id}"]:checked`,
          );
          fields[field.id] = checked ? checked.value : "";
        } else if (field.type === "checkbox-group") {
          if (booleanFields.includes(field.id)) {
            const cb = document.querySelector(`input[name="erm_${field.id}"]`);
            fields[field.id] = cb && cb.checked ? 1 : 0;
          } else {
            const checked = [
              ...document.querySelectorAll(
                `input[name="erm_${field.id}"]:checked`,
              ),
            ].map((el) => el.value);
            fields[field.id] = checked.join(", ");
          }
        } else if (field.type === "select") {
          const el = document.getElementById(`erm_${field.id}`);
          fields[field.id] = el ? el.value : "";
        } else {
          const el = document.getElementById(`erm_${field.id}`);
          fields[field.id] = el ? el.value : "";
        }
      });
    });

    return fields;
  },

  async save() {
    if (!this.currentRequestId) {
      showToast("No request selected. Please try again.", "error");
      return;
    }

    const subject = document.getElementById("erm-subject")?.value?.trim();
    const priority = document.getElementById("erm-priority")?.value;

    if (!subject) {
      showToast("Subject cannot be empty.", "error");
      return;
    }

    const fields = this.collectData();
    const payload = { subject, priority, fields };

    const saveBtn = document.querySelector("#edit-request-modal .btn-primary");
    const originalBtnHtml = saveBtn?.innerHTML;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML =
        '<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Saving...';
    }

    const res = await api(`/requests/${this.currentRequestId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (saveBtn && originalBtnHtml) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }

    if (res?.success) {
      const requestId = this.currentRequestId;
      this.close();
      showToast("Request updated successfully!", "success");

      if (typeof window.showRequestDetail === "function") {
        await window.showRequestDetail(requestId);
      }
      if (typeof window.renderRequests === "function") {
        await window.renderRequests(window._showAll || false);
      }
      if (
        state.currentPage === "dashboard" &&
        typeof renderDashboard === "function"
      ) {
        renderDashboard();
      }
    } else {
      showToast(res?.message || "Failed to save changes.", "error");
    }
  },

  close() {
    const modal = document.getElementById("edit-request-modal");
    if (modal) modal.classList.add("hidden");
    this.currentRequestId = null;
    this.currentCategory = null;
    this.currentRequestData = null;
  },

  escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      if (m === '"') return "&quot;";
      if (m === "'") return "&#39;";
      return m;
    });
  },
};

window.openEditRequestModal = async function (id) {
  if (!id) {
    showToast("Invalid request ID.", "error");
    return;
  }
  await EditRequestModal.open(id);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => EditRequestModal.init(), 200);
  });
} else {
  setTimeout(() => EditRequestModal.init(), 200);
}

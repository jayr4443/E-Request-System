// js/modals/newRequestModal.js - COMPLETELY FIXED FOR CRRF

const NewRequestModal = {
  currentStep: 1,
  currentCategory: null,
  formData: {},
  formErrors: {},
  isSubmitting: false,
  isDirty: false,

  elements: {
    modal: null,
    step1: null,
    step2: null,
    step3: null,
    formBody: null,
    reviewBody: null,
    stepLabel: null,
    priority: null,
    remarks: null,
  },

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.setupModalSize();
    window.addEventListener("resize", () => this.setupModalSize());

    window.addEventListener("beforeunload", (e) => {
      if (this.isDirty && this.currentStep === 2 && !this.isSubmitting) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    });
  },

  setupModalSize() {
    const modal = this.elements.modal;
    if (modal) {
      const modalContent = modal.querySelector(".modal");
      if (modalContent) {
        if (window.innerWidth <= 640) {
          modalContent.style.width = "100%";
          modalContent.style.maxWidth = "100%";
          modalContent.style.margin = "0";
          modalContent.style.borderRadius = "0";
        } else if (window.innerWidth <= 1024) {
          modalContent.style.width = "95%";
          modalContent.style.maxWidth = "95%";
          modalContent.style.borderRadius = "1rem";
        } else {
          modalContent.style.width = "90%";
          modalContent.style.maxWidth = "1200px";
          modalContent.style.borderRadius = "1.5rem";
        }
        modalContent.style.maxHeight = "92vh";
      }
    }
  },

  cacheElements() {
    this.elements.modal = document.getElementById("new-request-modal");
    this.elements.step1 = document.getElementById("nrm-step1");
    this.elements.step2 = document.getElementById("nrm-step2");
    this.elements.step3 = document.getElementById("nrm-step3");
    this.elements.formBody = document.getElementById("nrm-form-body");
    this.elements.reviewBody = document.getElementById("nrm-review-body");
    this.elements.stepLabel = document.getElementById("nrm-step-label");
    this.elements.priority = document.getElementById("nrm-priority");
    this.elements.remarks = document.getElementById("nrm-remarks");
  },

  attachEventListeners() {
    if (this.elements.formBody) {
      this.elements.formBody.addEventListener("keypress", (e) => {
        if (
          e.key === "Enter" &&
          this.currentStep === 2 &&
          !e.target.matches("textarea")
        ) {
          e.preventDefault();
          this.goToStep(3);
        }
      });
    }

    document.addEventListener("input", (e) => {
      if (this.currentStep === 2 && e.target.closest("#nrm-form-body")) {
        this.isDirty = true;
      }
    });
  },

  open() {
    this.currentCategory = null;
    this.formData = {};
    this.formErrors = {};
    this.currentStep = 1;
    this.isSubmitting = false;
    this.isDirty = false;
    if (this.elements.modal) {
      this.elements.modal.classList.remove("hidden");
      this.goToStep(1);
      this.resetForm();
      this.setupModalSize();
      setTimeout(() => {
        const firstCategory = document.querySelector(".category-card");
        if (firstCategory) firstCategory.focus();
      }, 100);
    }
  },

  close() {
    if (this.elements.modal) {
      this.elements.modal.classList.add("hidden");
    }
    this.resetForm();
    this.isSubmitting = false;
    this.isDirty = false;
  },

  resetForm() {
    if (this.elements.formBody) {
      this.elements.formBody.innerHTML = "";
    }
    if (this.elements.priority) {
      this.elements.priority.value = "normal";
    }
    if (this.elements.remarks) {
      this.elements.remarks.value = "";
    }
  },

  selectCategory(category) {
    this.currentCategory = category;

    if (typeof window.FORM_CONFIGS === "undefined") {
      console.error("FORM_CONFIGS is not defined");
      this.showToast(
        "System configuration error. Please refresh the page.",
        "error",
      );
      return;
    }

    const cfg = window.FORM_CONFIGS[category];
    if (!cfg) {
      console.error("Category configuration not found:", category);
      this.showToast("Form configuration not found.", "error");
      return;
    }

    const titleEl = document.getElementById("nrm-title");
    const subtitleEl = document.getElementById("nrm-subtitle");

    if (titleEl) titleEl.textContent = cfg.title;
    if (subtitleEl) subtitleEl.textContent = cfg.subtitle;

    this.renderForm(cfg);
    this.goToStep(2);
  },

  hasRequiredFields(fields) {
    return fields.some((f) => f.required === true);
  },

  renderForm(cfg) {
    if (!cfg || !cfg.sections) {
      console.error("Invalid configuration passed to renderForm");
      return;
    }

    let html = `
      <div class="form-scroll-container" style="height: 100%; overflow-y: auto; padding: 0 12px;">
        <div class="form-header sticky top-0 z-20 bg-white pb-3 mb-4" style="border-bottom: 2px solid ${cfg.color}">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-bold uppercase px-2 py-1 rounded" style="background: ${cfg.color}20; color: ${cfg.color}">${cfg.code}</span>
            <span class="text-xs text-slate-400">Required fields marked <span class="text-red-500">*</span></span>
          </div>
          <p class="text-sm text-slate-600 mt-2">${cfg.subtitle}</p>
        </div>
    `;

    cfg.sections.forEach((section, sectionIdx) => {
      html += `
        <div class="mb-6 rounded-xl overflow-hidden" style="background: white; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
          <div class="section-header px-4 py-3" style="background: ${cfg.bgColor}; border-bottom: 2px solid ${cfg.color}">
            <div class="flex flex-wrap items-center gap-2">
              <span class="section-number w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background: ${cfg.color}">${sectionIdx + 1}</span>
              <h3 class="font-semibold text-slate-800 text-sm md:text-base">${section.heading}</h3>
              ${this.hasRequiredFields(section.fields) ? '<span class="text-xs text-red-500 ml-auto">Required</span>' : ""}
            </div>
          </div>
          <div class="p-4 space-y-4">
      `;

      section.fields.forEach((f) => {
        if (f.type === "radio-group") {
          html += this.renderRadioField(f);
        } else if (f.type === "checkbox-group") {
          html += this.renderCheckboxField(f);
        } else if (f.type === "select") {
          html += this.renderSelectField(f);
        } else if (f.type === "textarea") {
          html += this.renderTextareaField(f);
        } else {
          html += this.renderInputField(f);
        }
      });

      html += `</div></div>`;
    });

    html += `
        <div class="sticky bottom-0 bg-white pt-3 pb-2 border-t border-slate-200 mt-4">
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>Complete all required fields</span>
            <span class="text-blue-600">Step 2 of 3</span>
          </div>
        </div>
      </div>
    `;

    if (this.elements.formBody) {
      this.elements.formBody.innerHTML = html;
      this.attachFieldValidations();
      this.attachSmoothScroll();
    }
  },

  renderRadioField(f) {
    const requiredStar = f.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";
    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${f.label}${requiredStar}</label>
        <div class="flex flex-wrap gap-4">
          ${f.options
            .map(
              (opt) => `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="nrm_${f.id}" value="${this.escapeHtml(opt)}" 
                ${f.required ? "required" : ""}
                class="accent-blue-600 w-4 h-4">
              <span class="text-sm text-slate-700">${this.escapeHtml(opt)}</span>
            </label>
          `,
            )
            .join("")}
        </div>
        <div class="field-error text-xs text-red-500 mt-1 hidden" id="error_nrm_${f.id}"></div>
      </div>
    `;
  },

  renderCheckboxField(f) {
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
    ];
    const isBoolean = booleanFields.includes(f.id);

    if (isBoolean) {
      return `
        <div class="form-field-group">
          <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:border-blue-400 transition-colors">
            <input type="checkbox" name="nrm_${f.id}" value="Yes" class="accent-blue-600 w-4 h-4 mt-0.5">
            <div>
              <span class="text-sm font-medium text-slate-700">${f.label}</span>
              ${f.helper ? `<p class="text-xs text-slate-400 mt-0.5">${f.helper}</p>` : ""}
            </div>
          </label>
        </div>
      `;
    }

    // Multi-select checkbox (like documents)
    const midIndex = Math.ceil(f.options.length / 2);
    const leftColumn = f.options.slice(0, midIndex);
    const rightColumn = f.options.slice(midIndex);

    return `
      <div class="form-field-group">
        ${f.label ? `<label class="form-label block mb-2 font-semibold text-slate-700">${f.label}</label>` : ""}
        ${f.helper ? `<p class="text-xs text-slate-400 mb-2">${f.helper}</p>` : ""}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/30">
          <div class="space-y-2">
            ${leftColumn
              .map(
                (opt) => `
              <label class="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="nrm_${f.id}" value="${this.escapeHtml(opt)}" class="accent-blue-600 w-4 h-4 mt-0.5">
                <span class="text-sm text-slate-700">${this.escapeHtml(opt)}</span>
              </label>
            `,
              )
              .join("")}
          </div>
          <div class="space-y-2">
            ${rightColumn
              .map(
                (opt) => `
              <label class="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="nrm_${f.id}" value="${this.escapeHtml(opt)}" class="accent-blue-600 w-4 h-4 mt-0.5">
                <span class="text-sm text-slate-700">${this.escapeHtml(opt)}</span>
              </label>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  },

  renderSelectField(f) {
    const requiredStar = f.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";
    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${f.label}${requiredStar}</label>
        <select id="nrm_${f.id}" name="${f.id}" class="form-input" ${f.required ? "required" : ""}>
          <option value="">Select ${f.label}...</option>
          ${f.options.map((opt) => `<option value="${this.escapeHtml(opt)}">${this.escapeHtml(opt)}</option>`).join("")}
        </select>
        <div class="field-error text-xs text-red-500 mt-1 hidden" id="error_nrm_${f.id}"></div>
      </div>
    `;
  },

  renderTextareaField(f) {
    const requiredStar = f.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";
    const rows = f.rows || 3;
    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${f.label}${requiredStar}</label>
        <textarea id="nrm_${f.id}" name="${f.id}" rows="${rows}" 
          class="form-input resize-vertical" 
          placeholder="${f.placeholder || ""}"
          ${f.required ? "required" : ""}></textarea>
        <div class="field-error text-xs text-red-500 mt-1 hidden" id="error_nrm_${f.id}"></div>
      </div>
    `;
  },

  renderInputField(f) {
    const requiredStar = f.required
      ? '<span class="text-red-500 ml-1">*</span>'
      : "";
    const inputType =
      f.type === "email" ? "email" : f.type === "date" ? "date" : "text";
    return `
      <div class="form-field-group">
        <label class="form-label block mb-2 font-semibold text-slate-700">${f.label}${requiredStar}</label>
        <input type="${inputType}" id="nrm_${f.id}" name="${f.id}" 
          class="form-input" 
          placeholder="${f.placeholder || ""}"
          ${f.required ? "required" : ""}>
        <div class="field-error text-xs text-red-500 mt-1 hidden" id="error_nrm_${f.id}"></div>
      </div>
    `;
  },

  attachFieldValidations() {
    document
      .querySelectorAll(
        "#nrm-form-body input, #nrm-form-body select, #nrm-form-body textarea",
      )
      .forEach((input) => {
        if (input.type !== "checkbox" && input.type !== "radio") {
          input.addEventListener("blur", () => this.validateField(input));
          input.addEventListener("input", () => {
            this.clearFieldError(input.id);
            this.validateField(input);
          });
        }
      });

    document
      .querySelectorAll('#nrm-form-body input[type="radio"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          const fieldId = radio.name.replace("nrm_", "");
          this.clearFieldError(`nrm_${fieldId}`);
          this.validateRadioGroup(fieldId);
        });
      });
  },

  attachSmoothScroll() {
    const firstError = document.querySelector(".field-error:not(.hidden)");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },

  validateField(input) {
    const fieldId = input.id;
    const isRequired = input.getAttribute("required") !== null;
    const value = input.value.trim();

    if (isRequired && !value) {
      this.showFieldError(fieldId, "This field is required.");
      return false;
    }

    if (input.type === "email" && value && !this.isValidEmail(value)) {
      this.showFieldError(fieldId, "Please enter a valid email address.");
      return false;
    }

    if (input.type === "date" && value) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        this.showFieldError(fieldId, "Please use YYYY-MM-DD format.");
        return false;
      }
    }

    this.clearFieldError(fieldId);
    return true;
  },

  validateRadioGroup(fieldId) {
    const checked = document.querySelector(
      `input[name="nrm_${fieldId}"]:checked`,
    );
    const required =
      document
        .querySelector(`input[name="nrm_${fieldId}"]`)
        ?.getAttribute("required") !== null;

    if (required && !checked) {
      this.showFieldError(`nrm_${fieldId}`, "Please select an option.");
      return false;
    }

    this.clearFieldError(`nrm_${fieldId}`);
    return true;
  },

  validateAllFields() {
    let isValid = true;
    const errors = [];

    document
      .querySelectorAll(
        '#nrm-form-body input[type="text"], #nrm-form-body input[type="email"], #nrm-form-body input[type="date"], #nrm-form-body select, #nrm-form-body textarea',
      )
      .forEach((input) => {
        if (!this.validateField(input)) {
          isValid = false;
          errors.push(input.id);
        }
      });

    const radioNames = new Set();
    document
      .querySelectorAll('#nrm-form-body input[type="radio"]')
      .forEach((radio) => {
        radioNames.add(radio.name.replace("nrm_", ""));
      });

    radioNames.forEach((name) => {
      if (!this.validateRadioGroup(name)) {
        isValid = false;
        errors.push(`nrm_${name}`);
      }
    });

    if (!isValid) {
      const firstError = document.querySelector(".field-error:not(.hidden)");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      this.showToast(
        `Please complete ${errors.length} required field(s) correctly.`,
        "warning",
      );
    }

    return isValid;
  },

  showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`error_${fieldId}`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
    const inputEl = document.getElementById(fieldId);
    if (inputEl) {
      inputEl.classList.add("border-red-500", "bg-red-50");
    }
  },

  clearFieldError(fieldId) {
    const errorEl = document.getElementById(`error_${fieldId}`);
    if (errorEl) {
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
    }
    const inputEl = document.getElementById(fieldId);
    if (inputEl) {
      inputEl.classList.remove("border-red-500", "bg-red-50");
    }
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  collectData() {
    if (typeof window.FORM_CONFIGS === "undefined") {
      console.error("FORM_CONFIGS is not defined");
      return {};
    }

    const cfg = window.FORM_CONFIGS[this.currentCategory];
    if (!cfg) {
      console.error("Category configuration not found:", this.currentCategory);
      return {};
    }

    const data = { category: this.currentCategory, form_code: cfg.code };
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

    cfg.sections.forEach((section) => {
      section.fields.forEach((f) => {
        if (f.type === "radio-group") {
          const checked = document.querySelector(
            `input[name="nrm_${f.id}"]:checked`,
          );
          data[f.id] = checked ? checked.value : "";
        } else if (f.type === "checkbox-group") {
          if (booleanFields.includes(f.id)) {
            const checkbox = document.querySelector(
              `input[name="nrm_${f.id}"]`,
            );
            data[f.id] = checkbox && checkbox.checked ? 1 : 0;
          } else {
            const checked = [
              ...document.querySelectorAll(`input[name="nrm_${f.id}"]:checked`),
            ].map((el) => el.value);
            data[f.id] = checked.join(", ");
          }
        } else {
          const el = document.getElementById(`nrm_${f.id}`);
          if (el) data[f.id] = el.value;
        }
      });
    });

    console.log("Collected form data:", data);
    return data;
  },

  renderReview() {
    const data = this.collectData();
    this.formData = data;
    const cfg = window.FORM_CONFIGS[this.currentCategory];

    const allInfo = [];
    const docsData = [];

    Object.entries(data).forEach(([k, v]) => {
      if (k === "category" || k === "form_code") return;
      if (k === "docs" && v) {
        docsData.push(...v.split(", ").filter((d) => d && d !== ""));
      } else if (v !== "" && v !== 0 && v !== null && v !== "Select...") {
        const label = k
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const display = v === 1 ? "Yes" : v === 0 ? "No" : v;
        allInfo.push({ label, display });
      }
    });

    this.elements.reviewBody.innerHTML = `
      <div class="review-container" style="height: 100%; overflow-y: auto; padding: 0 12px;">
        <div class="sticky top-0 z-10 bg-white pb-3 mb-4" style="border-bottom: 2px solid ${cfg.color}">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-3 py-1 rounded-full text-white" style="background: ${cfg.color}">${cfg.code}</span>
              <span class="font-semibold text-slate-800 text-sm md:text-base">${cfg.title}</span>
            </div>
            <span class="text-xs text-slate-400">${new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div class="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div class="text-xs text-blue-600 font-medium">Total Fields</div>
            <div class="text-2xl font-bold text-blue-700">${allInfo.length}</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 border border-green-100">
            <div class="text-xs text-green-600 font-medium">Documents</div>
            <div class="text-2xl font-bold text-green-700">${docsData.length}</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <div class="text-xs text-purple-600 font-medium">Request Type</div>
            <div class="text-sm font-semibold text-purple-700 truncate">${cfg.code}</div>
          </div>
        </div>

        <div class="rounded-xl overflow-hidden mb-4" style="border: 1px solid #e2e8f0;">
          <div class="px-4 py-3" style="background: ${cfg.bgColor}; border-bottom: 1px solid #e2e8f0;">
            <h4 class="font-semibold text-slate-800 text-sm">📋 FORM DATA</h4>
          </div>
          <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            ${allInfo
              .map(
                (item) => `
              <div class="flex flex-col sm:flex-row py-3 px-4 gap-1 sm:gap-4">
                <div class="sm:w-40 flex-shrink-0">
                  <span class="text-xs font-semibold text-slate-500">${item.label}</span>
                </div>
                <div class="flex-1">
                  <span class="text-sm text-slate-800 break-words">${this.escapeHtml(String(item.display)) || "—"}</span>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        ${
          docsData.length > 0
            ? `
          <div class="rounded-xl overflow-hidden" style="border: 1px solid #e2e8f0;">
            <div class="px-4 py-3" style="background: ${cfg.bgColor}; border-bottom: 1px solid #e2e8f0;">
              <h4 class="font-semibold text-slate-800 text-sm">📎 REQUIRED DOCUMENTS (${docsData.length})</h4>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${docsData
                  .map(
                    (d) => `
                  <div class="flex items-center gap-2 text-sm text-slate-600">
                    <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="break-words">${this.escapeHtml(d)}</span>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
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

  showToast(message, type = "info", title = null, duration = 4000) {
    if (typeof window.showToast === "function") {
      window.showToast(message, type, title, duration);
    } else {
      alert(message);
    }
  },

  async createRequest(action) {
    if (this.isSubmitting) {
      this.showToast("Please wait, request is being submitted...", "info");
      return;
    }

    if (!this.validateAllFields()) {
      return;
    }

    this.isSubmitting = true;
    this.isDirty = false;

    const data = this.collectData();
    const cfg = window.FORM_CONFIGS[this.currentCategory];

    const natureLabel = data.nature_of_request || "Request";
    const entityName =
      data.supplier_name ||
      data.sold_customer_name ||
      data.full_name ||
      data.description ||
      this.currentCategory;
    const subject = `[${cfg.code}] ${natureLabel} — ${entityName}`;

    const payload = {
      category: this.currentCategory,
      request_type_id:
        this.currentCategory === "SUPPLIER"
          ? 1
          : this.currentCategory === "CUSTOMER"
            ? 2
            : this.currentCategory === "MATERIAL"
              ? 5
              : 3,
      subject: subject,
      description: data.docs ? "Required docs: " + data.docs : "",
      priority: this.elements.priority?.value || "normal",
      fields: data,
      status: action === "submit" ? "submitted" : "draft",
    };

    console.log("Sending payload:", payload);

    let submitBtn = null;
    if (action === "submit") {
      submitBtn = document.querySelector("#nrm-step3 .btn-primary");
    } else {
      submitBtn = document.querySelector("#nrm-step3 .btn-secondary");
    }

    const originalBtnHtml = submitBtn?.innerHTML;
    if (submitBtn) {
      submitBtn.disabled = true;
      if (action === "submit") {
        submitBtn.innerHTML =
          '<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Submitting...';
      } else {
        submitBtn.innerHTML =
          '<div class="animate-spin w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full mr-2"></div> Saving...';
      }
    }

    try {
      const res = await api("/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        this.close();

        if (action === "submit") {
          this.showToast(
            `${cfg.code} request submitted successfully!`,
            "success",
          );
          if (typeof canvasConfetti === "function") {
            canvasConfetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }

          const currentPage = state.currentPage;
          if (
            currentPage === "dashboard" &&
            typeof renderDashboard === "function"
          ) {
            renderDashboard();
          } else if (
            (currentPage === "requests" || currentPage === "all-requests") &&
            typeof renderRequests === "function"
          ) {
            await renderRequests(currentPage === "all-requests");
          }
        } else {
          this.showToast(`${cfg.code} request saved as draft.`, "info");
          navigate("requests");
        }
      } else {
        this.showToast(res.message || "Error creating request.", "error");
      }
    } catch (error) {
      console.error("Create request error:", error);
      this.showToast("An error occurred. Please try again.", "error");
    } finally {
      this.isSubmitting = false;
      if (submitBtn && originalBtnHtml) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  },

  goToStep(step) {
    if (step === 3 && this.currentStep === 2) {
      if (!this.validateAllFields()) return;
    }

    this.currentStep = step;

    [1, 2, 3].forEach((s) => {
      const el = document.getElementById(`nrm-step${s}`);
      if (el) {
        if (s === step) {
          el.classList.remove("hidden");
          el.style.display = s === 1 ? "block" : "flex";
          el.style.flexDirection = "column";
        } else {
          el.classList.add("hidden");
          el.style.display = "none";
        }
      }

      const dot = document.getElementById(`step-dot-${s}`);
      if (dot) {
        if (s < step) {
          dot.style.background = "#22c55e";
          dot.style.color = "white";
          dot.innerHTML = "✓";
        } else if (s === step) {
          dot.style.background = "#2533e0";
          dot.style.color = "white";
          dot.innerHTML = s;
        } else {
          dot.style.background = "#e2e8f0";
          dot.style.color = "#94a3b8";
          dot.innerHTML = s;
        }
      }
    });

    if (step === 3) this.renderReview();
  },
};

// Global functions
window.showNewRequestModal = function () {
  NewRequestModal.open();
};

window.selectCategory = function (cat) {
  NewRequestModal.selectCategory(cat);
};

window.nrmGoStep = function (step) {
  NewRequestModal.goToStep(step);
};

window.handleCreateRequest = async function (action) {
  await NewRequestModal.createRequest(action);
};

document.addEventListener("DOMContentLoaded", () => {
  NewRequestModal.init();
});

// js/modals/userModal.js - COMPLETELY FIXED

const UserModal = {
  elements: {},
  isEdit: false,
  initialized: false,

  init() {
    if (this.initialized) return;
    this.cacheElements();
    this.attachEventListeners();
    this.initialized = true;
    console.log("UserModal initialized");
  },

  cacheElements() {
    this.elements.modal = document.getElementById("user-modal");
    this.elements.form = document.getElementById("user-form");
    this.elements.title = document.getElementById("user-modal-title");
    this.elements.subtitle = document.getElementById("user-modal-subtitle");
    this.elements.userId = document.getElementById("user-id");
    this.elements.firstName = document.getElementById("user-firstname");
    this.elements.lastName = document.getElementById("user-lastname");
    this.elements.employeeId = document.getElementById("user-empid");
    this.elements.department = document.getElementById("user-dept");
    this.elements.email = document.getElementById("user-email");
    this.elements.role = document.getElementById("user-role");
    this.elements.password = document.getElementById("user-password");
    this.elements.passwordConfirm = document.getElementById(
      "user-password-confirm",
    );
    this.elements.statusRow = document.getElementById("user-status-row");
    this.elements.error = document.getElementById("user-form-error");
    this.elements.passwordLabel = document.getElementById("password-label");
    this.elements.confirmRequired = document.getElementById("confirm-required");
  },

  attachEventListeners() {
    if (this.elements.form) {
      this.elements.form.addEventListener("submit", (e) => this.handleSave(e));
    }

    // Close modal when clicking overlay
    if (this.elements.modal) {
      this.elements.modal.addEventListener("click", (e) => {
        if (e.target === this.elements.modal) this.close();
      });
    }
  },

  openAdd() {
    if (!this.elements.modal) return;

    this.isEdit = false;
    this.elements.title.textContent = "Add New User";
    this.elements.subtitle.textContent =
      "Fill in the details to create a new system user";
    this.elements.userId.value = "";
    this.elements.form.reset();
    this.elements.password.required = true;
    this.elements.passwordConfirm.required = true;
    if (this.elements.passwordLabel)
      this.elements.passwordLabel.textContent = "Password *";
    if (this.elements.confirmRequired)
      this.elements.confirmRequired.style.display = "inline";
    this.elements.statusRow.classList.add("hidden");
    this.elements.error.classList.add("hidden");
    this.elements.modal.classList.remove("hidden");
  },

  openEdit(userId) {
    if (!this.elements.modal) return;

    if (typeof window.usersData === "undefined") {
      window.usersData = [];
    }

    if (!window.usersData.length) {
      this.showError("User data not loaded. Please refresh the page.");
      return;
    }

    const u = window.usersData.find((u) => u.id === userId);
    if (!u) {
      this.showError("User not found.");
      return;
    }

    // Check if user is LDAP - prevent editing
    if (u.ldap_user == 1) {
      this.showError(
        "LDAP users cannot be edited locally. User information is synced from Active Directory.",
      );
      return;
    }

    this.isEdit = true;
    this.elements.title.textContent = "Edit User";
    this.elements.subtitle.textContent = `Editing: ${u.first_name} ${u.last_name}`;
    this.elements.userId.value = u.id;
    this.elements.firstName.value = u.first_name || "";
    this.elements.lastName.value = u.last_name || "";
    this.elements.employeeId.value = u.employee_id || "";
    this.elements.department.value = u.department || "";
    this.elements.email.value = u.email || "";
    this.elements.role.value = u.role || "requester";
    this.elements.password.value = "";
    this.elements.passwordConfirm.value = "";

    this.elements.password.required = false;
    this.elements.passwordConfirm.required = false;
    if (this.elements.passwordLabel)
      this.elements.passwordLabel.textContent =
        "New Password (leave blank to keep current)";
    if (this.elements.confirmRequired)
      this.elements.confirmRequired.style.display = "none";

    this.elements.statusRow.classList.remove("hidden");
    const statusRadio = document.querySelector(
      `input[name="user-status"][value="${u.is_active}"]`,
    );
    if (statusRadio) statusRadio.checked = true;

    this.elements.error.classList.add("hidden");
    this.elements.modal.classList.remove("hidden");
  },

  close() {
    if (this.elements.modal) {
      this.elements.modal.classList.add("hidden");
    }
  },

  async handleSave(e) {
    e.preventDefault();
    this.elements.error.classList.add("hidden");

    const userId = this.elements.userId.value;
    const password = this.elements.password.value;
    const confirm = this.elements.passwordConfirm.value;

    if (!this.isEdit && (!password || password.length < 8)) {
      this.showError("Password must be at least 8 characters.");
      return;
    }

    if (password && password !== confirm) {
      this.showError("Passwords do not match.");
      return;
    }

    const payload = {
      employee_id: this.elements.employeeId.value.trim(),
      first_name: this.elements.firstName.value.trim(),
      last_name: this.elements.lastName.value.trim(),
      email: this.elements.email.value.trim(),
      role: this.elements.role.value,
      department: this.elements.department.value || null,
      ...(password ? { password } : {}),
      ...(this.isEdit
        ? {
            is_active:
              document.querySelector('input[name="user-status"]:checked')
                ?.value ?? 1,
          }
        : {}),
    };

    if (
      !payload.employee_id ||
      !payload.first_name ||
      !payload.last_name ||
      !payload.email ||
      !payload.role
    ) {
      this.showError("Please fill in all required fields.");
      return;
    }

    const endpoint = this.isEdit ? `/users/${userId}` : "/users";
    const method = this.isEdit ? "PUT" : "POST";

    try {
      const res = await api(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (res?.success) {
        this.close();
        if (this.isEdit) {
          const idx = window.usersData.findIndex((u) => u.id == userId);
          if (idx !== -1) {
            window.usersData[idx] = { ...window.usersData[idx], ...payload };
          }
          if (typeof showToast === "function")
            showToast("User updated successfully!", "success");
        } else {
          // Refresh users data after create
          if (typeof renderUsers === "function") {
            await renderUsers();
          } else if (typeof window.renderUsers === "function") {
            await window.renderUsers();
          }
          if (typeof showToast === "function")
            showToast("User created successfully!", "success");
        }

        if (typeof window.renderUsersTable === "function") {
          window.renderUsersTable(window.usersData || []);
        }
      } else {
        this.showError(res?.message || "Error saving user.");
      }
    } catch (error) {
      console.error("Save user error:", error);
      this.showError("An error occurred while saving the user.");
    }
  },

  showError(message) {
    if (this.elements.error) {
      this.elements.error.textContent = message;
      this.elements.error.classList.remove("hidden");
    } else {
      alert(message);
    }
  },
};

// Global functions for password toggles
window.toggleUserPassword = function () {
  const passwordInput = document.getElementById("user-password");
  const toggleBtn = event.currentTarget;

  if (!passwordInput) return;

  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;

  // Update icon
  const icon = toggleBtn.querySelector("svg");
  if (icon) {
    if (type === "text") {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`;
    } else {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
    }
  }
};

window.toggleUserPasswordConfirm = function () {
  const passwordInput = document.getElementById("user-password-confirm");
  const toggleBtn = event.currentTarget;

  if (!passwordInput) return;

  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;

  const icon = toggleBtn.querySelector("svg");
  if (icon) {
    if (type === "text") {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />`;
    } else {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
    }
  }
};

// Global functions for modals
window.openAddUserModal = function () {
  UserModal.openAdd();
};

window.openEditUserModal = function (userId) {
  UserModal.openEdit(userId);
};

window.handleSaveUser = function (e) {
  UserModal.handleSave(e);
};

// Activate/Deactivate functions
window.deactivateUser = async function (userId) {
  if (
    !confirm(
      "Are you sure you want to deactivate this user? They will not be able to log in.",
    )
  )
    return;

  try {
    const response = await api(`/users/${userId}/deactivate`, {
      method: "POST",
    });

    if (response?.success) {
      if (typeof showToast === "function")
        showToast("User deactivated successfully!", "success");
      if (typeof renderUsers === "function") await renderUsers();
      if (typeof window.renderUsers === "function") await window.renderUsers();
    } else {
      if (typeof showToast === "function")
        showToast(response?.message || "Failed to deactivate user", "error");
    }
  } catch (error) {
    console.error("Error deactivating user:", error);
    if (typeof showToast === "function")
      showToast("Error deactivating user", "error");
  }
};

window.activateUser = async function (userId) {
  if (!confirm("Are you sure you want to activate this user?")) return;

  try {
    const response = await api(`/users/${userId}/activate`, { method: "POST" });

    if (response?.success) {
      if (typeof showToast === "function")
        showToast("User activated successfully!", "success");
      if (typeof renderUsers === "function") await renderUsers();
      if (typeof window.renderUsers === "function") await window.renderUsers();
    } else {
      if (typeof showToast === "function")
        showToast(response?.message || "Failed to activate user", "error");
    }
  } catch (error) {
    console.error("Error activating user:", error);
    if (typeof showToast === "function")
      showToast("Error activating user", "error");
  }
};

window.openDeactivateModal = function (userId, userName) {
  if (
    confirm(
      `Are you sure you want to deactivate user "${userName}"? They will not be able to log in.`,
    )
  ) {
    window.deactivateUser(userId);
  }
};

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      UserModal.init();
    }, 200);
  });
} else {
  setTimeout(function () {
    UserModal.init();
  }, 200);
}

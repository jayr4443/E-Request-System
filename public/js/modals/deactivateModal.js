// js/modals/deactivateModal.js
// Deactivate User Confirmation Modal

const DeactivateModal = {
  elements: {
    modal: null,
    name: null,
  },
  targetUserId: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    this.cacheElements();
    this.attachEventListeners();
    this.initialized = true;
  },

  cacheElements() {
    this.elements.modal = document.getElementById("deactivate-modal");
    this.elements.name = document.getElementById("deactivate-name");
  },

  attachEventListeners() {
    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        this.elements.modal &&
        !this.elements.modal.classList.contains("hidden")
      ) {
        this.close();
      }
    });
  },

  open(userId, name) {
    if (!this.elements.modal) return;
    this.targetUserId = userId;
    if (this.elements.name) this.elements.name.textContent = name;
    this.elements.modal.classList.remove("hidden");
  },

  close() {
    if (this.elements.modal) {
      this.elements.modal.classList.add("hidden");
    }
    this.targetUserId = null;
  },

  async confirm() {
    if (!this.targetUserId) return;

    // Call API to deactivate user
    try {
      const result = await api(`/users/${this.targetUserId}/deactivate`, {
        method: "POST",
      });

      if (result && result.success) {
        showToast(
          result.message || "User deactivated successfully.",
          "success",
        );

        // Update local usersData if it exists
        if (typeof window.usersData !== "undefined") {
          const idx = window.usersData.findIndex(
            (u) => u.id === this.targetUserId,
          );
          if (idx !== -1) {
            window.usersData[idx].is_active = 0;
          }
        }

        // Refresh the users table
        if (typeof window.renderUsersTable === "function") {
          window.renderUsersTable(window.usersData || []);
        }
      } else {
        showToast(result?.message || "Failed to deactivate user.", "error");
      }
    } catch (error) {
      console.error("Deactivate error:", error);
      showToast("An error occurred while deactivating the user.", "error");
    }

    this.close();
  },

  async activate(userId) {
    try {
      const result = await api(`/users/${userId}/activate`, { method: "POST" });

      if (result && result.success) {
        showToast(result.message || "User activated successfully.", "success");

        // Update local usersData if it exists
        if (typeof window.usersData !== "undefined") {
          const idx = window.usersData.findIndex((u) => u.id === userId);
          if (idx !== -1) {
            window.usersData[idx].is_active = 1;
          }
        }

        // Refresh the users table
        if (typeof window.renderUsersTable === "function") {
          window.renderUsersTable(window.usersData || []);
        }
      } else {
        showToast(result?.message || "Failed to activate user.", "error");
      }
    } catch (error) {
      console.error("Activate error:", error);
      showToast("An error occurred while activating the user.", "error");
    }
  },
};

// Override existing functions
window.openDeactivateModal = function (userId, name) {
  DeactivateModal.open(userId, name);
};
window.confirmDeactivate = function () {
  DeactivateModal.confirm();
};
window.activateUser = function (userId) {
  DeactivateModal.activate(userId);
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  DeactivateModal.init();
});

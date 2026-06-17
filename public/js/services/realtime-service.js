// js/services/realtime-service.js - Complete Fixed Version

const RealtimeService = {
  pollingInterval: null,
  isRunning: false,
  lastNotificationId: 0,
  refreshTimeout: null,

  init() {
    // Don't start if already running OR not logged in
    if (this.isRunning) return;
    if (!state || !state.token || !state.user) {
      console.log("Not logged in, real-time service not started");
      return;
    }

    console.log("🚀 Starting real-time service");
    this.isRunning = true;

    this.loadLastNotificationId();
    setTimeout(() => this.checkForUpdates(), 2000);

    this.pollingInterval = setInterval(() => {
      this.checkForUpdates();
    }, 15000);
  },

  async loadLastNotificationId() {
    // Don't proceed if not logged in
    if (!state || !state.token || !state.user) return;

    try {
      const data = await api("/notifications/latest");
      if (data?.success && data.latest_id) {
        this.lastNotificationId = data.latest_id;
      }
    } catch (error) {
      // Silent fail - user might not have notifications yet
      this.lastNotificationId = 0;
    }
  },

  async checkForUpdates() {
    // Don't proceed if not logged in
    if (!state || !state.token || !state.user) return;

    try {
      const notifData = await api(
        `/notifications/new?after=${this.lastNotificationId}`,
      );

      if (
        notifData?.success &&
        notifData.notifications &&
        notifData.notifications.length > 0
      ) {
        for (const notif of notifData.notifications) {
          if (notif.id > this.lastNotificationId) {
            this.lastNotificationId = notif.id;
            this.showNotificationToast(notif);

            if (notif.title.includes("Status") && notif.request_id) {
              const status = this.extractStatusFromNotification(notif);
              if (status) {
                await this.updateTableRowStatus(notif.request_id, status);
              }
            }

            if (notif.title.includes("Submitted") && notif.request_id) {
              await this.updateTableRowStatus(notif.request_id, "submitted");
            }
          }
        }

        if (typeof fetchUnreadNotificationCount === "function") {
          fetchUnreadNotificationCount();
        }

        if (
          window.dropdownOpen &&
          typeof loadDropdownNotifications === "function"
        ) {
          loadDropdownNotifications();
        }

        this.refreshCurrentPage();
      }
    } catch (error) {
      // Silent fail - handle gracefully
      console.debug("Update check failed:", error.message);
    }
  },

  extractStatusFromNotification(notification) {
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();

    if (title.includes("under_review") || message.includes("under review"))
      return "under_review";
    if (title.includes("for_signing") || message.includes("for signing"))
      return "for_signing";
    if (title.includes("signed") || message.includes("signed")) return "signed";
    if (title.includes("posted") || message.includes("posted")) return "posted";
    if (title.includes("rejected") || message.includes("rejected"))
      return "rejected";
    if (title.includes("cancelled") || message.includes("cancelled"))
      return "cancelled";
    return null;
  },

  async updateTableRowStatus(requestId, newStatus) {
    try {
      const rows = document.querySelectorAll("#requests-tbody tr");

      for (const row of rows) {
        const checkbox = row.querySelector('input[type="checkbox"]');
        const dataId = checkbox ? checkbox.getAttribute("data-id") : null;

        if (dataId && parseInt(dataId) === requestId) {
          const statusCell = row.querySelector("td:nth-child(6)");
          if (statusCell && typeof statusBadge === "function") {
            statusCell.innerHTML = statusBadge(newStatus);
            statusCell.style.transition = "background-color 0.5s ease";
            statusCell.style.backgroundColor =
              newStatus === "submitted" ? "#dbeafe" : "#d1fae5";
            setTimeout(() => {
              if (statusCell) statusCell.style.backgroundColor = "";
            }, 1000);

            if (newStatus === "submitted") {
              const actionsCell = row.querySelector("td:last-child");
              if (actionsCell) {
                const submitBtn = actionsCell.querySelector(".btn-primary");
                if (submitBtn) {
                  submitBtn.outerHTML = `
                                        <span class="text-xs text-slate-400 flex items-center gap-1 px-2">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            Pending
                                        </span>
                                    `;
                }
              }
            }
            return true;
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error updating table row:", error);
    }
    return false;
  },

  showNotificationToast(notification) {
    if (document.visibilityState !== "visible") return;
    if (typeof showToast === "function") {
      let type = "info";
      const titleLower = notification.title.toLowerCase();

      if (titleLower.includes("submitted")) type = "info";
      else if (titleLower.includes("signed") || titleLower.includes("posted"))
        type = "success";
      else if (titleLower.includes("rejected")) type = "error";
      else if (titleLower.includes("cancelled")) type = "warning";

      showToast(notification.message, type, notification.title, 5000);
    }
    this.playSound();
  },

  playSound() {
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.15;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(
        0.00001,
        audioContext.currentTime + 0.2,
      );
      oscillator.stop(audioContext.currentTime + 0.2);

      setTimeout(() => {
        try {
          audioContext.close();
        } catch (e) {}
      }, 500);
    } catch (e) {}
  },

  refreshCurrentPage() {
    if (this.refreshTimeout) return;

    this.refreshTimeout = setTimeout(() => {
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
        const selectedRequests = window.selectedRequests
          ? [...window.selectedRequests]
          : [];
        const currentShowAll = currentPage === "all-requests";

        renderRequests(currentShowAll);

        setTimeout(() => {
          if (selectedRequests.length > 0) {
            window.selectedRequests = selectedRequests;
            document
              .querySelectorAll('#requests-tbody input[type="checkbox"]')
              .forEach((cb) => {
                const id = parseInt(cb.getAttribute("data-id"));
                if (selectedRequests.includes(id)) {
                  cb.checked = true;
                }
              });
            if (typeof updateBulkExportButton === "function") {
              updateBulkExportButton();
            }
          }
        }, 200);
      } else if (
        currentPage === "notifications" &&
        typeof renderNotifications === "function"
      ) {
        renderNotifications();
      }

      this.refreshTimeout = null;
    }, 1000);
  },

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    this.isRunning = false;
    console.log("🛑 Real-time service stopped");
  },
};

// Initialize function - only call when user is logged in
function initRealtimeService() {
  if (state && state.token && state.user) {
    RealtimeService.init();
  }
}

function cleanupRealtimeService() {
  RealtimeService.stop();
}

window.RealtimeService = RealtimeService;
window.initRealtimeService = initRealtimeService;
window.cleanupRealtimeService = cleanupRealtimeService;

console.log("✅ realtime-service.js loaded");

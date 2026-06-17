// ============================================
// SIMPLE REAL-TIME NOTIFICATION SYSTEM (Polling)
// ============================================

let notificationPollingInterval = null;
let notificationSound = null;
let lastNotificationId = 0;

// Initialize notification sound
function initNotificationSound() {
  try {
    notificationSound = new Audio();
    // Use a data URI for a simple beep if external sound fails
    notificationSound.src =
      "data:audio/wav;base64,U3RlYWx0aCBpcyBhIGZvcm0gb2YgZW5lcmd5IHRoYXQgaXMgdXNlZCB0byBwb3dlciBkZXZpY2VzLg==";
  } catch (e) {
    console.log("Sound not supported");
  }
}

// Play notification sound
function playNotificationSound() {
  if (notificationSound && document.visibilityState === "visible") {
    notificationSound.play().catch((e) => console.log("Sound play blocked"));
  }
}

// Show browser notification
async function showBrowserNotification(title, body, requestId = null) {
  if ("Notification" in window && Notification.permission === "granted") {
    // Only show if tab is not visible
    if (document.visibilityState !== "visible") {
      const notification = new Notification(title, {
        body: body,
        icon: "/favicon.ico",
        silent: false,
        requireInteraction: true,
      });

      notification.onclick = function () {
        window.focus();
        if (requestId) {
          showRequestDetail(requestId);
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    }
  } else if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

// Fetch new notifications
async function checkForNewNotifications() {
  if (!state.token) return;

  try {
    const data = await api(`/notifications/new?after=${lastNotificationId}`);

    if (data?.success && data.notifications && data.notifications.length > 0) {
      const newNotifications = data.notifications;

      // Update last ID
      for (const notif of newNotifications) {
        if (notif.id > lastNotificationId) {
          lastNotificationId = notif.id;
        }
      }

      // Update unread count
      await fetchUnreadNotificationCount();

      // Play sound and show notifications for each new one (but only play sound once)
      let soundPlayed = false;

      for (const notif of newNotifications) {
        // Show toast
        showToast(notif.message, "info", notif.title, 6000);

        // Show browser notification
        showBrowserNotification(notif.title, notif.message, notif.request_id);

        // Play sound only once for batch
        if (!soundPlayed && document.visibilityState === "visible") {
          playNotificationSound();
          soundPlayed = true;
        }
      }

      // Refresh notifications page if open
      if (
        state.currentPage === "notifications" &&
        typeof renderNotifications === "function"
      ) {
        renderNotifications();
      }

      // Refresh dashboard if open
      if (
        state.currentPage === "dashboard" &&
        typeof renderDashboard === "function"
      ) {
        renderDashboard();
      }
    }
  } catch (error) {
    console.error("Error checking notifications:", error);
  }
}

// Start polling for notifications
function startRealTimeNotifications() {
  if (notificationPollingInterval) {
    clearInterval(notificationPollingInterval);
  }

  initNotificationSound();

  // Get last notification ID on start
  loadLastNotificationId();

  // Poll every 3 seconds
  notificationPollingInterval = setInterval(() => {
    if (state.token && document.visibilityState === "visible") {
      checkForNewNotifications();
    } else if (state.token) {
      // Still check but don't play sound when not visible
      checkForNewNotificationsSilent();
    }
  }, 3000);
}

async function checkForNewNotificationsSilent() {
  if (!state.token) return;

  try {
    const data = await api(`/notifications/new?after=${lastNotificationId}`);
    if (data?.success && data.notifications && data.notifications.length > 0) {
      for (const notif of data.notifications) {
        if (notif.id > lastNotificationId) {
          lastNotificationId = notif.id;
        }
      }
      fetchUnreadNotificationCount();

      // Show browser notifications even when tab not visible
      for (const notif of data.notifications) {
        showBrowserNotification(notif.title, notif.message, notif.request_id);
      }
    }
  } catch (error) {
    console.error("Error checking notifications silently:", error);
  }
}

async function loadLastNotificationId() {
  try {
    const data = await api("/notifications/latest");
    if (data?.success && data.latest_id) {
      lastNotificationId = data.latest_id;
    }
  } catch (error) {
    console.error("Error loading last notification ID:", error);
  }
}

function stopRealTimeNotifications() {
  if (notificationPollingInterval) {
    clearInterval(notificationPollingInterval);
    notificationPollingInterval = null;
  }
}

async function fetchUnreadNotificationCount() {
  if (!state.token) return;

  try {
    const data = await api("/notifications/unread");
    if (data?.success) {
      const unreadCount = data.unread_count || 0;
      const notifBadge = document.getElementById("notif-badge");
      const topbarNotif = document.getElementById("topbar-notif");

      if (notifBadge) {
        if (unreadCount > 0) {
          notifBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
          notifBadge.classList.remove("hidden");
        } else {
          notifBadge.classList.add("hidden");
        }
      }
      if (topbarNotif) {
        if (unreadCount > 0) {
          topbarNotif.classList.remove("hidden");
        } else {
          topbarNotif.classList.add("hidden");
        }
      }

      const baseTitle = "MPC Electronic Request System";
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) ${baseTitle}`;
      } else {
        document.title = baseTitle;
      }

      return unreadCount;
    }
  } catch (error) {
    console.error("Failed to fetch notification count:", error);
  }
  return 0;
}

function startNotificationPolling() {
  fetchUnreadNotificationCount();
  startRealTimeNotifications();
}

// ============================================
// STATUS REQUESTS MODAL WITH DATATABLE
// ============================================

window.currentStatusFilter = null;

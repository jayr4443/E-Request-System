let dropdownOpen = false;
let dropdownNotifications = [];

// Toggle notification dropdown
function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notification-dropdown");
  if (!dropdown) return;

  if (dropdown.classList.contains("hidden")) {
    dropdown.classList.remove("hidden");
    dropdownOpen = true;
    loadDropdownNotifications();

    // Close dropdown when clicking outside
    setTimeout(() => {
      document.addEventListener("click", closeDropdownOnClickOutside);
    }, 100);
  } else {
    dropdown.classList.add("hidden");
    dropdownOpen = false;
    document.removeEventListener("click", closeDropdownOnClickOutside);
  }
}

// Close dropdown when clicking outside
function closeDropdownOnClickOutside(event) {
  const dropdown = document.getElementById("notification-dropdown");
  const bellBtn = document.getElementById("notification-bell-btn");

  if (dropdown && bellBtn) {
    if (!dropdown.contains(event.target) && !bellBtn.contains(event.target)) {
      dropdown.classList.add("hidden");
      dropdownOpen = false;
      document.removeEventListener("click", closeDropdownOnClickOutside);
    }
  }
}

// Load notifications into dropdown
async function loadDropdownNotifications() {
  try {
    const data = await api("/notifications?page=1&limit=10");

    if (data?.success && data.data) {
      dropdownNotifications = data.data;
      renderDropdownNotifications(data.data, data.unread_count);
    } else {
      renderEmptyDropdown();
    }
  } catch (error) {
    console.error("Error loading dropdown notifications:", error);
    renderEmptyDropdown();
  }
}

// Render notifications in dropdown
function renderDropdownNotifications(notifications, unreadCount) {
  const container = document.getElementById("notification-dropdown-list");
  const badge = document.getElementById("dropdown-unread-badge");
  const topbarBadge = document.getElementById("topbar-notif");

  // Update unread badge
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  // Update topbar badge
  if (topbarBadge) {
    if (unreadCount > 0) {
      topbarBadge.classList.remove("hidden");
    } else {
      topbarBadge.classList.add("hidden");
    }
  }

  if (!notifications || notifications.length === 0) {
    container.innerHTML = `
            <div class="p-8 text-center">
                <div class="text-4xl mb-2">🔔</div>
                <p class="text-sm text-slate-500 font-medium">No notifications</p>
                <p class="text-xs text-slate-400 mt-1">You're all caught up!</p>
            </div>
        `;
    return;
  }

  container.innerHTML = notifications
    .map(
      (notif) => `
        <div class="p-4 hover:bg-slate-50 transition-colors cursor-pointer ${notif.is_read ? "bg-white" : "bg-blue-50/30"}" 
             onclick="handleDropdownNotificationClick(${notif.id}, ${notif.request_id || "null"})">
            <div class="flex gap-3">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg ${notif.is_read ? "bg-slate-100" : "bg-blue-100"}">
                        ${getNotificationIcon(notif.title)}
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <p class="text-sm font-semibold text-slate-800 line-clamp-2">${escapeHtml(notif.title)}</p>
                        <span class="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">${formatRelativeTime(notif.created_at)}</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">${escapeHtml(notif.message)}</p>
                    ${notif.request_no ? `<p class="text-xs text-blue-600 mt-2 font-mono">📋 ${escapeHtml(notif.request_no)}</p>` : ""}
                </div>
                ${
                  !notif.is_read
                    ? `
                    <button onclick="event.stopPropagation(); markSingleNotificationRead(${notif.id})" 
                            class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100">
                        Mark read
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `,
    )
    .join("");
}

// Get icon based on notification title
function getNotificationIcon(title) {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("submitted")) return "📤";
  if (titleLower.includes("signed")) return "✍️";
  if (titleLower.includes("posted")) return "🚀";
  if (titleLower.includes("rejected")) return "❌";
  if (titleLower.includes("approved")) return "✅";
  if (titleLower.includes("update")) return "🔄";
  if (titleLower.includes("upload")) return "📎";
  return "🔔";
}

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Handle dropdown notification click
async function handleDropdownNotificationClick(notificationId, requestId) {
  // Mark as read
  await markSingleNotificationRead(notificationId);

  // Navigate to request if exists
  if (requestId) {
    // Close dropdown first
    const dropdown = document.getElementById("notification-dropdown");
    if (dropdown) dropdown.classList.add("hidden");
    dropdownOpen = false;

    // Show request detail
    await showRequestDetail(requestId);
  }
}

// Mark single notification as read
async function markSingleNotificationRead(notificationId) {
  try {
    const data = await api(`/notifications/${notificationId}/read`, {
      method: "POST",
    });
    if (data?.success) {
      // Refresh dropdown
      await loadDropdownNotifications();
      // Update unread count in topbar
      await fetchUnreadNotificationCount();
    }
  } catch (error) {
    console.error("Error marking notification read:", error);
  }
}

// Mark all notifications as read from dropdown
async function markAllNotificationsRead() {
  try {
    const data = await api("/notifications/read-all", { method: "POST" });
    if (data?.success) {
      await loadDropdownNotifications();
      await fetchUnreadNotificationCount();
      showToast("All notifications marked as read", "success");
    }
  } catch (error) {
    console.error("Error marking all read:", error);
  }
}

// Render empty dropdown
function renderEmptyDropdown() {
  const container = document.getElementById("notification-dropdown-list");
  container.innerHTML = `
        <div class="p-8 text-center">
            <div class="text-4xl mb-2">🔔</div>
            <p class="text-sm text-slate-500 font-medium">No notifications</p>
            <p class="text-xs text-slate-400 mt-1">You're all caught up!</p>
        </div>
    `;
}

// Navigate to full notifications page
function navigateToNotifications() {
  // Close dropdown
  const dropdown = document.getElementById("notification-dropdown");
  if (dropdown) dropdown.classList.add("hidden");
  dropdownOpen = false;

  // Navigate to notifications page
  if (typeof navigate === "function") {
    navigate("notifications");
  }
}

// Update notification count in real-time
async function fetchUnreadNotificationCount() {
  if (!state.token) return;

  try {
    const data = await api("/notifications/unread");
    if (data?.success) {
      const unreadCount = data.unread_count || 0;

      // Update topbar badge
      const topbarNotif = document.getElementById("topbar-notif");
      if (topbarNotif) {
        if (unreadCount > 0) {
          topbarNotif.classList.remove("hidden");
        } else {
          topbarNotif.classList.add("hidden");
        }
      }

      // Update document title
      const baseTitle = "MPC Electronic Request System";
      if (unreadCount > 0) {
        document.title = `(${unreadCount > 99 ? "99+" : unreadCount}) ${baseTitle}`;
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

// Start real-time notification polling (every 10 seconds)
let notificationPollInterval = null;

function startNotificationPolling() {
  if (notificationPollInterval) clearInterval(notificationPollInterval);

  // Initial fetch
  fetchUnreadNotificationCount();

  // Poll every 10 seconds
  notificationPollInterval = setInterval(async () => {
    if (state.token && document.visibilityState === "visible") {
      const newCount = await fetchUnreadNotificationCount();

      // If dropdown is open, refresh it
      if (dropdownOpen) {
        await loadDropdownNotifications();
      }

      // Show toast for new notifications (optional)
      if (
        window.lastNotificationCount !== undefined &&
        newCount > window.lastNotificationCount
      ) {
        const newNotifications = newCount - window.lastNotificationCount;
        if (newNotifications > 0) {
          showToast(
            `You have ${newNotifications} new notification${newNotifications > 1 ? "s" : ""}`,
            "info",
            "🔔 New",
            3000,
          );
          playNotificationSound();
        }
      }
      window.lastNotificationCount = newCount;
    }
  }, 10000);
}

// Stop polling
function stopNotificationPolling() {
  if (notificationPollInterval) {
    clearInterval(notificationPollInterval);
    notificationPollInterval = null;
  }
}

// Initialize notification dropdown
function initNotificationDropdown() {
  // Add CSS for dropdown animation
  const style = document.createElement("style");
  style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-slide-down {
            animation: slideDown 0.2s ease-out;
        }
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `;
  document.head.appendChild(style);

  // Start polling
  startNotificationPolling();

  // Close dropdown on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dropdownOpen) {
      const dropdown = document.getElementById("notification-dropdown");
      if (dropdown) dropdown.classList.add("hidden");
      dropdownOpen = false;
    }
  });
}

// Make functions globally available
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.handleDropdownNotificationClick = handleDropdownNotificationClick;
window.markSingleNotificationRead = markSingleNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.navigateToNotifications = navigateToNotifications;
window.fetchUnreadNotificationCount = fetchUnreadNotificationCount;
window.startNotificationPolling = startNotificationPolling;
window.stopNotificationPolling = stopNotificationPolling;

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  initNotificationDropdown();
});

// ─── App Init ─────────────────────────────────────
async function fetchUnreadNotificationCount() {
  if (!state.token) return;

  try {
    const data = await api("/notifications/unread");
    if (data?.success && data.unread_count > 0) {
      const notifBadge = document.getElementById("notif-badge");
      const topbarNotif = document.getElementById("topbar-notif");

      if (notifBadge) {
        notifBadge.textContent = data.unread_count;
        notifBadge.classList.remove("hidden");
      }
      if (topbarNotif) {
        topbarNotif.classList.remove("hidden");
      }
    } else {
      const notifBadge = document.getElementById("notif-badge");
      const topbarNotif = document.getElementById("topbar-notif");
      if (notifBadge) notifBadge.classList.add("hidden");
      if (topbarNotif) topbarNotif.classList.add("hidden");
    }
  } catch (error) {
    console.error("Failed to fetch notification count:", error);
  }
}

// Call this after login and periodically
function startNotificationPolling() {
  fetchUnreadNotificationCount();
  // Poll every 30 seconds
  setInterval(fetchUnreadNotificationCount, 30000);
}

// Update renderNotifications function
async function renderNotifications() {
  const page = new URLSearchParams(window.location.search).get("page") || 1;
  const data = await api(`/notifications?page=${page}&limit=15`);

  const totalPages = data?.pagination?.last_page || 1;
  const currentPage = data?.pagination?.current_page || 1;

  document.getElementById("page-content").innerHTML = `
    <div class="animate-fade max-w-3xl mx-auto">
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
            </svg>
            <h3 class="font-display font-semibold text-slate-800">Notifications</h3>
            ${data?.unread_count > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">${data.unread_count} new</span>` : ""}
          </div>
          <div class="flex gap-2">
            ${
              data?.unread_count > 0
                ? `
              <button onclick="markAllNotificationsRead()" class="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg bg-blue-50">
                Mark all as read
              </button>
            `
                : ""
            }
          </div>
        </div>
        
        <div class="divide-y divide-slate-100" id="notifications-list">
          ${
            !data?.data || data.data.length === 0
              ? `
            <div class="p-12 text-center text-slate-400">
              <div class="text-5xl mb-3">🔔</div>
              <p class="text-sm font-medium">No notifications yet</p>
              <p class="text-xs mt-1">You're all caught up!</p>
            </div>
          `
              : data.data
                  .map(
                    (notif) => `
            <div class="p-4 hover:bg-slate-50 transition-colors cursor-pointer ${notif.is_read ? "bg-white" : "bg-blue-50/30"}" onclick="handleNotificationClick(${notif.id}, ${notif.request_id || "null"})">
              <div class="flex gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${notif.is_read ? "bg-slate-100" : "bg-blue-100"}">
                  ${notif.is_read ? "📋" : "🔵"}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <p class="text-sm font-semibold text-slate-800">${escapeHtml(notif.title)}</p>
                    <span class="text-xs text-slate-400 whitespace-nowrap">${formatDateTime(notif.created_at)}</span>
                  </div>
                  <p class="text-sm text-slate-500 mt-1">${escapeHtml(notif.message)}</p>
                  ${notif.request_no ? `<p class="text-xs text-blue-600 mt-2">Request: ${escapeHtml(notif.request_no)}</p>` : ""}
                </div>
                ${
                  !notif.is_read
                    ? `
                  <button onclick="event.stopPropagation(); markNotificationRead(${notif.id})" class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100">
                    Mark read
                  </button>
                `
                    : ""
                }
              </div>
            </div>
          `,
                  )
                  .join("")
          }
        </div>
        
        <!-- Pagination -->
        ${
          totalPages > 1
            ? `
          <div class="px-5 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <p class="text-xs text-slate-400">
              Showing page ${currentPage} of ${totalPages}
            </p>
            <div class="flex gap-2">
              <button onclick="changeNotificationPage(${currentPage - 1})" 
                      class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${currentPage <= 1 ? "opacity-50 cursor-not-allowed" : ""}"
                      ${currentPage <= 1 ? "disabled" : ""}>
                ← Previous
              </button>
              <button onclick="changeNotificationPage(${currentPage + 1})" 
                      class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ${currentPage >= totalPages ? "opacity-50 cursor-not-allowed" : ""}"
                      ${currentPage >= totalPages ? "disabled" : ""}>
                Next →
              </button>
            </div>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

// Add these functions
async function markNotificationRead(id) {
  const data = await api(`/notifications/${id}/read`, { method: "POST" });
  if (data?.success) {
    renderNotifications();
  }
}

async function markAllNotificationsRead() {
  const data = await api("/notifications/read-all", { method: "POST" });
  if (data?.success) {
    renderNotifications();
    fetchUnreadNotificationCount();
    showToast("All notifications marked as read.", "success");
  }
}

async function changeNotificationPage(page) {
  if (page < 1) return;
  const data = await api(`/notifications?page=${page}&limit=5`);
  if (data?.success) {
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set("page", page);
    window.history.pushState({}, "", url);
    renderNotifications();
  }
}

// Handle notification click
function handleNotificationClick(notificationId, requestId) {
  if (requestId) {
    markNotificationRead(notificationId);
    showRequestDetail(requestId);
  }
}

// Make functions global
window.changeNotificationPage = changeNotificationPage;
window.handleNotificationClick = handleNotificationClick;

function showApp() {
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("main-app").classList.remove("hidden");
  setupUserUI();
  loadRequestTypes();
  navigate("dashboard");
  startNotificationPolling();

  // Only initialize real-time service AFTER login
  if (state.token && state.user) {
    console.log("User logged in, initializing real-time service");
    if (typeof initRealtimeService === "function") {
      initRealtimeService();
    }
  }
}

function setupUserUI() {
  const u = state.user;
  if (!u) return;
  const initials = u.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  document.getElementById("avatar").textContent = initials;
  document.getElementById("sidebar-name").textContent = u.name;
  document.getElementById("sidebar-role").textContent = u.role.replace(
    /_/g,
    " ",
  );

  const isManager = [
    "mpc_personnel",
    "it_manager",
    "senior_manager",
    "vp_operations",
    "admin",
  ].includes(u.role);
  if (isManager) {
    document.getElementById("nav-all-requests").classList.remove("hidden");
    document.getElementById("nav-users").classList.remove("hidden");
    document.getElementById("nav-form-maintenance").classList.remove("hidden");
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

function togglePassword() {
  const inp = document.getElementById("login-password");
  inp.type = inp.type === "password" ? "text" : "password";
}

// Init form maintenance overrides on load
if (typeof FormMaintenance !== "undefined") FormMaintenance.init();

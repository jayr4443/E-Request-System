// ─── Navigation ───────────────────────────────────
function navigate(page) {
  state.currentPage = page;
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    requests: "My Requests",
    "all-requests": "All Requests",
    notifications: "Notifications",
    users: "User Management",
    "form-maintenance": "Form Maintenance",
  };
  document.getElementById("page-title").textContent = titles[page] || page;

  const content = document.getElementById("page-content");
  content.innerHTML =
    '<div class="flex items-center justify-center h-40"><div class="animate-spin w-8 h-8 border-3 border-navy-700 border-t-transparent rounded-full" style="border-width:3px;border-color:#2533e0;border-top-color:transparent"></div></div>';

  if (page === "dashboard") renderDashboard();
  else if (page === "requests") renderRequests(false);
  else if (page === "all-requests") renderRequests(true);
  else if (page === "notifications") renderNotifications();
  else if (page === "users") renderUsers();
  else if (page === "form-maintenance") renderFormMaintenance();
}

// ─── Dashboard ────────────────────────────────────

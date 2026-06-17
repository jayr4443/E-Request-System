// ─── Notifications ────────────────────────────────

// ─── User Management ──────────────────────────────
const ROLE_LABELS = {
  requester: "Requester",
  mpc_personnel: "MPC Personnel",
  it_manager: "IT Manager",
  senior_manager: "Senior Manager",
  vp_operations: "VP - Operations",
  admin: "Admin",
};

const ROLE_COLORS = {
  requester: "badge-draft",
  mpc_personnel: "badge-submitted",
  it_manager: "badge-under_review",
  senior_manager: "badge-for_signing",
  vp_operations: "badge-signed",
  admin: "badge-posted",
};

async function renderUsers() {
  const data = (await api("/users")) || { success: false };
  console.log("Users data:", data);
  if (data?.success && data.data) window.usersData = data.data;
  renderUsersTable(window.usersData || []);
}

function renderUsersTable(users) {
  const searchVal =
    document.getElementById("user-search-input")?.value?.toLowerCase() || "";
  const roleFilter = document.getElementById("user-role-filter")?.value || "";
  const filtered = users.filter((u) => {
    const name = `${u.first_name} ${u.last_name}`.toLowerCase();
    return (
      (!searchVal ||
        name.includes(searchVal) ||
        u.email.toLowerCase().includes(searchVal) ||
        u.employee_id.toLowerCase().includes(searchVal)) &&
      (!roleFilter || u.role === roleFilter)
    );
  });

  document.getElementById("page-content").innerHTML = `
    <div class="animate-fade space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-card border border-slate-100"><div class="text-2xl font-display font-bold text-slate-800">${users.length}</div><div class="text-slate-500 text-sm mt-1">Total Users</div></div>
        <div class="stat-card bg-green-50 border border-green-100"><div class="text-2xl font-display font-bold text-green-700">${users.filter((u) => u.is_active == 1).length}</div><div class="text-slate-500 text-sm mt-1">Active</div></div>
        <div class="stat-card bg-red-50 border border-red-100"><div class="text-2xl font-display font-bold text-red-700">${users.filter((u) => u.is_active == 0).length}</div><div class="text-slate-500 text-sm mt-1">Inactive</div></div>
        <div class="stat-card bg-blue-50 border border-blue-100"><div class="text-2xl font-display font-bold text-blue-700">${users.filter((u) => u.role === "admin").length}</div><div class="text-slate-500 text-sm mt-1">Admins</div></div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
          <h3 class="font-display font-semibold text-slate-800">System Users</h3>
          <div class="flex flex-wrap gap-2 items-center">
            <input type="text" id="user-search-input" placeholder="Search name, email, ID..." class="form-input py-2 text-sm w-52" oninput="renderUsersTable(window.usersData)">
            <select id="user-role-filter" class="form-input py-2 text-sm w-44" onchange="renderUsersTable(window.usersData)">
              <option value="">All Roles</option>
              ${Object.entries(ROLE_LABELS)
                .map(([k, v]) => `<option value="${k}">${v}</option>`)
                .join("")}
            </select>
            <button onclick="openAddUserModal()" class="btn btn-primary btn-sm">Add User</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Auth Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              ${
                filtered.length === 0
                  ? '<tr><td colspan="8" class="text-center text-slate-400 py-10">No users found.</td></tr>'
                  : filtered
                      .map((u) => {
                        const isLDAP = u.ldap_user == 1;
                        const canEdit = !isLDAP; // LDAP users cannot be edited locally
                        return `
                        <tr>
                          <td class="font-mono text-xs font-medium text-slate-600">${u.employee_id}</td>
                          <td>
                            <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-navy-700">${(u.first_name[0] || "") + (u.last_name[0] || "")}</div>
                              <div>
                                <div class="font-medium text-slate-800">${u.first_name} ${u.last_name}</div>
                                <div class="text-xs text-slate-400">${u.department || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td class="text-slate-500 text-sm">${u.email}${isLDAP ? ' <span class="ml-1 text-xs text-blue-500">(USER)</span>' : ""}</td>
                          <td><span class="badge ${ROLE_COLORS[u.role] || "badge-draft"}">${ROLE_LABELS[u.role] || u.role}</span></td>
                          <td class="text-slate-500 text-sm">${u.department || "—"}</td>
                          <td><span class="badge ${u.is_active == 1 ? "badge-posted" : "badge-rejected"}">${u.is_active == 1 ? "Active" : "Inactive"}</span></td>
                          <td>
                            <span class="text-xs ${isLDAP ? "text-blue-500" : "text-green-500"} font-medium">
                              ${isLDAP ? "🔐 LDAP User" : "🔑 Local User"}
                            </span>
                          </td>
                          <td>
                            <div class="flex gap-2">
                              ${
                                canEdit
                                  ? `<button onclick="openEditUserModal(${u.id})" class="btn btn-secondary btn-sm">Edit</button>`
                                  : `<span class="text-xs text-slate-400 px-2 py-1 rounded bg-slate-100" title="LDAP users cannot be edited locally">LDAP Sync</span>`
                              }
                              ${
                                u.is_active == 1
                                  ? `<button onclick="openDeactivateModal(${u.id}, '${u.first_name} ${u.last_name}')" class="btn btn-sm bg-red-50 text-red-700">Deactivate</button>`
                                  : `<button onclick="activateUser(${u.id})" class="btn btn-sm bg-green-50 text-green-700">Activate</button>`
                              }
                            </div>
                          </td>
                        </tr>
                        `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
        <div class="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">Showing ${filtered.length} of ${users.length} users</div>
      </div>
    </div>
  `;
}

// Add this helper function at the top of your script (near other utility functions)
function getSafeCount(count) {
  return count !== null && count !== undefined && !isNaN(count) ? count : 0;
}

// ─── Dashboard ────────────────────────────────────
async function renderDashboard() {
  const data = await api("/requests/dashboard");
  if (!data?.success) return;
  const s = data.stats;

  const statCards = [
    {
      label: "Total Requests",
      value: getSafeCount(s.total),
      icon: "📋",
      color: "from-navy-700 to-navy-900",
      text: "text-white",
      status: null,
      onclick: "navigate('requests')",
    },
    {
      label: "Submitted",
      value: getSafeCount(s.submitted),
      icon: "📤",
      color: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-100",
      status: "submitted",
      onclick: "showStatusRequests('submitted')",
    },
    {
      label: "Under Review",
      value: getSafeCount(s.under_review),
      icon: "🔍",
      color: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
      status: "under_review",
      onclick: "showStatusRequests('under_review')",
    },
    {
      label: "For Signing",
      value: getSafeCount(s.for_signing),
      icon: "✍️",
      color: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-100",
      status: "for_signing",
      onclick: "showStatusRequests('for_signing')",
    },
    {
      label: "Signed",
      value: getSafeCount(s.signed || 0),
      icon: "✅",
      color: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
      status: "signed",
      onclick: "showStatusRequests('signed')",
    },
    {
      label: "Posted",
      value: getSafeCount(s.posted),
      icon: "🚀",
      color: "bg-green-50",
      text: "text-green-700",
      border: "border-green-100",
      status: "posted",
      onclick: "showStatusRequests('posted')",
    },
    {
      label: "Rejected",
      value: getSafeCount(s.rejected),
      icon: "❌",
      color: "bg-red-50",
      text: "text-red-700",
      border: "border-red-100",
      status: "rejected",
      onclick: "showStatusRequests('rejected')",
    },
  ];

  // Get signed count if not already in stats
  if (s.signed === undefined && data.stats.signed !== undefined) {
    statCards[4].value = getSafeCount(data.stats.signed);
  }

  document.getElementById("page-content").innerHTML = `
    <div class="animate-fade space-y-6">
      <!-- Welcome Banner -->
      <div class="rounded-2xl p-6 text-white flex items-center justify-between" style="background:linear-gradient(135deg,#1a228f,#2533e0)">
        <div>
          <h2 class="font-display font-bold text-2xl">Good day, ${state.user?.name?.split(" ")[0] || "User"}! 👋</h2>
          <p class="text-blue-200 mt-1 text-sm">Here's an overview of your MPC request activities.</p>
        </div>
        <button onclick="showNewRequestModal()" class="btn bg-white text-navy-900 hover:bg-blue-50" style="color:#1a228f">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Request
        </button>
      </div>

      <!-- Stats Cards Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        ${statCards
          .map((c) => {
            if (c.label === "Total Requests") {
              return `
              <div class="stat-card col-span-2 lg:col-span-1 bg-gradient-to-br ${c.color} border-0 cursor-pointer hover:opacity-90 transition-opacity" onclick="${c.onclick}">
                <div class="text-3xl mb-2">${c.icon}</div>
                <div class="text-4xl font-display font-bold ${c.text}">${c.value}</div>
                <div class="text-blue-200 text-sm mt-1 font-medium">${c.label}</div>
              </div>
            `;
            } else {
              return `
              <div class="stat-card ${c.color} border ${c.border || "border-slate-100"} cursor-pointer hover:shadow-md transition-all" onclick="${c.onclick}">
                <div class="text-2xl mb-2">${c.icon}</div>
                <div class="text-3xl font-display font-bold ${c.text}">${c.value}</div>
                <div class="text-slate-500 text-sm mt-1 font-medium">${c.label}</div>
              </div>
            `;
            }
          })
          .join("")}
      </div>

      <!-- Recent Requests Section -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
            </svg>
            <h3 class="font-display font-semibold text-slate-800">Recent Requests</h3>
          </div>
          <button onclick="navigate('requests')" class="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            View all
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table min-w-full">
            <thead>
              <tr class="bg-slate-50">
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Request No.</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${(data.recent_requests || [])
                .map(
                  (r) => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-5 py-4 font-mono text-xs font-medium text-slate-600">${escapeHtml(r.request_no)}</td>
                  <td class="px-5 py-4 max-w-xs">
                    <div class="font-medium text-slate-800 truncate">${escapeHtml(r.subject)}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${escapeHtml(r.requester_name)}</div>
                   </td>
                  <td class="px-5 py-4 text-slate-500 text-sm">${escapeHtml(r.request_type_name)}</td>
                  <td class="px-5 py-4"><span class="priority-${r.priority} inline-flex px-2.5 py-1 rounded-full text-xs font-medium">${(r.priority || "normal").toUpperCase()}</span></td>
                  <td class="px-5 py-4">${statusBadge(r.status)}</td>
                  <td class="px-5 py-4 text-slate-400 text-sm whitespace-nowrap">${formatDate(r.created_at)}</td>
                  <td class="px-5 py-4">
                    <button onclick="showRequestDetail(${r.id})" class="btn btn-secondary btn-sm">View</button>
                  </td>
                 </tr>
              `,
                )
                .join("")}
              ${
                (data.recent_requests || []).length === 0
                  ? `
                 <tr>
                  <td colspan="7" class="px-5 py-12 text-center text-slate-400">
                    <div class="text-4xl mb-2">📋</div>
                    <p>No requests yet</p>
                    <button onclick="showNewRequestModal()" class="btn btn-primary btn-sm mt-3">Create your first request</button>
                  </td>
                 </tr>
              `
                  : ""
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Workflow Section -->
      <div class="bg-white rounded-2xl border border-slate-200 p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <h3 class="font-display font-semibold text-slate-800">Request Workflow</h3>
          </div>
          <span class="text-xs text-slate-400">Standard MPC approval process</span>
        </div>
        <div class="flex items-center justify-between flex-wrap gap-4">
          ${[
            { num: "1", label: "Submit Request", icon: "📤", color: "#3b82f6" },
            { num: "2", label: "MPC Review", icon: "🔍", color: "#f59e0b" },
            { num: "3", label: "For Signing", icon: "✍️", color: "#8b5cf6" },
            {
              num: "4",
              label: "Upload Signed Doc",
              icon: "📎",
              color: "#06b6d4",
            },
            { num: "5", label: "Post to SAP", icon: "🚀", color: "#10b981" },
            { num: "6", label: "Complete", icon: "✅", color: "#22c55e" },
          ]
            .map(
              (step, i, arr) => `
            <div class="flex items-center gap-3 flex-1 min-w-[120px]">
              <div class="flex flex-col items-center gap-2 flex-1">
                <div class="workflow-step" style="background: ${step.color}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                  ${step.icon}
                </div>
                <span class="text-xs font-medium text-slate-600 text-center">${step.label}</span>
              </div>
              ${i < arr.length - 1 ? '<div class="workflow-line hidden md:block flex-1 h-0.5 bg-slate-200 rounded-full" style="max-width: 40px;"></div>' : ""}
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div class="flex items-start gap-3">
            <svg class="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-xs text-slate-500 leading-relaxed">
              <span class="font-medium text-slate-700">Workflow Guide:</span> Submit your request → MPC reviews and validates → Document routed for digital signing → Upload fully signed document → Post to SAP system → Request completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

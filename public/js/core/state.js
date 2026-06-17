// ─── State ──────────────────────────────────────
const state = {
  token: localStorage.getItem("mpc_token"),
  user: JSON.parse(localStorage.getItem("mpc_user") || "null"),
  currentPage: "dashboard",
  reqAction: "draft",
  requestTypes: [],
  notifications: [],
};

// ─── Toast System ─────────────────────────────────
(function injectToastCSS() {
  if (document.getElementById("gooey-toast-style")) return;
  const style = document.createElement("style");
  style.id = "gooey-toast-style";
  style.textContent = `
    #toast-container{position:fixed;top:1.25rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:.625rem;pointer-events:none;align-items:center;}
    .gooey-toast{pointer-events:all;display:flex;align-items:flex-start;gap:.75rem;min-width:280px;max-width:380px;padding:.875rem 1rem 0 1rem;border-radius:1rem;box-shadow:0 8px 30px rgba(0,0,0,.14);overflow:hidden;position:relative;cursor:pointer;animation:gooey-slide-in .35s cubic-bezier(.22,1,.36,1) both;background:#fff;border:1px solid #e2e8f0}
    .gooey-toast.removing{animation:gooey-slide-out .3s cubic-bezier(.55,0,1,.45) both}
    @keyframes gooey-slide-in{from{opacity:0;transform:translateX(110%) scale(.92)}to{opacity:1;transform:translateX(0) scale(1)}}
    @keyframes gooey-slide-out{from{opacity:1;transform:translateX(0) scale(1)}to{opacity:0;transform:translateX(110%) scale(.88)}}
    .gooey-toast-icon{width:2rem;height:2rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;margin-top:1px}
    .gooey-toast-body{flex:1;min-width:0;padding-bottom:.875rem}
    .gooey-toast-title{font-size:.8125rem;font-weight:700;line-height:1.3;margin-bottom:.2rem}
    .gooey-toast-msg{font-size:.78rem;line-height:1.45;color:#64748b;word-break:break-word}
    .gooey-toast-close{background:none;border:none;cursor:pointer;font-size:1rem;line-height:1;color:#94a3b8;padding:0;flex-shrink:0;margin-top:-1px}
    .gooey-toast-close:hover{color:#475569}
    .gooey-toast-bar{position:absolute;bottom:0;left:0;height:3px;border-radius:0 0 1rem 1rem;animation:gooey-bar var(--bar-dur,4s) linear forwards}
    @keyframes gooey-bar{from{width:100%}to{width:0%}}
    .gooey-success .gooey-toast-icon{background:#dcfce7;color:#16a34a}.gooey-success .gooey-toast-title{color:#15803d}.gooey-success .gooey-toast-bar{background:#22c55e}
    .gooey-error .gooey-toast-icon{background:#fee2e2;color:#dc2626}.gooey-error .gooey-toast-title{color:#b91c1c}.gooey-error .gooey-toast-bar{background:#ef4444}
    .gooey-warning .gooey-toast-icon{background:#fef9c3;color:#ca8a04}.gooey-warning .gooey-toast-title{color:#a16207}.gooey-warning .gooey-toast-bar{background:#eab308}
    .gooey-info .gooey-toast-icon{background:#dbeafe;color:#2563eb}.gooey-info .gooey-toast-title{color:#1d4ed8}.gooey-info .gooey-toast-bar{background:#3b82f6}
  `;
  document.head.appendChild(style);
})();

const TOAST_META = {
  success: {
    title: "Success",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:1rem;height:1rem"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>`,
  },
  error: {
    title: "Error",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:1rem;height:1rem"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
  },
  warning: {
    title: "Warning",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:1rem;height:1rem"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`,
  },
  info: {
    title: "Information",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:1rem;height:1rem"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>`,
  },
};

// Dynamic base: works regardless of folder name in XAMPP
const API = window.location.pathname.replace(/\/([^/]*)$/, "") + "/api";

// ─── API Helper ──────────────────────────────────
async function api(endpoint, options = {}) {
  if (!endpoint) {
    console.error("API endpoint is null or undefined");
    return { success: false, message: "Invalid API endpoint" };
  }

  const fullUrl = `${API}${endpoint}`;
  console.log("🌐 API CALL:", {
    method: options.method || "GET",
    url: fullUrl,
    endpoint: endpoint,
    baseAPI: API,
    timestamp: new Date().toISOString(),
  });

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = localStorage.getItem("mpc_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  try {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers,
    });

    // For file downloads, return the response directly
    if (options.returnBlob) {
      return res;
    }

    // Read body text first so we can inspect it regardless of Content-Type
    const text = await res.text();

    if (res.status === 401) {
      // Don't auto logout for login endpoint (401 is expected for bad credentials)
      if (!endpoint.includes("/auth/login")) {
        if (typeof handleLogout === "function") handleLogout();
      }
      // Return the error message from server if available
      try {
        const data = JSON.parse(text);
        return data;
      } catch (_parseErr) {
        return { success: false, message: "Authentication failed" };
      }
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      return data;
    } catch (_parseErr) {
      // Server returned non-JSON (HTML error page, PHP notice, etc.)
      console.error(
        "API non-JSON response [" + endpoint + "]:",
        text.substring(0, 300),
      );

      // For login endpoint, return a friendly error message
      if (endpoint.includes("/auth/login")) {
        return {
          success: false,
          message: "Server error. Please try again later or contact support.",
        };
      }

      const httpMsg =
        res.status >= 500
          ? "Server error (" + res.status + "). Check PHP error log."
          : res.status === 404
            ? "Endpoint not found (" + endpoint + ")."
            : "Unexpected server response (" + res.status + ").";
      return { success: false, message: httpMsg };
    }
  } catch (e) {
    console.error("API fetch error:", e);
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
}

// js/core/auth.js - Updated handleLogin function

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("login-btn");
  const err = document.getElementById("login-error");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");

  // Clear previous error
  err.classList.add("hidden");
  err.textContent = "";

  // Basic validation
  if (!emailInput.value.trim()) {
    showToast("Please enter your username or email address.", "warning");
    emailInput.focus();
    return;
  }

  if (!passwordInput.value) {
    showToast("Please enter your password.", "warning");
    passwordInput.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `
    <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
    Signing in...
  `;

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
      }),
    });

    if (data && data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem("mpc_token", data.token);
      localStorage.setItem("mpc_user", JSON.stringify(data.user));
      showToast("Login successful! Redirecting...", "success");
      setTimeout(() => {
        showApp();
      }, 500);
    } else {
      // Get the error message from server response
      let errorMsg =
        data?.message ||
        "Invalid username/email or password. Please try again.";

      // Check if this is a deactivation message - make it more prominent
      const isDeactivated =
        errorMsg.toLowerCase().includes("deactivated") ||
        errorMsg.toLowerCase().includes("inactive") ||
        errorMsg.toLowerCase().includes("contact the mpc");

      // Display error in the login form
      err.textContent = errorMsg;

      // Add special styling for deactivation messages
      if (isDeactivated) {
        err.style.background = "#fef3c7";
        err.style.borderLeft = "4px solid #f59e0b";
        err.style.color = "#92400e";
        err.style.fontWeight = "500";
        err.style.padding = "16px";
        err.style.borderRadius = "12px";

        // Also show as a warning toast with longer duration
        showToast(errorMsg, "warning", "Account Notice", 8000);
      } else {
        err.style.background = "#fee2e2";
        err.style.borderLeft = "4px solid #ef4444";
        err.style.color = "#991b1b";
        err.style.padding = "12px 16px";
        err.style.borderRadius = "8px";
        showToast(errorMsg, "error");
      }

      err.classList.remove("hidden");

      // Clear password field for security
      passwordInput.value = "";
      passwordInput.focus();
    }
  } catch (error) {
    console.error("Login error:", error);
    const errorMsg =
      "Network error. Please check your connection and try again.";
    err.textContent = errorMsg;
    err.style.background = "#fee2e2";
    err.style.borderLeft = "4px solid #ef4444";
    err.classList.remove("hidden");
    showToast(errorMsg, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
      </svg>
      Sign In
    `;
  }
}

async function handleLogout() {
  if (state.token) await api("/auth/logout", { method: "POST" });
  localStorage.removeItem("mpc_token");
  localStorage.removeItem("mpc_user");
  state.token = null;
  state.user = null;
  document.getElementById("main-app").classList.add("hidden");
  document.getElementById("login-page").classList.remove("hidden");
  // showToast("Logged out successfully.", "info");
}

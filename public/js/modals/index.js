// js/modals/index.js
// Main Modal Module Loader - Initializes all modals

// Wait for DOM and all scripts to be ready
document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure all scripts are loaded
  setTimeout(function () {
    // Initialize RequestModal
    if (typeof RequestModal !== "undefined" && RequestModal.init) {
      RequestModal.init();
      console.log("RequestModal initialized");
    } else {
      console.warn("RequestModal not found");
    }

    // Initialize EditRequestModal
    if (typeof EditRequestModal !== "undefined" && EditRequestModal.init) {
      EditRequestModal.init();
      console.log("EditRequestModal initialized");
    } else {
      console.warn("EditRequestModal not found");
    }

    // Initialize NewRequestModal
    if (typeof NewRequestModal !== "undefined" && NewRequestModal.init) {
      NewRequestModal.init();
      console.log("NewRequestModal initialized");
    } else {
      console.warn("NewRequestModal not found");
    }

    // Initialize UserModal
    if (typeof UserModal !== "undefined" && UserModal.init) {
      UserModal.init();
      console.log("UserModal initialized");
    } else {
      console.warn("UserModal not found");
    }

    // Initialize DeactivateModal
    if (typeof DeactivateModal !== "undefined" && DeactivateModal.init) {
      DeactivateModal.init();
      console.log("DeactivateModal initialized");
    } else {
      console.warn("DeactivateModal not found");
    }

    console.log("All modal modules initialized successfully");
  }, 100);
});

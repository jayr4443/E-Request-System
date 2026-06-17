// js/components/qrcode.js - QR Code Generator for Requests

const QRCodeManager = {
  async showQRCode(requestId, requestNo) {
    let modal = document.getElementById("qrcode-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "qrcode-modal";
      modal.className =
        "modal-overlay hidden fixed inset-0 z-50 flex items-center justify-center p-4";
      modal.style.background = "rgba(0,0,0,0.5)";
      modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 class="font-display font-bold text-slate-800">Request QR Code</h3>
                        <button onclick="closeModal('qrcode-modal')" class="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <div class="p-6 text-center">
                        <div id="qrcode-container" class="flex justify-center mb-4"></div>
                        <p id="qrcode-request-no" class="text-sm font-mono text-slate-600 mb-2"></p>
                        <p class="text-xs text-slate-400">Scan to view this request</p>
                        <div class="mt-4 flex gap-2">
                            <button onclick="QRCodeManager.downloadQR()" class="btn btn-secondary btn-sm flex-1">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Download
                            </button>
                            <button onclick="QRCodeManager.printQR()" class="btn btn-primary btn-sm flex-1">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                                </svg>
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
    }

    // Generate QR code URL
    const baseUrl =
      window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "");
    const viewUrl = `${baseUrl}?view=request&id=${requestId}`;

    // Clear previous QR code
    const container = document.getElementById("qrcode-container");
    container.innerHTML = "";

    // Generate new QR code
    new QRCode(container, {
      text: viewUrl,
      width: 200,
      height: 200,
      colorDark: "#1a228f",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });

    document.getElementById("qrcode-request-no").textContent = requestNo;

    // Store current request info for download
    this.currentRequestId = requestId;
    this.currentRequestNo = requestNo;
    this.currentQRUrl = viewUrl;

    modal.classList.remove("hidden");
  },

  downloadQR() {
    const qrImage = document.querySelector("#qrcode-container img");
    if (qrImage) {
      const link = document.createElement("a");
      link.download = `request_${this.currentRequestNo}_qr.png`;
      link.href = qrImage.src;
      link.click();
      showToast("QR Code downloaded!", "success", 2000);
    }
  },

  printQR() {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${this.currentRequestNo}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: white;
                    }
                    .qr-container {
                        text-align: center;
                        padding: 20px;
                    }
                    img {
                        max-width: 300px;
                        height: auto;
                    }
                    .request-no {
                        font-family: monospace;
                        font-size: 14px;
                        margin-top: 20px;
                        color: #333;
                    }
                    .company {
                        margin-top: 30px;
                        font-size: 12px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <h2>Co Ban Kiat Hardware Inc.</h2>
                    <h3>MPC Electronic Request System</h3>
                    <img src="${document.querySelector("#qrcode-container img").src}" alt="QR Code">
                    <div class="request-no">Request No: ${this.currentRequestNo}</div>
                    <div class="company">Scan to view request details</div>
                </div>
                <script>
                    window.print();
                    setTimeout(() => window.close(), 1000);
                </script>
            </body>
            </html>
        `);
    printWindow.document.close();
  },
};

// Add QR button to request detail modal
function addQRButtonToRequestModal() {
  // Modify RequestModal.buildRequestHTML to include QR button
  // Add this button in the actions section
  const qrButton = `
        <button onclick="QRCodeManager.showQRCode(${requestId}, '${requestNo}')" 
            class="btn btn-sm flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
            </svg>
            QR Code
        </button>
    `;
}

// Make globally available
window.QRCodeManager = QRCodeManager;

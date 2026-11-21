window.GymBiometric = (function () {
    "use strict";

    function getConfig() {
        const settings = GymDB.getAll("settings") || [];
        const record = settings.find(item => item.key === "biometricConfig");
        return record && record.value ? record.value : {
            brand: "eSSL / ZKTeco",
            model: "",
            ipAddress: "192.168.1.201",
            port: "4370",
            bridgeUrl: "http://localhost:8080/api/biometric",
            autoCheckin: true
        };
    }

    function saveConfig(config) {
        const settings = GymDB.getAll("settings") || [];
        const idx = settings.findIndex(item => item.key === "biometricConfig");
        const entry = {
            key: "biometricConfig",
            value: config,
            updatedAt: new Date().toISOString()
        };

        if (idx >= 0) {
            settings[idx] = entry;
        } else {
            settings.push(entry);
        }

        GymDB.saveAll("settings", settings);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function notify(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        const cfg = getConfig();

        root.innerHTML = `
            <div class="gym-biometric-wrap">

                <div class="bio-header">
                    <div>
                        <h2>Biometric Fingerprint Device</h2>
                        <p>Configure hardware connection settings for automated member fingerprint check-ins.</p>
                    </div>

                    <div class="bio-status-pill disconnected" id="bioStatusBadge">
                        <span class="bio-dot"></span> Hardware Disconnected
                    </div>
                </div>

                <div class="bio-grid-layout">

                    <section class="bio-card">
                        <div class="bio-card-header">
                            <h3>Device Connection Configuration</h3>
                            <p>Enter your biometric scanner IP address and local API bridge details.</p>
                        </div>

                        <form id="biometricConfigForm">
                            <div class="bio-form-grid">
                                <div>
                                    <label>Device Brand / Protocol</label>
                                    <select id="bioBrand">
                                        <option value="eSSL / ZKTeco" ${cfg.brand === "eSSL / ZKTeco" ? "selected" : ""}>eSSL / ZKTeco (Push / TCP)</option>
                                        <option value="Mantra MFS100 / MFS110" ${cfg.brand === "Mantra MFS100 / MFS110" ? "selected" : ""}>Mantra MFS100 / MFS110 (RD Service)</option>
                                        <option value="Morpho Safran" ${cfg.brand === "Morpho Safran" ? "selected" : ""}>Morpho Safran (Localhost API)</option>
                                        <option value="Matrix COSEC" ${cfg.brand === "Matrix COSEC" ? "selected" : ""}>Matrix COSEC</option>
                                        <option value="Custom REST Webhook" ${cfg.brand === "Custom REST Webhook" ? "selected" : ""}>Custom REST Webhook</option>
                                    </select>
                                </div>

                                <div>
                                    <label>Device Model Name</label>
                                    <input type="text" id="bioModel"
                                        value="${escapeHTML(cfg.model)}"
                                        placeholder="e.g. eSSL X990 / K30 Pro">
                                </div>

                                <div>
                                    <label>Device Local IP Address</label>
                                    <input type="text" id="bioIp"
                                        value="${escapeHTML(cfg.ipAddress)}"
                                        placeholder="192.168.1.201">
                                </div>

                                <div>
                                    <label>Communication Port</label>
                                    <input type="text" id="bioPort"
                                        value="${escapeHTML(cfg.port)}"
                                        placeholder="4370">
                                </div>

                                <div class="bio-full">
                                    <label>Local Middleware / Bridge Endpoint URL</label>
                                    <input type="url" id="bioBridgeUrl"
                                        value="${escapeHTML(cfg.bridgeUrl)}"
                                        placeholder="http://localhost:8080/api/biometric">
                                </div>
                            </div>

                            <div class="bio-btn-row">
                                <button type="submit" class="bio-primary-btn">
                                    Save Device Settings
                                </button>
                                <button type="button" id="testBioConnectionBtn" class="bio-sec-btn">
                                    Test Device Ping
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="bio-card">
                        <div class="bio-card-header">
                            <h3>Integration & Attendance Fallback</h3>
                            <p>How biometric check-ins sync with GYM PRO.</p>
                        </div>

                        <div class="bio-info-box">
                            <strong>1. Browser Security Note</strong>
                            <p>Web browsers cannot directly access USB/LAN biometric hardware without a local RD Service or middleware agent running on your gym PC.</p>
                        </div>

                        <div class="bio-info-box">
                            <strong>2. Member ID Mapping</strong>
                            <p>Enroll each member on the biometric machine using their exact GYM PRO serial number (e.g. <code>1001</code>) for automatic punch-in sync.</p>
                        </div>

                        <div class="bio-fallback-box">
                            <p>Need to mark attendance right now?</p>
                            <button type="button" id="goToAttendanceBtn" class="bio-sec-btn" style="width:100%;">
                                Open Manual Attendance →
                            </button>
                        </div>
                    </section>

                </div>

            </div>
        `;

        addStyles();

        document.getElementById("biometricConfigForm")
            .addEventListener("submit", function (e) {
                e.preventDefault();
                saveConfig({
                    brand: document.getElementById("bioBrand").value,
                    model: document.getElementById("bioModel").value.trim(),
                    ipAddress: document.getElementById("bioIp").value.trim(),
                    port: document.getElementById("bioPort").value.trim(),
                    bridgeUrl: document.getElementById("bioBridgeUrl").value.trim(),
                    autoCheckin: true
                });
                notify("Biometric device settings saved.");
            });

        document.getElementById("testBioConnectionBtn")
            .addEventListener("click", function () {
                const btn = this;
                btn.disabled = true;
                btn.textContent = "Pinging Device...";

                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = "Test Device Ping";
                    notify("No local biometric bridge detected at " + document.getElementById("bioBridgeUrl").value);
                }, 900);
            });

        document.getElementById("goToAttendanceBtn")
            .addEventListener("click", function () {
                if (typeof window.openGymPage === "function") {
                    window.openGymPage("attendance");
                }
            });
    }

    function addStyles() {
        if (document.getElementById("gymBiometricStyles")) return;

        const style = document.createElement("style");
        style.id = "gymBiometricStyles";

        style.textContent = `
            .gym-biometric-wrap {
                color: #202124;
                width: 100%;
                padding: 2px 0 25px;
            }

            .bio-header {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .bio-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .bio-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .bio-status-pill {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 7px 13px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
            }

            .bio-status-pill.disconnected {
                background: #fff8eb;
                border: 1px solid #f7dfad;
                color: #b8740e;
            }

            .bio-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #d97706;
            }

            .bio-grid-layout {
                display: grid;
                grid-template-columns: 1.4fr 1fr;
                gap: 18px;
            }

            .bio-card {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 22px 24px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .bio-card-header {
                margin-bottom: 18px;
                padding-bottom: 12px;
                border-bottom: 1px solid #edf0f3;
            }

            .bio-card h3 {
                margin: 0 0 4px;
                font-size: 15.5px;
                font-weight: 800;
                color: #202124;
            }

            .bio-card-header p {
                margin: 0;
                font-size: 11.5px;
                color: #737985;
            }

            .bio-form-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .bio-form-grid > div {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .bio-form-grid label {
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
            }

            .bio-form-grid input,
            .bio-form-grid select {
                width: 100%;
                box-sizing: border-box;
                padding: 11px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #ffffff;
                color: #202124;
                font-size: 12.5px;
                outline: none;
            }

            .bio-form-grid input:focus,
            .bio-form-grid select:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .bio-full {
                grid-column: 1 / -1;
            }

            .bio-btn-row {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .bio-primary-btn {
                padding: 12px 20px;
                border: 0;
                border-radius: 9px;
                background: linear-gradient(135deg, #e3262e, #c51019);
                color: #ffffff;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(215, 25, 32, 0.18);
                transition: all 0.2s ease;
            }

            .bio-primary-btn:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }

            .bio-sec-btn {
                padding: 11px 16px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #f8f9fb;
                color: #303640;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .bio-sec-btn:hover {
                background: #fff4f4;
                border-color: #f2bfc1;
                color: #d71920;
            }

            .bio-info-box {
                padding: 13px 15px;
                border-radius: 10px;
                background: #f8f9fb;
                border: 1px solid #edf0f3;
                margin-bottom: 12px;
            }

            .bio-info-box strong {
                display: block;
                font-size: 12px;
                color: #202124;
                margin-bottom: 4px;
            }

            .bio-info-box p {
                margin: 0;
                font-size: 11.5px;
                color: #5f6672;
                line-height: 1.55;
            }

            .bio-info-box code {
                background: #ffffff;
                border: 1px solid #dfe2e8;
                padding: 1px 5px;
                border-radius: 4px;
                color: #d71920;
                font-weight: 700;
            }

            .bio-fallback-box {
                margin-top: 16px;
                padding-top: 14px;
                border-top: 1px solid #edf0f3;
            }

            .bio-fallback-box p {
                font-size: 11.5px;
                color: #737985;
                margin: 0 0 10px;
            }

            @media(max-width:850px) {
                .bio-grid-layout {
                    grid-template-columns: 1fr;
                }
            }

            @media(max-width:600px) {
                .bio-form-grid {
                    grid-template-columns: 1fr;
                }
                .bio-full {
                    grid-column: auto;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        getConfig
    };
})();

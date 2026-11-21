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

    function today() {
        const d = new Date();
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
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

    function processFingerprintPunch(memberId) {
        const members = GymDB.getAll("members") || [];
        const member = members.find(
            m => String(m.id).toUpperCase() === String(memberId).trim().toUpperCase() ||
                 String(m.memberSerial) === String(memberId).trim()
        );

        if (!member) {
            return { ok: false, message: "Member ID not found in database." };
        }

        const status = String(member.status || "").toLowerCase();
        if (status !== "active" || (member.expiryDate && member.expiryDate < today())) {
            return {
                ok: false,
                message: `Access Denied: ${member.name}'s membership is expired or inactive.`
            };
        }

        const attendance = GymDB.getAll("attendance") || [];
        const openRecord = attendance.find(
            r => String(r.memberId) === String(member.id) && r.date === today() && !r.checkOut
        );

        const now = new Date().toISOString();

        if (openRecord) {
            GymDB.update("attendance", openRecord.id, {
                ...openRecord,
                checkOut: now,
                source: "Biometric",
                updatedAt: now
            });
            if (typeof window.updateGymDashboard === "function") window.updateGymDashboard();
            return {
                ok: true,
                action: "CHECK-OUT",
                message: `Check-Out recorded for ${member.name} (${member.id})`
            };
        } else {
            GymDB.add("attendance", {
                id: GymDB.generateID("ATT"),
                memberId: member.id,
                memberName: member.name || "",
                date: today(),
                checkIn: now,
                checkOut: "",
                source: "Biometric",
                createdAt: now
            });
            if (typeof window.updateGymDashboard === "function") window.updateGymDashboard();
            return {
                ok: true,
                action: "CHECK-IN",
                message: `Check-In recorded for ${member.name} (${member.id})`
            };
        }
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        const cfg = getConfig();
        const members = GymDB.getAll("members") || [];

        root.innerHTML = `
            <div class="gym-biometric-wrap">

                <div class="bio-header">
                    <div>
                        <h2>Biometric Fingerprint Device</h2>
                        <p>Configure hardware connection settings or test live fingerprint punches online.</p>
                    </div>

                    <div class="bio-status-pill disconnected" id="bioStatusBadge">
                        <span class="bio-dot"></span> <span id="bioStatusText">Standby / Ready to Test</span>
                    </div>
                </div>

                <div class="bio-grid-layout">

                    <section class="bio-card">
                        <div class="bio-card-header">
                            <h3>Device Connection Configuration</h3>
                            <p>Enter your biometric scanner IP address or online Webhook test URL.</p>
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
                                    <label>Middleware / Webhook Endpoint URL</label>
                                    <input type="url" id="bioBridgeUrl"
                                        value="${escapeHTML(cfg.bridgeUrl)}"
                                        placeholder="https://webhook.site/your-unique-id">
                                </div>
                            </div>

                            <div class="bio-btn-row">
                                <button type="submit" class="bio-primary-btn">
                                    Save Device Settings
                                </button>
                                <button type="button" id="testBioConnectionBtn" class="bio-sec-btn">
                                    Send Live Ping
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="bio-card">
                        <div class="bio-card-header">
                            <h3>Online Fingerprint Punch Simulator</h3>
                            <p>Test biometric Check-in / Check-out and send live JSON logs to your Webhook URL.</p>
                        </div>

                        <div class="bio-sim-box">
                            <label style="display:block;font-size:11.5px;font-weight:600;color:#454c57;margin-bottom:6px;">
                                Select Member to Scan Finger
                            </label>
                            <select id="bioSimMemberSelect" style="width:100%;padding:11px;border-radius:9px;border:1px solid #dfe2e8;background:#ffffff;margin-bottom:12px;font-size:12.5px;">
                                <option value="">Choose Registered Member...</option>
                                ${members.map(m => `
                                    <option value="${escapeHTML(m.id)}">
                                        ${escapeHTML(m.name)} (${escapeHTML(m.id)})
                                    </option>
                                `).join("")}
                            </select>

                            <button type="button" id="simulatePunchBtn" class="bio-primary-btn" style="width:100%;">
                                Simulate Fingerprint Scan
                            </button>

                            <div id="bioSimResult" style="display:none;margin-top:12px;padding:11px 13px;border-radius:9px;font-size:12px;font-weight:600;"></div>
                        </div>

                        <div class="bio-fallback-box">
                            <p>View live biometric entries in Attendance:</p>
                            <button type="button" id="goToAttendanceBtn" class="bio-sec-btn" style="width:100%;">
                                Open Attendance Logs →
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

        // REAL HTTP PING TO WEBHOOK / BRIDGE URL
        document.getElementById("testBioConnectionBtn")
            .addEventListener("click", async function () {
                const url = document.getElementById("bioBridgeUrl").value.trim();
                if (!url) {
                    alert("Please enter an Endpoint URL first.");
                    return;
                }

                const btn = this;
                btn.disabled = true;
                btn.textContent = "Sending Ping...";

                try {
                    await fetch(url, {
                        method: "POST",
                        mode: "no-cors",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event: "DEVICE_PING",
                            app: "GYM PRO",
                            brand: document.getElementById("bioBrand").value,
                            deviceIp: document.getElementById("bioIp").value,
                            timestamp: new Date().toISOString()
                        })
                    });

                    const badge = document.getElementById("bioStatusBadge");
                    const text = document.getElementById("bioStatusText");
                    if (badge && text) {
                        badge.className = "bio-status-pill connected";
                        text.textContent = "Ping Sent to Endpoint";
                    }
                    notify("Ping sent! Check your Webhook.site tab.");
                } catch (err) {
                    notify("Unable to reach endpoint URL.");
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Send Live Ping";
                }
            });

        // SIMULATE FINGERPRINT PUNCH + SEND WEBHOOK LOG
        document.getElementById("simulatePunchBtn")
            .addEventListener("click", async function () {
                const memberId = document.getElementById("bioSimMemberSelect").value;
                const resultBox = document.getElementById("bioSimResult");

                if (!memberId) {
                    alert("Please select a member first.");
                    return;
                }

                const res = processFingerprintPunch(memberId);
                resultBox.style.display = "block";
                resultBox.style.background = res.ok ? "#e9f8f0" : "#fff0f0";
                resultBox.style.color = res.ok ? "#168653" : "#d71920";
                resultBox.style.border = res.ok ? "1px solid #bfe7d1" : "1px solid #f5c6c8";
                resultBox.textContent = res.message;

                notify(res.message);

                // Also send punch payload to Webhook URL if configured
                const url = document.getElementById("bioBridgeUrl").value.trim();
                if (url && url.startsWith("http")) {
                    fetch(url, {
                        method: "POST",
                        mode: "no-cors",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event: "BIOMETRIC_PUNCH",
                            memberId: memberId,
                            status: res.ok ? res.action : "DENIED",
                            detail: res.message,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
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

            .bio-status-pill.connected {
                background: #e9f8f0;
                border: 1px solid #bfe7d1;
                color: #168653;
            }

            .bio-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: currentColor;
            }

            .bio-grid-layout {
                display: grid;
                grid-template-columns: 1.35fr 1fr;
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

            .bio-sim-box {
                padding: 16px;
                border-radius: 10px;
                background: #f8f9fb;
                border: 1px solid #edf0f3;
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
        getConfig,
        processFingerprintPunch
    };
})();

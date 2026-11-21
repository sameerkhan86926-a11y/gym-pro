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

    function getMembers() {
        return GymDB.getAll("members") || [];
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

    function getDeviceUserId(member) {
        if (member.memberSerial) return String(member.memberSerial);
        const match = String(member.id || "").match(/(\d+)$/);
        return match ? match[1] : String(member.id || "-");
    }

    function sendWebhookEvent(payload) {
        const cfg = getConfig();
        const url = String(cfg.bridgeUrl || "").trim();
        if (!url || !url.startsWith("http")) return;

        fetch(url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                app: "GYM PRO",
                brand: cfg.brand,
                deviceIp: cfg.ipAddress,
                timestamp: new Date().toISOString(),
                ...payload
            })
        }).catch(() => {});
    }

    function processFingerprintPunch(memberId) {
        const members = getMembers();
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
        const members = getMembers();
        const enrolledCount = members.filter(m => m.biometricEnrolled).length;

        root.innerHTML = `
            <div class="gym-biometric-wrap">

                <div class="bio-header">
                    <div>
                        <h2>Biometric Fingerprint Device</h2>
                        <p>Enroll member fingerprints, configure hardware connection and test live punches.</p>
                    </div>

                    <div class="bio-header-right">
                        <span class="bio-count-pill">Enrolled: <strong>${enrolledCount} / ${members.length}</strong></span>
                        <div class="bio-status-pill disconnected" id="bioStatusBadge">
                            <span class="bio-dot"></span> <span id="bioStatusText">Standby / Ready</span>
                        </div>
                    </div>
                </div>

                <div class="bio-grid-layout">

                    <section class="bio-card">
                        <div class="bio-card-header">
                            <h3>Device Connection Configuration</h3>
                            <p>Enter your biometric scanner IP address or Middleware / Webhook URL.</p>
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
                                        placeholder="e.g. eSSL X990 / Mantra MFS110">
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
                                        placeholder="http://localhost:8080/api/biometric">
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
                            <h3>Fingerprint Punch Simulator</h3>
                            <p>Test biometric Check-in / Check-out and verify live attendance sync.</p>
                        </div>

                        <div class="bio-sim-box">
                            <label style="display:block;font-size:11.5px;font-weight:600;color:#454c57;margin-bottom:6px;">
                                Select Member to Scan Finger
                            </label>
                            <select id="bioSimMemberSelect" style="width:100%;padding:11px;border-radius:9px;border:1px solid #dfe2e8;background:#ffffff;margin-bottom:12px;font-size:12.5px;">
                                <option value="">Choose Registered Member...</option>
                                ${members.map(m => `
                                    <option value="${escapeHTML(m.id)}">
                                        ${escapeHTML(m.name)} (${escapeHTML(m.id)}) ${m.biometricEnrolled ? "✓" : ""}
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

                <!-- MEMBER FINGERPRINT ENROLLMENT SECTION -->
                <section class="bio-card" style="margin-top:20px;">
                    <div class="bio-enroll-top">
                        <div>
                            <h3>Member Fingerprint Enrollment</h3>
                            <p>Register or manage member fingerprints for biometric device sync.</p>
                        </div>

                        <div class="bio-enroll-filters">
                            <input type="search" id="bioMemberSearch"
                                placeholder="Search member name, ID or phone...">
                            <select id="bioEnrollFilter">
                                <option value="all">All Members</option>
                                <option value="enrolled">Enrolled Only</option>
                                <option value="pending">Not Enrolled</option>
                            </select>
                        </div>
                    </div>

                    <div class="bio-table-wrap">
                        <table class="bio-table">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Device User ID</th>
                                    <th>Phone</th>
                                    <th>Enrolled Finger</th>
                                    <th>Biometric Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="bioMembersTableBody"></tbody>
                        </table>
                    </div>
                </section>

            </div>

            <!-- FINGERPRINT ENROLLMENT MODAL -->
            <div class="bio-modal" id="bioEnrollModal">
                <div class="bio-modal-box">
                    <div class="bio-modal-header">
                        <h3>Enroll Member Fingerprint</h3>
                        <button type="button" class="bio-modal-close" id="closeBioEnrollX" aria-label="Close">✕</button>
                    </div>

                    <form id="bioEnrollForm">
                        <input type="hidden" id="enrollMemberId">

                        <div class="bio-enroll-summary" id="enrollMemberSummary"></div>

                        <label style="display:block;font-size:11.5px;font-weight:600;color:#454c57;margin:14px 0 6px;">
                            Select Finger to Register *
                        </label>
                        <select id="enrollFingerSelect" style="width:100%;padding:11px 13px;border-radius:9px;border:1px solid #dfe2e8;background:#ffffff;font-size:12.5px;" required>
                            <option value="Right Thumb">Right Thumb</option>
                            <option value="Right Index Finger">Right Index Finger</option>
                            <option value="Left Thumb">Left Thumb</option>
                            <option value="Left Index Finger">Left Index Finger</option>
                        </select>

                        <div class="bio-scanner-pad" id="bioScannerPad">
                            <div class="bio-fp-circle" id="bioFpCircle">FP</div>
                            <strong id="bioScanTitle">Ready to Capture Fingerprint</strong>
                            <p id="bioScanHint">Ask the member to place their selected finger on the scanner, then click Capture below.</p>
                        </div>

                        <div class="bio-modal-actions">
                            <button type="submit" id="captureFingerBtn" class="bio-primary-btn">
                                Capture &amp; Register Finger
                            </button>
                            <button type="button" class="bio-sec-btn" id="cancelBioEnrollBtn">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        addStyles();
        attachEvents();
        renderEnrollmentTable();
    }

    function attachEvents() {
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
                    notify("Ping sent! Check your Webhook / Bridge.");
                } catch (err) {
                    notify("Unable to reach endpoint URL.");
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Send Live Ping";
                }
            });

        // SIMULATE FINGERPRINT PUNCH
        document.getElementById("simulatePunchBtn")
            .addEventListener("click", function () {
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

                sendWebhookEvent({
                    event: "BIOMETRIC_PUNCH",
                    memberId: memberId,
                    status: res.ok ? res.action : "DENIED",
                    detail: res.message
                });
            });

        document.getElementById("goToAttendanceBtn")
            .addEventListener("click", function () {
                if (typeof window.openGymPage === "function") {
                    window.openGymPage("attendance");
                }
            });

        // ENROLLMENT FILTERS & MODAL
        document.getElementById("bioMemberSearch")
            .addEventListener("input", renderEnrollmentTable);

        document.getElementById("bioEnrollFilter")
            .addEventListener("change", renderEnrollmentTable);

        document.getElementById("closeBioEnrollX")
            .addEventListener("click", closeEnrollModal);

        document.getElementById("cancelBioEnrollBtn")
            .addEventListener("click", closeEnrollModal);

        document.getElementById("bioEnrollForm")
            .addEventListener("submit", saveFingerprintEnrollment);
    }

    function renderEnrollmentTable() {
        const tbody = document.getElementById("bioMembersTableBody");
        if (!tbody) return;

        const members = getMembers();
        const search = (document.getElementById("bioMemberSearch")?.value || "")
            .trim().toLowerCase();
        const filter = document.getElementById("bioEnrollFilter")?.value || "all";

        const filtered = members.filter(member => {
            const matchesSearch =
                String(member.name || "").toLowerCase().includes(search) ||
                String(member.id || "").toLowerCase().includes(search) ||
                String(member.phone || "").toLowerCase().includes(search);

            const isEnrolled = Boolean(member.biometricEnrolled);
            const matchesFilter =
                filter === "all" ||
                (filter === "enrolled" && isEnrolled) ||
                (filter === "pending" && !isEnrolled);

            return matchesSearch && matchesFilter;
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="bio-empty">
                        No members found matching your filter.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(member => {
            const isEnrolled = Boolean(member.biometricEnrolled);
            const deviceUid = getDeviceUserId(member);

            return `
                <tr>
                    <td>
                        <strong style="color:#202124;">${escapeHTML(member.name)}</strong><br>
                        <span class="bio-id-pill">${escapeHTML(member.id)}</span>
                    </td>
                    <td>
                        <span class="bio-uid-pill">UID: ${escapeHTML(deviceUid)}</span>
                    </td>
                    <td>${escapeHTML(member.phone || "-")}</td>
                    <td>${isEnrolled ? escapeHTML(member.biometricFinger || "Registered") : "-"}</td>
                    <td>
                        <span class="bio-enroll-badge ${isEnrolled ? "yes" : "no"}">
                            ${isEnrolled ? "● Enrolled" : "Not Enrolled"}
                        </span>
                    </td>
                    <td style="white-space:nowrap;">
                        <button type="button" class="bio-tbl-btn enroll"
                            data-enroll-member="${escapeHTML(member.id)}">
                            ${isEnrolled ? "Re-enroll" : "+ Enroll Finger"}
                        </button>
                        ${isEnrolled ? `
                            <button type="button" class="bio-tbl-btn remove"
                                data-remove-bio="${escapeHTML(member.id)}">
                                Remove
                            </button>
                        ` : ""}
                    </td>
                </tr>
            `;
        }).join("");

        tbody.querySelectorAll("[data-enroll-member]").forEach(btn => {
            btn.addEventListener("click", function () {
                openEnrollModal(this.dataset.enrollMember);
            });
        });

        tbody.querySelectorAll("[data-remove-bio]").forEach(btn => {
            btn.addEventListener("click", function () {
                removeEnrollment(this.dataset.removeBio);
            });
        });
    }

    function openEnrollModal(memberId) {
        const member = GymDB.find("members", memberId);
        if (!member) return;

        document.getElementById("enrollMemberId").value = member.id;
        document.getElementById("enrollFingerSelect").value =
            member.biometricFinger || "Right Thumb";

        document.getElementById("enrollMemberSummary").innerHTML = `
            <strong style="font-size:13.5px;color:#202124;">${escapeHTML(member.name)}</strong>
            &nbsp;<span class="bio-id-pill">${escapeHTML(member.id)}</span><br>
            Device Machine User ID: <strong>${escapeHTML(getDeviceUserId(member))}</strong>
        `;

        const circle = document.getElementById("bioFpCircle");
        circle.classList.remove("scanning", "success");
        document.getElementById("bioScanTitle").textContent = "Ready to Capture Fingerprint";
        document.getElementById("bioScanHint").textContent =
            "Place finger on scanner (or click Capture below to simulate/sync with bridge).";

        const btn = document.getElementById("captureFingerBtn");
        btn.disabled = false;
        btn.textContent = "Capture & Register Finger";

        document.getElementById("bioEnrollModal").style.display = "flex";
    }

    function closeEnrollModal() {
        const modal = document.getElementById("bioEnrollModal");
        if (modal) modal.style.display = "none";
    }

    function saveFingerprintEnrollment(event) {
        event.preventDefault();

        const memberId = document.getElementById("enrollMemberId").value;
        const finger = document.getElementById("enrollFingerSelect").value;
        const member = GymDB.find("members", memberId);
        if (!member) return;

        const btn = document.getElementById("captureFingerBtn");
        const circle = document.getElementById("bioFpCircle");
        btn.disabled = true;
        btn.textContent = "Scanning Finger...";
        circle.classList.add("scanning");
        document.getElementById("bioScanTitle").textContent = "Scanning Fingerprint...";

        setTimeout(() => {
            const templateId = "FP-" + getDeviceUserId(member) + "-" + Date.now().toString().slice(-6);
            const now = new Date().toISOString();

            GymDB.update("members", member.id, {
                biometricEnrolled: true,
                biometricFinger: finger,
                biometricTemplateId: templateId,
                biometricEnrolledAt: now
            });

            circle.classList.remove("scanning");
            circle.classList.add("success");
            document.getElementById("bioScanTitle").textContent = "Fingerprint Registered!";

            sendWebhookEvent({
                event: "BIOMETRIC_ENROLL",
                memberId: member.id,
                memberName: member.name,
                deviceUserId: getDeviceUserId(member),
                finger: finger,
                templateId: templateId
            });

            setTimeout(() => {
                closeEnrollModal();
                render();
                notify(`Fingerprint registered for ${member.name} (${finger}).`);
            }, 500);
        }, 750);
    }

    function removeEnrollment(memberId) {
        const member = GymDB.find("members", memberId);
        if (!member) return;

        if (!confirm(`Remove biometric fingerprint registration for ${member.name}?`)) {
            return;
        }

        GymDB.update("members", member.id, {
            biometricEnrolled: false,
            biometricFinger: "",
            biometricTemplateId: "",
            biometricEnrolledAt: ""
        });

        sendWebhookEvent({
            event: "BIOMETRIC_REMOVE",
            memberId: member.id,
            deviceUserId: getDeviceUserId(member)
        });

        render();
        notify("Biometric registration removed.");
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

            .bio-header-right {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .bio-count-pill {
                padding: 7px 12px;
                border-radius: 20px;
                background: #f8f9fb;
                border: 1px solid #e7e9ee;
                font-size: 11px;
                color: #454c57;
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

            /* ENROLLMENT TABLE */
            .bio-enroll-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 16px;
            }

            .bio-enroll-top h3 {
                margin: 0 0 3px;
                font-size: 15.5px;
                font-weight: 800;
                color: #202124;
            }

            .bio-enroll-top p {
                margin: 0;
                font-size: 11.5px;
                color: #737985;
            }

            .bio-enroll-filters {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .bio-enroll-filters input,
            .bio-enroll-filters select {
                padding: 10px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
            }

            .bio-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .bio-table {
                width: 100%;
                min-width: 740px;
                border-collapse: collapse;
                background: #ffffff;
            }

            .bio-table th,
            .bio-table td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
                font-size: 11.5px;
                color: #454c57;
            }

            .bio-table th {
                background: #f8f9fb;
                color: #69717e;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .bio-table tbody tr:hover {
                background: #fffafa;
            }

            .bio-id-pill {
                display: inline-block;
                margin-top: 3px;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }

            .bio-uid-pill {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 6px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 11px;
                font-weight: 700;
            }

            .bio-enroll-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
            }

            .bio-enroll-badge.yes {
                background: #e9f8f0;
                color: #168653;
            }

            .bio-enroll-badge.no {
                background: #f2f4f7;
                color: #69717e;
            }

            .bio-tbl-btn {
                padding: 6px 11px;
                border-radius: 7px;
                font-size: 10.5px;
                font-weight: 700;
                cursor: pointer;
                margin-right: 4px;
                transition: all 0.18s ease;
            }

            .bio-tbl-btn.enroll {
                background: #fff0f0;
                border: 1px solid #f5c6c8;
                color: #d71920;
            }

            .bio-tbl-btn.enroll:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .bio-tbl-btn.remove {
                background: #f8f9fb;
                border: 1px solid #dfe2e8;
                color: #5f6672;
            }

            .bio-tbl-btn.remove:hover {
                background: #e7e9ee;
            }

            .bio-empty {
                text-align: center !important;
                padding: 32px 15px !important;
                color: #8a909a;
                font-size: 12px;
            }

            /* ENROLL MODAL */
            .bio-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 15px;
                background: rgba(15, 20, 30, 0.55);
                backdrop-filter: blur(3px);
            }

            .bio-modal-box {
                width: 100%;
                max-width: 450px;
                padding: 25px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
            }

            .bio-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 12px;
                margin-bottom: 14px;
                border-bottom: 1px solid #edf0f3;
            }

            .bio-modal-header h3 {
                margin: 0;
                font-size: 16.5px;
                font-weight: 800;
            }

            .bio-modal-close {
                width: 30px;
                height: 30px;
                border-radius: 8px;
                border: 1px solid #e7e9ee;
                background: #f8f9fb;
                color: #69717e;
                cursor: pointer;
            }

            .bio-enroll-summary {
                padding: 12px 14px;
                border-radius: 10px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                font-size: 12px;
                line-height: 1.7;
                color: #303640;
            }

            .bio-scanner-pad {
                margin-top: 16px;
                padding: 20px 16px;
                border-radius: 12px;
                background: #f8f9fb;
                border: 1.5px dashed #cbd2dc;
                text-align: center;
            }

            .bio-fp-circle {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: #fff0f0;
                border: 2px solid #f2bfc1;
                color: #d71920;
                font-weight: 800;
                font-size: 16px;
                display: grid;
                place-items: center;
                margin: 0 auto 10px;
                transition: all 0.25s ease;
            }

            .bio-fp-circle.scanning {
                background: #fff8eb;
                border-color: #d97706;
                color: #d97706;
                transform: scale(1.08);
            }

            .bio-fp-circle.success {
                background: #e9f8f0;
                border-color: #168653;
                color: #168653;
            }

            .bio-scanner-pad strong {
                display: block;
                font-size: 13px;
                color: #202124;
                margin-bottom: 4px;
            }

            .bio-scanner-pad p {
                margin: 0;
                font-size: 11.5px;
                color: #737985;
                line-height: 1.5;
            }

            .bio-modal-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .bio-modal-actions button {
                flex: 1;
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

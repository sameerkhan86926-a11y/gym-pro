window.GymSettings = (function () {
    "use strict";

    function getSettings() {
        return GymDB.getAll("settings") || [];
    }

    function getSetting(key, fallback) {
        const record = getSettings().find(item => item.key === key);
        return record ? record.value : fallback;
    }

    function saveSetting(key, value) {
        const settings = getSettings();
        const index = settings.findIndex(item => item.key === key);

        const record = {
            key,
            value,
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            settings[index] = record;
        } else {
            settings.push(record);
        }

        GymDB.saveAll("settings", settings);
    }

    function getProfile() {
        return getSetting("gymProfile", {
            gymName: "GYM PRO",
            ownerName: "",
            phone: "",
            email: "",
            address: "",
            currency: "INR"
        });
    }

    function getMemberIdConfig() {
        return getSetting("memberIdConfig", {
            prefix: "GYM",
            startSerial: 1001
        });
    }

    function saveProfile(profile) {
        saveSetting("gymProfile", profile);
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

    // APPLY GYM NAME THROUGHOUT THE APPLICATION
    function applyGymName() {
        const profile = getProfile();
        const gymName = String(profile.gymName || "GYM PRO").trim() || "GYM PRO";

        // Sidebar gym name
        const brandName = document.querySelector(".brand h2");
        if (brandName) {
            brandName.textContent = gymName;
        }

        // Sidebar logo initial (sirf tab text badle jab SVG icon na ho)
        const brandIcon = document.querySelector(".brand-icon");
        if (brandIcon && !brandIcon.querySelector("svg")) {
            brandIcon.textContent = gymName.charAt(0).toUpperCase();
        }

        // Topbar owner name agar set ho
        const profileStrong = document.querySelector(".profile strong");
        if (profileStrong && profile.ownerName) {
            profileStrong.textContent = profile.ownerName;
        }

        // Browser tab title
        document.title = gymName + " | Management System";

        // Footer name
        const footerName = document.querySelector(".footer span:first-child");
        if (footerName) {
            footerName.textContent = gymName + " Management System";
        }

        // Application information inside Settings
        const applicationName = document.getElementById("applicationName");
        if (applicationName) {
            applicationName.textContent = gymName;
        }
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        const profile = getProfile();
        const idConfig = getMemberIdConfig();

        root.innerHTML = `
            <div class="gym-settings">

                <div class="settings-heading">
                    <div>
                        <h2>System & Gym Settings</h2>
                        <p>Configure your gym identity, currency and automatic member ID format.</p>
                    </div>
                </div>

                <section class="settings-card">
                    <div class="settings-card-header">
                        <h3>Gym Business Profile</h3>
                        <p class="settings-description">
                            This information appears on your dashboard branding, reports and member receipts.
                        </p>
                    </div>

                    <form id="gymProfileForm">
                        <div class="settings-grid">

                            <div>
                                <label>Gym Name *</label>
                                <input type="text" id="settingGymName"
                                    value="${escapeHTML(profile.gymName)}"
                                    placeholder="e.g. GYM PRO" required>
                            </div>

                            <div>
                                <label>Owner / Administrator Name</label>
                                <input type="text" id="settingOwnerName"
                                    value="${escapeHTML(profile.ownerName)}"
                                    placeholder="Enter owner name">
                            </div>

                            <div>
                                <label>Contact Phone Number</label>
                                <input type="tel" id="settingPhone"
                                    value="${escapeHTML(profile.phone)}"
                                    placeholder="Enter gym contact number">
                            </div>

                            <div>
                                <label>Email Address</label>
                                <input type="email" id="settingEmail"
                                    value="${escapeHTML(profile.email)}"
                                    placeholder="gym@example.com">
                            </div>

                            <div>
                                <label>Default Currency</label>
                                <select id="settingCurrency">
                                    <option value="INR" ${profile.currency === "INR" ? "selected" : ""}>Indian Rupee (₹ INR)</option>
                                    <option value="USD" ${profile.currency === "USD" ? "selected" : ""}>US Dollar ($ USD)</option>
                                </select>
                            </div>

                            <div class="settings-full">
                                <label>Gym Address</label>
                                <textarea id="settingAddress" rows="3"
                                    placeholder="Enter full gym branch address...">${escapeHTML(profile.address)}</textarea>
                            </div>

                        </div>

                        <button type="submit" class="settings-primary">
                            Save Gym Profile
                        </button>
                    </form>
                </section>

                <section class="settings-card">
                    <div class="settings-card-header">
                        <h3>Member ID Auto-Generation</h3>
                        <p class="settings-description">
                            Customize the prefix and starting serial number for newly registered members.
                        </p>
                    </div>

                    <form id="memberIdForm">

                        <div class="settings-grid">

                            <div>
                                <label>Member ID Prefix (2–12 characters) *</label>
                                <input
                                    type="text"
                                    id="settingMemberPrefix"
                                    value="${escapeHTML(idConfig.prefix)}"
                                    maxlength="12"
                                    placeholder="GYM"
                                    required
                                >
                            </div>

                            <div>
                                <label>Starting Serial Number *</label>
                                <input
                                    type="number"
                                    id="settingMemberStart"
                                    value="${escapeHTML(idConfig.startSerial)}"
                                    min="1"
                                    step="1"
                                    required
                                >
                            </div>

                            <div class="settings-full">
                                <div class="member-id-preview">
                                    <span>Live Next ID Preview</span>
                                    <strong id="memberIdPreview">
                                        ${escapeHTML(idConfig.prefix)}-${escapeHTML(idConfig.startSerial)}
                                    </strong>
                                </div>
                            </div>

                        </div>

                        <button type="submit" class="settings-primary">
                            Save Member ID Settings
                        </button>

                    </form>

                    <div class="settings-note">
                        Existing member IDs remain unchanged. Newly added members will automatically use the updated format and skip any serial number already in use.
                    </div>
                </section>

                <section class="settings-card">
                    <div class="settings-card-header">
                        <h3>Application Information</h3>
                        <p class="settings-description">
                            Software version and environment details.
                        </p>
                    </div>

                    <div class="app-info-list">
                        <div class="app-info-row">
                            <span>Application Name</span>
                            <strong id="applicationName">${escapeHTML(profile.gymName || "GYM PRO")}</strong>
                        </div>

                        <div class="app-info-row">
                            <span>Software Version</span>
                            <strong>1.0.4 (Enterprise Red & White)</strong>
                        </div>

                        <div class="app-info-row">
                            <span>Database Engine</span>
                            <strong>Browser LocalStorage (Offline Ready)</strong>
                        </div>
                    </div>
                </section>

            </div>
        `;

        addStyles();
        attachEvents();
        applyGymName();
    }

    function attachEvents() {
        document.getElementById("gymProfileForm")
            .addEventListener("submit", saveProfileForm);

        document.getElementById("memberIdForm")
            .addEventListener("submit", saveMemberIdSettings);

        document.getElementById("settingMemberPrefix")
            .addEventListener("input", updateMemberIdPreview);

        document.getElementById("settingMemberStart")
            .addEventListener("input", updateMemberIdPreview);
    }

    function updateMemberIdPreview() {
        const prefix = document.getElementById("settingMemberPrefix")
            .value.trim().toUpperCase() || "GYM";

        const serial = document.getElementById("settingMemberStart")
            .value || "1001";

        document.getElementById("memberIdPreview").textContent =
            prefix + "-" + serial;
    }

    function saveMemberIdSettings(event) {
        event.preventDefault();

        const prefix = document.getElementById("settingMemberPrefix")
            .value.trim().toUpperCase();

        const startSerial = Number(
            document.getElementById("settingMemberStart").value
        );

        if (!/^[A-Z0-9]{2,12}$/.test(prefix)) {
            alert("Prefix must contain 2 to 12 letters or numbers.");
            return;
        }

        if (!Number.isSafeInteger(startSerial) || startSerial < 1) {
            alert("Please enter a valid starting serial number.");
            return;
        }

        saveSetting("memberIdConfig", {
            prefix,
            startSerial
        });

        updateMemberIdPreview();
        notify("Member ID settings saved successfully.");
    }

    function saveProfileForm(event) {
        event.preventDefault();

        const profile = {
            gymName: document.getElementById("settingGymName").value.trim(),
            ownerName: document.getElementById("settingOwnerName").value.trim(),
            phone: document.getElementById("settingPhone").value.trim(),
            email: document.getElementById("settingEmail").value.trim(),
            currency: document.getElementById("settingCurrency").value,
            address: document.getElementById("settingAddress").value.trim()
        };

        if (!profile.gymName) {
            alert("Please enter gym name.");
            return;
        }

        saveProfile(profile);
        applyGymName();
        notify("Gym profile saved successfully.");
    }

    function addStyles() {
        if (document.getElementById("gymSettingsStyles")) return;

        const style = document.createElement("style");
        style.id = "gymSettingsStyles";

        style.textContent = `
            .gym-settings {
                color: #202124;
                width: 100%;
                padding: 2px 0 25px;
            }

            .settings-heading {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px 24px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .settings-heading h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .settings-heading p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .settings-card {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 22px 24px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .settings-card-header {
                margin-bottom: 18px;
                padding-bottom: 12px;
                border-bottom: 1px solid #edf0f3;
            }

            .settings-card h3 {
                margin: 0 0 4px;
                font-size: 15.5px;
                font-weight: 800;
                color: #202124;
            }

            .settings-description {
                color: #737985;
                font-size: 11.5px;
                line-height: 1.5;
                margin: 0;
            }

            .settings-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .settings-grid > div {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .settings-grid label {
                color: #454c57;
                font-size: 11.5px;
                font-weight: 600;
            }

            .settings-grid input,
            .settings-grid select,
            .settings-grid textarea {
                box-sizing: border-box;
                width: 100%;
                padding: 11px 13px;
                background: #ffffff;
                color: #202124;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                font-size: 12.5px;
                outline: none;
            }

            .settings-grid input:focus,
            .settings-grid select:focus,
            .settings-grid textarea:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .settings-full {
                grid-column: 1 / -1;
            }

            .member-id-preview {
                padding: 14px 16px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                border-radius: 10px;
            }

            .member-id-preview span {
                display: block;
                color: #737985;
                font-size: 11px;
                font-weight: 600;
                margin-bottom: 5px;
            }

            .member-id-preview strong {
                color: #d71920;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: 0.8px;
            }

            .settings-primary {
                padding: 12px 20px;
                border: 0;
                border-radius: 9px;
                color: #ffffff;
                background: linear-gradient(135deg, #e3262e, #c51019);
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(215, 25, 32, 0.18);
                transition: all 0.2s ease;
            }

            .settings-primary:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
                transform: translateY(-1px);
            }

            .settings-note {
                margin-top: 16px;
                padding: 12px 14px;
                border-radius: 9px;
                background: #f8f9fb;
                border: 1px solid #e7e9ee;
                color: #5f6672;
                font-size: 11.5px;
                line-height: 1.6;
            }

            .app-info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                padding: 12px 0;
                border-bottom: 1px solid #edf0f3;
                font-size: 12px;
            }

            .app-info-row:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }

            .app-info-row span {
                color: #737985;
            }

            .app-info-row strong {
                color: #202124;
                text-align: right;
            }

            @media(max-width:650px) {
                .settings-grid {
                    grid-template-columns: 1fr;
                }

                .settings-full {
                    grid-column: auto;
                }

                .settings-card {
                    padding: 18px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    if (typeof GymDB !== "undefined") {
        applyGymName();
    }

    return {
        render,
        getProfile,
        getMemberIdConfig,
        applyGymName
    };
})();

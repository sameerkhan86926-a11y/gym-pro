window.GymSettings = (function () {
    const SETTINGS_KEY = "gympro_settings";

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

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        const profile = getProfile();
        const idConfig = getMemberIdConfig();

        root.innerHTML = `
            <div class="gym-settings">

                <div class="settings-heading">
                    <div>
                        <h2>Settings</h2>
                        <p>Manage your gym profile and application settings.</p>
                    </div>
                </div>

                <section class="settings-card">
                    <h3>Gym Profile</h3>
                    <p class="settings-description">
                        Add your gym's basic information.
                    </p>

                    <form id="gymProfileForm">
                        <div class="settings-grid">

                            <div>
                                <label>Gym Name</label>
                                <input type="text" id="settingGymName"
                                    value="${escapeHTML(profile.gymName)}" required>
                            </div>

                            <div>
                                <label>Owner Name</label>
                                <input type="text" id="settingOwnerName"
                                    value="${escapeHTML(profile.ownerName)}">
                            </div>

                            <div>
                                <label>Phone Number</label>
                                <input type="tel" id="settingPhone"
                                    value="${escapeHTML(profile.phone)}">
                            </div>

                            <div>
                                <label>Email Address</label>
                                <input type="email" id="settingEmail"
                                    value="${escapeHTML(profile.email)}">
                            </div>

                            <div>
                                <label>Currency</label>
                                <select id="settingCurrency">
                                    <option value="INR" ${profile.currency === "INR" ? "selected" : ""}>Indian Rupee (₹)</option>
                                    <option value="USD" ${profile.currency === "USD" ? "selected" : ""}>US Dollar ($)</option>
                                </select>
                            </div>

                            <div class="settings-full">
                                <label>Gym Address</label>
                                <textarea id="settingAddress" rows="3">${escapeHTML(profile.address)}</textarea>
                            </div>

                        </div>

                        <button type="submit" class="settings-primary">
                            Save Gym Profile
                        </button>
                    </form>
                </section>

                <section class="settings-card">
                    <h3>Member ID Configuration</h3>

                    <p class="settings-description">
                        Choose the member ID format and starting serial number.
                        New members will receive IDs automatically.
                    </p>

                    <form id="memberIdForm">

                        <div class="settings-grid">

                            <div>
                                <label>Member ID Prefix</label>
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
                                <label>Starting Serial Number</label>
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
                                    <span>Example Member ID</span>
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

                    <div class="settings-warning">
                        Existing member IDs will not change. The new format
                        will be used for newly registered members. If a serial
                        number already exists, the system will skip it.
                    </div>
                </section>

                <section class="settings-card">
                    <h3>Data Backup & Restore</h3>

                    <p class="settings-description">
                        Export your gym records to a JSON backup file.
                        You can later restore the file in this browser.
                    </p>

                    <div class="settings-actions">

                        <button id="backupDataBtn" class="settings-primary">
                            Download Backup
                        </button>

                        <button id="restoreDataBtn" class="settings-secondary">
                            Restore Backup
                        </button>

                        <input type="file" id="restoreFileInput"
                            accept=".json,application/json"
                            style="display:none;">

                    </div>

                    <div class="settings-warning">
                        Restoring a backup replaces the existing GYM PRO data
                        in this browser. Download a backup before restoring.
                    </div>
                </section>

                <section class="settings-card">
                    <h3>Storage Information</h3>

                    <p class="settings-description">
                        Current data is stored locally in this browser.
                    </p>

                    <div class="storage-info">
                        <div>
                            <span>Members</span>
                            <strong id="storageMembers">0</strong>
                        </div>

                        <div>
                            <span>Payments</span>
                            <strong id="storagePayments">0</strong>
                        </div>

                        <div>
                            <span>Attendance</span>
                            <strong id="storageAttendance">0</strong>
                        </div>

                        <div>
                            <span>Expenses</span>
                            <strong id="storageExpenses">0</strong>
                        </div>
                    </div>
                </section>

                <section class="settings-card">
                    <h3>Application Information</h3>

                    <div class="app-info-row">
                        <span>Application</span>
                        <strong>GYM PRO</strong>
                    </div>

                    <div class="app-info-row">
                        <span>Version</span>
                        <strong>1.0.0</strong>
                    </div>

                    <div class="app-info-row">
                        <span>Storage</span>
                        <strong>Browser LocalStorage</strong>
                    </div>

                    <div class="app-info-row">
                        <span>Hosting</span>
                        <strong>GitHub Pages</strong>
                    </div>
                </section>

            </div>
        `;

        addStyles();
        attachEvents();
        updateStorageInfo();
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

        document.getElementById("backupDataBtn")
            .addEventListener("click", downloadBackup);

        document.getElementById("restoreDataBtn")
            .addEventListener("click", () => {
                document.getElementById("restoreFileInput").click();
            });

        document.getElementById("restoreFileInput")
            .addEventListener("change", restoreBackup);
    }

    function updateMemberIdPreview() {
        const prefix = document.getElementById("settingMemberPrefix").value
            .trim().toUpperCase() || "GYM";

        const serial = document.getElementById("settingMemberStart").value || "1001";

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

        alert("Member ID settings saved successfully.");
        updateMemberIdPreview();
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
        alert("Gym profile saved successfully.");
    }

    function downloadBackup() {
        try {
            const backup = GymDB.exportData();

            const fileData = {
                application: "GYM PRO",
                version: "1.0.0",
                backupDate: new Date().toISOString(),
                data: backup
            };

            const blob = new Blob(
                [JSON.stringify(fileData, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "GYM-PRO-Backup-" +
                new Date().toISOString().slice(0, 10) + ".json";

            link.click();
            URL.revokeObjectURL(url);

            alert("Backup downloaded successfully.");
        } catch (error) {
            console.error(error);
            alert("Backup could not be created.");
        }
    }

    function restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const backup = JSON.parse(reader.result);

                if (backup.application !== "GYM PRO" || !backup.data) {
                    alert("Invalid GYM PRO backup file.");
                    return;
                }

                const confirmed = confirm(
                    "Restoring this backup will replace existing GYM PRO data in this browser. Continue?"
                );

                if (!confirmed) return;

                GymDB.importData(backup.data);

                alert("Backup restored. The page will now reload.");
                window.location.reload();

            } catch (error) {
                console.error(error);
                alert("Backup file is invalid or damaged.");
            } finally {
                event.target.value = "";
            }
        };

        reader.onerror = function () {
            alert("Unable to read backup file.");
            event.target.value = "";
        };

        reader.readAsText(file);
    }

    function updateStorageInfo() {
        const collections = [
            ["members", "storageMembers"],
            ["payments", "storagePayments"],
            ["attendance", "storageAttendance"],
            ["expenses", "storageExpenses"]
        ];

        collections.forEach(([collection, elementId]) => {
            const element = document.getElementById(elementId);
            if (!element) return;

            element.textContent =
                (GymDB.getAll(collection) || []).length;
        });
    }

    function addStyles() {
        if (document.getElementById("gymSettingsStyles")) return;

        const style = document.createElement("style");
        style.id = "gymSettingsStyles";

        style.textContent = `
            .gym-settings {
                color: #f4f0ff;
                width: 100%;
            }

            .settings-heading {
                margin-bottom: 22px;
            }

            .settings-heading h2 {
                margin: 0 0 6px;
                font-size: 25px;
            }

            .settings-heading p {
                margin: 0;
                color: #aaa0c5;
            }

            .settings-card {
                background: #171326;
                border: 1px solid #302548;
                border-radius: 15px;
                padding: 22px;
                margin-bottom: 20px;
            }

            .settings-card h3 {
                margin: 0 0 8px;
                font-size: 18px;
            }

            .settings-description {
                color: #aaa0c5;
                font-size: 13px;
                line-height: 1.6;
                margin-bottom: 20px;
            }

            .settings-grid {
                display: grid;
                grid-template-columns: repeat(2,minmax(0,1fr));
                gap: 17px;
                margin-bottom: 20px;
            }

            .settings-grid > div {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .settings-grid label {
                color: #c5b8df;
                font-size: 13px;
            }

            .settings-grid input,
            .settings-grid select,
            .settings-grid textarea {
                box-sizing: border-box;
                width: 100%;
                padding: 12px;
                background: #211b32;
                color: white;
                border: 1px solid #403456;
                border-radius: 9px;
                outline: none;
            }

            .settings-grid input:focus,
            .settings-grid select:focus,
            .settings-grid textarea:focus {
                border-color: #a77aff;
            }

            .settings-full {
                grid-column: 1 / -1;
            }

            .member-id-preview {
                padding: 15px;
                background: #211b32;
                border: 1px solid #403456;
                border-radius: 10px;
            }

            .member-id-preview span {
                display: block;
                color: #aaa0c5;
                font-size: 12px;
                margin-bottom: 8px;
            }

            .member-id-preview strong {
                color: #c9a8ff;
                font-size: 24px;
                letter-spacing: 1px;
            }

            .gym-settings button {
                padding: 12px 18px;
                border: 0;
                border-radius: 9px;
                color: white;
                font-weight: 600;
                cursor: pointer;
            }

            .settings-primary {
                background: linear-gradient(135deg,#a77aff,#7544d8);
                box-shadow: 0 4px 12px #0004;
            }

            .settings-secondary {
                background: #302548;
                border: 1px solid #594477 !important;
            }

            .settings-actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .settings-warning {
                margin-top: 18px;
                padding: 13px;
                border-radius: 9px;
                background: #352817;
                color: #f2ce8c;
                font-size: 13px;
                line-height: 1.6;
            }

            .storage-info {
                display: grid;
                grid-template-columns: repeat(4,minmax(0,1fr));
                gap: 12px;
            }

            .storage-info div {
                background: #211b32;
                padding: 15px;
                border-radius: 10px;
            }

            .storage-info span,
            .storage-info strong {
                display: block;
            }

            .storage-info span {
                color: #b9adcf;
                font-size: 12px;
            }

            .storage-info strong {
                font-size: 23px;
                margin-top: 8px;
            }

            .app-info-row {
                display: flex;
                justify-content: space-between;
                gap: 15px;
                padding: 13px 0;
                border-bottom: 1px solid #302548;
                font-size: 13px;
            }

            .app-info-row span {
                color: #aaa0c5;
            }

            .app-info-row strong {
                text-align: right;
            }

            @media(max-width:650px) {
                .settings-grid {
                    grid-template-columns: 1fr;
                }

                .settings-full {
                    grid-column: auto;
                }

                .storage-info {
                    grid-template-columns: repeat(2,minmax(0,1fr));
                }

                .settings-card {
                    padding: 16px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh: updateStorageInfo,
        getProfile,
        getMemberIdConfig
    };
})();

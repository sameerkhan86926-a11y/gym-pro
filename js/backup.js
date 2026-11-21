window.GymBackup = (function () {
    "use strict";

    const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
    let driveToken = null;

    function notify(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    function getCounts() {
        return {
            members: (GymDB.getAll("members") || []).length,
            plans: (GymDB.getAll("plans") || []).length,
            payments: (GymDB.getAll("payments") || []).length,
            attendance: (GymDB.getAll("attendance") || []).length,
            expenses: (GymDB.getAll("expenses") || []).length,
            trainers: (GymDB.getAll("trainers") || []).length
        };
    }

    function getSettingRecord(key) {
        const settings = GymDB.getAll("settings") || [];
        return settings.find(item => item.key === key) || null;
    }

    function saveSettingRecord(key, value) {
        const settings = GymDB.getAll("settings") || [];
        const idx = settings.findIndex(item => item.key === key);
        const now = new Date().toISOString();
        const entry = { key, value, updatedAt: now };

        if (idx >= 0) {
            settings[idx] = entry;
        } else {
            settings.push(entry);
        }

        GymDB.saveAll("settings", settings);
    }

    function getDriveClientId() {
        const rec = getSettingRecord("googleDriveClientId");
        return rec && rec.value ? String(rec.value).trim() : "";
    }

    function getLastBackupDate() {
        const record = getSettingRecord("lastBackupDate");
        if (!record || !record.value) return "Never";

        const d = new Date(record.value);
        return isNaN(d.getTime())
            ? record.value
            : d.toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
    }

    function requestGoogleDriveToken(clientId) {
        return new Promise((resolve, reject) => {
            if (!clientId) {
                reject(new Error("Please enter and save your Google Drive Client ID first."));
                return;
            }

            if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
                reject(new Error("Google Drive SDK did not load. Check internet connection and index.html script."));
                return;
            }

            if (driveToken) {
                resolve(driveToken);
                return;
            }

            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: DRIVE_SCOPE,
                callback: (response) => {
                    if (response && response.access_token) {
                        driveToken = response.access_token;
                        resolve(driveToken);
                    } else {
                        reject(new Error(response?.error || "Google authorization cancelled or failed."));
                    }
                }
            });

            tokenClient.requestAccessToken({ prompt: "" });
        });
    }

    async function uploadBackupToDrive() {
        try {
            const clientId = (document.getElementById("driveClientIdInput")?.value || "").trim() || getDriveClientId();
            if (clientId) {
                saveSettingRecord("googleDriveClientId", clientId);
            }

            const token = await requestGoogleDriveToken(clientId);
            const fileData = GymDB.exportData();
            const fileName = "GYM-PRO-Backup-" + fileData.backupDate.slice(0, 10) + ".json";
            const jsonText = JSON.stringify(fileData, null, 2);

            const boundary = "-------gympro_boundary_" + Date.now();
            const metadata = { name: fileName, mimeType: "application/json" };

            const multipartBody =
                "--" + boundary + "\r\n" +
                "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
                JSON.stringify(metadata) + "\r\n" +
                "--" + boundary + "\r\n" +
                "Content-Type: application/json\r\n\r\n" +
                jsonText + "\r\n" +
                "--" + boundary + "--";

            const res = await fetch(
                "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + token,
                        "Content-Type": "multipart/related; boundary=" + boundary
                    },
                    body: multipartBody
                }
            );

            if (!res.ok) {
                if (res.status === 401) driveToken = null;
                throw new Error("Drive upload failed (HTTP " + res.status + ").");
            }

            saveSettingRecord("lastBackupDate", fileData.backupDate);
            const label = document.getElementById("lastBackupLabel");
            if (label) label.textContent = getLastBackupDate();

            notify("Backup uploaded to Google Drive (" + fileName + ").");
        } catch (err) {
            console.error(err);
            alert(err.message || "Google Drive upload failed.");
        }
    }

    async function restoreBackupFromDrive() {
        try {
            const clientId = (document.getElementById("driveClientIdInput")?.value || "").trim() || getDriveClientId();
            if (clientId) {
                saveSettingRecord("googleDriveClientId", clientId);
            }

            const token = await requestGoogleDriveToken(clientId);
            const query = encodeURIComponent(
                "name contains 'GYM-PRO-Backup-' and mimeType = 'application/json' and trashed = false"
            );

            const listRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime%20desc&pageSize=1&fields=files(id,name,createdTime)`,
                { headers: { Authorization: "Bearer " + token } }
            );

            if (!listRes.ok) {
                if (listRes.status === 401) driveToken = null;
                throw new Error("Unable to fetch backup list from Google Drive.");
            }

            const listData = await listRes.json();
            const latestFile = listData.files && listData.files[0];

            if (!latestFile) {
                alert("No GYM-PRO-Backup file found in your Google Drive.");
                return;
            }

            const confirmed = confirm(
                `Latest backup found: "${latestFile.name}".\nRestoring will replace existing GYM PRO data in this browser. Continue?`
            );
            if (!confirmed) return;

            const fileRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(latestFile.id)}?alt=media`,
                { headers: { Authorization: "Bearer " + token } }
            );

            if (!fileRes.ok) {
                throw new Error("Failed to download backup content from Google Drive.");
            }

            const backupJson = await fileRes.json();
            if (backupJson.application !== "GYM PRO" || !backupJson.data) {
                alert("Invalid GYM PRO backup file format on Drive.");
                return;
            }

            const ok = GymDB.importData(backupJson);
            if (!ok) {
                alert("Restore failed.");
                return;
            }

            alert("Backup restored from Google Drive! Page will now reload.");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert(err.message || "Google Drive restore failed.");
        }
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        const counts = getCounts();
        const storage = GymDB.getStorageInfo();
        const savedClientId = getDriveClientId();

        root.innerHTML = `
            <div class="gym-backup-wrap">
                <div class="backup-header">
                    <div>
                        <h2>Backup & Data Restore</h2>
                        <p>Export local JSON backups or connect Admin Google Drive for cloud protection.</p>
                    </div>
                    <div class="backup-meta-pills">
                        <span class="backup-last-pill">Storage Used: <strong>${storage.kilobytes} KB</strong></span>
                        <span class="backup-last-pill">Last Backup: <strong id="lastBackupLabel">${getLastBackupDate()}</strong></span>
                    </div>
                </div>

                <div class="backup-stats-grid">
                    <div class="backup-stat-card"><span>Members</span><strong>${counts.members}</strong></div>
                    <div class="backup-stat-card"><span>Membership Plans</span><strong>${counts.plans}</strong></div>
                    <div class="backup-stat-card"><span>Payments</span><strong>${counts.payments}</strong></div>
                    <div class="backup-stat-card"><span>Attendance</span><strong>${counts.attendance}</strong></div>
                    <div class="backup-stat-card"><span>Expenses</span><strong>${counts.expenses}</strong></div>
                    <div class="backup-stat-card"><span>Trainers</span><strong>${counts.trainers}</strong></div>
                </div>

                <div class="backup-two-col">
                    <section class="backup-card">
                        <div class="backup-card-badge green">LOCAL BACKUP</div>
                        <h3>Download Full Backup (.json)</h3>
                        <p>Save a complete <code>.json</code> backup file onto your computer containing all gym records.</p>
                        <button type="button" id="backupDataBtn" class="backup-primary-btn">↓ Download JSON Backup</button>
                    </section>

                    <section class="backup-card">
                        <div class="backup-card-badge blue">LOCAL RESTORE</div>
                        <h3>Restore From Backup File</h3>
                        <p>Select a previously downloaded GYM PRO <code>.json</code> backup file to restore records.</p>
                        <button type="button" id="restoreDataBtn" class="backup-secondary-btn">↑ Choose Backup File (.json)</button>
                        <input type="file" id="restoreFileInput" accept=".json,application/json" style="display:none;">
                        <div class="backup-warning">
                            <strong>Warning:</strong> Restoring replaces all current data in this browser.
                        </div>
                    </section>
                </div>

                <section class="backup-card drive-card">
                    <div class="backup-card-badge red">ADMIN GOOGLE DRIVE</div>
                    <h3>Connect Admin Google Drive</h3>
                    <p>Admin can enter their own Google Cloud OAuth Client ID once to upload and restore backups on Google Drive.</p>
                    <div class="drive-id-row">
                        <input type="text" id="driveClientIdInput" value="${escapeHTML(savedClientId)}"
                            placeholder="Paste Google OAuth Client ID (e.g. 1234567890-xxx.apps.googleusercontent.com)">
                        <button type="button" id="saveDriveIdBtn" class="backup-secondary-btn">Save Client ID</button>
                    </div>
                    <div class="drive-btn-row">
                        <button type="button" id="driveUploadBtn" class="backup-primary-btn">☁ Upload Backup to Drive</button>
                        <button type="button" id="driveRestoreBtn" class="backup-secondary-btn">☁ Restore Latest From Drive</button>
                    </div>
                </section>
            </div>
        `;

        addStyles();

        document.getElementById("backupDataBtn").addEventListener("click", downloadBackup);
        document.getElementById("restoreDataBtn").addEventListener("click", () => {
            document.getElementById("restoreFileInput").click();
        });
        document.getElementById("restoreFileInput").addEventListener("change", restoreBackup);
        document.getElementById("saveDriveIdBtn").addEventListener("click", () => {
            const val = document.getElementById("driveClientIdInput").value.trim();
            saveSettingRecord("googleDriveClientId", val);
            driveToken = null;
            notify("Google Drive Client ID saved.");
        });
        document.getElementById("driveUploadBtn").addEventListener("click", uploadBackupToDrive);
        document.getElementById("driveRestoreBtn").addEventListener("click", restoreBackupFromDrive);
    }

    function downloadBackup() {
        try {
            const fileData = GymDB.exportData();
            const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "GYM-PRO-Backup-" + fileData.backupDate.slice(0, 10) + ".json";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            saveSettingRecord("lastBackupDate", fileData.backupDate);
            const label = document.getElementById("lastBackupLabel");
            if (label) label.textContent = getLastBackupDate();
            notify("Backup file downloaded successfully.");
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
                if (!confirm("Restoring this backup will replace all existing GYM PRO data in this browser. Continue?")) return;
                if (!GymDB.importData(backup)) {
                    alert("Restore failed.");
                    return;
                }
                alert("Backup restored successfully! Page will now reload.");
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Backup file is invalid or damaged.");
            } finally {
                event.target.value = "";
            }
        };
        reader.readAsText(file);
    }

    function addStyles() {
        if (document.getElementById("gymBackupStyles")) return;
        const style = document.createElement("style");
        style.id = "gymBackupStyles";
        style.textContent = `
            .gym-backup-wrap { color:#202124; width:100%; padding:2px 0 25px; }
            .backup-header { background:#fff; border:1px solid #e7e9ee; border-radius:13px; padding:20px 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px; box-shadow:0 4px 18px rgba(20,25,35,0.045); }
            .backup-header h2 { margin:0 0 4px; font-size:18px; font-weight:800; color:#202124; }
            .backup-header p { margin:0; color:#737985; font-size:11.5px; }
            .backup-meta-pills { display:flex; gap:8px; flex-wrap:wrap; }
            .backup-last-pill { padding:7px 12px; border-radius:8px; background:#f8f9fb; border:1px solid #e7e9ee; font-size:11px; color:#5f6672; }
            .backup-stats-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin-bottom:20px; }
            .backup-stat-card { background:#fff; border:1px solid #e7e9ee; border-radius:12px; padding:16px; box-shadow:0 4px 18px rgba(20,25,35,0.045); }
            .backup-stat-card span { display:block; font-size:10.5px; font-weight:600; color:#69717e; margin-bottom:8px; }
            .backup-stat-card strong { font-size:22px; font-weight:800; color:#202124; }
            .backup-two-col { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
            .backup-card { background:#fff; border:1px solid #e7e9ee; border-radius:13px; padding:24px; box-shadow:0 4px 18px rgba(20,25,35,0.045); }
            .drive-card { margin-top:18px; }
            .drive-id-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
            .drive-id-row input { flex:1; min-width:240px; padding:11px 13px; border-radius:9px; border:1px solid #dfe2e8; background:#fff; color:#202124; font-size:12px; outline:none; }
            .drive-id-row input:focus { border-color:#d71920; }
            .drive-btn-row { display:flex; gap:10px; flex-wrap:wrap; }
            .backup-card-badge { display:inline-block; padding:4px 9px; border-radius:6px; font-size:9.5px; font-weight:800; letter-spacing:0.5px; margin-bottom:12px; }
            .backup-card-badge.green { background:#e9f8f0; color:#168653; }
            .backup-card-badge.blue { background:#edf5ff; color:#2879d0; }
            .backup-card-badge.red { background:#fff0f0; color:#d71920; }
            .backup-card h3 { margin:0 0 8px; font-size:16px; font-weight:800; color:#202124; }
            .backup-card p { margin:0 0 18px; color:#5f6672; font-size:12px; line-height:1.65; }
            .backup-primary-btn { padding:12px 20px; border:0; border-radius:9px; background:linear-gradient(135deg,#e3262e,#c51019); color:#fff; font-weight:700; font-size:12px; cursor:pointer; }
            .backup-secondary-btn { padding:12px 20px; border:1px solid #dfe2e8; border-radius:9px; background:#f8f9fb; color:#202124; font-weight:700; font-size:12px; cursor:pointer; }
            .backup-warning { margin-top:18px; padding:12px 14px; border-radius:9px; background:#fff8eb; border:1px solid #f7dfad; color:#7c5812; font-size:11.5px; }
            @media(max-width:900px) { .backup-stats-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
            @media(max-width:650px) { .backup-stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .backup-two-col { grid-template-columns:1fr; } }
        `;
        document.head.appendChild(style);
    }

    return { render, refresh: render };
})();

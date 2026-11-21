window.GymBackup = (function () {
    "use strict";

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
            trainers: (GymDB.getAll("trainers") || []).length,
            discounts: (GymDB.getAll("discounts") || []).length
        };
    }

    function getLastBackupDate() {
        const settings = GymDB.getAll("settings") || [];
        const record = settings.find(item => item.key === "lastBackupDate");
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

    function setLastBackupDate(isoString) {
        const settings = GymDB.getAll("settings") || [];
        const idx = settings.findIndex(item => item.key === "lastBackupDate");
        const entry = {
            key: "lastBackupDate",
            value: isoString,
            updatedAt: isoString
        };

        if (idx >= 0) {
            settings[idx] = entry;
        } else {
            settings.push(entry);
        }

        GymDB.saveAll("settings", settings);
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        const counts = getCounts();

        root.innerHTML = `
            <div class="gym-backup-wrap">

                <div class="backup-header">
                    <div>
                        <h2>Backup & Data Restore</h2>
                        <p>Export a complete JSON snapshot of your gym database or restore from a previous backup.</p>
                    </div>
                    <span class="backup-last-pill">Last Backup: <strong id="lastBackupLabel">${getLastBackupDate()}</strong></span>
                </div>

                <div class="backup-stats-grid">
                    <div class="backup-stat-card">
                        <span>Members</span>
                        <strong>${counts.members}</strong>
                    </div>
                    <div class="backup-stat-card">
                        <span>Membership Plans</span>
                        <strong>${counts.plans}</strong>
                    </div>
                    <div class="backup-stat-card">
                        <span>Payments</span>
                        <strong>${counts.payments}</strong>
                    </div>
                    <div class="backup-stat-card">
                        <span>Attendance</span>
                        <strong>${counts.attendance}</strong>
                    </div>
                    <div class="backup-stat-card">
                        <span>Expenses</span>
                        <strong>${counts.expenses}</strong>
                    </div>
                    <div class="backup-stat-card">
                        <span>Trainers</span>
                        <strong>${counts.trainers}</strong>
                    </div>
                </div>

                <div class="backup-two-col">

                    <section class="backup-card">
                        <div class="backup-card-badge green">EXPORT DATA</div>
                        <h3>Download Full Backup</h3>
                        <p>
                            Generate a portable <code>.json</code> backup file containing all members, plans, payments, discounts, attendance logs, trainers, expenses and settings.
                        </p>

                        <button type="button" id="backupDataBtn" class="backup-primary-btn">
                            ↓ Download JSON Backup
                        </button>
                    </section>

                    <section class="backup-card">
                        <div class="backup-card-badge blue">IMPORT DATA</div>
                        <h3>Restore From Backup File</h3>
                        <p>
                            Select a valid GYM PRO <code>.json</code> backup file to restore your records into this browser.
                        </p>

                        <button type="button" id="restoreDataBtn" class="backup-secondary-btn">
                            ↑ Choose Backup File (.json)
                        </button>

                        <input type="file" id="restoreFileInput"
                            accept=".json,application/json"
                            style="display:none;">

                        <div class="backup-warning">
                            <strong>Warning:</strong> Restoring a backup replaces all current data stored in this browser. Always download a fresh backup before restoring.
                        </div>
                    </section>

                </div>

            </div>
        `;

        addStyles();

        document.getElementById("backupDataBtn")
            .addEventListener("click", downloadBackup);

        document.getElementById("restoreDataBtn")
            .addEventListener("click", () => {
                document.getElementById("restoreFileInput").click();
            });

        document.getElementById("restoreFileInput")
            .addEventListener("change", restoreBackup);
    }

    function downloadBackup() {
        try {
            const now = new Date().toISOString();
            const backup = GymDB.exportData();

            const fileData = {
                application: "GYM PRO",
                version: "1.0.4",
                backupDate: now,
                data: backup
            };

            const blob = new Blob(
                [JSON.stringify(fileData, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "GYM-PRO-Backup-" + now.slice(0, 10) + ".json";

            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            setLastBackupDate(now);
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

                const confirmed = confirm(
                    "Restoring this backup will replace all existing GYM PRO data in this browser. Do you want to continue?"
                );

                if (!confirmed) return;

                GymDB.importData(backup.data);

                alert("Backup restored successfully! The application will now reload.");
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

    function addStyles() {
        if (document.getElementById("gymBackupStyles")) return;

        const style = document.createElement("style");
        style.id = "gymBackupStyles";

        style.textContent = `
            .gym-backup-wrap {
                color: #202124;
                width: 100%;
                padding: 2px 0 25px;
            }

            .backup-header {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .backup-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .backup-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .backup-last-pill {
                padding: 7px 12px;
                border-radius: 8px;
                background: #f8f9fb;
                border: 1px solid #e7e9ee;
                font-size: 11px;
                color: #5f6672;
            }

            .backup-stats-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }

            .backup-stat-card {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .backup-stat-card span {
                display: block;
                font-size: 10.5px;
                font-weight: 600;
                color: #69717e;
                margin-bottom: 8px;
            }

            .backup-stat-card strong {
                font-size: 22px;
                font-weight: 800;
                color: #202124;
            }

            .backup-two-col {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 18px;
            }

            .backup-card {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 24px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .backup-card-badge {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 6px;
                font-size: 9.5px;
                font-weight: 800;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
            }

            .backup-card-badge.green {
                background: #e9f8f0;
                color: #168653;
            }

            .backup-card-badge.blue {
                background: #edf5ff;
                color: #2879d0;
            }

            .backup-card h3 {
                margin: 0 0 8px;
                font-size: 16px;
                font-weight: 800;
                color: #202124;
            }

            .backup-card p {
                margin: 0 0 18px;
                color: #5f6672;
                font-size: 12px;
                line-height: 1.65;
            }

            .backup-card code {
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                color: #d71920;
            }

            .backup-primary-btn {
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

            .backup-primary-btn:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
                transform: translateY(-1px);
            }

            .backup-secondary-btn {
                padding: 12px 20px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #f8f9fb;
                color: #202124;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .backup-secondary-btn:hover {
                background: #fff4f4;
                border-color: #f2bfc1;
                color: #d71920;
            }

            .backup-warning {
                margin-top: 18px;
                padding: 12px 14px;
                border-radius: 9px;
                background: #fff8eb;
                border: 1px solid #f7dfad;
                color: #7c5812;
                font-size: 11.5px;
                line-height: 1.6;
            }

            @media(max-width:900px) {
                .backup-stats-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }

            @media(max-width:650px) {
                .backup-stats-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                .backup-two-col {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh: render
    };
})();

window.GymTrainers = (function () {
    const MODULE = "trainers";

    function getTrainers() {
        return GymDB.getAll(MODULE) || [];
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
    }

    function currency(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN");
    }

    function today() {
        const date = new Date();
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 10);
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

    function getAssignedMembers(trainer) {
        return getMembers().filter(member =>
            member.trainer === trainer.name
        );
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymTrainersStyles")) return;

        const style = document.createElement("style");
        style.id = "gymTrainersStyles";

        style.textContent = `
            .trainers-wrap {
                padding: 2px 0 25px;
                color: #202124;
            }

            .trainers-header {
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

            .trainers-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .trainers-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .trainers-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }

            .trainers-stat {
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .trainers-stat:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .trainers-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .trainers-stat span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .trainers-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .trainers-stat strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .trainers-panel {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .trainers-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 18px;
            }

            .trainers-toolbar input,
            .trainers-toolbar select {
                padding: 11px 14px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
                min-width: 170px;
                transition: all 0.2s ease;
            }

            .trainers-toolbar input[type="search"] {
                flex: 1;
                min-width: 210px;
            }

            .trainers-toolbar select {
                font-weight: 600;
            }

            .trainers-toolbar input:focus,
            .trainers-toolbar select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .trainers-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .trainers-table {
                width: 100%;
                min-width: 960px;
                border-collapse: collapse;
                background: #ffffff;
            }

            .trainers-table th,
            .trainers-table td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
            }

            .trainers-table th {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                background: #f8f9fb;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .trainers-table td {
                font-size: 11.5px;
                color: #454c57;
                vertical-align: middle;
            }

            .trainers-table tbody tr:hover {
                background: #fffafa;
            }

            .trainer-id-pill {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }

            .trainer-spec-pill {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 6px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 10.5px;
                font-weight: 600;
            }

            .trainer-members-pill {
                display: inline-block;
                padding: 3px 9px;
                border-radius: 20px;
                background: #f3f4f6;
                color: #303640;
                font-size: 10.5px;
                font-weight: 700;
            }

            .trainer-status {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                background: #e9f8f0;
                color: #168653;
                font-size: 10px;
                font-weight: 700;
            }

            .trainer-status.inactive {
                background: #f2f4f7;
                color: #69717e;
            }

            .trainer-actions-cell {
                white-space: nowrap;
            }

            .trainer-action {
                padding: 6px 10px;
                border: 1px solid #dfe2e8;
                border-radius: 7px;
                margin: 2px;
                cursor: pointer;
                font-size: 10.5px;
                font-weight: 600;
                color: #303640;
                background: #ffffff;
                transition: all 0.18s ease;
            }

            .trainer-action:hover {
                background: #f4f6f9;
            }

            .trainer-action.salary {
                background: #e9f8f0;
                border-color: #bfe7d1;
                color: #168653;
            }

            .trainer-action.salary:hover {
                background: #168653;
                border-color: #168653;
                color: #ffffff;
            }

            .trainer-action.attendance {
                background: #edf5ff;
                border-color: #c5defc;
                color: #2879d0;
            }

            .trainer-action.attendance:hover {
                background: #2879d0;
                border-color: #2879d0;
                color: #ffffff;
            }

            .trainer-action.delete {
                background: #fff0f0;
                border-color: #f5c6c8;
                color: #d71920;
            }

            .trainer-action.delete:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .trainers-empty {
                text-align: center;
                padding: 34px 15px;
                color: #8a909a;
                font-size: 12px;
            }

            /* MODALS */
            .trainer-modal {
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

            .trainer-modal-box {
                width: 100%;
                max-width: 520px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 26px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
            }

            .trainer-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 14px;
                border-bottom: 1px solid #edf0f3;
            }

            .trainer-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 800;
                color: #202124;
            }

            .trainer-modal-close {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: 1px solid #e7e9ee;
                background: #f8f9fb;
                color: #69717e;
                font-size: 16px;
                display: grid;
                place-items: center;
                cursor: pointer;
            }

            .trainer-modal-close:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }

            .trainer-modal-box h4 {
                margin: 22px 0 10px;
                font-size: 13.5px;
                font-weight: 800;
                color: #202124;
            }

            .trainer-form label {
                display: block;
                margin: 14px 0 6px;
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
            }

            .trainer-form input,
            .trainer-form select,
            .trainer-form textarea {
                width: 100%;
                padding: 11px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #ffffff;
                color: #202124;
                font-size: 12.5px;
                outline: none;
                box-sizing: border-box;
            }

            .trainer-form input:focus,
            .trainer-form select:focus,
            .trainer-form textarea:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .trainer-form textarea {
                min-height: 70px;
                resize: vertical;
            }

            .trainer-form-actions {
                display: flex;
                gap: 12px;
                margin-top: 22px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }

            .trainer-form-actions button {
                flex: 1;
                padding: 12px;
                border: 0;
                border-radius: 9px;
                cursor: pointer;
                color: #ffffff;
                background: linear-gradient(135deg, #e3262e, #c51019);
                font-weight: 700;
                font-size: 12.5px;
                box-shadow: 0 4px 12px rgba(215, 25, 32, 0.18);
                transition: all 0.2s ease;
            }

            .trainer-form-actions button:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }

            .trainer-form-actions .cancel {
                background: #f3f4f6;
                color: #454c57;
                border: 1px solid #dfe2e8;
                box-shadow: none;
            }

            .trainer-form-actions .cancel:hover {
                background: #e7e9ee;
            }

            .trainer-history-wrap {
                overflow-x: auto;
                border: 1px solid #edf0f3;
                border-radius: 9px;
            }

            .trainer-history {
                width: 100%;
                border-collapse: collapse;
                font-size: 11.5px;
            }

            .trainer-history th,
            .trainer-history td {
                padding: 10px 10px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
                color: #454c57;
            }

            .trainer-history th {
                background: #f8f9fb;
                color: #69717e;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
            }

            .trainer-info {
                padding: 14px 16px;
                background: #f8f9fb;
                border: 1px solid #e7e9ee;
                border-radius: 10px;
                margin-bottom: 14px;
                color: #303640;
                font-size: 12px;
                line-height: 1.8;
            }

            .trainer-info.highlight {
                background: #fff5f5;
                border-color: #f7d4d6;
            }

            .trainer-small-btn {
                width: 100%;
                margin-top: 14px;
                padding: 11px 16px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #f3f4f6;
                color: #303640;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
            }

            .trainer-small-btn:hover {
                background: #e7e9ee;
            }

            @media(max-width:650px) {
                .trainers-stats {
                    grid-template-columns: 1fr;
                }
                .trainers-header .btn {
                    width: 100%;
                }
                .trainer-modal-box {
                    padding: 18px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function render() {
        injectStyles();

        const container = document.getElementById("modulePlaceholder");
        if (!container) return;

        container.innerHTML = `
            <div class="trainers-wrap">

                <div class="trainers-header">
                    <div>
                        <h2>Trainer & Staff Management</h2>
                        <p>Manage trainers, assigned members, monthly salaries and attendance logs.</p>
                    </div>

                    <button class="btn btn-primary" id="addTrainerBtn">
                        + Add Trainer
                    </button>
                </div>

                <div class="trainers-stats">
                    <div class="trainers-stat">
                        <div class="trainers-stat-top">
                            <span>Total Trainers</span>
                            <div class="trainers-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="totalTrainers">0</strong>
                    </div>

                    <div class="trainers-stat">
                        <div class="trainers-stat-top">
                            <span>Active Trainers</span>
                            <div class="trainers-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="activeTrainers">0</strong>
                    </div>

                    <div class="trainers-stat">
                        <div class="trainers-stat-top">
                            <span>Active Monthly Payroll</span>
                            <div class="trainers-stat-dot" style="background:#2879d0;"></div>
                        </div>
                        <strong id="trainerSalaryTotal">₹0</strong>
                    </div>
                </div>

                <div class="trainers-panel">
                    <div class="trainers-toolbar">
                        <input type="search" id="trainerSearch"
                            placeholder="Search trainer name, ID or phone...">

                        <select id="trainerStatusFilter">
                            <option value="all">All Trainers</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>

                    <div class="trainers-table-wrap">
                        <table class="trainers-table">
                            <thead>
                                <tr>
                                    <th>Trainer ID</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Specialization</th>
                                    <th>Members</th>
                                    <th>Monthly Salary</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody id="trainersTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ADD / EDIT TRAINER MODAL -->
            <div class="trainer-modal" id="trainerModal">
                <div class="trainer-modal-box">
                    <div class="trainer-modal-header">
                        <h3 id="trainerFormTitle">Add New Trainer</h3>
                        <button type="button" class="trainer-modal-close" id="closeTrainerFormX" aria-label="Close">✕</button>
                    </div>

                    <form class="trainer-form" id="trainerForm">
                        <input type="hidden" id="trainerId">

                        <label>Trainer Name *</label>
                        <input type="text" id="trainerName"
                            placeholder="Enter trainer full name" required>

                        <label>Phone Number *</label>
                        <input type="tel" id="trainerPhone"
                            placeholder="Enter phone number"
                            pattern="[0-9+() -]{7,20}" required>

                        <label>Email</label>
                        <input type="email" id="trainerEmail"
                            placeholder="Enter email address">

                        <label>Specialization</label>
                        <input type="text" id="trainerSpecialization"
                            placeholder="e.g. Weight Training, Yoga, CrossFit">

                        <label>Monthly Salary (₹)</label>
                        <input type="number" id="trainerSalary"
                            min="0" step="0.01" placeholder="Enter monthly salary">

                        <label>Joining Date</label>
                        <input type="date" id="trainerJoiningDate">

                        <label>Status</label>
                        <select id="trainerStatus">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <label>Address</label>
                        <textarea id="trainerAddress"
                            placeholder="Enter trainer residential address"></textarea>

                        <div class="trainer-form-actions">
                            <button type="submit">Save Trainer</button>
                            <button type="button" class="cancel"
                                id="cancelTrainerBtn">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- TRAINER SALARY MODAL -->
            <div class="trainer-modal" id="trainerSalaryModal">
                <div class="trainer-modal-box">
                    <div class="trainer-modal-header">
                        <h3>Trainer Salary Payout</h3>
                        <button type="button" class="trainer-modal-close" id="closeSalaryX" aria-label="Close">✕</button>
                    </div>
                    <div id="trainerSalaryInfo" class="trainer-info highlight"></div>

                    <form class="trainer-form" id="trainerSalaryForm">
                        <input type="hidden" id="salaryTrainerId">

                        <label>Payment Amount (₹) *</label>
                        <input type="number" id="salaryAmount"
                            min="0.01" step="0.01" placeholder="Enter payout amount" required>

                        <label>Payment Date *</label>
                        <input type="date" id="salaryDate" required>

                        <label>Payment Method</label>
                        <select id="salaryMethod">
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Other">Other</option>
                        </select>

                        <label>Note</label>
                        <textarea id="salaryNote"
                            placeholder="Optional note (e.g. Nov 2026 Salary)"></textarea>

                        <div class="trainer-form-actions">
                            <button type="submit">Record Payout</button>
                            <button type="button" class="cancel"
                                id="closeSalaryBtn">Close</button>
                        </div>
                    </form>

                    <h4>Salary Payment History</h4>
                    <div id="trainerSalaryHistory"></div>
                </div>
            </div>

            <!-- TRAINER ATTENDANCE MODAL -->
            <div class="trainer-modal" id="trainerAttendanceModal">
                <div class="trainer-modal-box">
                    <div class="trainer-modal-header">
                        <h3>Trainer Attendance Log</h3>
                        <button type="button" class="trainer-modal-close" id="closeAttendanceX" aria-label="Close">✕</button>
                    </div>
                    <div id="trainerAttendanceInfo" class="trainer-info highlight"></div>

                    <form class="trainer-form" id="trainerAttendanceForm">
                        <input type="hidden" id="attendanceTrainerId">

                        <label>Attendance Date *</label>
                        <input type="date" id="trainerAttendanceDate"
                            required>

                        <label>Status *</label>
                        <select id="trainerAttendanceStatus">
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Leave">Leave</option>
                        </select>

                        <label>Note</label>
                        <textarea id="trainerAttendanceNote"
                            placeholder="Optional note"></textarea>

                        <div class="trainer-form-actions">
                            <button type="submit">Save Attendance</button>
                            <button type="button" class="cancel"
                                id="closeAttendanceBtn">Close</button>
                        </div>
                    </form>

                    <h4>Attendance History</h4>
                    <div id="trainerAttendanceHistory"></div>
                </div>
            </div>

            <!-- TRAINER PROFILE MODAL -->
            <div class="trainer-modal" id="trainerProfileModal">
                <div class="trainer-modal-box">
                    <div class="trainer-modal-header">
                        <h3>Trainer Profile Summary</h3>
                        <button type="button" class="trainer-modal-close" id="closeProfileX" aria-label="Close">✕</button>
                    </div>
                    <div id="trainerProfileContent"></div>
                    <button type="button" class="trainer-small-btn"
                        id="closeProfileBtn">Close Profile</button>
                </div>
            </div>
        `;

        document.getElementById("addTrainerBtn")
            .addEventListener("click", () => openForm());

        document.getElementById("cancelTrainerBtn")
            .addEventListener("click", closeForm);

        document.getElementById("closeTrainerFormX")
            .addEventListener("click", closeForm);

        document.getElementById("trainerForm")
            .addEventListener("submit", saveTrainer);

        document.getElementById("trainerSearch")
            .addEventListener("input", renderTable);

        document.getElementById("trainerStatusFilter")
            .addEventListener("change", renderTable);

        document.getElementById("trainerSalaryForm")
            .addEventListener("submit", saveSalary);

        document.getElementById("closeSalaryBtn")
            .addEventListener("click", closeSalary);

        document.getElementById("closeSalaryX")
            .addEventListener("click", closeSalary);

        document.getElementById("trainerAttendanceForm")
            .addEventListener("submit", saveAttendance);

        document.getElementById("closeAttendanceBtn")
            .addEventListener("click", closeAttendance);

        document.getElementById("closeAttendanceX")
            .addEventListener("click", closeAttendance);

        document.getElementById("closeProfileBtn")
            .addEventListener("click", closeProfile);

        document.getElementById("closeProfileX")
            .addEventListener("click", closeProfile);

        renderTable();
    }

    function openForm(trainer) {
        const form = document.getElementById("trainerForm");
        form.reset();

        document.getElementById("trainerId").value = "";
        document.getElementById("trainerFormTitle").textContent = "Add New Trainer";
        document.getElementById("trainerStatus").value = "active";

        if (trainer) {
            document.getElementById("trainerFormTitle").textContent = "Edit Trainer";

            document.getElementById("trainerId").value = trainer.id;
            document.getElementById("trainerName").value = trainer.name || "";
            document.getElementById("trainerPhone").value = trainer.phone || "";
            document.getElementById("trainerEmail").value = trainer.email || "";
            document.getElementById("trainerSpecialization").value =
                trainer.specialization || "";
            document.getElementById("trainerSalary").value = trainer.salary ?? "";
            document.getElementById("trainerJoiningDate").value =
                trainer.joiningDate || "";
            document.getElementById("trainerStatus").value =
                trainer.status || "active";
            document.getElementById("trainerAddress").value =
                trainer.address || "";
        }

        document.getElementById("trainerModal").style.display = "flex";
    }

    function closeForm() {
        document.getElementById("trainerModal").style.display = "none";
    }

    function saveTrainer(event) {
        event.preventDefault();

        const id = document.getElementById("trainerId").value;
        const name = document.getElementById("trainerName").value.trim();
        const phone = document.getElementById("trainerPhone").value.trim();
        const salaryValue = document.getElementById("trainerSalary").value;
        const salary = salaryValue === "" ? 0 : Number(salaryValue);

        if (!name || !phone || !Number.isFinite(salary) || salary < 0) {
            alert("Please enter valid trainer details.");
            return;
        }

        const existing = id ? GymDB.find(MODULE, id) : null;

        if (id && !existing) {
            alert("Trainer record not found.");
            return;
        }

        const trainerData = {
            ...(existing || {}),
            name,
            phone,
            email: document.getElementById("trainerEmail").value.trim(),
            specialization: document.getElementById("trainerSpecialization").value.trim(),
            salary,
            joiningDate: document.getElementById("trainerJoiningDate").value,
            status: document.getElementById("trainerStatus").value,
            address: document.getElementById("trainerAddress").value.trim(),

            // Preserve old history
            salaryHistory: Array.isArray(existing?.salaryHistory)
                ? existing.salaryHistory : [],

            attendanceHistory: Array.isArray(existing?.attendanceHistory)
                ? existing.attendanceHistory : [],

            updatedAt: new Date().toISOString()
        };

        let saved;

        if (id) {
            saved = GymDB.update(MODULE, id, trainerData);
        } else {
            trainerData.id = GymDB.generateID("TRN");
            trainerData.createdAt = new Date().toISOString();
            saved = GymDB.add(MODULE, trainerData);
        }

        if (!saved) {
            alert("Trainer could not be saved. Please try again.");
            return;
        }

        closeForm();
        renderTable();
        notify(id ? "Trainer updated successfully." : "Trainer added successfully.");
    }

    function deleteTrainer(id) {
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        const assigned = getAssignedMembers(trainer);

        if (assigned.length) {
            alert(
                "This trainer is assigned to " + assigned.length +
                " member(s). Reassign those members before deleting."
            );
            return;
        }

        if (!confirm(
            "Delete " + trainer.name +
            " permanently? Salary and attendance history will also be deleted."
        )) return;

        const deleted = GymDB.delete(MODULE, id);

        if (!deleted) {
            alert("Trainer could not be deleted.");
            return;
        }

        renderTable();
        notify("Trainer deleted successfully.");
    }

    function renderTable() {
        const table = document.getElementById("trainersTableBody");
        if (!table) return;

        const trainers = getTrainers();
        const active = trainers.filter(t => t.status === "active");

        const salaryTotal = active.reduce((sum, trainer) =>
            sum + Number(trainer.salary || 0), 0
        );

        document.getElementById("totalTrainers").textContent = trainers.length;
        document.getElementById("activeTrainers").textContent = active.length;
        document.getElementById("trainerSalaryTotal").textContent =
            currency(salaryTotal);

        const search = document.getElementById("trainerSearch")
            .value.trim().toLowerCase();

        const status = document.getElementById("trainerStatusFilter").value;

        const filtered = trainers.filter(trainer => {
            const matchesSearch =
                String(trainer.name || "").toLowerCase().includes(search) ||
                String(trainer.phone || "").toLowerCase().includes(search) ||
                String(trainer.id || "").toLowerCase().includes(search);

            const matchesStatus =
                status === "all" || trainer.status === status;

            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="trainers-empty">
                        No trainers found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(trainer => {
            const assignedCount = getAssignedMembers(trainer).length;
            const isActive = trainer.status === "active";

            return `
                <tr>
                    <td><span class="trainer-id-pill">${escapeHTML(trainer.id)}</span></td>
                    <td><strong style="color:#202124;">${escapeHTML(trainer.name)}</strong></td>
                    <td>${escapeHTML(trainer.phone)}</td>
                    <td>
                        ${trainer.specialization
                            ? `<span class="trainer-spec-pill">${escapeHTML(trainer.specialization)}</span>`
                            : "-"}
                    </td>
                    <td><span class="trainer-members-pill">${assignedCount}</span></td>
                    <td><strong style="color:#202124;">${currency(trainer.salary)}</strong></td>
                    <td>
                        <span class="trainer-status ${isActive ? "" : "inactive"}">
                            ${isActive ? "Active" : "Inactive"}
                        </span>
                    </td>
                    <td class="trainer-actions-cell">
                        <button class="trainer-action"
                            data-profile="${escapeHTML(trainer.id)}">View</button>

                        <button class="trainer-action"
                            data-edit="${escapeHTML(trainer.id)}">Edit</button>

                        <button class="trainer-action salary"
                            data-salary="${escapeHTML(trainer.id)}">Salary</button>

                        <button class="trainer-action attendance"
                            data-attendance="${escapeHTML(trainer.id)}">Attendance</button>

                        <button class="trainer-action delete"
                            data-delete="${escapeHTML(trainer.id)}">Delete</button>
                    </td>
                </tr>
            `;
        }).join("");

        table.querySelectorAll("[data-edit]").forEach(button => {
            button.addEventListener("click", () => {
                const trainer = GymDB.find(MODULE, button.dataset.edit);
                if (trainer) openForm(trainer);
            });
        });

        table.querySelectorAll("[data-delete]").forEach(button => {
            button.addEventListener("click", () =>
                deleteTrainer(button.dataset.delete)
            );
        });

        table.querySelectorAll("[data-salary]").forEach(button => {
            button.addEventListener("click", () =>
                openSalary(button.dataset.salary)
            );
        });

        table.querySelectorAll("[data-attendance]").forEach(button => {
            button.addEventListener("click", () =>
                openAttendance(button.dataset.attendance)
            );
        });

        table.querySelectorAll("[data-profile]").forEach(button => {
            button.addEventListener("click", () =>
                openProfile(button.dataset.profile)
            );
        });
    }

    // SALARY MANAGEMENT

    function openSalary(id) {
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        document.getElementById("salaryTrainerId").value = id;
        document.getElementById("salaryAmount").value = trainer.salary || "";
        document.getElementById("salaryDate").value = today();
        document.getElementById("salaryMethod").value = "Cash";
        document.getElementById("salaryNote").value = "";

        document.getElementById("trainerSalaryInfo").innerHTML = `
            <strong style="font-size:14px;color:#202124;">${escapeHTML(trainer.name)}</strong>
            &nbsp;<span class="trainer-id-pill">${escapeHTML(trainer.id)}</span><br>
            Base Monthly Salary: <strong style="color:#d71920;">${currency(trainer.salary)}</strong>
        `;

        renderSalaryHistory(trainer);
        document.getElementById("trainerSalaryModal").style.display = "flex";
    }

    function renderSalaryHistory(trainer) {
        const history = Array.isArray(trainer.salaryHistory)
            ? [...trainer.salaryHistory] : [];

        history.sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || ""))
        );

        if (!history.length) {
            document.getElementById("trainerSalaryHistory").innerHTML =
                `<p class="trainers-empty">No salary payments recorded.</p>`;
            return;
        }

        document.getElementById("trainerSalaryHistory").innerHTML = `
            <div class="trainer-history-wrap">
                <table class="trainer-history">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(item => `
                            <tr>
                                <td>${escapeHTML(item.date)}</td>
                                <td><strong style="color:#168653;">${currency(item.amount)}</strong></td>
                                <td>${escapeHTML(item.method || "-")}</td>
                                <td>${escapeHTML(item.note || "-")}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function saveSalary(event) {
        event.preventDefault();

        const id = document.getElementById("salaryTrainerId").value;
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        const amount = Number(document.getElementById("salaryAmount").value);
        const date = document.getElementById("salaryDate").value;

        if (!Number.isFinite(amount) || amount <= 0 || !date) {
            alert("Enter a valid salary amount and date.");
            return;
        }

        const history = Array.isArray(trainer.salaryHistory)
            ? [...trainer.salaryHistory] : [];

        history.push({
            id: GymDB.generateID("SAL"),
            amount,
            date,
            method: document.getElementById("salaryMethod").value,
            note: document.getElementById("salaryNote").value.trim(),
            createdAt: new Date().toISOString()
        });

        const saved = GymDB.update(MODULE, id, {
            salaryHistory: history
        });

        if (!saved) {
            alert("Salary payment could not be saved.");
            return;
        }

        document.getElementById("salaryAmount").value = "";
        document.getElementById("salaryNote").value = "";

        const updated = GymDB.find(MODULE, id);
        renderSalaryHistory(updated);
        renderTable();

        notify("Salary payment recorded successfully.");
    }

    function closeSalary() {
        document.getElementById("trainerSalaryModal").style.display = "none";
    }

    // ATTENDANCE MANAGEMENT

    function openAttendance(id) {
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        document.getElementById("attendanceTrainerId").value = id;
        document.getElementById("trainerAttendanceDate").value = today();
        document.getElementById("trainerAttendanceStatus").value = "Present";
        document.getElementById("trainerAttendanceNote").value = "";

        document.getElementById("trainerAttendanceInfo").innerHTML = `
            <strong style="font-size:14px;color:#202124;">${escapeHTML(trainer.name)}</strong><br>
            Trainer ID: <span class="trainer-id-pill">${escapeHTML(trainer.id)}</span>
        `;

        renderAttendanceHistory(trainer);
        document.getElementById("trainerAttendanceModal").style.display = "flex";
    }

    function renderAttendanceHistory(trainer) {
        const history = Array.isArray(trainer.attendanceHistory)
            ? [...trainer.attendanceHistory] : [];

        history.sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || ""))
        );

        if (!history.length) {
            document.getElementById("trainerAttendanceHistory").innerHTML =
                `<p class="trainers-empty">No attendance records found.</p>`;
            return;
        }

        document.getElementById("trainerAttendanceHistory").innerHTML = `
            <div class="trainer-history-wrap">
                <table class="trainer-history">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(item => {
                            const badgeBg = item.status === "Present"
                                ? "#e9f8f0"
                                : item.status === "Absent"
                                    ? "#fff0f0"
                                    : "#fff8eb";
                            const badgeColor = item.status === "Present"
                                ? "#168653"
                                : item.status === "Absent"
                                    ? "#d71920"
                                    : "#b8740e";

                            return `
                                <tr>
                                    <td>${escapeHTML(item.date)}</td>
                                    <td>
                                        <span style="display:inline-block;padding:3px 9px;border-radius:12px;font-size:10.5px;font-weight:700;background:${badgeBg};color:${badgeColor};">
                                            ${escapeHTML(item.status)}
                                        </span>
                                    </td>
                                    <td>${escapeHTML(item.note || "-")}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function saveAttendance(event) {
        event.preventDefault();

        const id = document.getElementById("attendanceTrainerId").value;
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        const date = document.getElementById("trainerAttendanceDate").value;
        const status = document.getElementById("trainerAttendanceStatus").value;
        const note = document.getElementById("trainerAttendanceNote").value.trim();

        if (!date || date > today()) {
            alert("Please select a valid attendance date. Future dates are not allowed.");
            return;
        }

        const history = Array.isArray(trainer.attendanceHistory)
            ? [...trainer.attendanceHistory] : [];

        const existingIndex = history.findIndex(item => item.date === date);

        const attendanceRecord = {
            id: existingIndex >= 0
                ? history[existingIndex].id
                : GymDB.generateID("TAT"),
            date,
            status,
            note,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            if (!confirm(
                "Attendance for this date already exists. Do you want to update it?"
            )) return;

            history[existingIndex] = {
                ...history[existingIndex],
                ...attendanceRecord
            };
        } else {
            attendanceRecord.createdAt = new Date().toISOString();
            history.push(attendanceRecord);
        }

        const saved = GymDB.update(MODULE, id, {
            attendanceHistory: history
        });

        if (!saved) {
            alert("Attendance could not be saved.");
            return;
        }

        document.getElementById("trainerAttendanceNote").value = "";

        const updated = GymDB.find(MODULE, id);
        renderAttendanceHistory(updated);

        notify("Trainer attendance saved successfully.");
    }

    function closeAttendance() {
        document.getElementById("trainerAttendanceModal").style.display = "none";
    }

    // TRAINER PROFILE

    function openProfile(id) {
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        const members = getAssignedMembers(trainer);
        const salaryHistory = Array.isArray(trainer.salaryHistory)
            ? trainer.salaryHistory : [];
        const attendanceHistory = Array.isArray(trainer.attendanceHistory)
            ? trainer.attendanceHistory : [];

        const totalSalaryPaid = salaryHistory.reduce((sum, item) =>
            sum + Number(item.amount || 0), 0
        );

        const present = attendanceHistory.filter(item =>
            item.status === "Present"
        ).length;

        const absent = attendanceHistory.filter(item =>
            item.status === "Absent"
        ).length;

        const leave = attendanceHistory.filter(item =>
            item.status === "Leave"
        ).length;

        document.getElementById("trainerProfileContent").innerHTML = `
            <div class="trainer-info highlight">
                <strong style="font-size:15px;color:#202124;">${escapeHTML(trainer.name)}</strong>
                &nbsp;<span class="trainer-id-pill">${escapeHTML(trainer.id)}</span><br>
                Phone: <strong>${escapeHTML(trainer.phone)}</strong><br>
                Email: ${escapeHTML(trainer.email || "-")}<br>
                Specialization: <strong>${escapeHTML(trainer.specialization || "-")}</strong><br>
                Joining Date: ${escapeHTML(trainer.joiningDate || "-")}<br>
                Monthly Salary: <strong style="color:#d71920;">${currency(trainer.salary)}</strong><br>
                Status: <strong style="text-transform:uppercase;">${escapeHTML(trainer.status || "active")}</strong><br>
                Address: ${escapeHTML(trainer.address || "-")}
            </div>

            <h4>Assigned Members (${members.length})</h4>
            <div class="trainer-info">
                ${
                    members.length
                    ? members.map(member =>
                        "<strong>" + escapeHTML(member.name) + "</strong>" +
                        " (" + escapeHTML(member.phone || "-") + ")"
                    ).join("<br>")
                    : "No members assigned."
                }
            </div>

            <h4>Salary Summary</h4>
            <div class="trainer-info">
                Total Salary Paid: <strong style="color:#168653;">${currency(totalSalaryPaid)}</strong><br>
                Total Payout Records: <strong>${salaryHistory.length}</strong>
            </div>

            <h4>Attendance Summary</h4>
            <div class="trainer-info">
                Present: <strong style="color:#168653;">${present}</strong> &nbsp;•&nbsp;
                Absent: <strong style="color:#d71920;">${absent}</strong> &nbsp;•&nbsp;
                Leave: <strong style="color:#b8740e;">${leave}</strong><br>
                Total Logged Days: <strong>${attendanceHistory.length}</strong>
            </div>
        `;

        document.getElementById("trainerProfileModal").style.display = "flex";
    }

    function closeProfile() {
        document.getElementById("trainerProfileModal").style.display = "none";
    }

    return {
        render,
        refresh: renderTable,
        getTrainers,
        getAssignedMembers
    };
})();

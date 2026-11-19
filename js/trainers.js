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

    function injectStyles() {
        if (document.getElementById("gymTrainersStyles")) return;

        const style = document.createElement("style");
        style.id = "gymTrainersStyles";

        style.textContent = `
            .trainers-wrap { padding:5px 0 25px; }

            .trainers-header {
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:15px;
                margin-bottom:22px;
            }

            .trainers-header h2 { margin:0 0 6px; }
            .trainers-header p { margin:0; opacity:.7; }

            .trainers-stats {
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:15px;
                margin-bottom:22px;
            }

            .trainers-stat {
                padding:20px;
                border-radius:14px;
                background:rgba(255,255,255,.05);
                border:1px solid rgba(255,255,255,.08);
            }

            .trainers-stat span {
                display:block;
                opacity:.7;
                font-size:13px;
                margin-bottom:9px;
            }

            .trainers-stat strong { font-size:25px; }

            .trainers-toolbar {
                display:flex;
                flex-wrap:wrap;
                gap:12px;
                margin-bottom:18px;
            }

            .trainers-toolbar input,
            .trainers-toolbar select {
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
                min-width:180px;
            }

            .trainers-table-wrap {
                overflow-x:auto;
                border-radius:13px;
            }

            .trainers-table {
                width:100%;
                min-width:950px;
                border-collapse:collapse;
            }

            .trainers-table th,
            .trainers-table td {
                padding:13px;
                text-align:left;
                border-bottom:1px solid rgba(255,255,255,.08);
            }

            .trainers-table th {
                font-size:12px;
                opacity:.7;
                text-transform:uppercase;
            }

            .trainer-status {
                display:inline-block;
                padding:5px 10px;
                border-radius:20px;
                background:rgba(46,204,113,.13);
                color:#6ee7a0;
                font-size:11px;
            }

            .trainer-status.inactive {
                background:rgba(255,255,255,.1);
                color:#aaa;
            }

            .trainer-action {
                padding:7px 10px;
                border:0;
                border-radius:7px;
                margin:2px;
                cursor:pointer;
                color:white;
                background:#6845b8;
                font-size:12px;
            }

            .trainer-action.delete { background:#a93650; }
            .trainer-action.salary { background:#167c62; }
            .trainer-action.attendance { background:#2764a5; }

            .trainers-empty {
                text-align:center;
                padding:35px 15px;
                opacity:.65;
            }

            .trainer-modal {
                position:fixed;
                inset:0;
                z-index:9999;
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                background:rgba(0,0,0,.78);
            }

            .trainer-modal-box {
                width:100%;
                max-width:500px;
                max-height:90vh;
                overflow-y:auto;
                padding:24px;
                border-radius:16px;
                background:#211a32;
                border:1px solid rgba(255,255,255,.12);
            }

            .trainer-modal-box h3 { margin-top:0; }

            .trainer-form label {
                display:block;
                margin:14px 0 7px;
                font-size:13px;
            }

            .trainer-form input,
            .trainer-form select,
            .trainer-form textarea {
                width:100%;
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
                box-sizing:border-box;
            }

            .trainer-form textarea {
                min-height:70px;
                resize:vertical;
            }

            .trainer-form-actions {
                display:flex;
                gap:10px;
                margin-top:20px;
            }

            .trainer-form-actions button {
                flex:1;
                padding:12px;
                border:0;
                border-radius:9px;
                cursor:pointer;
                color:white;
                background:#8055d9;
                font-weight:600;
            }

            .trainer-form-actions .cancel { background:#494253; }

            .trainer-history {
                width:100%;
                border-collapse:collapse;
                margin-top:15px;
                font-size:13px;
            }

            .trainer-history th,
            .trainer-history td {
                padding:10px 7px;
                text-align:left;
                border-bottom:1px solid rgba(255,255,255,.1);
            }

            .trainer-history-wrap { overflow-x:auto; }

            .trainer-info {
                padding:13px;
                background:rgba(255,255,255,.05);
                border-radius:10px;
                margin-bottom:15px;
                font-size:13px;
                line-height:1.8;
            }

            .trainer-small-btn {
                padding:9px 12px;
                border:0;
                border-radius:8px;
                background:#6845b8;
                color:white;
                cursor:pointer;
            }

            .trainer-danger { background:#a93650; }

            @media(max-width:650px) {
                .trainers-stats { grid-template-columns:1fr; }
                .trainer-modal-box { padding:18px; }
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
                        <h2>Trainer Management</h2>
                        <p>Manage trainers, salary and attendance.</p>
                    </div>

                    <button class="btn btn-primary" id="addTrainerBtn">
                        + Add Trainer
                    </button>
                </div>

                <div class="trainers-stats">
                    <div class="trainers-stat">
                        <span>Total Trainers</span>
                        <strong id="totalTrainers">0</strong>
                    </div>

                    <div class="trainers-stat">
                        <span>Active Trainers</span>
                        <strong id="activeTrainers">0</strong>
                    </div>

                    <div class="trainers-stat">
                        <span>Active Monthly Salary</span>
                        <strong id="trainerSalaryTotal">₹0</strong>
                    </div>
                </div>

                <div class="trainers-toolbar">
                    <input type="search" id="trainerSearch"
                        placeholder="Search name, ID or phone...">

                    <select id="trainerStatusFilter">
                        <option value="all">All Trainers</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
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

            <div class="trainer-modal" id="trainerModal">
                <div class="trainer-modal-box">
                    <h3 id="trainerFormTitle">Add New Trainer</h3>

                    <form class="trainer-form" id="trainerForm">
                        <input type="hidden" id="trainerId">

                        <label>Trainer Name *</label>
                        <input type="text" id="trainerName"
                            placeholder="Enter trainer name" required>

                        <label>Phone Number *</label>
                        <input type="tel" id="trainerPhone"
                            placeholder="Enter phone number"
                            pattern="[0-9+() -]{7,20}" required>

                        <label>Email</label>
                        <input type="email" id="trainerEmail"
                            placeholder="Enter email">

                        <label>Specialization</label>
                        <input type="text" id="trainerSpecialization"
                            placeholder="Weight Training, Yoga, Cardio">

                        <label>Monthly Salary (₹)</label>
                        <input type="number" id="trainerSalary"
                            min="0" step="0.01" placeholder="Enter salary">

                        <label>Joining Date</label>
                        <input type="date" id="trainerJoiningDate">

                        <label>Status</label>
                        <select id="trainerStatus">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <label>Address</label>
                        <textarea id="trainerAddress"
                            placeholder="Enter trainer address"></textarea>

                        <div class="trainer-form-actions">
                            <button type="submit">Save Trainer</button>
                            <button type="button" class="cancel"
                                id="cancelTrainerBtn">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="trainer-modal" id="trainerSalaryModal">
                <div class="trainer-modal-box">
                    <h3>Trainer Salary</h3>
                    <div id="trainerSalaryInfo" class="trainer-info"></div>

                    <form class="trainer-form" id="trainerSalaryForm">
                        <input type="hidden" id="salaryTrainerId">

                        <label>Payment Amount (₹) *</label>
                        <input type="number" id="salaryAmount"
                            min="0.01" step="0.01" required>

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
                            placeholder="Optional note"></textarea>

                        <div class="trainer-form-actions">
                            <button type="submit">Save Payment</button>
                            <button type="button" class="cancel"
                                id="closeSalaryBtn">Close</button>
                        </div>
                    </form>

                    <h4>Salary Payment History</h4>
                    <div id="trainerSalaryHistory"></div>
                </div>
            </div>

            <div class="trainer-modal" id="trainerAttendanceModal">
                <div class="trainer-modal-box">
                    <h3>Trainer Attendance</h3>
                    <div id="trainerAttendanceInfo" class="trainer-info"></div>

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

            <div class="trainer-modal" id="trainerProfileModal">
                <div class="trainer-modal-box">
                    <h3>Trainer Profile</h3>
                    <div id="trainerProfileContent"></div>
                    <button type="button" class="trainer-small-btn"
                        id="closeProfileBtn">Close</button>
                </div>
            </div>
        `;

        document.getElementById("addTrainerBtn")
            .addEventListener("click", () => openForm());

        document.getElementById("cancelTrainerBtn")
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

        document.getElementById("trainerAttendanceForm")
            .addEventListener("submit", saveAttendance);

        document.getElementById("closeAttendanceBtn")
            .addEventListener("click", closeAttendance);

        document.getElementById("closeProfileBtn")
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
                    <td>${escapeHTML(trainer.id)}</td>
                    <td><strong>${escapeHTML(trainer.name)}</strong></td>
                    <td>${escapeHTML(trainer.phone)}</td>
                    <td>${escapeHTML(trainer.specialization || "-")}</td>
                    <td>${assignedCount}</td>
                    <td>${currency(trainer.salary)}</td>
                    <td>
                        <span class="trainer-status ${isActive ? "" : "inactive"}">
                            ${isActive ? "Active" : "Inactive"}
                        </span>
                    </td>
                    <td>
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
        document.getElementById("salaryAmount").value = "";
        document.getElementById("salaryDate").value = today();
        document.getElementById("salaryMethod").value = "Cash";
        document.getElementById("salaryNote").value = "";

        document.getElementById("trainerSalaryInfo").innerHTML = `
            <strong>${escapeHTML(trainer.name)}</strong><br>
            Monthly Salary: ${currency(trainer.salary)}
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
                                <td>${currency(item.amount)}</td>
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
            <strong>${escapeHTML(trainer.name)}</strong><br>
            Trainer ID: ${escapeHTML(trainer.id)}
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
                        ${history.map(item => `
                            <tr>
                                <td>${escapeHTML(item.date)}</td>
                                <td>${escapeHTML(item.status)}</td>
                                <td>${escapeHTML(item.note || "-")}</td>
                            </tr>
                        `).join("")}
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
            <div class="trainer-info">
                <strong>${escapeHTML(trainer.name)}</strong><br>
                Trainer ID: ${escapeHTML(trainer.id)}<br>
                Phone: ${escapeHTML(trainer.phone)}<br>
                Email: ${escapeHTML(trainer.email || "-")}<br>
                Specialization: ${escapeHTML(trainer.specialization || "-")}<br>
                Joining Date: ${escapeHTML(trainer.joiningDate || "-")}<br>
                Monthly Salary: ${currency(trainer.salary)}<br>
                Status: ${escapeHTML(trainer.status || "active")}<br>
                Address: ${escapeHTML(trainer.address || "-")}
            </div>

            <h4>Assigned Members (${members.length})</h4>
            <div class="trainer-info">
                ${
                    members.length
                    ? members.map(member =>
                        escapeHTML(member.name) +
                        " - " + escapeHTML(member.phone || "-")
                    ).join("<br>")
                    : "No members assigned."
                }
            </div>

            <h4>Salary Summary</h4>
            <div class="trainer-info">
                Total Salary Payments Recorded: ${currency(totalSalaryPaid)}<br>
                Number of Payments: ${salaryHistory.length}
            </div>

            <h4>Attendance Summary</h4>
            <div class="trainer-info">
                Present: ${present}<br>
                Absent: ${absent}<br>
                Leave: ${leave}<br>
                Total Records: ${attendanceHistory.length}
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

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

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
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
            }

            .trainers-table-wrap {
                overflow-x:auto;
                border-radius:13px;
            }

            .trainers-table {
                width:100%;
                min-width:750px;
                border-collapse:collapse;
            }

            .trainers-table th,
            .trainers-table td {
                padding:14px;
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
                padding:7px 11px;
                border:0;
                border-radius:7px;
                margin:2px;
                cursor:pointer;
                color:white;
                background:#6845b8;
            }

            .trainer-action.delete { background:#a93650; }

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
                background:rgba(0,0,0,.75);
            }

            .trainer-modal-box {
                width:100%;
                max-width:480px;
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

            @media(max-width:650px) {
                .trainers-stats { grid-template-columns:1fr; }
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
                        <p>Manage gym trainers and their details.</p>
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
                        <span>Total Monthly Salary</span>
                        <strong id="trainerSalaryTotal">₹0</strong>
                    </div>
                </div>

                <div class="trainers-toolbar">
                    <input type="search" id="trainerSearch"
                        placeholder="Search trainer name or phone...">

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
                                <th>Trainer Name</th>
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
                            placeholder="Example: Weight Training, Yoga">

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

        const trainerData = {
            ...(existing || {}),
            name: name,
            phone: phone,
            email: document.getElementById("trainerEmail").value.trim(),
            specialization: document.getElementById("trainerSpecialization").value.trim(),
            salary: salary,
            joiningDate: document.getElementById("trainerJoiningDate").value,
            status: document.getElementById("trainerStatus").value,
            address: document.getElementById("trainerAddress").value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            GymDB.update(MODULE, id, trainerData);
        } else {
            trainerData.id = GymDB.generateID("TRN");
            trainerData.createdAt = new Date().toISOString();
            GymDB.add(MODULE, trainerData);
        }

        closeForm();
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast(id ? "Trainer updated successfully" : "Trainer added successfully");
        } else {
            alert(id ? "Trainer updated successfully." : "Trainer added successfully.");
        }
    }

    function deleteTrainer(id) {
        const trainer = GymDB.find(MODULE, id);
        if (!trainer) return;

        const assigned = getMembers().some(member =>
            member.trainer === trainer.name
        );

        if (assigned) {
            alert("This trainer is assigned to members. Reassign those members before deleting the trainer.");
            return;
        }

        if (!confirm("Are you sure you want to delete this trainer?")) return;

        GymDB.delete(MODULE, id);
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast("Trainer deleted successfully");
        }
    }

    function renderTable() {
        const table = document.getElementById("trainersTableBody");
        if (!table) return;

        const trainers = getTrainers();
        const members = getMembers();

        const active = trainers.filter(t => t.status === "active");

        const salaryTotal = active.reduce((sum, trainer) => {
            return sum + Number(trainer.salary || 0);
        }, 0);

        document.getElementById("totalTrainers").textContent = trainers.length;
        document.getElementById("activeTrainers").textContent = active.length;
        document.getElementById("trainerSalaryTotal").textContent = currency(salaryTotal);

        const search = document.getElementById("trainerSearch").value
            .trim().toLowerCase();

        const status = document.getElementById("trainerStatusFilter").value;

        const filtered = trainers.filter(trainer => {
            const matchesSearch =
                (trainer.name || "").toLowerCase().includes(search) ||
                (trainer.phone || "").toLowerCase().includes(search);

            const matchesStatus =
                status === "all" || trainer.status === status;

            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="trainers-empty">
                        No trainers found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(trainer => {
            const assignedCount = members.filter(member =>
                member.trainer === trainer.name
            ).length;

            return `
                <tr>
                    <td><strong>${escapeHTML(trainer.name)}</strong></td>
                    <td>${escapeHTML(trainer.phone)}</td>
                    <td>${escapeHTML(trainer.specialization || "-")}</td>
                    <td>${assignedCount}</td>
                    <td>${currency(trainer.salary)}</td>
                    <td>
                        <span class="trainer-status ${trainer.status === "active" ? "" : "inactive"}">
                            ${trainer.status === "active" ? "Active" : "Inactive"}
                        </span>
                    </td>
                    <td>
                        <button class="trainer-action"
                            data-edit-trainer="${escapeHTML(trainer.id)}">
                            Edit
                        </button>

                        <button class="trainer-action delete"
                            data-delete-trainer="${escapeHTML(trainer.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        table.querySelectorAll("[data-edit-trainer]").forEach(button => {
            button.addEventListener("click", function () {
                const trainer = GymDB.find(MODULE, this.dataset.editTrainer);
                if (trainer) openForm(trainer);
            });
        });

        table.querySelectorAll("[data-delete-trainer]").forEach(button => {
            button.addEventListener("click", function () {
                deleteTrainer(this.dataset.deleteTrainer);
            });
        });
    }

    return {
        render: render,
        refresh: renderTable
    };
})();

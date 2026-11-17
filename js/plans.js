window.GymPlans = (function () {
    const MODULE = "plans";

    function getPlans() {
        return GymDB.getAll(MODULE) || [];
    }

    function currency(amount) {
        return "₹" + Number(amount || 0).toLocaleString("en-IN");
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function injectStyles() {
        if (document.getElementById("gymPlansStyles")) return;

        const style = document.createElement("style");
        style.id = "gymPlansStyles";

        style.textContent = `
            .plans-wrap {
                padding: 5px 0 25px;
            }

            .plans-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 22px;
            }

            .plans-header h2 {
                margin: 0 0 6px;
            }

            .plans-header p {
                margin: 0;
                opacity: .7;
            }

            .plans-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 22px;
            }

            .plans-stat {
                padding: 20px;
                border-radius: 14px;
                background: rgba(255,255,255,.05);
                border: 1px solid rgba(255,255,255,.08);
            }

            .plans-stat span {
                display: block;
                opacity: .7;
                font-size: 13px;
                margin-bottom: 9px;
            }

            .plans-stat strong {
                font-size: 25px;
            }

            .plans-toolbar {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 18px;
            }

            .plans-toolbar input,
            .plans-form input,
            .plans-form select,
            .plans-form textarea {
                width: 100%;
                padding: 12px 14px;
                border-radius: 9px;
                border: 1px solid rgba(255,255,255,.13);
                background: #171324;
                color: #fff;
                outline: none;
            }

            .plans-toolbar input {
                max-width: 350px;
            }

            .plans-table-wrap {
                overflow-x: auto;
                border-radius: 13px;
            }

            .plans-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 650px;
            }

            .plans-table th,
            .plans-table td {
                padding: 15px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,.08);
            }

            .plans-table th {
                font-size: 12px;
                opacity: .7;
                text-transform: uppercase;
            }

            .plans-table td {
                font-size: 14px;
            }

            .plan-status {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 11px;
                background: rgba(46,204,113,.13);
                color: #6ee7a0;
            }

            .plan-status.inactive {
                background: rgba(255,255,255,.1);
                color: #aaa;
            }

            .plan-action {
                padding: 7px 11px;
                border: 0;
                border-radius: 7px;
                margin: 2px;
                cursor: pointer;
                color: white;
                background: #6845b8;
            }

            .plan-action.delete {
                background: #a93650;
            }

            .plans-empty {
                text-align: center;
                padding: 35px 15px;
                opacity: .65;
            }

            .plans-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 15px;
                background: rgba(0,0,0,.75);
            }

            .plans-modal-box {
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                padding: 24px;
                border-radius: 16px;
                background: #211a32;
                border: 1px solid rgba(255,255,255,.12);
            }

            .plans-modal-box h3 {
                margin-top: 0;
            }

            .plans-form label {
                display: block;
                font-size: 13px;
                margin: 14px 0 7px;
            }

            .plans-form textarea {
                min-height: 75px;
                resize: vertical;
            }

            .plans-form-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }

            .plans-form-actions button {
                flex: 1;
                padding: 12px;
                border: 0;
                border-radius: 9px;
                cursor: pointer;
                color: white;
                background: #8055d9;
                font-weight: 600;
            }

            .plans-form-actions .cancel {
                background: #494253;
            }

            @media(max-width:650px) {
                .plans-stats {
                    grid-template-columns: 1fr;
                }

                .plans-header .btn {
                    width: 100%;
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
            <div class="plans-wrap">

                <div class="plans-header">
                    <div>
                        <h2>Membership Plans</h2>
                        <p>Create and manage your gym membership plans.</p>
                    </div>

                    <button class="btn btn-primary" id="addGymPlanBtn">
                        + Add New Plan
                    </button>
                </div>

                <div class="plans-stats">
                    <div class="plans-stat">
                        <span>Total Plans</span>
                        <strong id="totalGymPlans">0</strong>
                    </div>

                    <div class="plans-stat">
                        <span>Active Plans</span>
                        <strong id="activeGymPlans">0</strong>
                    </div>

                    <div class="plans-stat">
                        <span>Inactive Plans</span>
                        <strong id="inactiveGymPlans">0</strong>
                    </div>
                </div>

                <div class="plans-toolbar">
                    <input
                        type="search"
                        id="searchGymPlans"
                        placeholder="Search plan name..."
                    >
                </div>

                <div class="plans-table-wrap">
                    <table class="plans-table">
                        <thead>
                            <tr>
                                <th>Plan Name</th>
                                <th>Duration</th>
                                <th>Fees</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody id="gymPlansTable"></tbody>
                    </table>
                </div>

            </div>

            <div class="plans-modal" id="gymPlanModal">
                <div class="plans-modal-box">
                    <h3 id="gymPlanFormTitle">Add Membership Plan</h3>

                    <form class="plans-form" id="gymPlanForm">
                        <input type="hidden" id="gymPlanId">

                        <label>Plan Name *</label>
                        <input
                            type="text"
                            id="gymPlanName"
                            placeholder="Example: Monthly Plan"
                            required
                        >

                        <label>Duration *</label>
                        <select id="gymPlanDuration" required>
                            <option value="1">1 Day</option>
                            <option value="30">1 Month</option>
                            <option value="90">3 Months</option>
                            <option value="180">6 Months</option>
                            <option value="365">12 Months</option>
                            <option value="custom">Custom Duration</option>
                        </select>

                        <div id="customDurationBox" style="display:none;">
                            <label>Custom Duration (Days) *</label>
                            <input
                                type="number"
                                id="gymPlanCustomDays"
                                min="1"
                                placeholder="Enter number of days"
                            >
                        </div>

                        <label>Plan Fees (₹) *</label>
                        <input
                            type="number"
                            id="gymPlanFees"
                            min="0"
                            step="0.01"
                            placeholder="Enter plan fees"
                            required
                        >

                        <label>Description</label>
                        <textarea
                            id="gymPlanDescription"
                            placeholder="Optional plan details"
                        ></textarea>

                        <label>Plan Status</label>
                        <select id="gymPlanStatus">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <div class="plans-form-actions">
                            <button type="submit">Save Plan</button>
                            <button type="button" class="cancel" id="cancelGymPlan">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById("addGymPlanBtn").addEventListener("click", function () {
            openForm();
        });

        document.getElementById("cancelGymPlan").addEventListener("click", closeForm);

        document.getElementById("gymPlanDuration").addEventListener("change", function () {
            document.getElementById("customDurationBox").style.display =
                this.value === "custom" ? "block" : "none";
        });

        document.getElementById("gymPlanForm").addEventListener("submit", savePlan);

        document.getElementById("searchGymPlans").addEventListener("input", renderTable);

        renderTable();
    }

    function openForm(plan) {
        const modal = document.getElementById("gymPlanModal");
        const form = document.getElementById("gymPlanForm");

        form.reset();

        document.getElementById("gymPlanId").value = "";
        document.getElementById("gymPlanFormTitle").textContent = "Add Membership Plan";
        document.getElementById("gymPlanStatus").value = "active";
        document.getElementById("customDurationBox").style.display = "none";

        if (plan) {
            document.getElementById("gymPlanFormTitle").textContent = "Edit Membership Plan";
            document.getElementById("gymPlanId").value = plan.id;
            document.getElementById("gymPlanName").value = plan.name || "";
            document.getElementById("gymPlanFees").value = plan.fees ?? "";
            document.getElementById("gymPlanDescription").value = plan.description || "";
            document.getElementById("gymPlanStatus").value = plan.status || "active";

            const standardDurations = ["1", "30", "90", "180", "365"];
            const duration = String(plan.durationDays || 30);

            if (standardDurations.includes(duration)) {
                document.getElementById("gymPlanDuration").value = duration;
            } else {
                document.getElementById("gymPlanDuration").value = "custom";
                document.getElementById("customDurationBox").style.display = "block";
                document.getElementById("gymPlanCustomDays").value = duration;
            }
        }

        modal.style.display = "flex";
    }

    function closeForm() {
        const modal = document.getElementById("gymPlanModal");
        if (modal) modal.style.display = "none";
    }

    function savePlan(event) {
        event.preventDefault();

        const id = document.getElementById("gymPlanId").value;
        const durationValue = document.getElementById("gymPlanDuration").value;

        const durationDays = durationValue === "custom"
            ? Number(document.getElementById("gymPlanCustomDays").value)
            : Number(durationValue);

        const name = document.getElementById("gymPlanName").value.trim();
        const fees = Number(document.getElementById("gymPlanFees").value);

        if (!name || !Number.isFinite(fees) || fees < 0) {
            alert("Please enter a valid plan name and fees.");
            return;
        }

        if (!Number.isInteger(durationDays) || durationDays < 1) {
            alert("Please enter a valid duration.");
            return;
        }

        const existing = id ? GymDB.find(MODULE, id) : null;

        const planData = {
            ...(existing || {}),
            name: name,
            durationDays: durationDays,
            fees: fees,
            description: document.getElementById("gymPlanDescription").value.trim(),
            status: document.getElementById("gymPlanStatus").value,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            GymDB.update(MODULE, id, planData);
        } else {
            planData.id = GymDB.generateID("PLAN");
            planData.createdAt = new Date().toISOString();
            GymDB.add(MODULE, planData);
        }

        closeForm();
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast(id ? "Plan updated successfully" : "Plan created successfully");
        } else {
            alert(id ? "Plan updated successfully." : "Plan created successfully.");
        }
    }

    function renderTable() {
        const table = document.getElementById("gymPlansTable");
        if (!table) return;

        const plans = getPlans();
        const search = (document.getElementById("searchGymPlans")?.value || "").toLowerCase();

        const active = plans.filter(plan => plan.status === "active");
        const inactive = plans.filter(plan => plan.status !== "active");

        document.getElementById("totalGymPlans").textContent = plans.length;
        document.getElementById("activeGymPlans").textContent = active.length;
        document.getElementById("inactiveGymPlans").textContent = inactive.length;

        const filtered = plans.filter(plan =>
            (plan.name || "").toLowerCase().includes(search)
        );

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="plans-empty">
                        No membership plans found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(plan => `
            <tr>
                <td>
                    <strong>${escapeHTML(plan.name)}</strong>
                    <br>
                    <small>${escapeHTML(plan.description || "")}</small>
                </td>

                <td>${Number(plan.durationDays || 0)} Days</td>

                <td><strong>${currency(plan.fees)}</strong></td>

                <td>
                    <span class="plan-status ${plan.status === "active" ? "" : "inactive"}">
                        ${plan.status === "active" ? "Active" : "Inactive"}
                    </span>
                </td>

                <td>
                    <button class="plan-action" data-edit-plan="${escapeHTML(plan.id)}">
                        Edit
                    </button>

                    <button class="plan-action delete" data-delete-plan="${escapeHTML(plan.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");

        table.querySelectorAll("[data-edit-plan]").forEach(button => {
            button.addEventListener("click", function () {
                const plan = GymDB.find(MODULE, this.dataset.editPlan);
                if (plan) openForm(plan);
            });
        });

        table.querySelectorAll("[data-delete-plan]").forEach(button => {
            button.addEventListener("click", function () {
                deletePlan(this.dataset.deletePlan);
            });
        });
    }

    function deletePlan(id) {
        const plan = GymDB.find(MODULE, id);
        if (!plan) return;

        const members = GymDB.getAll("members") || [];

        const assigned = members.some(member =>
            member.planId === id
        );

        if (assigned) {
            alert("This plan is assigned to a member. Please change that member's plan before deleting it.");
            return;
        }

        if (!confirm("Are you sure you want to delete this membership plan?")) {
            return;
        }

        GymDB.delete(MODULE, id);
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast("Plan deleted successfully");
        } else {
            alert("Plan deleted successfully.");
        }
    }

    return {
        render: render,
        refresh: renderTable
    };
})();

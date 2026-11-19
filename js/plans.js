window.GymPlans = (function () {
    const MODULE = "plans";

    // ==========================================
    // DATABASE FUNCTIONS
    // ==========================================

    function getPlans() {
        return GymDB.getAll(MODULE) || [];
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
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

    function showMessage(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    function generatePlanId() {
        return GymDB.generateID("PLAN");
    }

    function getAssignedMembers(plan) {
        const members = getMembers();

        return members.filter(member => {
            return (
                member.planId === plan.id ||
                (
                    !member.planId &&
                    String(member.planName || "").toLowerCase() ===
                    String(plan.name || "").toLowerCase()
                )
            );
        });
    }

    function getDurationLabel(days) {
        days = Number(days || 0);

        const standard = {
            1: "1 Day",
            30: "1 Month",
            90: "3 Months",
            180: "6 Months",
            365: "12 Months"
        };

        return standard[days] || days + " Days";
    }

    // ==========================================
    // STYLES
    // ==========================================

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
                font-size: 25px;
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
            .plans-toolbar select {
                padding: 12px 14px;
                border-radius: 9px;
                border: 1px solid rgba(255,255,255,.13);
                background: #171324;
                color: #fff;
                outline: none;
            }

            .plans-toolbar input {
                flex: 1;
                min-width: 180px;
            }

            .plans-toolbar select {
                min-width: 150px;
            }

            .plans-table-wrap {
                overflow-x: auto;
                border-radius: 13px;
                background: rgba(255,255,255,.025);
                border: 1px solid rgba(255,255,255,.06);
            }

            .plans-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 800px;
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
                white-space: nowrap;
            }

            .plans-table td {
                font-size: 14px;
            }

            .plan-name {
                font-weight: 700;
                font-size: 14px;
            }

            .plan-description {
                display: block;
                margin-top: 5px;
                opacity: .6;
                font-size: 12px;
                max-width: 220px;
                white-space: normal;
            }

            .plan-price {
                font-size: 16px;
                font-weight: 700;
            }

            .plan-members-count {
                display: inline-block;
                padding: 6px 11px;
                border-radius: 20px;
                background: rgba(128,85,217,.15);
                color: #c7aaff;
                font-size: 12px;
                font-weight: 700;
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
                padding: 8px 11px;
                border: 0;
                border-radius: 7px;
                margin: 2px;
                cursor: pointer;
                color: white;
                background: #6845b8;
                font-size: 12px;
            }

            .plan-action:hover {
                filter: brightness(1.15);
            }

            .plan-action.delete {
                background: #a93650;
            }

            .plan-action.toggle {
                background: #287c68;
            }

            .plans-empty {
                text-align: center;
                padding: 40px 15px;
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
                background: rgba(0,0,0,.78);
            }

            .plans-modal-box {
                width: 100%;
                max-width: 520px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 25px;
                border-radius: 17px;
                background: #211a32;
                border: 1px solid rgba(255,255,255,.12);
                box-shadow: 0 20px 60px rgba(0,0,0,.4);
            }

            .plans-modal-box h3 {
                margin-top: 0;
                margin-bottom: 5px;
                font-size: 21px;
            }

            .plans-modal-subtitle {
                opacity: .65;
                font-size: 13px;
                margin-bottom: 20px;
            }

            .plans-form label {
                display: block;
                font-size: 13px;
                margin: 14px 0 7px;
            }

            .plans-form input,
            .plans-form select,
            .plans-form textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 12px 14px;
                border-radius: 9px;
                border: 1px solid rgba(255,255,255,.13);
                background: #171324;
                color: #fff;
                outline: none;
            }

            .plans-form input:focus,
            .plans-form select:focus,
            .plans-form textarea:focus {
                border-color: #9469e8;
            }

            .plans-form textarea {
                min-height: 85px;
                resize: vertical;
            }

            .plans-duration-box {
                padding: 12px;
                margin-top: 10px;
                border-radius: 10px;
                background: rgba(128,85,217,.1);
                border: 1px solid rgba(128,85,217,.2);
            }

            .plans-preview {
                margin-top: 15px;
                padding: 13px;
                border-radius: 10px;
                background: rgba(46,204,113,.08);
                border: 1px solid rgba(46,204,113,.18);
                line-height: 1.7;
                font-size: 13px;
            }

            .plans-form-actions {
                display: flex;
                gap: 10px;
                margin-top: 22px;
            }

            .plans-form-actions button {
                flex: 1;
                padding: 13px;
                border: 0;
                border-radius: 9px;
                cursor: pointer;
                color: white;
                background: linear-gradient(135deg,#9469e8,#6845b8);
                font-weight: 700;
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

                .plans-modal-box {
                    padding: 19px;
                }

                .plans-toolbar input,
                .plans-toolbar select {
                    width: 100%;
                    max-width: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ==========================================
    // RENDER PAGE
    // ==========================================

    function render() {
        injectStyles();

        const container = document.getElementById("modulePlaceholder");

        if (!container) return;

        container.innerHTML = `
            <div class="plans-wrap">

                <div class="plans-header">
                    <div>
                        <h2>Membership Plans</h2>
                        <p>Create, manage and track your gym membership plans.</p>
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

                    <select id="filterGymPlans">
                        <option value="all">All Plans</option>
                        <option value="active">Active Plans</option>
                        <option value="inactive">Inactive Plans</option>
                    </select>

                </div>

                <div class="plans-table-wrap">

                    <table class="plans-table">

                        <thead>
                            <tr>
                                <th>Plan Name</th>
                                <th>Duration</th>
                                <th>Fees</th>
                                <th>Members</th>
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

                    <div class="plans-modal-subtitle">
                        Configure membership duration and pricing.
                    </div>

                    <form class="plans-form" id="gymPlanForm">

                        <input type="hidden" id="gymPlanId">

                        <label>Plan Name *</label>

                        <input
                            type="text"
                            id="gymPlanName"
                            placeholder="Example: Monthly Premium"
                            maxlength="60"
                            required
                        >

                        <label>Membership Duration *</label>

                        <select id="gymPlanDuration" required>
                            <option value="1">Daily Plan - 1 Day</option>
                            <option value="30">Monthly Plan - 30 Days</option>
                            <option value="90">3 Months - 90 Days</option>
                            <option value="180">6 Months - 180 Days</option>
                            <option value="365">12 Months - 365 Days</option>
                            <option value="custom">Custom Duration</option>
                        </select>

                        <div
                            id="customDurationBox"
                            class="plans-duration-box"
                            style="display:none;"
                        >
                            <label>Custom Duration (Days) *</label>

                            <input
                                type="number"
                                id="gymPlanCustomDays"
                                min="1"
                                max="3650"
                                placeholder="Enter number of days"
                            >
                        </div>

                        <label>Plan Fees (₹) *</label>

                        <input
                            type="number"
                            id="gymPlanFees"
                            min="0"
                            max="10000000"
                            step="0.01"
                            placeholder="Enter plan fees"
                            required
                        >

                        <div class="plans-preview" id="gymPlanPreview">
                            Select duration and enter fees to see plan summary.
                        </div>

                        <label>Description</label>

                        <textarea
                            id="gymPlanDescription"
                            maxlength="500"
                            placeholder="Optional plan details"
                        ></textarea>

                        <label>Plan Status</label>

                        <select id="gymPlanStatus">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <div class="plans-form-actions">

                            <button type="submit">
                                Save Plan
                            </button>

                            <button
                                type="button"
                                class="cancel"
                                id="cancelGymPlan"
                            >
                                Cancel
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        `;

        document.getElementById("addGymPlanBtn")
            .addEventListener("click", function () {
                openForm();
            });

        document.getElementById("cancelGymPlan")
            .addEventListener("click", closeForm);

        document.getElementById("gymPlanDuration")
            .addEventListener("change", function () {
                const customBox =
                    document.getElementById("customDurationBox");

                customBox.style.display =
                    this.value === "custom" ? "block" : "none";

                updatePreview();
            });

        document.getElementById("gymPlanCustomDays")
            .addEventListener("input", updatePreview);

        document.getElementById("gymPlanFees")
            .addEventListener("input", updatePreview);

        document.getElementById("gymPlanName")
            .addEventListener("input", updatePreview);

        document.getElementById("gymPlanForm")
            .addEventListener("submit", savePlan);

        document.getElementById("searchGymPlans")
            .addEventListener("input", renderTable);

        document.getElementById("filterGymPlans")
            .addEventListener("change", renderTable);

        renderTable();
    }

    // ==========================================
    // PLAN PREVIEW
    // ==========================================

    function updatePreview() {
        const durationValue =
            document.getElementById("gymPlanDuration")?.value;

        const fees =
            Number(document.getElementById("gymPlanFees")?.value || 0);

        const name =
            document.getElementById("gymPlanName")?.value.trim() ||
            "Your Plan";

        let days = durationValue === "custom"
            ? Number(document.getElementById("gymPlanCustomDays")?.value)
            : Number(durationValue);

        const preview =
            document.getElementById("gymPlanPreview");

        if (!preview) return;

        if (!Number.isInteger(days) || days < 1 || days > 3650) {
            preview.textContent =
                "Please enter a valid membership duration.";
            return;
        }

        preview.innerHTML = `
            <strong>Plan Preview</strong><br>
            Plan: ${escapeHTML(name)}<br>
            Duration: ${days} Days<br>
            Fees: ${currency(fees)}
        `;
    }

    // ==========================================
    // OPEN / CLOSE FORM
    // ==========================================

    function openForm(plan) {
        const modal = document.getElementById("gymPlanModal");
        const form = document.getElementById("gymPlanForm");

        if (!modal || !form) return;

        form.reset();

        document.getElementById("gymPlanId").value = "";

        document.getElementById("gymPlanFormTitle").textContent =
            "Add Membership Plan";

        document.getElementById("gymPlanStatus").value = "active";

        document.getElementById("gymPlanDuration").value = "30";

        document.getElementById("customDurationBox").style.display =
            "none";

        if (plan) {
            document.getElementById("gymPlanFormTitle").textContent =
                "Edit Membership Plan";

            document.getElementById("gymPlanId").value =
                plan.id;

            document.getElementById("gymPlanName").value =
                plan.name || "";

            document.getElementById("gymPlanFees").value =
                plan.fees ?? "";

            document.getElementById("gymPlanDescription").value =
                plan.description || "";

            document.getElementById("gymPlanStatus").value =
                plan.status || "active";

            const standardDurations = [
                "1", "30", "90", "180", "365"
            ];

            const duration = String(plan.durationDays || 30);

            if (standardDurations.includes(duration)) {
                document.getElementById("gymPlanDuration").value =
                    duration;
            } else {
                document.getElementById("gymPlanDuration").value =
                    "custom";

                document.getElementById("customDurationBox").style.display =
                    "block";

                document.getElementById("gymPlanCustomDays").value =
                    duration;
            }
        }

        updatePreview();

        modal.style.display = "flex";
    }

    function closeForm() {
        const modal = document.getElementById("gymPlanModal");

        if (modal) {
            modal.style.display = "none";
        }
    }

    // ==========================================
    // SAVE PLAN
    // ==========================================

    function savePlan(event) {
        event.preventDefault();

        const id =
            document.getElementById("gymPlanId").value;

        const durationValue =
            document.getElementById("gymPlanDuration").value;

        const durationDays = durationValue === "custom"
            ? Number(document.getElementById("gymPlanCustomDays").value)
            : Number(durationValue);

        const name =
            document.getElementById("gymPlanName").value.trim();

        const fees =
            Number(document.getElementById("gymPlanFees").value);

        const status =
            document.getElementById("gymPlanStatus").value;

        const description =
            document.getElementById("gymPlanDescription").value.trim();

        if (!name) {
            alert("Please enter a plan name.");
            return;
        }

        if (!Number.isFinite(fees) || fees < 0 || fees > 10000000) {
            alert("Please enter valid plan fees.");
            return;
        }

        if (
            !Number.isInteger(durationDays) ||
            durationDays < 1 ||
            durationDays > 3650
        ) {
            alert("Please enter a valid duration between 1 and 3650 days.");
            return;
        }

        if (!["active", "inactive"].includes(status)) {
            alert("Please select a valid plan status.");
            return;
        }

        const existing = id
            ? GymDB.find(MODULE, id)
            : null;

        const duplicate = getPlans().find(plan =>
            String(plan.name || "").trim().toLowerCase() ===
            name.toLowerCase() &&
            plan.id !== id
        );

        if (duplicate) {
            alert("A membership plan with this name already exists.");
            return;
        }

        const planData = {
            ...(existing || {}),

            name: name,
            durationDays: durationDays,
            fees: fees,
            description: description,
            status: status,

            updatedAt: new Date().toISOString()
        };

        try {
            if (id) {
                if (!existing) {
                    alert("Plan not found. Please refresh and try again.");
                    return;
                }

                GymDB.update(MODULE, id, planData);

            } else {
                planData.id = generatePlanId();
                planData.createdAt = new Date().toISOString();

                GymDB.add(MODULE, planData);
            }

            closeForm();
            renderTable();

            showMessage(
                id
                    ? "Membership plan updated successfully."
                    : "Membership plan created successfully."
            );

        } catch (error) {
            console.error("Save plan error:", error);
            alert("Unable to save plan. Please try again.");
        }
    }

    // ==========================================
    // RENDER PLANS TABLE
    // ==========================================

    function renderTable() {
        const table =
            document.getElementById("gymPlansTable");

        if (!table) return;

        const plans = getPlans();

        const search = (
            document.getElementById("searchGymPlans")?.value || ""
        ).toLowerCase();

        const filter =
            document.getElementById("filterGymPlans")?.value || "all";

        const active = plans.filter(plan =>
            plan.status === "active"
        );

        const inactive = plans.filter(plan =>
            plan.status !== "active"
        );

        document.getElementById("totalGymPlans").textContent =
            plans.length;

        document.getElementById("activeGymPlans").textContent =
            active.length;

        document.getElementById("inactiveGymPlans").textContent =
            inactive.length;

        const filtered = plans.filter(plan => {
            const matchesSearch =
                String(plan.name || "").toLowerCase().includes(search);

            const matchesFilter =
                filter === "all" ||
                plan.status === filter ||
                (filter === "inactive" && plan.status !== "active");

            return matchesSearch && matchesFilter;
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="plans-empty">
                        No membership plans found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(plan => {
            const assignedMembers =
                getAssignedMembers(plan).length;

            const isActive = plan.status === "active";

            return `
                <tr>

                    <td>
                        <span class="plan-name">
                            ${escapeHTML(plan.name)}
                        </span>

                        <small class="plan-description">
                            ${escapeHTML(plan.description || "No description")}
                        </small>
                    </td>

                    <td>
                        ${getDurationLabel(plan.durationDays)}
                    </td>

                    <td>
                        <span class="plan-price">
                            ${currency(plan.fees)}
                        </span>
                    </td>

                    <td>
                        <span class="plan-members-count">
                            ${assignedMembers} Members
                        </span>
                    </td>

                    <td>
                        <span class="plan-status ${isActive ? "" : "inactive"}">
                            ${isActive ? "Active" : "Inactive"}
                        </span>
                    </td>

                    <td>

                        <button
                            class="plan-action"
                            data-edit-plan="${escapeHTML(plan.id)}"
                        >
                            Edit
                        </button>

                        <button
                            class="plan-action toggle"
                            data-toggle-plan="${escapeHTML(plan.id)}"
                        >
                            ${isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                            class="plan-action delete"
                            data-delete-plan="${escapeHTML(plan.id)}"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;
        }).join("");

        table.querySelectorAll("[data-edit-plan]").forEach(button => {
            button.addEventListener("click", function () {
                const plan = GymDB.find(
                    MODULE,
                    this.dataset.editPlan
                );

                if (plan) openForm(plan);
            });
        });

        table.querySelectorAll("[data-toggle-plan]").forEach(button => {
            button.addEventListener("click", function () {
                togglePlan(this.dataset.togglePlan);
            });
        });

        table.querySelectorAll("[data-delete-plan]").forEach(button => {
            button.addEventListener("click", function () {
                deletePlan(this.dataset.deletePlan);
            });
        });
    }

    // ==========================================
    // ACTIVATE / DEACTIVATE PLAN
    // ==========================================

    function togglePlan(id) {
        const plan = GymDB.find(MODULE, id);

        if (!plan) return;

        const newStatus =
            plan.status === "active" ? "inactive" : "active";

        const message = newStatus === "inactive"
            ? "Do you want to deactivate this plan?"
            : "Do you want to activate this plan?";

        if (!confirm(message)) return;

        GymDB.update(MODULE, id, {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        renderTable();

        showMessage(
            newStatus === "active"
                ? "Plan activated successfully."
                : "Plan deactivated successfully."
        );
    }

    // ==========================================
    // DELETE PLAN
    // ==========================================

    function deletePlan(id) {
        const plan = GymDB.find(MODULE, id);

        if (!plan) return;

        const assignedMembers =
            getAssignedMembers(plan);

        if (assignedMembers.length > 0) {
            alert(
                "This plan is assigned to " +
                assignedMembers.length +
                " member(s). Please change their membership plan before deleting it."
            );

            return;
        }

        if (!confirm(
            "Are you sure you want to delete " +
            plan.name +
            "? This action cannot be undone."
        )) {
            return;
        }

        GymDB.delete(MODULE, id);

        renderTable();

        showMessage("Membership plan deleted successfully.");
    }

    // ==========================================
    // PUBLIC FUNCTIONS
    // ==========================================

    return {
        render: render,
        refresh: renderTable
    };

})();

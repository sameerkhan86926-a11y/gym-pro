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
            30: "1 Month (30 Days)",
            90: "3 Months (90 Days)",
            180: "6 Months (180 Days)",
            365: "12 Months (365 Days)"
        };

        return standard[days] || days + " Days";
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymPlansStyles")) return;

        const style = document.createElement("style");
        style.id = "gymPlansStyles";

        style.textContent = `
            .plans-wrap {
                padding: 2px 0 25px;
            }

            .plans-header {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .plans-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .plans-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .plans-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }

            .plans-stat {
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .plans-stat:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .plans-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .plans-stat span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .plans-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .plans-stat strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .plans-panel {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .plans-toolbar {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 18px;
            }

            .plans-toolbar input,
            .plans-toolbar select {
                padding: 11px 14px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
                transition: all 0.2s ease;
            }

            .plans-toolbar input:focus,
            .plans-toolbar select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .plans-toolbar input {
                flex: 1;
                min-width: 210px;
            }

            .plans-toolbar select {
                min-width: 160px;
                font-weight: 600;
            }

            .plans-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .plans-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 820px;
                background: #ffffff;
            }

            .plans-table th,
            .plans-table td {
                padding: 14px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
            }

            .plans-table th {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                background: #f8f9fb;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                white-space: nowrap;
            }

            .plans-table td {
                font-size: 12px;
                color: #454c57;
                vertical-align: middle;
            }

            .plans-table tbody tr:hover {
                background: #fffafa;
            }

            .plan-name {
                font-weight: 700;
                font-size: 13px;
                color: #202124;
            }

            .plan-description {
                display: block;
                margin-top: 4px;
                color: #8a909a;
                font-size: 11px;
                max-width: 260px;
                white-space: normal;
                line-height: 1.45;
            }

            .plan-duration-pill {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 6px;
                background: #f3f4f6;
                color: #454c57;
                font-size: 11px;
                font-weight: 600;
            }

            .plan-price {
                font-size: 14px;
                font-weight: 800;
                color: #202124;
            }

            .plan-members-count {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 10.5px;
                font-weight: 700;
            }

            .plan-status {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
                background: #e9f8f0;
                color: #168653;
            }

            .plan-status.inactive {
                background: #f2f4f7;
                color: #69717e;
            }

            .plan-actions-cell {
                white-space: nowrap;
            }

            .plan-action {
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

            .plan-action:hover {
                background: #f4f6f9;
                border-color: #cbd2dc;
            }

            .plan-action.toggle {
                background: #fff8eb;
                border-color: #f5deb3;
                color: #b8740e;
            }

            .plan-action.toggle:hover {
                background: #d97706;
                border-color: #d97706;
                color: #ffffff;
            }

            .plan-action.delete {
                background: #fff0f0;
                border-color: #f5c6c8;
                color: #d71920;
            }

            .plan-action.delete:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .plans-empty {
                text-align: center;
                padding: 38px 15px;
                color: #8a909a;
                font-size: 12px;
            }

            /* MODAL */
            .plans-modal {
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

            .plans-modal-box {
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

            .plans-modal-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                padding-bottom: 14px;
                margin-bottom: 14px;
                border-bottom: 1px solid #edf0f3;
            }

            .plans-modal-header h3 {
                margin: 0 0 4px;
                font-size: 17px;
                font-weight: 800;
                color: #202124;
            }

            .plans-modal-subtitle {
                color: #737985;
                font-size: 11.5px;
                margin: 0;
            }

            .plans-modal-close {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: 1px solid #e7e9ee;
                background: #f8f9fb;
                color: #69717e;
                font-size: 16px;
                display: grid;
                place-items: center;
                flex-shrink: 0;
            }

            .plans-modal-close:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }

            .plans-form label {
                display: block;
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
                margin: 14px 0 6px;
            }

            .plans-form input,
            .plans-form select,
            .plans-form textarea {
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

            .plans-form input:focus,
            .plans-form select:focus,
            .plans-form textarea:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .plans-form textarea {
                min-height: 80px;
                resize: vertical;
            }

            .plans-duration-box {
                padding: 12px 14px;
                margin-top: 10px;
                border-radius: 10px;
                background: #f8f9fb;
                border: 1px solid #e7e9ee;
            }

            .plans-duration-box label {
                margin-top: 0;
            }

            .plans-preview {
                margin-top: 15px;
                padding: 13px 15px;
                border-radius: 10px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                color: #303640;
                line-height: 1.75;
                font-size: 12px;
            }

            .plans-form-actions {
                display: flex;
                gap: 12px;
                margin-top: 22px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }

            .plans-form-actions button {
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

            .plans-form-actions button:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }

            .plans-form-actions .cancel {
                background: #f3f4f6;
                color: #454c57;
                border: 1px solid #dfe2e8;
                box-shadow: none;
            }

            .plans-form-actions .cancel:hover {
                background: #e7e9ee;
            }

            @media(max-width:650px) {
                .plans-stats {
                    grid-template-columns: 1fr;
                }

                .plans-header .btn {
                    width: 100%;
                }

                .plans-modal-box {
                    padding: 18px;
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
                        <h2>Membership Packages & Plans</h2>
                        <p>Create, customize and manage gym membership tiers and pricing.</p>
                    </div>

                    <button class="btn btn-primary" id="addGymPlanBtn">
                        + Add New Plan
                    </button>
                </div>

                <div class="plans-stats">

                    <div class="plans-stat">
                        <div class="plans-stat-top">
                            <span>Total Plans</span>
                            <div class="plans-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="totalGymPlans">0</strong>
                    </div>

                    <div class="plans-stat">
                        <div class="plans-stat-top">
                            <span>Active Plans</span>
                            <div class="plans-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="activeGymPlans">0</strong>
                    </div>

                    <div class="plans-stat">
                        <div class="plans-stat-top">
                            <span>Inactive Plans</span>
                            <div class="plans-stat-dot" style="background:#8a909a;"></div>
                        </div>
                        <strong id="inactiveGymPlans">0</strong>
                    </div>

                </div>

                <div class="plans-panel">
                    <div class="plans-toolbar">

                        <input
                            type="search"
                            id="searchGymPlans"
                            placeholder="Search membership plan by name..."
                        >

                        <select id="filterGymPlans">
                            <option value="all">All Plans</option>
                            <option value="active">Active Plans Only</option>
                            <option value="inactive">Inactive Plans Only</option>
                        </select>

                    </div>

                    <div class="plans-table-wrap">

                        <table class="plans-table">

                            <thead>
                                <tr>
                                    <th>Plan Name</th>
                                    <th>Duration</th>
                                    <th>Fees</th>
                                    <th>Enrolled</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody id="gymPlansTable"></tbody>

                        </table>

                    </div>
                </div>

            </div>

            <div class="plans-modal" id="gymPlanModal">

                <div class="plans-modal-box">

                    <div class="plans-modal-header">
                        <div>
                            <h3 id="gymPlanFormTitle">Add Membership Plan</h3>
                            <p class="plans-modal-subtitle">
                                Configure membership duration and pricing.
                            </p>
                        </div>
                        <button type="button" class="plans-modal-close" id="closeGymPlanX" aria-label="Close">✕</button>
                    </div>

                    <form class="plans-form" id="gymPlanForm">

                        <input type="hidden" id="gymPlanId">

                        <label>Plan Name *</label>

                        <input
                            type="text"
                            id="gymPlanName"
                            placeholder="Example: Monthly Premium / Quarterly Pro"
                            maxlength="60"
                            required
                        >

                        <label>Membership Duration *</label>

                        <select id="gymPlanDuration" required>
                            <option value="1">Daily Pass - 1 Day</option>
                            <option value="30">Monthly Plan - 30 Days</option>
                            <option value="90">Quarterly Plan - 90 Days</option>
                            <option value="180">Half-Yearly Plan - 180 Days</option>
                            <option value="365">Annual Plan - 365 Days</option>
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
                                placeholder="Enter number of days (e.g. 45)"
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
                            placeholder="Optional plan perks or details (e.g. Cardio + Strength + Locker)"
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

        document.getElementById("closeGymPlanX")
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
            <strong style="color:#d71920;">Plan Summary Preview</strong><br>
            <strong>Plan:</strong> ${escapeHTML(name)} &nbsp;•&nbsp;
            <strong>Duration:</strong> ${days} Days &nbsp;•&nbsp;
            <strong>Fees:</strong> ${currency(fees)}
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
                        <span class="plan-duration-pill">
                            ${getDurationLabel(plan.durationDays)}
                        </span>
                    </td>

                    <td>
                        <span class="plan-price">
                            ${currency(plan.fees)}
                        </span>
                    </td>

                    <td>
                        <span class="plan-members-count">
                            ${assignedMembers} Member${assignedMembers === 1 ? "" : "s"}
                        </span>
                    </td>

                    <td>
                        <span class="plan-status ${isActive ? "" : "inactive"}">
                            ${isActive ? "Active" : "Inactive"}
                        </span>
                    </td>

                    <td class="plan-actions-cell">

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

window.GymMembers = (function () {
    const MODULE = "members";

    let currentMembers = [];
    let editingMemberId = null;

    function getMembers() {
        return GymDB.getAll(MODULE) || [];
    }

    function getPlans() {
        return GymDB.getAll("plans") || [];
    }

    function getActivePlans() {
        return getPlans().filter(plan => plan.status === "active");
    }

    // ==========================================
    // MEMBER ID SERIAL SYSTEM
    // ==========================================

    function getMemberIdConfig() {
        const config = window.GymSettings?.getMemberIdConfig?.();

        return {
            prefix: String(config?.prefix || "GYM").trim().toUpperCase(),
            startSerial: Number(config?.startSerial) || 1001
        };
    }

    function getSavedCounters() {
        const settings = GymDB.getAll("settings") || [];

        const record = settings.find(
            item => item.key === "memberIdCounters"
        );

        return record && record.value && typeof record.value === "object"
            ? record.value
            : {};
    }

    function saveMemberCounter(counters) {
        const settings = GymDB.getAll("settings") || [];

        const index = settings.findIndex(
            item => item.key === "memberIdCounters"
        );

        const record = {
            key: "memberIdCounters",
            value: counters,
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            settings[index] = record;
        } else {
            settings.push(record);
        }

        GymDB.saveAll("settings", settings);
    }

    function generateMemberId() {
        const config = getMemberIdConfig();

        const prefix = config.prefix;
        const startSerial = config.startSerial;

        if (!/^[A-Z0-9]{2,12}$/.test(prefix)) {
            throw new Error("Invalid Member ID prefix.");
        }

        if (
            !Number.isSafeInteger(startSerial) ||
            startSerial < 1
        ) {
            throw new Error("Invalid starting serial number.");
        }

        const members = getMembers();
        const counters = getSavedCounters();

        const escapedPrefix = prefix.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const pattern = new RegExp(
            "^" + escapedPrefix + "-(\\d+)$"
        );

        let highestSerial = startSerial - 1;

        // Check existing member IDs.
        members.forEach(member => {
            const match = String(member.id || "").match(pattern);

            if (match) {
                const serial = Number(match[1]);

                if (Number.isSafeInteger(serial)) {
                    highestSerial = Math.max(
                        highestSerial,
                        serial
                    );
                }
            }
        });

        // Check previously generated serial counter.
        const savedCounter = Number(counters[prefix]);

        if (Number.isSafeInteger(savedCounter)) {
            highestSerial = Math.max(
                highestSerial,
                savedCounter
            );
        }

        let nextSerial = Math.max(
            startSerial,
            highestSerial + 1
        );

        if (!Number.isSafeInteger(nextSerial)) {
            throw new Error("Member ID serial limit reached.");
        }

        let newId = prefix + "-" + nextSerial;

        // Extra duplicate check.
        while (members.some(member => member.id === newId)) {
            nextSerial++;

            if (!Number.isSafeInteger(nextSerial)) {
                throw new Error("Member ID serial limit reached.");
            }

            newId = prefix + "-" + nextSerial;
        }

        // Save counter so deleted IDs are not reused.
        counters[prefix] = nextSerial;
        saveMemberCounter(counters);

        return {
            id: newId,
            serial: nextSerial,
            prefix: prefix
        };
    }

    // ==========================================
    // COMMON FUNCTIONS
    // ==========================================

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

    function today() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function calculateExpiry(joiningDate, durationDays) {
        if (!joiningDate || !durationDays) return "";

        const date = new Date(joiningDate + "T12:00:00");

        if (isNaN(date.getTime())) return "";

        date.setDate(date.getDate() + Number(durationDays) - 1);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function showMessage(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // ==========================================
    // STYLES
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymMembersStyles")) return;

        const style = document.createElement("style");
        style.id = "gymMembersStyles";

        style.textContent = `
            .members-wrap {
                padding: 5px 0 25px;
            }

            .members-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 22px;
            }

            .members-header h2 {
                margin: 0 0 6px;
            }

            .members-header p {
                margin: 0;
                opacity: .7;
            }

            .members-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 22px;
            }

            .members-stat {
                padding: 20px;
                border-radius: 14px;
                background: rgba(255,255,255,.05);
                border: 1px solid rgba(255,255,255,.08);
            }

            .members-stat span {
                display: block;
                opacity: .7;
                font-size: 13px;
                margin-bottom: 9px;
            }

            .members-stat strong {
                font-size: 25px;
            }

            .members-toolbar {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 18px;
            }

            .members-toolbar input,
            .members-toolbar select {
                padding: 12px 14px;
                border-radius: 9px;
                border: 1px solid rgba(255,255,255,.13);
                background: #171324;
                color: #fff;
                outline: none;
            }

            .members-toolbar input {
                flex: 1;
                min-width: 180px;
            }

            .members-toolbar select {
                min-width: 140px;
            }

            .members-table-wrap {
                overflow-x: auto;
                border-radius: 13px;
            }

            .members-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 850px;
            }

            .members-table th,
            .members-table td {
                padding: 14px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,.08);
            }

            .members-table th {
                font-size: 12px;
                opacity: .7;
                text-transform: uppercase;
            }

            .members-table td {
                font-size: 13px;
            }

            .member-status {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 11px;
                background: rgba(46,204,113,.13);
                color: #6ee7a0;
            }

            .member-status.inactive {
                background: rgba(255,255,255,.1);
                color: #aaa;
            }

            .member-status.expired {
                background: rgba(231,76,60,.15);
                color: #ff8d8d;
            }

            .member-action {
                padding: 7px 10px;
                border: 0;
                border-radius: 7px;
                margin: 2px;
                cursor: pointer;
                color: white;
                background: #6845b8;
            }

            .member-action.delete {
                background: #a93650;
            }

            .member-action.toggle {
                background: #287c68;
            }

            .members-empty {
                text-align: center;
                padding: 35px 15px;
                opacity: .65;
            }

            .members-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 15px;
                background: rgba(0,0,0,.78);
            }

            .members-modal-box {
                width: 100%;
                max-width: 650px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 24px;
                border-radius: 16px;
                background: #211a32;
                border: 1px solid rgba(255,255,255,.12);
            }

            .members-modal-box h3 {
                margin-top: 0;
                margin-bottom: 20px;
            }

            .members-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0 15px;
            }

            .members-form label {
                display: block;
                font-size: 13px;
                margin: 13px 0 7px;
            }

            .members-form input,
            .members-form select,
            .members-form textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 12px 14px;
                border-radius: 9px;
                border: 1px solid rgba(255,255,255,.13);
                background: #171324;
                color: #fff;
                outline: none;
            }

            .members-form textarea {
                min-height: 75px;
                resize: vertical;
            }

            .members-full {
                grid-column: 1 / -1;
            }

            .members-plan-info {
                margin-top: 12px;
                padding: 12px;
                border-radius: 9px;
                background: rgba(128,85,217,.13);
                border: 1px solid rgba(128,85,217,.25);
                font-size: 12px;
                line-height: 1.7;
            }

            .members-plan-warning {
                color: #ffc56d;
                margin-top: 8px;
                font-size: 12px;
            }

            .members-form-actions {
                display: flex;
                gap: 10px;
                margin-top: 22px;
            }

            .members-form-actions button {
                flex: 1;
                padding: 12px;
                border: 0;
                border-radius: 9px;
                cursor: pointer;
                color: white;
                background: #8055d9;
                font-weight: 600;
            }

            .members-form-actions .cancel {
                background: #494253;
            }

            @media(max-width:650px) {
                .members-stats {
                    grid-template-columns: 1fr;
                }

                .members-form-grid {
                    grid-template-columns: 1fr;
                }

                .members-full {
                    grid-column: auto;
                }

                .members-header .btn {
                    width: 100%;
                }

                .members-modal-box {
                    padding: 18px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ==========================================
    // RENDER MEMBERS PAGE
    // ==========================================

    function render() {
        injectStyles();

        const container = document.getElementById("modulePlaceholder");
        if (!container) return;

        container.innerHTML = `
            <div class="members-wrap">

                <div class="members-header">
                    <div>
                        <h2>Gym Members</h2>
                        <p>Manage your gym members and memberships.</p>
                    </div>

                    <button class="btn btn-primary" id="addGymMemberBtn">
                        + Add New Member
                    </button>
                </div>

                <div class="members-stats">
                    <div class="members-stat">
                        <span>Total Members</span>
                        <strong id="membersTotal">0</strong>
                    </div>

                    <div class="members-stat">
                        <span>Active Members</span>
                        <strong id="membersActive">0</strong>
                    </div>

                    <div class="members-stat">
                        <span>Inactive Members</span>
                        <strong id="membersInactive">0</strong>
                    </div>
                </div>

                <div class="members-toolbar">
                    <input
                        type="search"
                        id="searchGymMembers"
                        placeholder="Search name, phone or member ID..."
                    >

                    <select id="filterGymMembers">
                        <option value="all">All Members</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                <div class="members-table-wrap">
                    <table class="members-table">
                        <thead>
                            <tr>
                                <th>Member</th>
                                <th>Phone</th>
                                <th>Membership Plan</th>
                                <th>Joining Date</th>
                                <th>Expiry Date</th>
                                <th>Fees</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody id="gymMembersTable"></tbody>
                    </table>
                </div>

            </div>

            <div class="members-modal" id="gymMemberModal">
                <div class="members-modal-box">
                    <h3 id="gymMemberFormTitle">Add New Member</h3>

                    <form class="members-form" id="gymMemberForm">

                        <div class="members-form-grid">

                            <div>
                                <label>Member Name *</label>
                                <input
                                    type="text"
                                    id="memberName"
                                    placeholder="Enter full name"
                                    required
                                >
                            </div>

                            <div>
                                <label>Phone Number *</label>
                                <input
                                    type="tel"
                                    id="memberPhone"
                                    placeholder="Enter phone number"
                                    required
                                >
                            </div>

                            <div>
                                <label>Gender</label>
                                <select id="memberGender">
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label>Date of Birth</label>
                                <input type="date" id="memberDob">
                            </div>

                            <div>
                                <label>Joining Date *</label>
                                <input type="date" id="memberJoiningDate" required>
                            </div>

                            <div>
                                <label>Membership Plan *</label>
                                <select id="memberPlan" required>
                                    <option value="">Loading plans...</option>
                                </select>
                            </div>

                            <div>
                                <label>Membership Fees (₹)</label>
                                <input
                                    type="number"
                                    id="memberFees"
                                    min="0"
                                    step="0.01"
                                    placeholder="Plan fees"
                                    required
                                >
                            </div>

                            <div>
                                <label>Expiry Date</label>
                                <input type="date" id="memberExpiry" required>
                            </div>

                            <div class="members-full">
                                <div class="members-plan-info" id="memberPlanInfo">
                                    Select a membership plan to see its details.
                                </div>
                                <div class="members-plan-warning" id="memberPlanWarning"></div>
                            </div>

                            <div>
                                <label>Emergency Contact</label>
                                <input
                                    type="tel"
                                    id="memberEmergency"
                                    placeholder="Emergency phone number"
                                >
                            </div>

                            <div>
                                <label>Trainer Name</label>
                                <input
                                    type="text"
                                    id="memberTrainer"
                                    placeholder="Enter trainer name"
                                >
                            </div>

                            <div class="members-full">
                                <label>Address</label>
                                <textarea
                                    id="memberAddress"
                                    placeholder="Enter member address"
                                ></textarea>
                            </div>

                            <div class="members-full">
                                <label>Notes</label>
                                <textarea
                                    id="memberNotes"
                                    placeholder="Additional information"
                                ></textarea>
                            </div>

                        </div>

                        <div class="members-form-actions">
                            <button type="submit">Save Member</button>

                            <button
                                type="button"
                                class="cancel"
                                id="cancelGymMember"
                            >
                                Cancel
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        `;

        document.getElementById("addGymMemberBtn")
            .addEventListener("click", function () {
                openForm();
            });

        document.getElementById("cancelGymMember")
            .addEventListener("click", closeForm);

        document.getElementById("gymMemberForm")
            .addEventListener("submit", saveMember);

        document.getElementById("searchGymMembers")
            .addEventListener("input", renderTable);

        document.getElementById("filterGymMembers")
            .addEventListener("change", renderTable);

        document.getElementById("memberPlan")
            .addEventListener("change", handlePlanChange);

        document.getElementById("memberJoiningDate")
            .addEventListener("change", handleJoiningDateChange);

        renderTable();
    }

    // ==========================================
    // PLAN DROPDOWN
    // ==========================================

    function fillPlanDropdown(member) {
        const select = document.getElementById("memberPlan");
        const info = document.getElementById("memberPlanInfo");
        const warning = document.getElementById("memberPlanWarning");

        if (!select) return;

        const plans = getActivePlans();

        let html = `<option value="">Select Membership Plan</option>`;

        plans.forEach(plan => {
            html += `
                <option value="${escapeHTML(plan.id)}">
                    ${escapeHTML(plan.name)} - ${currency(plan.fees)}
                    (${Number(plan.durationDays || 0)} Days)
                </option>
            `;
        });

        let legacyPlan = null;

        if (member && member.planName) {
            const matchingPlan = plans.find(plan =>
                plan.id === member.planId ||
                plan.name.toLowerCase() === String(member.planName).toLowerCase()
            );

            if (!matchingPlan) {
                legacyPlan = member;

                html += `
                    <option value="__legacy__">
                        Existing Plan - ${escapeHTML(member.planName)}
                    </option>
                `;
            }
        }

        select.innerHTML = html;

        if (member) {
            const matchingPlan = plans.find(plan =>
                plan.id === member.planId ||
                (
                    !member.planId &&
                    plan.name.toLowerCase() === String(member.planName || "").toLowerCase()
                )
            );

            if (matchingPlan) {
                select.value = matchingPlan.id;
                updatePlanInformation(matchingPlan);

            } else if (legacyPlan) {
                select.value = "__legacy__";

                info.textContent =
                    "This member has an existing custom or inactive plan. Its saved details will be preserved.";

                warning.textContent =
                    "Choose another active plan if you want to change this membership.";

            } else {
                select.value = "";
            }

        } else {
            select.value = "";

            if (!plans.length) {
                info.textContent = "No active membership plans found.";
                warning.textContent =
                    "Please create an active plan in Membership Plans first.";

            } else {
                info.textContent =
                    "Select a plan to automatically fill fees and expiry date.";

                warning.textContent = "";
            }
        }
    }

    function updatePlanInformation(plan) {
        const info = document.getElementById("memberPlanInfo");
        const warning = document.getElementById("memberPlanWarning");

        if (!info || !plan) return;

        info.innerHTML = `
            <strong>Selected Plan:</strong> ${escapeHTML(plan.name)}
            <br>
            <strong>Duration:</strong> ${Number(plan.durationDays || 0)} Days
            <br>
            <strong>Plan Fees:</strong> ${currency(plan.fees)}
        `;

        if (warning) warning.textContent = "";
    }

    function handlePlanChange() {
        const select = document.getElementById("memberPlan");
        const planId = select.value;

        if (!planId) return;

        if (planId === "__legacy__") {
            return;
        }

        const plan = GymDB.find("plans", planId);

        if (!plan) return;

        document.getElementById("memberFees").value =
            Number(plan.fees || 0);

        const joiningDate =
            document.getElementById("memberJoiningDate").value;

        document.getElementById("memberExpiry").value =
            calculateExpiry(joiningDate, plan.durationDays);

        updatePlanInformation(plan);
    }

    function handleJoiningDateChange() {
        const planId = document.getElementById("memberPlan").value;

        if (!planId || planId === "__legacy__") return;

        const plan = GymDB.find("plans", planId);

        if (!plan) return;

        document.getElementById("memberExpiry").value =
            calculateExpiry(
                document.getElementById("memberJoiningDate").value,
                plan.durationDays
            );
    }

    // ==========================================
    // OPEN / CLOSE MEMBER FORM
    // ==========================================

    function openForm(member) {
        const modal = document.getElementById("gymMemberModal");
        const form = document.getElementById("gymMemberForm");

        if (!modal || !form) return;

        form.reset();

        editingMemberId = member ? member.id : null;

        document.getElementById("gymMemberFormTitle").textContent =
            member ? "Edit Member" : "Add New Member";

        document.getElementById("memberJoiningDate").value =
            member?.joiningDate || today();

        fillPlanDropdown(member);

        if (member) {
            document.getElementById("memberName").value =
                member.name || "";

            document.getElementById("memberPhone").value =
                member.phone || "";

            document.getElementById("memberGender").value =
                member.gender || "";

            document.getElementById("memberDob").value =
                member.dob || "";

            document.getElementById("memberFees").value =
                member.fees ?? "";

            document.getElementById("memberExpiry").value =
                member.expiryDate || "";

            document.getElementById("memberEmergency").value =
                member.emergencyContact || "";

            document.getElementById("memberTrainer").value =
                member.trainer || "";

            document.getElementById("memberAddress").value =
                member.address || "";

            document.getElementById("memberNotes").value =
                member.notes || "";

            const selectedPlan =
                document.getElementById("memberPlan").value;

            if (selectedPlan && selectedPlan !== "__legacy__") {
                const plan = GymDB.find("plans", selectedPlan);

                if (plan) updatePlanInformation(plan);
            }
        }

        modal.style.display = "flex";
    }

    function closeForm() {
        const modal = document.getElementById("gymMemberModal");

        if (modal) modal.style.display = "none";

        editingMemberId = null;
    }

    // ==========================================
    // SAVE MEMBER
    // ==========================================

    function saveMember(event) {
        event.preventDefault();

        const name =
            document.getElementById("memberName").value.trim();

        const phone =
            document.getElementById("memberPhone").value.trim();

        const joiningDate =
            document.getElementById("memberJoiningDate").value;

        const selectedPlanId =
            document.getElementById("memberPlan").value;

        if (!name || !phone || !joiningDate || !selectedPlanId) {
            alert(
                "Please fill all required fields and select a membership plan."
            );
            return;
        }

        if (joiningDate > today()) {
            alert("Joining date cannot be in the future.");
            return;
        }

        let planName = "";
        let planId = "";
        let durationDays = null;

        let fees = Number(
            document.getElementById("memberFees").value || 0
        );

        let expiryDate =
            document.getElementById("memberExpiry").value;

        if (selectedPlanId === "__legacy__") {
            const oldMember = GymDB.find(MODULE, editingMemberId);

            if (!oldMember) {
                alert("Please select an active membership plan.");
                return;
            }

            planName = oldMember.planName || "";
            planId = oldMember.planId || "";
            durationDays = oldMember.durationDays || null;

        } else {
            const plan = GymDB.find("plans", selectedPlanId);

            if (!plan || plan.status !== "active") {
                alert(
                    "Selected plan is not active. Please select another plan."
                );
                return;
            }

            planName = plan.name;
            planId = plan.id;
            durationDays = Number(plan.durationDays || 0);

            fees = Number(plan.fees || 0);

            expiryDate = calculateExpiry(
                joiningDate,
                durationDays
            );
        }

        if (!Number.isFinite(fees) || fees < 0) {
            alert("Please enter valid membership fees.");
            return;
        }

        if (!expiryDate) {
            alert("Please select a valid membership expiry date.");
            return;
        }

        if (expiryDate < joiningDate) {
            alert("Expiry date cannot be before joining date.");
            return;
        }

        const existing = editingMemberId
            ? GymDB.find(MODULE, editingMemberId)
            : null;

        const memberData = {
            ...(existing || {}),

            name: name,
            phone: phone,

            gender: document.getElementById("memberGender").value,
            dob: document.getElementById("memberDob").value,

            joiningDate: joiningDate,

            planId: planId,
            planName: planName,
            durationDays: durationDays,

            fees: fees,
            expiryDate: expiryDate,

            emergencyContact:
                document.getElementById("memberEmergency").value.trim(),

            trainer:
                document.getElementById("memberTrainer").value.trim(),

            address:
                document.getElementById("memberAddress").value.trim(),

            notes:
                document.getElementById("memberNotes").value.trim(),

            status: existing ? existing.status : "active",
            updatedAt: new Date().toISOString()
        };

        const wasEditing = Boolean(editingMemberId && existing);

        if (wasEditing) {
            // Existing member ID remains unchanged.
            GymDB.update(MODULE, editingMemberId, memberData);

        } else {
            try {
                const generated = generateMemberId();

                memberData.id = generated.id;
                memberData.memberSerial = generated.serial;
                memberData.memberIdPrefix = generated.prefix;

                memberData.createdAt = new Date().toISOString();

                GymDB.add(MODULE, memberData);

            } catch (error) {
                console.error("Member ID generation error:", error);

                alert(
                    "Member ID generate nahi ho payi. Please try again."
                );

                return;
            }
        }

        closeForm();
        renderTable();

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }

        showMessage(
            wasEditing
                ? "Member updated successfully."
                : "Member added successfully."
        );
    }

    // ==========================================
    // MEMBER STATUS
    // ==========================================

    function getMemberStatus(member) {
        if (member.status === "inactive") return "inactive";

        if (member.expiryDate && member.expiryDate < today()) {
            return "expired";
        }

        return "active";
    }

    // ==========================================
    // RENDER MEMBER TABLE
    // ==========================================

    function renderTable() {
        const table = document.getElementById("gymMembersTable");

        if (!table) return;

        currentMembers = getMembers();

        const search = (
            document.getElementById("searchGymMembers")?.value || ""
        ).toLowerCase();

        const filter =
            document.getElementById("filterGymMembers")?.value || "all";

        const active = currentMembers.filter(member =>
            getMemberStatus(member) === "active"
        );

        const inactive = currentMembers.filter(member =>
            getMemberStatus(member) !== "active"
        );

        document.getElementById("membersTotal").textContent =
            currentMembers.length;

        document.getElementById("membersActive").textContent =
            active.length;

        document.getElementById("membersInactive").textContent =
            inactive.length;

        const filtered = currentMembers.filter(member => {
            const status = getMemberStatus(member);

            const matchesSearch =
                String(member.name || "").toLowerCase().includes(search) ||
                String(member.phone || "").toLowerCase().includes(search) ||
                String(member.id || "").toLowerCase().includes(search) ||
                String(member.planName || "").toLowerCase().includes(search);

            const matchesFilter =
                filter === "all" ||
                filter === status;

            return matchesSearch && matchesFilter;
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="members-empty">
                        No members found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(member => {
            const status = getMemberStatus(member);

            const statusText =
                status === "active" ? "Active" :
                status === "expired" ? "Expired" :
                "Inactive";

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(member.name)}</strong>
                        <br>
                        <small>${escapeHTML(member.id || "")}</small>
                    </td>

                    <td>${escapeHTML(member.phone || "")}</td>

                    <td>${escapeHTML(member.planName || "Not Assigned")}</td>

                    <td>${escapeHTML(member.joiningDate || "-")}</td>

                    <td>${escapeHTML(member.expiryDate || "-")}</td>

                    <td><strong>${currency(member.fees)}</strong></td>

                    <td>
                        <span class="member-status ${status}">
                            ${statusText}
                        </span>
                    </td>

                    <td>
                        <button
                            class="member-action"
                            data-edit-member="${escapeHTML(member.id)}"
                        >
                            Edit
                        </button>

                        <button
                            class="member-action toggle"
                            data-toggle-member="${escapeHTML(member.id)}"
                        >
                            ${member.status === "inactive" ? "Activate" : "Deactivate"}
                        </button>

                        <button
                            class="member-action delete"
                            data-delete-member="${escapeHTML(member.id)}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        table.querySelectorAll("[data-edit-member]").forEach(button => {
            button.addEventListener("click", function () {
                const member = GymDB.find(
                    MODULE,
                    this.dataset.editMember
                );

                if (member) openForm(member);
            });
        });

        table.querySelectorAll("[data-toggle-member]").forEach(button => {
            button.addEventListener("click", function () {
                toggleMember(this.dataset.toggleMember);
            });
        });

        table.querySelectorAll("[data-delete-member]").forEach(button => {
            button.addEventListener("click", function () {
                deleteMember(this.dataset.deleteMember);
            });
        });
    }

    // ==========================================
    // ACTIVATE / DEACTIVATE
    // ==========================================

    function toggleMember(id) {
        const member = GymDB.find(MODULE, id);

        if (!member) return;

        const newStatus =
            member.status === "inactive" ? "active" : "inactive";

        if (!confirm(
            newStatus === "inactive"
                ? "Are you sure you want to deactivate this member?"
                : "Do you want to activate this member?"
        )) {
            return;
        }

        GymDB.update(MODULE, id, {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        renderTable();

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }

        showMessage("Member status updated.");
    }

    // ==========================================
    // DELETE MEMBER
    // ==========================================

    function deleteMember(id) {
        const member = GymDB.find(MODULE, id);

        if (!member) return;

        if (!confirm(
            "Are you sure you want to delete " +
            member.name +
            "? This action cannot be undone."
        )) {
            return;
        }

        GymDB.delete(MODULE, id);

        renderTable();

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }

        showMessage("Member deleted successfully.");
    }

    // ==========================================
    // PUBLIC FUNCTIONS
    // ==========================================

    return {
        render: render,
        refresh: renderTable
    };
})();

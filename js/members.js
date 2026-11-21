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

    function getActiveTrainers() {
        return (GymDB.getAll("trainers") || []).filter(
            trainer => trainer.status === "active"
        );
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

        while (members.some(member => member.id === newId)) {
            nextSerial++;

            if (!Number.isSafeInteger(nextSerial)) {
                throw new Error("Member ID serial limit reached.");
            }

            newId = prefix + "-" + nextSerial;
        }

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
    // WHATSAPP MEMBER DETAILS
    // ==========================================

    function sendMemberWhatsApp(memberId) {
        const member = GymDB.find(MODULE, memberId);

        if (!member) {
            alert("Member not found.");
            return;
        }

        let phone = String(member.phone || "").replace(/\D/g, "");

        // Indian mobile number support
        if (phone.length === 10) {
            phone = "91" + phone;
        } else if (phone.length !== 12 || !phone.startsWith("91")) {
            alert("Please check the member's phone number.");
            return;
        }

        const status = getMemberStatus(member);

        const message = [
            "Hello " + (member.name || "Member") + "!",
            "",
            "Your Gym Membership Details:",
            "Member ID: " + (member.id || "-"),
            "Name: " + (member.name || "-"),
            "Phone: " + (member.phone || "-"),
            "Plan: " + (member.planName || "-"),
            "Trainer: " + (member.trainer || "Not Assigned"),
            "Joining Date: " + (member.joiningDate || "-"),
            "Expiry Date: " + (member.expiryDate || "-"),
            "Membership Fees: " + currency(member.fees),
            "Status: " + status.toUpperCase(),
            "",
            "Thank you for being a member!"
        ].join("\n");

        const whatsappURL =
            "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);

        window.open(whatsappURL, "_blank");
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymMembersStyles")) return;

        const style = document.createElement("style");
        style.id = "gymMembersStyles";

        style.textContent = `
            .members-wrap {
                padding: 2px 0 25px;
            }

            .members-header {
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

            .members-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .members-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .members-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }

            .members-stat {
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .members-stat:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .members-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .members-stat span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .members-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .members-stat strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .members-panel {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .members-toolbar {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 18px;
            }

            .members-toolbar input,
            .members-toolbar select {
                padding: 11px 14px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
                transition: all 0.2s ease;
            }

            .members-toolbar input:focus,
            .members-toolbar select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .members-toolbar input {
                flex: 1;
                min-width: 210px;
            }

            .members-toolbar select {
                min-width: 160px;
                font-weight: 600;
            }

            .members-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .members-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 960px;
                background: #ffffff;
            }

            .members-table th,
            .members-table td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
            }

            .members-table th {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                background: #f8f9fb;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .members-table td {
                font-size: 11.5px;
                color: #454c57;
                vertical-align: middle;
            }

            .members-table tbody tr:hover {
                background: #fffafa;
            }

            .member-id-pill {
                display: inline-block;
                margin-top: 4px;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }

            .member-trainer-tag {
                display: inline-block;
                margin-top: 4px;
                margin-left: 4px;
                padding: 2px 7px;
                border-radius: 5px;
                background: #fff5f5;
                color: #d71920;
                font-size: 10px;
                font-weight: 600;
            }

            .member-plan-pill {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 6px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 10.5px;
                font-weight: 600;
            }

            .member-status {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
                background: #e9f8f0;
                color: #168653;
            }

            .member-status.inactive {
                background: #f2f4f7;
                color: #69717e;
            }

            .member-status.expired {
                background: #fff0f0;
                color: #d71920;
            }

            .member-actions-cell {
                white-space: nowrap;
            }

            .member-action {
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

            .member-action:hover {
                background: #f4f6f9;
                border-color: #cbd2dc;
            }

            .member-action.renew {
                background: #edf5ff;
                border-color: #c5defc;
                color: #2879d0;
            }

            .member-action.renew:hover {
                background: #2879d0;
                border-color: #2879d0;
                color: #ffffff;
            }

            .member-action.whatsapp {
                background: #e9f8f0;
                border-color: #bfe7d1;
                color: #168653;
            }

            .member-action.whatsapp:hover {
                background: #168653;
                border-color: #168653;
                color: #ffffff;
            }

            .member-action.toggle {
                background: #fff8eb;
                border-color: #f5deb3;
                color: #b8740e;
            }

            .member-action.toggle:hover {
                background: #d97706;
                border-color: #d97706;
                color: #ffffff;
            }

            .member-action.delete {
                background: #fff0f0;
                border-color: #f5c6c8;
                color: #d71920;
            }

            .member-action.delete:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .members-empty {
                text-align: center;
                padding: 35px 15px;
                color: #8a909a;
                font-size: 12px;
            }

            /* MODAL */
            .members-modal {
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

            .members-modal-box {
                width: 100%;
                max-width: 680px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 26px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
            }

            .members-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 16px;
                border-bottom: 1px solid #edf0f3;
            }

            .members-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 800;
                color: #202124;
            }

            .members-modal-close {
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

            .members-modal-close:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }

            .members-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0 16px;
            }

            .members-form label {
                display: block;
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
                margin: 13px 0 6px;
            }

            .members-form input,
            .members-form select,
            .members-form textarea {
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

            .members-form input:focus,
            .members-form select:focus,
            .members-form textarea:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .members-form textarea {
                min-height: 72px;
                resize: vertical;
            }

            .members-full {
                grid-column: 1 / -1;
            }

            .members-plan-info {
                margin-top: 14px;
                padding: 13px 15px;
                border-radius: 10px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                color: #303640;
                font-size: 12px;
                line-height: 1.75;
            }

            .members-plan-warning {
                color: #d97706;
                font-weight: 600;
                margin-top: 8px;
                font-size: 11.5px;
            }

            .members-form-actions {
                display: flex;
                gap: 12px;
                margin-top: 22px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }

            .members-form-actions button {
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

            .members-form-actions button:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }

            .members-form-actions .cancel {
                background: #f3f4f6;
                color: #454c57;
                border: 1px solid #dfe2e8;
                box-shadow: none;
            }

            .members-form-actions .cancel:hover {
                background: #e7e9ee;
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
                        <h2>Gym Members Directory</h2>
                        <p>Add, edit, renew memberships and assign trainers.</p>
                    </div>

                    <button class="btn btn-primary" id="addGymMemberBtn">
                        + Add New Member
                    </button>
                </div>

                <div class="members-stats">
                    <div class="members-stat">
                        <div class="members-stat-top">
                            <span>Total Registered</span>
                            <div class="members-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="membersTotal">0</strong>
                    </div>

                    <div class="members-stat">
                        <div class="members-stat-top">
                            <span>Active Members</span>
                            <div class="members-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="membersActive">0</strong>
                    </div>

                    <div class="members-stat">
                        <div class="members-stat-top">
                            <span>Inactive / Expired</span>
                            <div class="members-stat-dot" style="background:#8a909a;"></div>
                        </div>
                        <strong id="membersInactive">0</strong>
                    </div>
                </div>

                <div class="members-panel">
                    <div class="members-toolbar">
                        <input
                            type="search"
                            id="searchGymMembers"
                            placeholder="Search by member name, phone, trainer, plan or ID..."
                        >

                        <select id="filterGymMembers">
                            <option value="all">All Members</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                            <option value="expired">Expired Only</option>
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

            </div>

            <!-- ADD / EDIT MEMBER MODAL -->
            <div class="members-modal" id="gymMemberModal">
                <div class="members-modal-box">
                    <div class="members-modal-header">
                        <h3 id="gymMemberFormTitle">Add New Member</h3>
                        <button type="button" class="members-modal-close" id="closeGymMemberX" aria-label="Close">✕</button>
                    </div>

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
                                    placeholder="Enter 10-digit phone number"
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
                                <label>Assign Trainer</label>
                                <select id="memberTrainer">
                                    <option value="">No Trainer Assigned</option>
                                </select>
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

            <!-- RENEW MEMBERSHIP MODAL -->
            <div class="members-modal" id="renewMemberModal">
                <div class="members-modal-box" style="max-width:480px;">
                    <div class="members-modal-header">
                        <h3>Renew Membership</h3>
                        <button type="button" class="members-modal-close" id="closeRenewX" aria-label="Close">✕</button>
                    </div>

                    <form class="members-form" id="renewMemberForm">
                        <input type="hidden" id="renewMemberId">

                        <div class="members-plan-info" id="renewMemberSummary"></div>

                        <label>Select Renewal Plan *</label>
                        <select id="renewPlanSelect" required></select>

                        <label>New Cycle Start Date *</label>
                        <input type="date" id="renewStartDate" required>

                        <label>New Expiry Date *</label>
                        <input type="date" id="renewExpiryDate" required>

                        <label>Renewal Fees (₹) *</label>
                        <input type="number" id="renewFeesInput" min="0" step="0.01" required>

                        <div class="members-plan-warning" style="color:#5f6672;font-weight:500;">
                            After renewal, the new plan fee will automatically appear in <strong>Fees &amp; Payments</strong> for collection.
                        </div>

                        <div class="members-form-actions">
                            <button type="submit">Confirm Renewal</button>
                            <button type="button" class="cancel" id="cancelRenewBtn">Cancel</button>
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

        document.getElementById("closeGymMemberX")
            .addEventListener("click", closeForm);

        document.getElementById("gymMemberForm")
            .addEventListener("submit", saveMember);

        document.getElementById("closeRenewX")
            .addEventListener("click", closeRenewModal);

        document.getElementById("cancelRenewBtn")
            .addEventListener("click", closeRenewModal);

        document.getElementById("renewMemberForm")
            .addEventListener("submit", saveRenewal);

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
    // TRAINER DROPDOWN
    // ==========================================

    function fillTrainerDropdown(selectedTrainer) {
        const select = document.getElementById("memberTrainer");
        if (!select) return;

        const trainers = getActiveTrainers();

        let html = `<option value="">No Trainer Assigned</option>`;

        trainers.forEach(trainer => {
            const spec = trainer.specialization
                ? ` (${escapeHTML(trainer.specialization)})`
                : "";
            html += `
                <option value="${escapeHTML(trainer.name)}">
                    ${escapeHTML(trainer.name)}${spec}
                </option>
            `;
        });

        if (
            selectedTrainer &&
            !trainers.some(t => t.name === selectedTrainer)
        ) {
            html += `
                <option value="${escapeHTML(selectedTrainer)}">
                    ${escapeHTML(selectedTrainer)}
                </option>
            `;
        }

        select.innerHTML = html;
        select.value = selectedTrainer || "";
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
            &nbsp;•&nbsp;
            <strong>Duration:</strong> ${Number(plan.durationDays || 0)} Days
            &nbsp;•&nbsp;
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
            member ? "Edit Member Details" : "Add New Member";

        document.getElementById("memberJoiningDate").value =
            member?.joiningDate || today();

        fillPlanDropdown(member);
        fillTrainerDropdown(member?.trainer || "");

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
    // RENEW MEMBERSHIP MODAL & LOGIC
    // ==========================================

    function openRenewModal(memberId) {
        const member = GymDB.find(MODULE, memberId);
        if (!member) return;

        const plans = getActivePlans();
        if (!plans.length) {
            alert("Please create an active membership plan first.");
            return;
        }

        document.getElementById("renewMemberId").value = member.id;

        document.getElementById("renewMemberSummary").innerHTML = `
            <strong style="font-size:13.5px;color:#202124;">${escapeHTML(member.name)}</strong>
            &nbsp;<span class="member-id-pill">${escapeHTML(member.id)}</span><br>
            Current Plan: <strong>${escapeHTML(member.planName || "-")}</strong>
            &nbsp;•&nbsp;
            Current Expiry: <strong>${escapeHTML(member.expiryDate || "-")}</strong>
        `;

        const select = document.getElementById("renewPlanSelect");
        select.innerHTML = plans.map(plan => `
            <option value="${escapeHTML(plan.id)}">
                ${escapeHTML(plan.name)} - ${currency(plan.fees)} (${Number(plan.durationDays || 0)} Days)
            </option>
        `).join("");

        let startDate = today();
        if (member.expiryDate && member.expiryDate >= today()) {
            const nextDay = new Date(member.expiryDate + "T12:00:00");
            if (!isNaN(nextDay.getTime())) {
                nextDay.setDate(nextDay.getDate() + 1);
                startDate = [
                    nextDay.getFullYear(),
                    String(nextDay.getMonth() + 1).padStart(2, "0"),
                    String(nextDay.getDate()).padStart(2, "0")
                ].join("-");
            }
        }

        document.getElementById("renewStartDate").value = startDate;

        if (member.planId && plans.some(p => p.id === member.planId)) {
            select.value = member.planId;
        }

        const updateRenewFields = () => {
            const plan = GymDB.find("plans", select.value);
            if (!plan) return;

            document.getElementById("renewFeesInput").value = Number(plan.fees || 0);
            document.getElementById("renewExpiryDate").value = calculateExpiry(
                document.getElementById("renewStartDate").value,
                plan.durationDays
            );
        };

        select.onchange = updateRenewFields;
        document.getElementById("renewStartDate").onchange = updateRenewFields;
        updateRenewFields();

        document.getElementById("renewMemberModal").style.display = "flex";
    }

    function closeRenewModal() {
        const modal = document.getElementById("renewMemberModal");
        if (modal) modal.style.display = "none";
    }

    function saveRenewal(event) {
        event.preventDefault();

        const memberId = document.getElementById("renewMemberId").value;
        const member = GymDB.find(MODULE, memberId);
        const plan = GymDB.find("plans", document.getElementById("renewPlanSelect").value);

        if (!member || !plan) {
            alert("Please select a valid membership plan.");
            return;
        }

        const startDate = document.getElementById("renewStartDate").value;
        const expiryDate = document.getElementById("renewExpiryDate").value;
        const renewalFees = Number(document.getElementById("renewFeesInput").value || 0);

        if (!startDate || !expiryDate || expiryDate < startDate) {
            alert("Please enter valid renewal start and expiry dates.");
            return;
        }

        if (!Number.isFinite(renewalFees) || renewalFees < 0) {
            alert("Please enter valid renewal fees.");
            return;
        }

        const renewalHistory = Array.isArray(member.renewals) ? member.renewals.slice() : [];
        const nowIso = new Date().toISOString();

        renewalHistory.push({
            id: "REN-" + Date.now(),
            planId: plan.id,
            planName: plan.name,
            startDate: startDate,
            expiryDate: expiryDate,
            fees: renewalFees,
            renewedAt: nowIso
        });

        GymDB.update(MODULE, member.id, {
            planId: plan.id,
            planName: plan.name,
            durationDays: Number(plan.durationDays || 0),
            joiningDate: startDate,
            expiryDate: expiryDate,
            fees: renewalFees,
            billingFinalFees: null,
            billingOriginalFees: null,
            billingDiscountAmount: null,
            billingDiscountName: "",
            billingDiscountReason: "",
            billingDiscountId: "",
            renewals: renewalHistory,
            status: "active",
            updatedAt: nowIso
        });

        closeRenewModal();
        renderTable();

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }

        showMessage("Membership renewed! Collect " + currency(renewalFees) + " in Fees & Payments.");

        if (
            confirm("Membership renewed for " + member.name + " (" + currency(renewalFees) + " due).\nOpen Fees & Payments now to collect payment?") &&
            typeof window.openGymPage === "function"
        ) {
            window.openGymPage("payments");
        }
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
                String(member.planName || "").toLowerCase().includes(search) ||
                String(member.trainer || "").toLowerCase().includes(search);

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
                        <strong style="color:#202124;">${escapeHTML(member.name)}</strong>
                        <br>
                        <span class="member-id-pill">${escapeHTML(member.id || "")}</span>
                        ${member.trainer
                            ? `<span class="member-trainer-tag">Trainer: ${escapeHTML(member.trainer)}</span>`
                            : ""}
                    </td>

                    <td>${escapeHTML(member.phone || "")}</td>

                    <td>
                        <span class="member-plan-pill">${escapeHTML(member.planName || "Not Assigned")}</span>
                    </td>

                    <td>${escapeHTML(member.joiningDate || "-")}</td>

                    <td>${escapeHTML(member.expiryDate || "-")}</td>

                    <td><strong style="color:#202124;">${currency(member.fees)}</strong></td>

                    <td>
                        <span class="member-status ${status}">
                            ${statusText}
                        </span>
                    </td>

                    <td class="member-actions-cell">
                        <button
                            class="member-action renew"
                            data-renew-member="${escapeHTML(member.id)}"
                        >
                            Renew
                        </button>

                        <button
                            class="member-action whatsapp"
                            data-whatsapp-member="${escapeHTML(member.id)}"
                        >
                            WhatsApp
                        </button>

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

        table.querySelectorAll("[data-renew-member]").forEach(button => {
            button.addEventListener("click", function () {
                openRenewModal(this.dataset.renewMember);
            });
        });

        table.querySelectorAll("[data-whatsapp-member]").forEach(button => {
            button.addEventListener("click", function () {
                sendMemberWhatsApp(this.dataset.whatsappMember);
            });
        });

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

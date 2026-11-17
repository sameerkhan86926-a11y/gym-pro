/* =====================================
   GYM PRO - MEMBERS MANAGEMENT
   Version 1.0.0
===================================== */

window.GymMembers = (function () {

    let searchText = "";
    let statusFilter = "all";

    function getMembers() {
        return GymDB.getAll("members");
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
        return new Date().toISOString().split("T")[0];
    }

    function money(amount) {
        return "₹" + Number(amount || 0).toLocaleString("en-IN");
    }

    function status(member) {

        if (member.status === "inactive") {
            return "inactive";
        }

        if (member.expiryDate && member.expiryDate < today()) {
            return "expired";
        }

        return "active";
    }

    function render() {

        const container = document.getElementById("modulePlaceholder");

        if (!container) return;

        container.innerHTML = `
            <div class="members-module">

                <div class="members-header">
                    <div>
                        <h2>Members Management</h2>
                        <p>Register and manage your gym members.</p>
                    </div>

                    <button class="gym-primary-btn" id="addMemberBtn">
                        + Add New Member
                    </button>
                </div>

                <div class="members-stats">

                    <div class="member-stat-card">
                        <span>Total Members</span>
                        <h2 id="memberTotal">0</h2>
                    </div>

                    <div class="member-stat-card">
                        <span>Active Members</span>
                        <h2 id="memberActive">0</h2>
                    </div>

                    <div class="member-stat-card">
                        <span>Inactive Members</span>
                        <h2 id="memberInactive">0</h2>
                    </div>

                </div>

                <div class="members-toolbar">

                    <input
                        type="search"
                        id="memberSearch"
                        placeholder="Search name, phone or member ID..."
                    >

                    <select id="memberStatusFilter">
                        <option value="all">All Members</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                    </select>

                </div>

                <div class="members-table-wrapper">

                    <table class="members-table">

                        <thead>
                            <tr>
                                <th>Member ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Plan</th>
                                <th>Joining Date</th>
                                <th>Expiry Date</th>
                                <th>Fees</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody id="membersTableBody"></tbody>

                    </table>

                </div>

                <div id="memberModal" class="member-modal" style="display:none;">

                    <div class="member-modal-content">

                        <div class="member-modal-header">
                            <h2 id="memberFormTitle">Add New Member</h2>
                            <button type="button" id="closeMemberModal">×</button>
                        </div>

                        <form id="memberForm">

                            <input type="hidden" id="memberEditId">

                            <div class="member-form-grid">

                                <div class="member-field">
                                    <label>Full Name *</label>
                                    <input type="text" id="memberName" required>
                                </div>

                                <div class="member-field">
                                    <label>Mobile Number *</label>
                                    <input type="tel" id="memberPhone"
                                        maxlength="10" pattern="[0-9]{10}" required>
                                </div>

                                <div class="member-field">
                                    <label>Gender</label>
                                    <select id="memberGender">
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div class="member-field">
                                    <label>Date of Birth</label>
                                    <input type="date" id="memberDOB">
                                </div>

                                <div class="member-field">
                                    <label>Joining Date *</label>
                                    <input type="date" id="memberJoining" required>
                                </div>

                                <div class="member-field">
                                    <label>Membership Plan</label>
                                    <input type="text" id="memberPlan"
                                        placeholder="Monthly / 3 Months / Yearly">
                                </div>

                                <div class="member-field">
                                    <label>Membership Fees (₹)</label>
                                    <input type="number" id="memberFees"
                                        min="0" step="0.01" value="0">
                                </div>

                                <div class="member-field">
                                    <label>Expiry Date</label>
                                    <input type="date" id="memberExpiry">
                                </div>

                                <div class="member-field">
                                    <label>Emergency Contact</label>
                                    <input type="tel" id="memberEmergency"
                                        maxlength="10">
                                </div>

                                <div class="member-field">
                                    <label>Trainer Name</label>
                                    <input type="text" id="memberTrainer">
                                </div>

                                <div class="member-field full-width">
                                    <label>Address</label>
                                    <textarea id="memberAddress" rows="2"></textarea>
                                </div>

                                <div class="member-field full-width">
                                    <label>Notes</label>
                                    <textarea id="memberNotes" rows="2"></textarea>
                                </div>

                            </div>

                            <div class="member-form-actions">

                                <button type="button"
                                    class="gym-secondary-btn"
                                    id="cancelMemberBtn">
                                    Cancel
                                </button>

                                <button type="submit"
                                    class="gym-primary-btn">
                                    Save Member
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            </div>
        `;

        addStyles();
        attachEvents();
        renderTable();
    }

    function addStyles() {

        if (document.getElementById("membersModuleStyles")) return;

        const style = document.createElement("style");

        style.id = "membersModuleStyles";

        style.textContent = `

            .members-module {
                padding: 20px 0;
                color: #fff;
            }

            .members-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 25px;
            }

            .members-header h2 {
                margin: 0 0 7px;
            }

            .members-header p {
                color: #aaa;
                margin: 0;
            }

            .gym-primary-btn,
            .gym-secondary-btn {
                border: none;
                padding: 12px 20px;
                border-radius: 9px;
                cursor: pointer;
                font-weight: 600;
            }

            .gym-primary-btn {
                background: linear-gradient(135deg,#ad8aff,#8154f7);
                color: white;
                box-shadow: 0 5px 15px #8154f744;
            }

            .gym-secondary-btn {
                background: #30303d;
                color: white;
            }

            .members-stats {
                display: grid;
                grid-template-columns: repeat(3,1fr);
                gap: 15px;
                margin-bottom: 22px;
            }

            .member-stat-card {
                background: #1d1d29;
                border: 1px solid #343445;
                padding: 20px;
                border-radius: 13px;
            }

            .member-stat-card span {
                color: #aaa;
                font-size: 13px;
            }

            .member-stat-card h2 {
                margin: 10px 0 0;
                font-size: 26px;
            }

            .members-toolbar {
                display: flex;
                gap: 12px;
                margin-bottom: 18px;
            }

            .members-toolbar input,
            .members-toolbar select {
                background: #1d1d29;
                color: white;
                border: 1px solid #414154;
                padding: 13px;
                border-radius: 9px;
                outline: none;
            }

            .members-toolbar input {
                flex: 1;
                min-width: 180px;
            }

            .members-table-wrapper {
                overflow-x: auto;
                background: #1d1d29;
                border-radius: 12px;
                border: 1px solid #343445;
            }

            .members-table {
                width: 100%;
                min-width: 950px;
                border-collapse: collapse;
            }

            .members-table th,
            .members-table td {
                padding: 14px;
                text-align: left;
                border-bottom: 1px solid #343445;
                font-size: 13px;
            }

            .members-table th {
                color: #b99bff;
                background: #252535;
            }

            .members-table td {
                color: #eee;
            }

            .member-status {
                padding: 5px 9px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: bold;
            }

            .member-status.active {
                background: #164a35;
                color: #70f0a8;
            }

            .member-status.inactive,
            .member-status.expired {
                background: #4b252b;
                color: #ff969e;
            }

            .member-action-btn {
                border: none;
                padding: 7px 10px;
                margin: 2px;
                border-radius: 6px;
                cursor: pointer;
                color: white;
                background: #554080;
            }

            .member-delete-btn {
                background: #77333d;
            }

            .member-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                background: #000b;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 15px;
                overflow-y: auto;
            }

            .member-modal-content {
                width: 100%;
                max-width: 750px;
                max-height: 92vh;
                overflow-y: auto;
                background: #1d1d29;
                border: 1px solid #48405c;
                padding: 22px;
                border-radius: 15px;
            }

            .member-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .member-modal-header button {
                background: none;
                border: none;
                color: white;
                font-size: 28px;
                cursor: pointer;
            }

            .member-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }

            .member-field {
                display: flex;
                flex-direction: column;
                gap: 7px;
            }

            .member-field label {
                color: #ccc;
                font-size: 13px;
            }

            .member-field input,
            .member-field select,
            .member-field textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 12px;
                background: #292938;
                color: white;
                border: 1px solid #45455b;
                border-radius: 8px;
                outline: none;
            }

            .full-width {
                grid-column: 1 / -1;
            }

            .member-form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 22px;
            }

            .member-empty {
                text-align: center !important;
                padding: 35px !important;
                color: #aaa !important;
            }

            @media(max-width:650px) {

                .members-stats {
                    grid-template-columns: 1fr;
                }

                .members-toolbar {
                    flex-direction: column;
                }

                .member-form-grid {
                    grid-template-columns: 1fr;
                }

                .full-width {
                    grid-column: auto;
                }

                .member-modal-content {
                    padding: 15px;
                }

            }

        `;

        document.head.appendChild(style);
    }

    function attachEvents() {

        document.getElementById("addMemberBtn")
            .addEventListener("click", function () {
                openForm();
            });

        document.getElementById("closeMemberModal")
            .addEventListener("click", closeForm);

        document.getElementById("cancelMemberBtn")
            .addEventListener("click", closeForm);

        document.getElementById("memberSearch")
            .addEventListener("input", function (event) {
                searchText = event.target.value.toLowerCase();
                renderTable();
            });

        document.getElementById("memberStatusFilter")
            .addEventListener("change", function (event) {
                statusFilter = event.target.value;
                renderTable();
            });

        document.getElementById("memberForm")
            .addEventListener("submit", saveMember);
    }

    function openForm(member = null) {

        const modal = document.getElementById("memberModal");

        document.getElementById("memberForm").reset();

        document.getElementById("memberEditId").value = "";

        document.getElementById("memberJoining").value = today();

        document.getElementById("memberFormTitle").textContent =
            member ? "Edit Member" : "Add New Member";

        if (member) {

            document.getElementById("memberEditId").value = member.id;

            document.getElementById("memberName").value = member.name || "";
            document.getElementById("memberPhone").value = member.phone || "";
            document.getElementById("memberGender").value = member.gender || "";
            document.getElementById("memberDOB").value = member.dob || "";
            document.getElementById("memberJoining").value = member.joiningDate || "";
            document.getElementById("memberPlan").value = member.planName || "";
            document.getElementById("memberFees").value = member.fees || 0;
            document.getElementById("memberExpiry").value = member.expiryDate || "";
            document.getElementById("memberEmergency").value = member.emergencyContact || "";
            document.getElementById("memberTrainer").value = member.trainer || "";
            document.getElementById("memberAddress").value = member.address || "";
            document.getElementById("memberNotes").value = member.notes || "";

        }

        modal.style.display = "flex";
    }

    function closeForm() {
        document.getElementById("memberModal").style.display = "none";
    }

    function saveMember(event) {

        event.preventDefault();

        const editId = document.getElementById("memberEditId").value;

        const name = document.getElementById("memberName").value.trim();

        const phone = document.getElementById("memberPhone").value.trim();

        if (!name || !/^[0-9]{10}$/.test(phone)) {
            alert("Please enter a valid name and 10-digit mobile number.");
            return;
        }

        const existing = editId ? GymDB.find("members", editId) : null;

        const memberData = {

            name: name,

            phone: phone,

            gender: document.getElementById("memberGender").value,

            dob: document.getElementById("memberDOB").value,

            joiningDate: document.getElementById("memberJoining").value,

            planName: document.getElementById("memberPlan").value.trim(),

            fees: Number(document.getElementById("memberFees").value || 0),

            expiryDate: document.getElementById("memberExpiry").value,

            emergencyContact: document.getElementById("memberEmergency").value.trim(),

            trainer: document.getElementById("memberTrainer").value.trim(),

            address: document.getElementById("memberAddress").value.trim(),

            notes: document.getElementById("memberNotes").value.trim(),

            status: existing ? existing.status : "active"

        };

        let result;

        if (editId) {

            result = GymDB.update("members", editId, memberData);

        } else {

            result = GymDB.add("members", memberData);

        }

        if (!result) {
            alert("Member save nahi hua. Storage check karein.");
            return;
        }

        closeForm();

        renderTable();

        if (typeof updateGymDashboard === "function") {
            updateGymDashboard();
        }

        alert(editId ? "Member updated successfully!" : "New member registered successfully!");
    }

    function renderTable() {

        const tbody = document.getElementById("membersTableBody");

        if (!tbody) return;

        const members = getMembers();

        const filtered = members.filter(function (member) {

            const currentStatus = status(member);

            const text = [
                member.id,
                member.name,
                member.phone,
                member.planName
            ].join(" ").toLowerCase();

            const matchesSearch = text.includes(searchText);

            const matchesStatus =
                statusFilter === "all" ||
                currentStatus === statusFilter;

            return matchesSearch && matchesStatus;

        });

        const active = members.filter(m => status(m) === "active").length;

        const inactive = members.length - active;

        document.getElementById("memberTotal").textContent = members.length;

        document.getElementById("memberActive").textContent = active;

        document.getElementById("memberInactive").textContent = inactive;

        if (!filtered.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="member-empty">
                        No members found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = filtered.map(function (member) {

            const memberStatus = status(member);

            return `
                <tr>

                    <td>${escapeHTML(member.id)}</td>

                    <td>${escapeHTML(member.name)}</td>

                    <td>${escapeHTML(member.phone)}</td>

                    <td>${escapeHTML(member.planName || "-")}</td>

                    <td>${escapeHTML(member.joiningDate || "-")}</td>

                    <td>${escapeHTML(member.expiryDate || "-")}</td>

                    <td>${money(member.fees)}</td>

                    <td>
                        <span class="member-status ${memberStatus}">
                            ${memberStatus.toUpperCase()}
                        </span>
                    </td>

                    <td>

                        <button class="member-action-btn"
                            data-edit="${escapeHTML(member.id)}">
                            Edit
                        </button>

                        <button class="member-action-btn member-delete-btn"
                            data-delete="${escapeHTML(member.id)}">
                            Delete
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

        tbody.querySelectorAll("[data-edit]").forEach(function (button) {

            button.addEventListener("click", function () {

                const member = GymDB.find("members", button.dataset.edit);

                if (member) openForm(member);

            });

        });

        tbody.querySelectorAll("[data-delete]").forEach(function (button) {

            button.addEventListener("click", function () {

                const id = button.dataset.delete;

                if (!confirm("Are you sure you want to delete this member?")) {
                    return;
                }

                GymDB.delete("members", id);

                renderTable();

                alert("Member deleted successfully.");

            });

        });

    }

    return {
        render: render,
        refresh: renderTable
    };

})();

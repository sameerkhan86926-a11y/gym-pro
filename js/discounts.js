window.GymDiscounts = (function () {
    const MODULE = "discounts";

    function getDiscounts() {
        return GymDB.getAll(MODULE) || [];
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
    }

    function money(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
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

    function today() {
        const d = new Date();
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
    }

    function getStatus(discount) {
        const current = today();

        if (discount.status === "inactive") return "inactive";
        if (discount.startDate && discount.startDate > current) return "upcoming";
        if (discount.endDate && discount.endDate < current) return "expired";

        return "active";
    }

    function isValid(discount) {
        return getStatus(discount) === "active";
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        root.innerHTML = `
            <div class="gym-discounts">

                <div class="discount-heading">
                    <div>
                        <h2>Discount Management</h2>
                        <p>Manage individual and bulk member discounts.</p>
                    </div>

                    <button id="addDiscountBtn">+ Add Discount</button>
                </div>

                <div class="discount-stats">
                    <div>
                        <span>Total Discounts</span>
                        <strong id="discountTotal">0</strong>
                    </div>
                    <div>
                        <span>Active Discounts</span>
                        <strong id="discountActive">0</strong>
                    </div>
                    <div>
                        <span>Expired / Inactive</span>
                        <strong id="discountInactive">0</strong>
                    </div>
                </div>

                <div class="discount-section">

                    <div class="discount-toolbar">

                        <input type="search"
                            id="discountSearch"
                            placeholder="Search member or reason...">

                        <select id="discountMemberFilter">
                            <option value="all">All Members</option>
                        </select>

                        <select id="discountTypeFilter">
                            <option value="all">All Types</option>
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>

                        <select id="discountStatusFilter">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="expired">Expired</option>
                            <option value="upcoming">Upcoming</option>
                        </select>

                    </div>

                    <div class="discount-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Discount</th>
                                    <th>Reason</th>
                                    <th>Validity</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody id="discountTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <div id="discountFormContainer"></div>

            </div>
        `;

        addStyles();

        document.getElementById("addDiscountBtn")
            .addEventListener("click", () => openForm());

        document.getElementById("discountSearch")
            .addEventListener("input", renderTable);

        document.getElementById("discountMemberFilter")
            .addEventListener("change", renderTable);

        document.getElementById("discountTypeFilter")
            .addEventListener("change", renderTable);

        document.getElementById("discountStatusFilter")
            .addEventListener("change", renderTable);

        fillMemberFilter();
        renderTable();
    }

    function fillMemberFilter() {
        const select = document.getElementById("discountMemberFilter");
        if (!select) return;

        const members = getMembers();

        select.innerHTML = `
            <option value="all">All Members</option>
            ${members.map(member => `
                <option value="${escapeHTML(member.id)}">
                    ${escapeHTML(member.name)}
                </option>
            `).join("")}
        `;
    }

    function renderTable() {
        const tbody = document.getElementById("discountTableBody");
        if (!tbody) return;

        const discounts = getDiscounts();
        const members = getMembers();

        const search = document.getElementById("discountSearch").value
            .trim().toLowerCase();

        const memberFilter =
            document.getElementById("discountMemberFilter").value;

        const typeFilter =
            document.getElementById("discountTypeFilter").value;

        const statusFilter =
            document.getElementById("discountStatusFilter").value;

        document.getElementById("discountTotal").textContent =
            discounts.length;

        document.getElementById("discountActive").textContent =
            discounts.filter(d => getStatus(d) === "active").length;

        document.getElementById("discountInactive").textContent =
            discounts.filter(d => getStatus(d) !== "active").length;

        const filtered = discounts.filter(discount => {
            const member = members.find(m => m.id === discount.memberId);

            const memberName = member?.name ||
                discount.memberName || "Member";

            const text = [
                memberName,
                discount.reason,
                discount.memberId
            ].join(" ").toLowerCase();

            return text.includes(search) &&
                (memberFilter === "all" ||
                    discount.memberId === memberFilter) &&
                (typeFilter === "all" ||
                    discount.type === typeFilter) &&
                (statusFilter === "all" ||
                    getStatus(discount) === statusFilter);
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="discount-empty">
                        No discount records found.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(discount => {
            const member = members.find(m => m.id === discount.memberId);

            const name = member?.name ||
                discount.memberName || "Member";

            const amount = discount.type === "percentage"
                ? Number(discount.value) + "%"
                : money(discount.value);

            const status = getStatus(discount);

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(name)}</strong>
                        <small>${escapeHTML(discount.memberId)}</small>
                    </td>

                    <td>${escapeHTML(amount)}</td>

                    <td>${escapeHTML(discount.reason || "-")}</td>

                    <td>
                        ${escapeHTML(discount.startDate || "-")}
                        <br>
                        to ${escapeHTML(discount.endDate || "-")}
                    </td>

                    <td>
                        <span class="discount-status ${status}">
                            ${status.toUpperCase()}
                        </span>
                    </td>

                    <td>
                        <div class="discount-actions">
                            <button data-edit-discount="${escapeHTML(discount.id)}">
                                Edit
                            </button>

                            <button class="discount-delete"
                                data-delete-discount="${escapeHTML(discount.id)}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        tbody.querySelectorAll("[data-edit-discount]").forEach(button => {
            button.addEventListener("click", () => {
                openForm(button.dataset.editDiscount);
            });
        });

        tbody.querySelectorAll("[data-delete-discount]").forEach(button => {
            button.addEventListener("click", () => {
                deleteDiscount(button.dataset.deleteDiscount);
            });
        });
    }

    function openForm(id = null) {
        const container = document.getElementById("discountFormContainer");

        const existing = id ? GymDB.find(MODULE, id) : null;

        if (id && !existing) {
            alert("Discount record not found.");
            return;
        }

        const members = getMembers();

        if (!members.length) {
            alert("Please add members first.");
            return;
        }

        container.innerHTML = `
            <div class="discount-form-card">

                <div class="discount-form-heading">
                    <h3>${existing ? "Edit Discount" : "Create Discount"}</h3>
                    <button type="button" id="closeDiscountForm">✕</button>
                </div>

                <form id="discountForm">

                    ${existing ? "" : `
                        <div class="discount-form-grid">
                            <div>
                                <label>Discount Apply To</label>

                                <select id="discountTarget">
                                    <option value="single">One Member</option>
                                    <option value="all">All Active Members</option>
                                    <option value="selected">Selected Members</option>
                                </select>
                            </div>
                        </div>
                    `}

                    <div id="singleMemberArea"
                        ${!existing ? "" : ""}>

                        <label>Select Member</label>

                        <select id="discountMember"
                            ${existing ? "disabled" : ""}>
                            <option value="">Choose Member</option>

                            ${members.map(member => `
                                <option value="${escapeHTML(member.id)}"
                                    ${existing?.memberId === member.id ? "selected" : ""}>
                                    ${escapeHTML(member.name)}
                                    (${escapeHTML(member.id)})
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <div id="bulkMemberArea" style="display:none">

                        <label>Choose Members</label>

                        <div class="bulk-member-tools">
                            <input type="search"
                                id="bulkMemberSearch"
                                placeholder="Search members...">

                            <button type="button" id="selectAllBulk">
                                Select All
                            </button>

                            <button type="button" id="clearAllBulk">
                                Clear
                            </button>
                        </div>

                        <div class="bulk-member-list" id="bulkMemberList">

                            ${members.map(member => `
                                <label class="bulk-member-item"
                                    data-member-search="${escapeHTML((member.name + " " + member.id).toLowerCase())}">

                                    <input type="checkbox"
                                        class="bulk-member-checkbox"
                                        value="${escapeHTML(member.id)}">

                                    <span>
                                        ${escapeHTML(member.name)}
                                        <small>${escapeHTML(member.id)}</small>
                                    </span>

                                </label>
                            `).join("")}

                        </div>
                    </div>

                    <div class="discount-form-grid">

                        <div>
                            <label>Discount Type</label>

                            <select id="discountType">
                                <option value="percentage"
                                    ${existing?.type === "percentage" ? "selected" : ""}>
                                    Percentage (%)
                                </option>

                                <option value="fixed"
                                    ${existing?.type === "fixed" ? "selected" : ""}>
                                    Fixed Amount (₹)
                                </option>
                            </select>
                        </div>

                        <div>
                            <label>Discount Value</label>

                            <input type="number"
                                id="discountValue"
                                min="0.01"
                                step="0.01"
                                value="${escapeHTML(existing?.value ?? "")}"
                                required>
                        </div>

                        <div>
                            <label>Start Date</label>

                            <input type="date"
                                id="discountStart"
                                value="${escapeHTML(existing?.startDate || today())}">
                        </div>

                        <div>
                            <label>End Date</label>

                            <input type="date"
                                id="discountEnd"
                                value="${escapeHTML(existing?.endDate || "")}">
                        </div>

                        <div>
                            <label>Status</label>

                            <select id="discountStatus">
                                <option value="active"
                                    ${existing?.status !== "inactive" ? "selected" : ""}>
                                    Active
                                </option>

                                <option value="inactive"
                                    ${existing?.status === "inactive" ? "selected" : ""}>
                                    Inactive
                                </option>
                            </select>
                        </div>

                        <div class="discount-form-full">
                            <label>Reason</label>

                            <textarea id="discountReason"
                                rows="3"
                                placeholder="Enter discount reason...">${escapeHTML(existing?.reason || "")}</textarea>
                        </div>

                    </div>

                    <button type="submit" class="discount-save-btn">
                        ${existing ? "Update Discount" : "Save Discount"}
                    </button>

                </form>
            </div>
        `;

        const target = document.getElementById("discountTarget");

        if (target) {
            target.addEventListener("change", updateTargetMode);
        }

        const search = document.getElementById("bulkMemberSearch");

        if (search) {
            search.addEventListener("input", filterBulkMembers);
        }

        const selectAll = document.getElementById("selectAllBulk");

        if (selectAll) {
            selectAll.addEventListener("click", () => {
                document.querySelectorAll(".bulk-member-item").forEach(item => {
                    if (item.style.display !== "none") {
                        item.querySelector("input").checked = true;
                    }
                });
            });
        }

        const clearAll = document.getElementById("clearAllBulk");

        if (clearAll) {
            clearAll.addEventListener("click", () => {
                document.querySelectorAll(".bulk-member-checkbox")
                    .forEach(box => box.checked = false);
            });
        }

        document.getElementById("closeDiscountForm")
            .addEventListener("click", () => {
                container.innerHTML = "";
            });

        document.getElementById("discountForm")
            .addEventListener("submit", event => {
                saveDiscount(event, id);
            });

        container.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function updateTargetMode() {
        const target = document.getElementById("discountTarget").value;

        document.getElementById("singleMemberArea").style.display =
            target === "single" ? "block" : "none";

        document.getElementById("bulkMemberArea").style.display =
            target === "single" ? "none" : "block";
    }

    function filterBulkMembers() {
        const search = document.getElementById("bulkMemberSearch")
            .value.trim().toLowerCase();

        document.querySelectorAll(".bulk-member-item").forEach(item => {
            item.style.display =
                item.dataset.memberSearch.includes(search) ? "flex" : "none";
        });
    }

    function saveDiscount(event, id) {
        event.preventDefault();

        const type = document.getElementById("discountType").value;
        const value = Number(document.getElementById("discountValue").value);

        const startDate = document.getElementById("discountStart").value;
        const endDate = document.getElementById("discountEnd").value;

        const reason = document.getElementById("discountReason")
            .value.trim();

        const status = document.getElementById("discountStatus").value;

        if (!Number.isFinite(value) || value <= 0) {
            alert("Enter a valid discount value.");
            return;
        }

        if (type === "percentage" && value > 100) {
            alert("Percentage discount cannot exceed 100%.");
            return;
        }

        if (startDate && endDate && startDate > endDate) {
            alert("End date cannot be before start date.");
            return;
        }

        const members = getMembers();
        let targetMembers = [];

        if (id) {
            const memberId = document.getElementById("discountMember").value;
            const member = GymDB.find("members", memberId);

            if (!member) {
                alert("Member not found.");
                return;
            }

            targetMembers = [member];
        } else {
            const target = document.getElementById("discountTarget").value;

            if (target === "single") {
                const memberId = document.getElementById("discountMember").value;
                const member = GymDB.find("members", memberId);

                if (!member) {
                    alert("Please select a member.");
                    return;
                }

                targetMembers = [member];

            } else if (target === "all") {
                targetMembers = members.filter(member =>
                    member.status === "active"
                );

            } else {
                const selectedIds = Array.from(
                    document.querySelectorAll(".bulk-member-checkbox:checked")
                ).map(box => box.value);

                targetMembers = members.filter(member =>
                    selectedIds.includes(member.id)
                );
            }
        }

        if (!targetMembers.length) {
            alert("No members selected.");
            return;
        }

        const now = new Date().toISOString();

        if (id) {
            const old = GymDB.find(MODULE, id);

            GymDB.update(MODULE, id, {
                memberId: targetMembers[0].id,
                memberName: targetMembers[0].name,
                type,
                value,
                reason,
                startDate,
                endDate,
                status,
                updatedAt: now
            });

        } else {
            targetMembers.forEach(member => {
                const record = {
                    id: GymDB.generateID("DISC"),
                    memberId: member.id,
                    memberName: member.name,
                    type,
                    value,
                    reason,
                    startDate,
                    endDate,
                    status,
                    bulkGroupId: targetMembers.length > 1
                        ? "BULK-" + Date.now()
                        : "",
                    createdAt: now,
                    updatedAt: now
                };

                GymDB.add(MODULE, record);
            });
        }

        document.getElementById("discountFormContainer").innerHTML = "";

        fillMemberFilter();
        renderTable();

        alert(
            id
                ? "Discount updated successfully."
                : "Discount applied to " + targetMembers.length + " member(s)."
        );
    }

    function deleteDiscount(id) {
        if (!confirm("Are you sure you want to delete this discount?")) {
            return;
        }

        GymDB.delete(MODULE, id);
        renderTable();

        alert("Discount deleted successfully.");
    }

    function addStyles() {
        if (document.getElementById("gymDiscountStyles")) return;

        const style = document.createElement("style");
        style.id = "gymDiscountStyles";

        style.textContent = `
            .gym-discounts {
                color:#f4f0ff;
                width:100%;
            }

            .discount-heading {
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:15px;
                flex-wrap:wrap;
                margin-bottom:22px;
            }

            .discount-heading h2 {
                margin:0 0 6px;
                font-size:25px;
            }

            .discount-heading p {
                margin:0;
                color:#aaa0c5;
            }

            .gym-discounts button {
                border:0;
                border-radius:9px;
                padding:10px 15px;
                background:linear-gradient(135deg,#a77aff,#7544d8);
                color:white;
                font-weight:600;
                cursor:pointer;
            }

            .discount-stats {
                display:grid;
                grid-template-columns:repeat(3,minmax(0,1fr));
                gap:14px;
                margin-bottom:20px;
            }

            .discount-stats div {
                padding:18px;
                background:#1c172b;
                border:1px solid #382950;
                border-radius:13px;
            }

            .discount-stats span,
            .discount-stats strong {
                display:block;
            }

            .discount-stats span {
                color:#b9adcf;
                font-size:13px;
            }

            .discount-stats strong {
                margin-top:10px;
                font-size:24px;
            }

            .discount-section,
            .discount-form-card {
                background:#171326;
                border:1px solid #302548;
                border-radius:14px;
                padding:18px;
                margin-bottom:20px;
            }

            .discount-toolbar {
                display:flex;
                flex-wrap:wrap;
                gap:12px;
                margin-bottom:18px;
            }

            .discount-toolbar input,
            .discount-toolbar select,
            .discount-form-card input,
            .discount-form-card select,
            .discount-form-card textarea {
                padding:11px;
                border:1px solid #403456;
                border-radius:8px;
                background:#211b32;
                color:white;
                min-width:0;
            }

            .discount-toolbar input {
                flex:1;
            }

            .discount-table-wrap {
                overflow-x:auto;
            }

            .discount-table-wrap table {
                width:100%;
                min-width:750px;
                border-collapse:collapse;
            }

            .discount-table-wrap th,
            .discount-table-wrap td {
                padding:13px;
                border-bottom:1px solid #302548;
                text-align:left;
                font-size:13px;
            }

            .discount-table-wrap th {
                color:#bba6ed;
                background:#211a32;
            }

            .discount-table-wrap td small,
            .bulk-member-item small {
                display:block;
                color:#a99abd;
                margin-top:4px;
            }

            .discount-status {
                display:inline-block;
                padding:5px 9px;
                border-radius:20px;
                font-size:10px;
            }

            .discount-status.active {
                background:#17452f;
                color:#8ef0b6;
            }

            .discount-status.inactive,
            .discount-status.expired {
                background:#492323;
                color:#ffaaaa;
            }

            .discount-status.upcoming {
                background:#514019;
                color:#ffe39a;
            }

            .discount-actions {
                display:flex;
                gap:7px;
            }

            .discount-actions button {
                padding:7px 10px;
                font-size:12px;
            }

            .discount-actions .discount-delete {
                background:#8d3434;
            }

            .discount-empty {
                text-align:center !important;
                padding:25px !important;
                color:#aaa0c5;
            }

            .discount-form-heading {
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:20px;
            }

            .discount-form-heading h3 {
                margin:0;
            }

            .discount-form-heading button {
                padding:7px 11px;
                background:#382950;
            }

            .discount-form-grid {
                display:grid;
                grid-template-columns:repeat(2,minmax(0,1fr));
                gap:16px;
                margin:18px 0;
            }

            .discount-form-grid > div,
            #singleMemberArea {
                display:flex;
                flex-direction:column;
                gap:8px;
            }

            .discount-form-grid label,
            #singleMemberArea label,
            #bulkMemberArea > label {
                color:#c5b8df;
                font-size:13px;
            }

            .discount-form-grid input,
            .discount-form-grid select,
            .discount-form-grid textarea,
            #singleMemberArea select {
                width:100%;
                box-sizing:border-box;
            }

            .discount-form-full {
                grid-column:1 / -1;
            }

            .discount-save-btn {
                min-width:170px;
            }

            .bulk-member-tools {
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin:10px 0;
            }

            .bulk-member-tools input {
                flex:1;
                min-width:150px;
            }

            .bulk-member-list {
                max-height:220px;
                overflow-y:auto;
                border:1px solid #403456;
                border-radius:9px;
                padding:8px;
                background:#211b32;
            }

            .bulk-member-item {
                display:flex;
                align-items:center;
                gap:10px;
                padding:9px;
                border-bottom:1px solid #382950;
                cursor:pointer;
            }

            .bulk-member-item input {
                width:17px;
                height:17px;
            }

            @media(max-width:650px) {
                .discount-stats {
                    grid-template-columns:1fr 1fr;
                }

                .discount-form-grid {
                    grid-template-columns:1fr;
                }

                .discount-form-full {
                    grid-column:auto;
                }

                .discount-toolbar {
                    flex-direction:column;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh: renderTable,
        getActiveDiscounts: function (memberId) {
            return getDiscounts().filter(discount =>
                discount.memberId === memberId && isValid(discount)
            );
        }
    };
})();

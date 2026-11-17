window.GymDiscounts = (function () {
    const MODULE = "discounts";

    function getDiscounts() {
        return GymDB.getAll(MODULE) || [];
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
    }

    function money(value) {
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

    function today() {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - offset * 60000)
            .toISOString().slice(0, 10);
    }

    function isValid(discount) {
        const current = today();

        return discount.status !== "inactive" &&
            (!discount.startDate || discount.startDate <= current) &&
            (!discount.endDate || discount.endDate >= current);
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        root.innerHTML = `
            <div class="gym-discounts">
                <div class="discount-heading">
                    <div>
                        <h2>Discount Management</h2>
                        <p>Create and manage member discounts</p>
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
                        <span>Inactive Discounts</span>
                        <strong id="discountInactive">0</strong>
                    </div>
                </div>

                <div class="discount-section">
                    <div class="discount-toolbar">
                        <input type="search" id="discountSearch"
                            placeholder="Search member or reason...">

                        <select id="discountStatusFilter">
                            <option value="all">All Discounts</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
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

        document.getElementById("discountStatusFilter")
            .addEventListener("change", renderTable);

        renderTable();
    }

    function renderTable() {
        const discounts = getDiscounts();
        const members = getMembers();

        const search = document.getElementById("discountSearch")
            .value.trim().toLowerCase();

        const filter = document.getElementById("discountStatusFilter").value;

        document.getElementById("discountTotal").textContent =
            discounts.length;

        document.getElementById("discountActive").textContent =
            discounts.filter(isValid).length;

        document.getElementById("discountInactive").textContent =
            discounts.filter(d => !isValid(d)).length;

        const filtered = discounts.filter(discount => {
            const member = members.find(m => m.id === discount.memberId);

            const text = [
                member?.name || discount.memberName,
                discount.reason
            ].join(" ").toLowerCase();

            const status = isValid(discount) ? "active" : "inactive";

            return text.includes(search) &&
                (filter === "all" || filter === status);
        });

        const tbody = document.getElementById("discountTableBody");

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
            const memberName = member?.name ||
                discount.memberName || "Member";

            const amount = discount.type === "percentage"
                ? Number(discount.value) + "%"
                : money(discount.value);

            const active = isValid(discount);

            return `
                <tr>
                    <td>${escapeHTML(memberName)}</td>
                    <td>${escapeHTML(amount)}</td>
                    <td>${escapeHTML(discount.reason || "-")}</td>
                    <td>
                        ${escapeHTML(discount.startDate || "-")}
                        <br>
                        to ${escapeHTML(discount.endDate || "-")}
                    </td>
                    <td>
                        <span class="discount-status ${active ? "active" : "inactive"}">
                            ${active ? "Active" : "Inactive"}
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
        const existing = id
            ? GymDB.find(MODULE, id)
            : null;

        if (id && !existing) {
            alert("Discount record not found.");
            return;
        }

        const members = getMembers();

        if (!members.length) {
            alert("Please add a member first.");
            return;
        }

        container.innerHTML = `
            <div class="discount-form-card">
                <div class="discount-form-heading">
                    <h3>${existing ? "Edit Discount" : "Create Discount"}</h3>
                    <button type="button" id="closeDiscountForm">✕</button>
                </div>

                <form id="discountForm">
                    <div class="discount-form-grid">
                        <div>
                            <label>Select Member</label>
                            <select id="discountMember" required>
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
                            <input type="number" id="discountValue"
                                min="0.01" step="0.01"
                                value="${escapeHTML(existing?.value ?? "")}"
                                required>
                        </div>

                        <div>
                            <label>Start Date</label>
                            <input type="date" id="discountStart"
                                value="${escapeHTML(existing?.startDate || today())}">
                        </div>

                        <div>
                            <label>End Date</label>
                            <input type="date" id="discountEnd"
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
                            <textarea id="discountReason" rows="3"
                                placeholder="Enter discount reason...">${escapeHTML(existing?.reason || "")}</textarea>
                        </div>
                    </div>

                    <button type="submit" class="discount-save-btn">
                        ${existing ? "Update Discount" : "Save Discount"}
                    </button>
                </form>
            </div>
        `;

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

    function saveDiscount(event, id) {
        event.preventDefault();

        const memberId = document.getElementById("discountMember").value;
        const member = GymDB.find("members", memberId);

        if (!member) {
            alert("Please select a valid member.");
            return;
        }

        const type = document.getElementById("discountType").value;
        const value = Number(
            document.getElementById("discountValue").value
        );

        const startDate = document.getElementById("discountStart").value;
        const endDate = document.getElementById("discountEnd").value;

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

        const record = {
            memberId,
            memberName: member.name,
            type,
            value,
            reason: document.getElementById("discountReason")
                .value.trim(),
            startDate,
            endDate,
            status: document.getElementById("discountStatus").value,
            updatedAt: new Date().toISOString()
        };

        if (id) {
            GymDB.update(MODULE, id, record);
        } else {
            record.createdAt = new Date().toISOString();
            GymDB.add(MODULE, record);
        }

        document.getElementById("discountFormContainer").innerHTML = "";
        renderTable();

        alert(id ? "Discount updated successfully." : "Discount saved successfully.");
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
                color: #f4f0ff;
                width: 100%;
            }

            .discount-heading {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 22px;
            }

            .discount-heading h2 {
                margin: 0 0 6px;
                font-size: 25px;
            }

            .discount-heading p {
                margin: 0;
                color: #aaa0c5;
            }

            .gym-discounts button {
                border: 0;
                border-radius: 9px;
                padding: 10px 15px;
                background: linear-gradient(135deg,#a77aff,#7544d8);
                color: white;
                font-weight: 600;
                cursor: pointer;
            }

            .discount-stats {
                display: grid;
                grid-template-columns: repeat(3,minmax(0,1fr));
                gap: 14px;
                margin-bottom: 20px;
            }

            .discount-stats div {
                padding: 18px;
                background: #1c172b;
                border: 1px solid #382950;
                border-radius: 13px;
            }

            .discount-stats span,
            .discount-stats strong {
                display: block;
            }

            .discount-stats span {
                color: #b9adcf;
                font-size: 13px;
            }

            .discount-stats strong {
                margin-top: 10px;
                font-size: 24px;
            }

            .discount-section,
            .discount-form-card {
                background: #171326;
                border: 1px solid #302548;
                border-radius: 14px;
                padding: 18px;
                margin-bottom: 20px;
            }

            .discount-toolbar {
                display: flex;
                gap: 12px;
                margin-bottom: 18px;
            }

            .discount-toolbar input,
            .discount-toolbar select {
                padding: 11px;
                border: 1px solid #403456;
                border-radius: 8px;
                background: #211b32;
                color: white;
                min-width: 0;
            }

            .discount-toolbar input {
                flex: 1;
            }

            .discount-table-wrap {
                overflow-x: auto;
            }

            .discount-table-wrap table {
                width: 100%;
                min-width: 750px;
                border-collapse: collapse;
            }

            .discount-table-wrap th,
            .discount-table-wrap td {
                padding: 13px;
                border-bottom: 1px solid #302548;
                text-align: left;
                font-size: 13px;
            }

            .discount-table-wrap th {
                color: #bba6ed;
                background: #211a32;
            }

            .discount-status {
                display: inline-block;
                padding: 5px 9px;
                border-radius: 20px;
                font-size: 11px;
            }

            .discount-status.active {
                background: #17452f;
                color: #8ef0b6;
            }

            .discount-status.inactive {
                background: #492323;
                color: #ffaaaa;
            }

            .discount-actions {
                display: flex;
                gap: 7px;
            }

            .discount-actions button {
                padding: 7px 10px;
                font-size: 12px;
            }

            .discount-actions .discount-delete {
                background: #8d3434;
            }

            .discount-empty {
                text-align: center !important;
                padding: 25px !important;
                color: #aaa0c5;
            }

            .discount-form-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }

            .discount-form-heading h3 {
                margin: 0;
            }

            .discount-form-heading button {
                padding: 7px 11px;
                background: #382950;
            }

            .discount-form-grid {
                display: grid;
                grid-template-columns: repeat(2,minmax(0,1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .discount-form-grid > div {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .discount-form-grid label {
                color: #c5b8df;
                font-size: 13px;
            }

            .discount-form-grid input,
            .discount-form-grid select,
            .discount-form-grid textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #403456;
                background: #211b32;
                color: white;
            }

            .discount-form-full {
                grid-column: 1 / -1;
            }

            .discount-save-btn {
                min-width: 170px;
            }

            @media(max-width:650px) {
                .discount-stats {
                    grid-template-columns: 1fr 1fr;
                }

                .discount-form-grid {
                    grid-template-columns: 1fr;
                }

                .discount-form-full {
                    grid-column: auto;
                }

                .discount-toolbar {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh: renderTable
    };
})();

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

    function showMessage(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
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

    // Calculate actual ₹ discount given for a discount record
    function getDiscountRupeeValue(discount, members) {
        const member = members.find(m => String(m.id) === String(discount.memberId));
        const fees = Number(
            member?.billingOriginalFees ??
            member?.fees ??
            0
        );

        if (discount.type === "percentage") {
            if (fees > 0) {
                return Math.min(fees, (fees * Number(discount.value || 0)) / 100);
            }
            return 0;
        }

        const fixed = Number(discount.value || 0);
        return fees > 0 ? Math.min(fees, fixed) : fixed;
    }

    function getRecordDate(discount) {
        if (discount.startDate) return discount.startDate;
        if (discount.createdAt) return String(discount.createdAt).slice(0, 10);
        return "";
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        root.innerHTML = `
            <div class="gym-discounts">

                <div class="discount-heading">
                    <div>
                        <h2>Discounts & Promotional Offers</h2>
                        <p>Create and manage individual or bulk member fee discounts.</p>
                    </div>

                    <button id="addDiscountBtn" class="discount-primary-btn">+ Add Discount</button>
                </div>

                <div class="discount-stats">
                    <div class="discount-stat-card">
                        <div class="discount-stat-top">
                            <span>Total Discounts</span>
                            <div class="discount-stat-dot" style="background:#2879d0;"></div>
                        </div>
                        <strong id="discountTotal">0</strong>
                    </div>

                    <div class="discount-stat-card">
                        <div class="discount-stat-top">
                            <span>Active Discounts</span>
                            <div class="discount-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="discountActive">0</strong>
                    </div>

                    <div class="discount-stat-card">
                        <div class="discount-stat-top">
                            <span>Expired / Inactive</span>
                            <div class="discount-stat-dot" style="background:#8a909a;"></div>
                        </div>
                        <strong id="discountInactive">0</strong>
                    </div>

                    <div class="discount-stat-card highlight">
                        <div class="discount-stat-top">
                            <span>Total Discount Given</span>
                            <div class="discount-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="discountTotalAmount" style="color:#d71920;">₹0</strong>
                    </div>
                </div>

                <div id="discountFormContainer"></div>

                <div class="discount-section">

                    <div class="discount-toolbar">

                        <div class="discount-filter-field search-field">
                            <label for="discountSearch">Search</label>
                            <input type="search"
                                id="discountSearch"
                                placeholder="Search member name, ID or reason...">
                        </div>

                        <div class="discount-filter-field">
                            <label for="discountFromDate">From Date</label>
                            <input type="date" id="discountFromDate">
                        </div>

                        <div class="discount-filter-field">
                            <label for="discountToDate">To Date</label>
                            <input type="date" id="discountToDate">
                        </div>

                        <div class="discount-filter-field">
                            <label for="discountMemberFilter">Member</label>
                            <select id="discountMemberFilter">
                                <option value="all">All Members</option>
                            </select>
                        </div>

                        <div class="discount-filter-field">
                            <label for="discountTypeFilter">Type</label>
                            <select id="discountTypeFilter">
                                <option value="all">All Types</option>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                            </select>
                        </div>

                        <div class="discount-filter-field">
                            <label for="discountStatusFilter">Status</label>
                            <select id="discountStatusFilter">
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="expired">Expired</option>
                                <option value="upcoming">Upcoming</option>
                            </select>
                        </div>

                        <button type="button" class="discount-reset-btn" id="resetDiscountFiltersBtn">
                            Reset
                        </button>

                    </div>

                    <div class="discount-filter-summary" id="discountFilterSummary">
                        Showing 0 discount(s) • Total Discount Value: ₹0
                    </div>

                    <div class="discount-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Discount</th>
                                    <th>Reason</th>
                                    <th>Validity Period</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody id="discountTableBody"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;

        addStyles();

        document.getElementById("addDiscountBtn")
            .addEventListener("click", () => openForm());

        document.getElementById("discountSearch")
            .addEventListener("input", renderTable);

        document.getElementById("discountFromDate")
            .addEventListener("change", renderTable);

        document.getElementById("discountToDate")
            .addEventListener("change", renderTable);

        document.getElementById("discountMemberFilter")
            .addEventListener("change", renderTable);

        document.getElementById("discountTypeFilter")
            .addEventListener("change", renderTable);

        document.getElementById("discountStatusFilter")
            .addEventListener("change", renderTable);

        document.getElementById("resetDiscountFiltersBtn")
            .addEventListener("click", () => {
                document.getElementById("discountSearch").value = "";
                document.getElementById("discountFromDate").value = "";
                document.getElementById("discountToDate").value = "";
                document.getElementById("discountMemberFilter").value = "all";
                document.getElementById("discountTypeFilter").value = "all";
                document.getElementById("discountStatusFilter").value = "all";
                renderTable();
                showMessage("Discount filters reset.");
            });

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

        const fromDate = document.getElementById("discountFromDate").value;
        const toDate = document.getElementById("discountToDate").value;

        const memberFilter =
            document.getElementById("discountMemberFilter").value;

        const typeFilter =
            document.getElementById("discountTypeFilter").value;

        const statusFilter =
            document.getElementById("discountStatusFilter").value;

        // Overall Stats Cards
        const totalRupeeGiven = discounts.reduce(
            (sum, d) => sum + getDiscountRupeeValue(d, members),
            0
        );

        document.getElementById("discountTotal").textContent =
            discounts.length;

        document.getElementById("discountActive").textContent =
            discounts.filter(d => getStatus(d) === "active").length;

        document.getElementById("discountInactive").textContent =
            discounts.filter(d => getStatus(d) !== "active").length;

        document.getElementById("discountTotalAmount").textContent =
            money(totalRupeeGiven);

        // Filtered Rows
        const filtered = (fromDate && toDate && fromDate > toDate)
            ? []
            : discounts.filter(discount => {
                const member = members.find(m => m.id === discount.memberId);

                const memberName = member?.name ||
                    discount.memberName || "Member";

                const text = [
                    memberName,
                    discount.reason,
                    discount.memberId
                ].join(" ").toLowerCase();

                const recordDate = getRecordDate(discount);

                const matchesFrom = !fromDate || (recordDate && recordDate >= fromDate);
                const matchesTo = !toDate || (recordDate && recordDate <= toDate);

                return text.includes(search) &&
                    matchesFrom &&
                    matchesTo &&
                    (memberFilter === "all" ||
                        discount.memberId === memberFilter) &&
                    (typeFilter === "all" ||
                        discount.type === typeFilter) &&
                    (statusFilter === "all" ||
                        getStatus(discount) === statusFilter);
            }).sort((a, b) =>
                String(getRecordDate(b)).localeCompare(String(getRecordDate(a)))
            );

        const filteredRupeeTotal = filtered.reduce(
            (sum, d) => sum + getDiscountRupeeValue(d, members),
            0
        );

        const summaryEl = document.getElementById("discountFilterSummary");
        if (summaryEl) {
            summaryEl.innerHTML = `
                Filtered Total: <strong>${money(filteredRupeeTotal)}</strong>
                <span>(${filtered.length} discount${filtered.length === 1 ? "" : "s"})</span>
            `;
        }

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

            const rupeeVal = getDiscountRupeeValue(discount, members);

            const amount = discount.type === "percentage"
                ? Number(discount.value) + "% OFF" + (rupeeVal > 0 ? ` (${money(rupeeVal)})` : "")
                : money(discount.value) + " OFF";

            const status = getStatus(discount);

            return `
                <tr>
                    <td>
                        <strong style="color:#202124;">${escapeHTML(name)}</strong>
                        <span class="discount-id-pill">${escapeHTML(discount.memberId)}</span>
                    </td>

                    <td>
                        <span class="discount-value-pill">${escapeHTML(amount)}</span>
                    </td>

                    <td>${escapeHTML(discount.reason || "-")}</td>

                    <td>
                        <span style="color:#202124;font-weight:600;">${escapeHTML(discount.startDate || "-")}</span>
                        <small>to ${escapeHTML(discount.endDate || "No expiry")}</small>
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
                    <div>
                        <h3>${existing ? "Edit Discount" : "Create New Discount"}</h3>
                        <p>Apply percentage or flat fee reduction to members.</p>
                    </div>
                    <button type="button" id="closeDiscountForm" aria-label="Close">✕</button>
                </div>

                <form id="discountForm">

                    ${existing ? "" : `
                        <div class="discount-form-grid" style="margin-top:0;">
                            <div>
                                <label>Discount Apply To *</label>

                                <select id="discountTarget">
                                    <option value="single">Single Member</option>
                                    <option value="all">All Active Members</option>
                                    <option value="selected">Selected Members (Bulk)</option>
                                </select>
                            </div>
                        </div>
                    `}

                    <div id="singleMemberArea">

                        <label>Select Member *</label>

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
                                placeholder="Filter members by name or ID...">

                            <button type="button" id="selectAllBulk" class="bulk-tool-btn">
                                Select All
                            </button>

                            <button type="button" id="clearAllBulk" class="bulk-tool-btn secondary">
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
                                        <strong>${escapeHTML(member.name)}</strong>
                                        <small>${escapeHTML(member.id)}</small>
                                    </span>

                                </label>
                            `).join("")}

                        </div>
                    </div>

                    <div class="discount-form-grid">

                        <div>
                            <label>Discount Type *</label>

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
                            <label>Discount Value *</label>

                            <input type="number"
                                id="discountValue"
                                min="0.01"
                                step="0.01"
                                placeholder="e.g. 10 or 500"
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
                            <label>Reason / Offer Note</label>

                            <textarea id="discountReason"
                                rows="3"
                                placeholder="e.g. Annual renewal offer, Referral discount...">${escapeHTML(existing?.reason || "")}</textarea>
                        </div>

                    </div>

                    <div class="discount-form-footer">
                        <button type="submit" class="discount-save-btn">
                            ${existing ? "Update Discount" : "Save & Apply Discount"}
                        </button>
                        <button type="button" class="discount-cancel-btn" id="cancelDiscountFormBtn">
                            Cancel
                        </button>
                    </div>

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

        document.getElementById("cancelDiscountFormBtn")
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
            target === "selected" ? "block" : "none";
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

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }

        showMessage(
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

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }

        showMessage("Discount deleted successfully.");
    }

    function addStyles() {
        if (document.getElementById("gymDiscountStyles")) return;

        const style = document.createElement("style");
        style.id = "gymDiscountStyles";

        style.textContent = `
            .gym-discounts {
                color: #202124;
                width: 100%;
                padding: 2px 0 25px;
            }

            .discount-heading {
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

            .discount-heading h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .discount-heading p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .discount-primary-btn,
            .discount-save-btn {
                border: 0;
                border-radius: 9px;
                padding: 12px 20px;
                background: linear-gradient(135deg, #e3262e, #c51019);
                color: #ffffff;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(215, 25, 32, 0.18);
                transition: all 0.2s ease;
            }

            .discount-primary-btn:hover,
            .discount-save-btn:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
                transform: translateY(-1px);
            }

            .discount-stats {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .discount-stat-card {
                padding: 20px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .discount-stat-card.highlight {
                background: #fffafa;
                border-color: #f5c6c8;
            }

            .discount-stat-card:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .discount-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .discount-stat-card span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .discount-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .discount-stat-card strong {
                display: block;
                font-size: 25px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .discount-section,
            .discount-form-card {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .discount-form-card {
                border-color: #f2bfc1;
            }

            .discount-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: flex-end;
                gap: 10px;
                margin-bottom: 14px;
            }

            .discount-filter-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .discount-filter-field.search-field {
                flex: 1;
                min-width: 190px;
            }

            .discount-filter-field label {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .discount-toolbar input,
            .discount-toolbar select {
                padding: 10px 12px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                min-width: 130px;
                outline: none;
            }

            .discount-toolbar input[type="search"] {
                width: 100%;
            }

            .discount-toolbar select {
                font-weight: 600;
            }

            .discount-reset-btn {
                padding: 10px 15px;
                border-radius: 9px;
                border: 1px solid #f2bfc1;
                background: #fff5f5;
                color: #d71920;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.18s ease;
                white-space: nowrap;
            }

            .discount-reset-btn:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .discount-filter-summary {
                display: inline-block;
                margin: 0 0 14px;
                padding: 6px 12px;
                border-radius: 7px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                color: #d71920;
                font-size: 11.5px;
                font-weight: 600;
            }

            .discount-filter-summary strong {
                font-weight: 800;
            }

            .discount-filter-summary span {
                color: #5f6672;
                margin-left: 4px;
            }

            .discount-form-card input,
            .discount-form-card select,
            .discount-form-card textarea {
                padding: 11px 13px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #ffffff;
                color: #202124;
                font-size: 12.5px;
                min-width: 0;
                outline: none;
            }

            .discount-toolbar input:focus,
            .discount-toolbar select:focus,
            .discount-form-card input:focus,
            .discount-form-card select:focus,
            .discount-form-card textarea:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .discount-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .discount-table-wrap table {
                width: 100%;
                min-width: 780px;
                border-collapse: collapse;
                background: #ffffff;
            }

            .discount-table-wrap th,
            .discount-table-wrap td {
                padding: 13px 12px;
                border-bottom: 1px solid #edf0f3;
                text-align: left;
                font-size: 11.5px;
                color: #454c57;
                vertical-align: middle;
            }

            .discount-table-wrap th {
                color: #69717e;
                background: #f8f9fb;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .discount-table-wrap tbody tr:hover {
                background: #fffafa;
            }

            .discount-table-wrap td small,
            .bulk-member-item small {
                display: block;
                color: #8a909a;
                margin-top: 3px;
                font-size: 10.5px;
            }

            .discount-id-pill {
                display: inline-block;
                margin-top: 4px;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }

            .discount-value-pill {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 6px;
                background: #fff0f0;
                color: #d71920;
                font-size: 11px;
                font-weight: 800;
            }

            .discount-status {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
            }

            .discount-status.active {
                background: #e9f8f0;
                color: #168653;
            }

            .discount-status.inactive,
            .discount-status.expired {
                background: #fff0f0;
                color: #d71920;
            }

            .discount-status.upcoming {
                background: #fff8eb;
                color: #b8740e;
            }

            .discount-actions {
                display: flex;
                gap: 6px;
            }

            .discount-actions button {
                padding: 6px 10px;
                font-size: 10.5px;
                font-weight: 600;
                border-radius: 7px;
                border: 1px solid #dfe2e8;
                background: #ffffff;
                color: #303640;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .discount-actions button:hover {
                background: #f4f6f9;
            }

            .discount-actions .discount-delete {
                background: #fff0f0;
                border-color: #f5c6c8;
                color: #d71920;
            }

            .discount-actions .discount-delete:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .discount-empty {
                text-align: center !important;
                padding: 34px 15px !important;
                color: #8a909a;
                font-size: 12px;
            }

            .discount-form-heading {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 18px;
                border-bottom: 1px solid #edf0f3;
            }

            .discount-form-heading h3 {
                margin: 0 0 3px;
                font-size: 16px;
                font-weight: 800;
                color: #202124;
            }

            .discount-form-heading p {
                margin: 0;
                font-size: 11.5px;
                color: #737985;
            }

            .discount-form-heading button {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: 1px solid #e7e9ee;
                background: #f8f9fb;
                color: #69717e;
                font-size: 15px;
                display: grid;
                place-items: center;
                cursor: pointer;
            }

            .discount-form-heading button:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }

            .discount-form-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 15px;
                margin: 16px 0;
            }

            .discount-form-grid > div,
            #singleMemberArea {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .discount-form-grid label,
            #singleMemberArea label,
            #bulkMemberArea > label {
                color: #454c57;
                font-size: 11.5px;
                font-weight: 600;
            }

            .discount-form-grid input,
            .discount-form-grid select,
            .discount-form-grid textarea,
            #singleMemberArea select {
                width: 100%;
                box-sizing: border-box;
            }

            .discount-form-full {
                grid-column: 1 / -1;
            }

            .discount-form-footer {
                display: flex;
                gap: 10px;
                margin-top: 18px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }

            .discount-cancel-btn {
                padding: 12px 18px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f3f4f6;
                color: #454c57;
                font-weight: 600;
                font-size: 12px;
                cursor: pointer;
            }

            .discount-cancel-btn:hover {
                background: #e7e9ee;
            }

            .bulk-member-tools {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin: 8px 0 10px;
            }

            .bulk-member-tools input {
                flex: 1;
                min-width: 160px;
            }

            .bulk-tool-btn {
                padding: 9px 14px;
                border-radius: 8px;
                border: 1px solid #f2bfc1;
                background: #fff0f0;
                color: #d71920;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
            }

            .bulk-tool-btn.secondary {
                border-color: #dfe2e8;
                background: #f8f9fb;
                color: #454c57;
            }

            .bulk-member-list {
                max-height: 220px;
                overflow-y: auto;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                padding: 6px;
                background: #f8f9fb;
            }

            .bulk-member-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 9px 10px;
                border-bottom: 1px solid #edf0f3;
                background: #ffffff;
                border-radius: 6px;
                margin-bottom: 4px;
                cursor: pointer;
            }

            .bulk-member-item:hover {
                background: #fffafa;
            }

            .bulk-member-item input {
                width: 16px;
                height: 16px;
                accent-color: #d71920;
            }

            @media(max-width:850px) {
                .discount-stats {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media(max-width:650px) {
                .discount-stats {
                    grid-template-columns: 1fr;
                }

                .discount-form-grid {
                    grid-template-columns: 1fr;
                }

                .discount-form-full {
                    grid-column: auto;
                }

                .discount-filter-field {
                    width: 100%;
                }

                .discount-heading button {
                    width: 100%;
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

window.GymExpenses = (function () {
    const MODULE = "expenses";

    const CATEGORIES = [
        "Rent",
        "Electricity",
        "Equipment",
        "Maintenance",
        "Trainer Salary",
        "Staff Salary",
        "Cleaning",
        "Water",
        "Marketing",
        "Other"
    ];

    const METHODS = [
        "Cash",
        "UPI",
        "Bank Transfer",
        "Card",
        "Other"
    ];

    function getExpenses() {
        return GymDB.getAll(MODULE) || [];
    }

    function today() {
        const d = new Date();
        return [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0")
        ].join("-");
    }

    function currentMonth() {
        return today().slice(0, 7);
    }

    function currency(value) {
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

    function notify(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymExpensesStyles")) return;

        const style = document.createElement("style");
        style.id = "gymExpensesStyles";

        style.textContent = `
            .expenses-wrap {
                padding: 2px 0 25px;
                color: #202124;
            }

            .expenses-header {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .expenses-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .expenses-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .expenses-header-actions {
                display: flex;
                align-items: center;
                gap: 9px;
                flex-wrap: wrap;
            }

            .expenses-sec-btn {
                padding: 11px 15px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #ffffff;
                color: #303640;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .expenses-sec-btn:hover {
                background: #fff4f4;
                border-color: #f2bfc1;
                color: #d71920;
            }

            .expenses-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }

            .expenses-stat {
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .expenses-stat:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .expenses-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .expenses-stat span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .expenses-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .expenses-stat strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .expenses-section {
                margin-top: 20px;
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .expenses-section-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 16px;
            }

            .expenses-section-top h3 {
                margin: 0 0 3px;
                font-size: 15px;
                font-weight: 800;
                color: #202124;
            }

            .expenses-section-top p {
                margin: 0;
                font-size: 11px;
                color: #737985;
            }

            .expense-month-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .expense-month-wrap label {
                font-size: 11.5px;
                font-weight: 600;
                color: #69717e;
            }

            .expense-month-picker {
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                font-weight: 600;
                outline: none;
            }

            .expense-month-picker:focus {
                background: #ffffff;
                border-color: #d71920;
            }

            .expenses-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 14px;
            }

            .expenses-toolbar input,
            .expenses-toolbar select {
                padding: 10px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
                min-width: 145px;
                transition: all 0.2s ease;
            }

            .expenses-toolbar input[type="search"] {
                flex: 1;
                min-width: 200px;
            }

            .expenses-toolbar select {
                font-weight: 600;
            }

            .expenses-toolbar input:focus,
            .expenses-toolbar select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .expense-filter-total {
                display: inline-block;
                margin: 0 0 14px;
                padding: 6px 12px;
                border-radius: 7px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                color: #d71920;
                font-weight: 700;
                font-size: 11.5px;
            }

            .expenses-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .expenses-table {
                width: 100%;
                min-width: 800px;
                border-collapse: collapse;
                background: #ffffff;
            }

            .expenses-table th,
            .expenses-table td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
            }

            .expenses-table th {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                background: #f8f9fb;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .expenses-table td {
                font-size: 11.5px;
                color: #454c57;
                vertical-align: middle;
            }

            .expenses-table tbody tr:hover {
                background: #fffafa;
            }

            .expense-id-pill {
                display: inline-block;
                margin-top: 3px;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }

            .expense-category {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                background: #fff0f0;
                color: #d71920;
                font-size: 10.5px;
                font-weight: 700;
            }

            .expense-method-pill {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 6px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 10.5px;
                font-weight: 600;
            }

            .expense-action {
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

            .expense-action:hover {
                background: #f4f6f9;
            }

            .expense-action.delete {
                background: #fff0f0;
                border-color: #f5c6c8;
                color: #d71920;
            }

            .expense-action.delete:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .expenses-empty {
                text-align: center;
                padding: 34px 15px;
                color: #8a909a;
                font-size: 12px;
            }

            .expense-breakdown {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
            }

            .expense-breakdown-item {
                padding: 15px 16px;
                border-radius: 10px;
                background: #f8f9fb;
                border: 1px solid #edf0f3;
            }

            .expense-breakdown-item.highlight {
                background: #fff5f5;
                border-color: #f7d4d6;
            }

            .expense-breakdown-item span {
                display: block;
                font-size: 11px;
                font-weight: 600;
                color: #69717e;
                margin-bottom: 6px;
            }

            .expense-breakdown-item strong {
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .expense-breakdown-item.highlight strong {
                color: #d71920;
            }

            .expense-breakdown-bar {
                height: 5px;
                background: #e7e9ee;
                border-radius: 99px;
                overflow: hidden;
                margin: 8px 0 6px;
            }

            .expense-breakdown-fill {
                height: 100%;
                background: #d71920;
                border-radius: 99px;
            }

            .expense-breakdown-item small {
                display: block;
                color: #8a909a;
                font-size: 10.5px;
            }

            /* MODAL */
            .expense-modal {
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

            .expense-modal-box {
                width: 100%;
                max-width: 480px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 26px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
            }

            .expense-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 14px;
                border-bottom: 1px solid #edf0f3;
            }

            .expense-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 800;
                color: #202124;
            }

            .expense-modal-close {
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

            .expense-modal-close:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }

            .expense-form label {
                display: block;
                margin: 14px 0 6px;
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
            }

            .expense-form input,
            .expense-form select,
            .expense-form textarea {
                width: 100%;
                padding: 11px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #ffffff;
                color: #202124;
                font-size: 12.5px;
                outline: none;
                box-sizing: border-box;
            }

            .expense-form input:focus,
            .expense-form select:focus,
            .expense-form textarea:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .expense-form textarea {
                min-height: 75px;
                resize: vertical;
            }

            .expense-form-actions {
                display: flex;
                gap: 12px;
                margin-top: 22px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }

            .expense-form-actions button {
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

            .expense-form-actions button:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }

            .expense-form-actions .cancel {
                background: #f3f4f6;
                color: #454c57;
                border: 1px solid #dfe2e8;
                box-shadow: none;
            }

            .expense-form-actions .cancel:hover {
                background: #e7e9ee;
            }

            @media(max-width:750px) {
                .expense-breakdown {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media(max-width:650px) {
                .expenses-stats {
                    grid-template-columns: 1fr;
                }
                .expense-breakdown {
                    grid-template-columns: 1fr;
                }
                .expense-modal-box {
                    padding: 18px;
                }
                .expenses-header-actions {
                    width: 100%;
                }
                .expenses-header-actions button {
                    flex: 1;
                }
            }

            @media print {
                body * { visibility: hidden !important; }

                #expensePrintArea,
                #expensePrintArea * {
                    visibility: visible !important;
                }

                #expensePrintArea {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    color: #000 !important;
                    background: #fff !important;
                }

                #expensePrintArea table {
                    width: 100%;
                    border-collapse: collapse;
                }

                #expensePrintArea th,
                #expensePrintArea td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    color: #000 !important;
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
            <div class="expenses-wrap" id="expensePrintArea">

                <div class="expenses-header">
                    <div>
                        <h2>Expense & Operational Cost Tracker</h2>
                        <p>Record gym overheads, salaries, equipment costs and export statements.</p>
                    </div>

                    <div class="expenses-header-actions">
                        <button class="btn btn-primary" id="addExpenseBtn">
                            + Add Expense
                        </button>

                        <button class="expenses-sec-btn" id="exportExpenseBtn">
                            Export CSV
                        </button>

                        <button class="expenses-sec-btn" id="printExpenseBtn">
                            Print Report
                        </button>
                    </div>
                </div>

                <div class="expenses-stats">
                    <div class="expenses-stat">
                        <div class="expenses-stat-top">
                            <span>Total Cumulative Expenses</span>
                            <div class="expenses-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="totalExpensesAmount">₹0</strong>
                    </div>

                    <div class="expenses-stat">
                        <div class="expenses-stat-top">
                            <span>Today's Expenses</span>
                            <div class="expenses-stat-dot" style="background:#d97706;"></div>
                        </div>
                        <strong id="todayExpensesAmount">₹0</strong>
                    </div>

                    <div class="expenses-stat">
                        <div class="expenses-stat-top">
                            <span>This Month Expenses</span>
                            <div class="expenses-stat-dot" style="background:#2879d0;"></div>
                        </div>
                        <strong id="monthExpensesAmount">₹0</strong>
                    </div>
                </div>

                <div class="expenses-section">
                    <div class="expenses-section-top">
                        <div>
                            <h3>Monthly Category Breakdown</h3>
                            <p>Category-wise spending distribution for the selected month</p>
                        </div>

                        <div class="expense-month-wrap">
                            <label for="expenseReportMonth">Month:</label>
                            <input type="month" id="expenseReportMonth"
                                class="expense-month-picker"
                                value="${currentMonth()}">
                        </div>
                    </div>

                    <div class="expense-breakdown" id="expenseBreakdown"></div>
                </div>

                <div class="expenses-section">
                    <div class="expenses-section-top">
                        <div>
                            <h3>Expense History</h3>
                            <p>Search, filter and manage individual expense entries</p>
                        </div>
                    </div>

                    <div class="expenses-toolbar">
                        <input type="search" id="expenseSearch"
                            placeholder="Search title, category or ID...">

                        <input type="date" id="expenseDateFilter"
                            title="Filter by exact date">

                        <input type="date" id="expenseFromDate"
                            title="From date">

                        <input type="date" id="expenseToDate"
                            title="To date">

                        <select id="expenseCategoryFilter">
                            <option value="all">All Categories</option>
                            ${CATEGORIES.map(category => `
                                <option value="${escapeHTML(category)}">
                                    ${escapeHTML(category)}
                                </option>
                            `).join("")}
                        </select>

                        <select id="expenseMethodFilter">
                            <option value="all">All Payment Methods</option>
                            ${METHODS.map(method => `
                                <option value="${escapeHTML(method)}">
                                    ${escapeHTML(method)}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <p class="expense-filter-total" id="expenseFilterTotal">
                        Showing ₹0
                    </p>

                    <div class="expenses-table-wrap">
                        <table class="expenses-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Payment Method</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody id="expensesTableBody"></tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div class="expense-modal" id="expenseModal">
                <div class="expense-modal-box">
                    <div class="expense-modal-header">
                        <h3 id="expenseFormTitle">Add New Expense</h3>
                        <button type="button" class="expense-modal-close" id="closeExpenseX" aria-label="Close">✕</button>
                    </div>

                    <form class="expense-form" id="expenseForm">
                        <input type="hidden" id="expenseId">

                        <label>Expense Title *</label>
                        <input type="text" id="expenseTitle"
                            placeholder="Example: Monthly Electricity Bill"
                            maxlength="100" required>

                        <label>Category *</label>
                        <select id="expenseCategory" required>
                            ${CATEGORIES.map(category => `
                                <option value="${escapeHTML(category)}">
                                    ${escapeHTML(category)}
                                </option>
                            `).join("")}
                        </select>

                        <label>Amount (₹) *</label>
                        <input type="number" id="expenseAmount"
                            min="0.01" step="0.01"
                            placeholder="Enter amount" required>

                        <label>Expense Date *</label>
                        <input type="date" id="expenseDate"
                            max="${today()}" value="${today()}" required>

                        <label>Payment Method</label>
                        <select id="expenseMethod">
                            ${METHODS.map(method => `
                                <option value="${escapeHTML(method)}">
                                    ${escapeHTML(method)}
                                </option>
                            `).join("")}
                        </select>

                        <label>Notes</label>
                        <textarea id="expenseNotes"
                            maxlength="1000"
                            placeholder="Optional details (bill number, vendor name, etc.)"></textarea>

                        <div class="expense-form-actions">
                            <button type="submit">Save Expense</button>
                            <button type="button" class="cancel"
                                id="cancelExpenseBtn">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById("addExpenseBtn")
            .addEventListener("click", () => openForm());

        document.getElementById("cancelExpenseBtn")
            .addEventListener("click", closeForm);

        document.getElementById("closeExpenseX")
            .addEventListener("click", closeForm);

        document.getElementById("expenseForm")
            .addEventListener("submit", saveExpense);

        [
            "expenseSearch",
            "expenseDateFilter",
            "expenseFromDate",
            "expenseToDate",
            "expenseCategoryFilter",
            "expenseMethodFilter"
        ].forEach(id => {
            const element = document.getElementById(id);
            element.addEventListener(
                element.tagName === "INPUT" && element.type === "search"
                    ? "input" : "change",
                renderTable
            );
        });

        document.getElementById("expenseReportMonth")
            .addEventListener("change", renderBreakdown);

        document.getElementById("exportExpenseBtn")
            .addEventListener("click", exportCSV);

        document.getElementById("printExpenseBtn")
            .addEventListener("click", printExpenses);

        renderTable();
        renderBreakdown();
    }

    function openForm(expense) {
        const form = document.getElementById("expenseForm");
        form.reset();

        document.getElementById("expenseId").value = "";
        document.getElementById("expenseFormTitle").textContent = "Add New Expense";
        document.getElementById("expenseDate").value = today();
        document.getElementById("expenseDate").max = today();

        if (expense) {
            document.getElementById("expenseFormTitle").textContent = "Edit Expense";

            document.getElementById("expenseId").value = expense.id;
            document.getElementById("expenseTitle").value = expense.title || "";
            document.getElementById("expenseCategory").value =
                CATEGORIES.includes(expense.category) ? expense.category : "Other";
            document.getElementById("expenseAmount").value = expense.amount ?? "";
            document.getElementById("expenseDate").value = expense.date || today();
            document.getElementById("expenseMethod").value =
                METHODS.includes(expense.method) ? expense.method : "Other";
            document.getElementById("expenseNotes").value = expense.notes || "";
        }

        document.getElementById("expenseModal").style.display = "flex";
    }

    function closeForm() {
        document.getElementById("expenseModal").style.display = "none";
    }

    function saveExpense(event) {
        event.preventDefault();

        const id = document.getElementById("expenseId").value;
        const title = document.getElementById("expenseTitle").value.trim();
        const amount = Number(document.getElementById("expenseAmount").value);
        const date = document.getElementById("expenseDate").value;
        const category = document.getElementById("expenseCategory").value;
        const method = document.getElementById("expenseMethod").value;

        if (!title || !Number.isFinite(amount) || amount <= 0) {
            alert("Please enter a valid expense title and amount.");
            return;
        }

        if (!date || date > today()) {
            alert("Please select a valid expense date.");
            return;
        }

        if (!CATEGORIES.includes(category) || !METHODS.includes(method)) {
            alert("Please select a valid category and payment method.");
            return;
        }

        const existing = id ? GymDB.find(MODULE, id) : null;

        if (id && !existing) {
            alert("Expense record not found.");
            return;
        }

        const expenseData = {
            ...(existing || {}),
            title,
            category,
            amount,
            date,
            method,
            notes: document.getElementById("expenseNotes").value.trim(),
            updatedAt: new Date().toISOString()
        };

        let saved;

        if (id) {
            saved = GymDB.update(MODULE, id, expenseData);
        } else {
            expenseData.id = GymDB.generateID("EXP");
            expenseData.createdAt = new Date().toISOString();
            saved = GymDB.add(MODULE, expenseData);
        }

        if (!saved) {
            alert("Expense could not be saved. Please try again.");
            return;
        }

        closeForm();
        renderTable();
        renderBreakdown();

        notify(id ? "Expense updated successfully." : "Expense saved successfully.");

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function deleteExpense(id) {
        const expense = GymDB.find(MODULE, id);
        if (!expense) return;

        if (!confirm(
            "Are you sure you want to delete this expense record?"
        )) return;

        const deleted = GymDB.delete(MODULE, id);

        if (!deleted) {
            alert("Expense could not be deleted.");
            return;
        }

        renderTable();
        renderBreakdown();

        notify("Expense deleted successfully.");

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function getFilteredExpenses() {
        const expenses = getExpenses();

        const search = document.getElementById("expenseSearch")
            .value.trim().toLowerCase();

        const exactDate = document.getElementById("expenseDateFilter").value;
        const fromDate = document.getElementById("expenseFromDate").value;
        const toDate = document.getElementById("expenseToDate").value;

        const category = document.getElementById("expenseCategoryFilter").value;
        const method = document.getElementById("expenseMethodFilter").value;

        if (fromDate && toDate && fromDate > toDate) {
            return [];
        }

        return expenses.filter(item => {
            const matchesSearch =
                String(item.title || "").toLowerCase().includes(search) ||
                String(item.category || "").toLowerCase().includes(search) ||
                String(item.method || "").toLowerCase().includes(search) ||
                String(item.id || "").toLowerCase().includes(search);

            const matchesExactDate =
                !exactDate || item.date === exactDate;

            const matchesFrom =
                !fromDate || item.date >= fromDate;

            const matchesTo =
                !toDate || item.date <= toDate;

            const matchesCategory =
                category === "all" || item.category === category;

            const matchesMethod =
                method === "all" || item.method === method;

            return matchesSearch &&
                matchesExactDate &&
                matchesFrom &&
                matchesTo &&
                matchesCategory &&
                matchesMethod;
        }).sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || ""))
        );
    }

    function renderTable() {
        const table = document.getElementById("expensesTableBody");
        if (!table) return;

        const expenses = getExpenses();
        const month = currentMonth();
        const currentDay = today();

        const total = expenses.reduce((sum, item) =>
            sum + Number(item.amount || 0), 0
        );

        const todayTotal = expenses
            .filter(item => item.date === currentDay)
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const monthTotal = expenses
            .filter(item => String(item.date || "").startsWith(month))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        document.getElementById("totalExpensesAmount").textContent = currency(total);
        document.getElementById("todayExpensesAmount").textContent = currency(todayTotal);
        document.getElementById("monthExpensesAmount").textContent = currency(monthTotal);

        const filtered = getFilteredExpenses();

        const filteredTotal = filtered.reduce((sum, item) =>
            sum + Number(item.amount || 0), 0
        );

        document.getElementById("expenseFilterTotal").textContent =
            "Filtered Total: " + currency(filteredTotal) +
            " (" + filtered.length + " record" + (filtered.length === 1 ? "" : "s") + ")";

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="expenses-empty">
                        No expense records found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(item => `
            <tr>
                <td>
                    <strong style="color:#202124;">${escapeHTML(item.title)}</strong>
                    <br>
                    <span class="expense-id-pill">${escapeHTML(item.id)}</span>
                </td>
                <td>
                    <span class="expense-category">
                        ${escapeHTML(item.category)}
                    </span>
                </td>
                <td>${escapeHTML(item.date)}</td>
                <td>
                    <span class="expense-method-pill">
                        ${escapeHTML(item.method || "-")}
                    </span>
                </td>
                <td><strong style="color:#d71920;">${currency(item.amount)}</strong></td>
                <td>
                    <button class="expense-action"
                        data-edit-expense="${escapeHTML(item.id)}">
                        Edit
                    </button>

                    <button class="expense-action delete"
                        data-delete-expense="${escapeHTML(item.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");

        table.querySelectorAll("[data-edit-expense]").forEach(button => {
            button.addEventListener("click", function () {
                const expense = GymDB.find(MODULE, this.dataset.editExpense);
                if (expense) openForm(expense);
            });
        });

        table.querySelectorAll("[data-delete-expense]").forEach(button => {
            button.addEventListener("click", function () {
                deleteExpense(this.dataset.deleteExpense);
            });
        });
    }

    // MONTHLY CATEGORY BREAKDOWN

    function renderBreakdown() {
        const container = document.getElementById("expenseBreakdown");
        if (!container) return;

        const month = document.getElementById("expenseReportMonth").value;

        const expenses = getExpenses().filter(item =>
            String(item.date || "").startsWith(month)
        );

        const total = expenses.reduce((sum, item) =>
            sum + Number(item.amount || 0), 0
        );

        if (!expenses.length) {
            container.innerHTML = `
                <div class="expenses-empty" style="grid-column:1/-1;">
                    No expenses recorded for this month.
                </div>
            `;
            return;
        }

        const grouped = {};

        expenses.forEach(item => {
            const category = item.category || "Other";
            grouped[category] = (grouped[category] || 0) +
                Number(item.amount || 0);
        });

        const sorted = Object.entries(grouped)
            .sort((a, b) => b[1] - a[1]);

        container.innerHTML = `
            <div class="expense-breakdown-item highlight">
                <span>Total Monthly Expenses</span>
                <strong>${currency(total)}</strong>
                <div class="expense-breakdown-bar">
                    <div class="expense-breakdown-fill" style="width:100%;"></div>
                </div>
                <small>${expenses.length} expense record(s)</small>
            </div>

            ${sorted.map(([category, amount]) => {
                const percentage = total > 0
                    ? ((amount / total) * 100).toFixed(1)
                    : 0;

                return `
                    <div class="expense-breakdown-item">
                        <span>${escapeHTML(category)}</span>
                        <strong>${currency(amount)}</strong>
                        <div class="expense-breakdown-bar">
                            <div class="expense-breakdown-fill" style="width:${percentage}%;"></div>
                        </div>
                        <small>${percentage}% of monthly expenses</small>
                    </div>
                `;
            }).join("")}
        `;
    }

    // CSV EXPORT

    function exportCSV() {
        const expenses = getFilteredExpenses();

        if (!expenses.length) {
            alert("No expense records available to export.");
            return;
        }

        const headers = [
            "Expense ID",
            "Title",
            "Category",
            "Amount",
            "Date",
            "Payment Method",
            "Notes"
        ];

        function csvCell(value) {
            let text = String(value ?? "");

            // Protect spreadsheet users from formula injection.
            if (/^[=+\-@\t\r]/.test(text)) {
                text = "'" + text;
            }

            return '"' + text.replace(/"/g, '""') + '"';
        }

        const rows = expenses.map(item => [
            item.id,
            item.title,
            item.category,
            item.amount,
            item.date,
            item.method,
            item.notes
        ]);

        const csv = "\uFEFF" + [
            headers,
            ...rows
        ].map(row => row.map(csvCell).join(",")).join("\r\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "GYM-PRO-Expenses-" + today() + ".csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        notify("Expense CSV exported successfully.");
    }

    // PRINT REPORT

    function printExpenses() {
        const expenses = getFilteredExpenses();

        if (!expenses.length) {
            alert("No expense records available to print.");
            return;
        }

        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert("Please allow pop-ups to print the expense report.");
            return;
        }

        const total = expenses.reduce((sum, item) =>
            sum + Number(item.amount || 0), 0
        );

        const rows = expenses.map(item => `
            <tr>
                <td>${escapeHTML(item.id)}</td>
                <td>${escapeHTML(item.title)}</td>
                <td>${escapeHTML(item.category)}</td>
                <td>${escapeHTML(item.date)}</td>
                <td>${escapeHTML(item.method || "-")}</td>
                <td>${currency(item.amount)}</td>
            </tr>
        `).join("");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>GYM PRO Expense Report</title>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        padding: 28px;
                        color: #202124;
                    }

                    h1 { margin-bottom: 4px; color: #d71920; }
                    p { color: #5f6672; font-size: 13px; margin: 4px 0; }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }

                    th, td {
                        border: 1px solid #dfe2e8;
                        padding: 10px;
                        text-align: left;
                        font-size: 12px;
                    }

                    th { background: #f8f9fb; font-weight: 700; }

                    .total {
                        margin-top: 20px;
                        font-size: 17px;
                        font-weight: 800;
                        color: #d71920;
                    }
                </style>
            </head>
            <body>
                <h1>GYM PRO — Expense Report</h1>
                <p>Generated on: ${escapeHTML(today())}</p>
                <p>Total Records: ${expenses.length}</p>

                <table>
                    <thead>
                        <tr>
                            <th>Expense ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Date</th>
                            <th>Payment Method</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>

                <div class="total">
                    Total Expenses: ${currency(total)}
                </div>

                <script>
                    window.onload = function () {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    return {
        render,
        refresh: renderTable,
        getExpenses
    };
})();

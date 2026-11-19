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

    function injectStyles() {
        if (document.getElementById("gymExpensesStyles")) return;

        const style = document.createElement("style");
        style.id = "gymExpensesStyles";

        style.textContent = `
            .expenses-wrap { padding:5px 0 25px; }

            .expenses-header {
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:15px;
                margin-bottom:22px;
            }

            .expenses-header h2 { margin:0 0 6px; }
            .expenses-header p { margin:0; opacity:.7; }

            .expenses-header-actions {
                display:flex;
                gap:9px;
                flex-wrap:wrap;
            }

            .expenses-stats {
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:15px;
                margin-bottom:22px;
            }

            .expenses-stat {
                padding:20px;
                border-radius:14px;
                background:rgba(255,255,255,.05);
                border:1px solid rgba(255,255,255,.08);
            }

            .expenses-stat span {
                display:block;
                opacity:.7;
                font-size:13px;
                margin-bottom:9px;
            }

            .expenses-stat strong { font-size:24px; }

            .expenses-section {
                margin-top:20px;
                padding:18px;
                border-radius:14px;
                background:rgba(255,255,255,.035);
                border:1px solid rgba(255,255,255,.08);
            }

            .expenses-section h3 { margin-top:0; }

            .expenses-toolbar {
                display:flex;
                flex-wrap:wrap;
                gap:12px;
                margin-bottom:18px;
            }

            .expenses-toolbar input,
            .expenses-toolbar select {
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
                min-width:150px;
            }

            .expenses-table-wrap {
                overflow-x:auto;
                border-radius:13px;
            }

            .expenses-table {
                width:100%;
                min-width:780px;
                border-collapse:collapse;
            }

            .expenses-table th,
            .expenses-table td {
                padding:14px;
                text-align:left;
                border-bottom:1px solid rgba(255,255,255,.08);
            }

            .expenses-table th {
                font-size:12px;
                opacity:.7;
                text-transform:uppercase;
            }

            .expense-category {
                display:inline-block;
                padding:5px 10px;
                border-radius:20px;
                background:rgba(120,90,220,.15);
                color:#c7adff;
                font-size:11px;
            }

            .expense-action {
                padding:7px 11px;
                border:0;
                border-radius:7px;
                margin:2px;
                cursor:pointer;
                color:white;
                background:#6845b8;
            }

            .expense-action.delete { background:#a93650; }

            .expenses-empty {
                text-align:center;
                padding:35px 15px;
                opacity:.65;
            }

            .expense-modal {
                position:fixed;
                inset:0;
                z-index:9999;
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                background:rgba(0,0,0,.75);
            }

            .expense-modal-box {
                width:100%;
                max-width:470px;
                max-height:90vh;
                overflow-y:auto;
                padding:24px;
                border-radius:16px;
                background:#211a32;
                border:1px solid rgba(255,255,255,.12);
            }

            .expense-modal-box h3 { margin-top:0; }

            .expense-form label {
                display:block;
                margin:14px 0 7px;
                font-size:13px;
            }

            .expense-form input,
            .expense-form select,
            .expense-form textarea {
                width:100%;
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
                box-sizing:border-box;
            }

            .expense-form textarea {
                min-height:75px;
                resize:vertical;
            }

            .expense-form-actions {
                display:flex;
                gap:10px;
                margin-top:20px;
            }

            .expense-form-actions button {
                flex:1;
                padding:12px;
                border:0;
                border-radius:9px;
                cursor:pointer;
                color:white;
                background:#8055d9;
                font-weight:600;
            }

            .expense-form-actions .cancel { background:#494253; }

            .expense-breakdown {
                display:grid;
                grid-template-columns:repeat(2,1fr);
                gap:12px;
            }

            .expense-breakdown-item {
                padding:13px;
                border-radius:10px;
                background:rgba(255,255,255,.05);
                border:1px solid rgba(255,255,255,.07);
            }

            .expense-breakdown-item span {
                display:block;
                font-size:12px;
                opacity:.7;
                margin-bottom:7px;
            }

            .expense-breakdown-item strong {
                font-size:16px;
            }

            .expense-breakdown-item small {
                display:block;
                opacity:.6;
                margin-top:5px;
            }

            .expense-month-picker {
                padding:10px;
                border-radius:8px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                margin-bottom:15px;
            }

            .expense-filter-total {
                margin:0 0 12px;
                opacity:.8;
                font-size:13px;
            }

            @media(max-width:650px) {
                .expenses-stats { grid-template-columns:1fr; }
                .expense-breakdown { grid-template-columns:1fr; }
                .expense-modal-box { padding:18px; }
            }

            @media print {
                body * { visibility:hidden !important; }

                #expensePrintArea,
                #expensePrintArea * {
                    visibility:visible !important;
                }

                #expensePrintArea {
                    position:absolute;
                    left:0;
                    top:0;
                    width:100%;
                    color:#000 !important;
                    background:#fff !important;
                }

                #expensePrintArea table {
                    width:100%;
                    border-collapse:collapse;
                }

                #expensePrintArea th,
                #expensePrintArea td {
                    border:1px solid #ccc;
                    padding:8px;
                    color:#000 !important;
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
                        <h2>Expense Management</h2>
                        <p>Track and manage all gym expenses.</p>
                    </div>

                    <div class="expenses-header-actions">
                        <button class="btn btn-primary" id="addExpenseBtn">
                            + Add Expense
                        </button>

                        <button class="expense-action" id="exportExpenseBtn">
                            Export CSV
                        </button>

                        <button class="expense-action" id="printExpenseBtn">
                            Print
                        </button>
                    </div>
                </div>

                <div class="expenses-stats">
                    <div class="expenses-stat">
                        <span>Total Expenses</span>
                        <strong id="totalExpensesAmount">₹0</strong>
                    </div>

                    <div class="expenses-stat">
                        <span>Today's Expenses</span>
                        <strong id="todayExpensesAmount">₹0</strong>
                    </div>

                    <div class="expenses-stat">
                        <span>This Month Expenses</span>
                        <strong id="monthExpensesAmount">₹0</strong>
                    </div>
                </div>

                <div class="expenses-section">
                    <h3>Monthly Category Breakdown</h3>

                    <label for="expenseReportMonth">Select Month</label>
                    <br>

                    <input type="month" id="expenseReportMonth"
                        class="expense-month-picker"
                        value="${currentMonth()}">

                    <div class="expense-breakdown" id="expenseBreakdown"></div>
                </div>

                <div class="expenses-section">
                    <h3>Expense History</h3>

                    <div class="expenses-toolbar">
                        <input type="search" id="expenseSearch"
                            placeholder="Search expense...">

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
                    <h3 id="expenseFormTitle">Add New Expense</h3>

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
                            placeholder="Optional details"></textarea>

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
            "Showing " + currency(filteredTotal) +
            " across " + filtered.length + " record(s).";

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
                    <strong>${escapeHTML(item.title)}</strong>
                    <br>
                    <small>${escapeHTML(item.id)}</small>
                </td>
                <td>
                    <span class="expense-category">
                        ${escapeHTML(item.category)}
                    </span>
                </td>
                <td>${escapeHTML(item.date)}</td>
                <td>${escapeHTML(item.method || "-")}</td>
                <td><strong>${currency(item.amount)}</strong></td>
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
                <div class="expenses-empty">
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
            <div class="expense-breakdown-item">
                <span>Total Monthly Expenses</span>
                <strong>${currency(total)}</strong>
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
                        font-family:Arial,sans-serif;
                        padding:25px;
                        color:#222;
                    }

                    h1 { margin-bottom:5px; }
                    p { color:#555; }

                    table {
                        width:100%;
                        border-collapse:collapse;
                        margin-top:20px;
                    }

                    th,td {
                        border:1px solid #ccc;
                        padding:10px;
                        text-align:left;
                        font-size:12px;
                    }

                    th { background:#eee; }

                    .total {
                        margin-top:20px;
                        font-size:18px;
                        font-weight:bold;
                    }
                </style>
            </head>
            <body>
                <h1>GYM PRO - Expense Report</h1>
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

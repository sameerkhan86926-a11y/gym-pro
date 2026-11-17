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
            }

            .expenses-table-wrap {
                overflow-x:auto;
                border-radius:13px;
            }

            .expenses-table {
                width:100%;
                min-width:700px;
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

            @media(max-width:650px) {
                .expenses-stats { grid-template-columns:1fr; }
            }
        `;

        document.head.appendChild(style);
    }

    function render() {
        injectStyles();

        const container = document.getElementById("modulePlaceholder");
        if (!container) return;

        container.innerHTML = `
            <div class="expenses-wrap">

                <div class="expenses-header">
                    <div>
                        <h2>Expenses Management</h2>
                        <p>Track and manage all gym expenses.</p>
                    </div>

                    <button class="btn btn-primary" id="addExpenseBtn">
                        + Add Expense
                    </button>
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
                    <h3>Expense History</h3>

                    <div class="expenses-toolbar">
                        <input type="search" id="expenseSearch"
                            placeholder="Search expense...">

                        <input type="date" id="expenseDateFilter">

                        <select id="expenseCategoryFilter">
                            <option value="all">All Categories</option>
                            ${CATEGORIES.map(category => `
                                <option value="${escapeHTML(category)}">
                                    ${escapeHTML(category)}
                                </option>
                            `).join("")}
                        </select>
                    </div>

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
                            required>

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
                            value="${today()}" required>

                        <label>Payment Method</label>
                        <select id="expenseMethod">
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="Other">Other</option>
                        </select>

                        <label>Notes</label>
                        <textarea id="expenseNotes"
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

        document.getElementById("expenseSearch")
            .addEventListener("input", renderTable);

        document.getElementById("expenseDateFilter")
            .addEventListener("change", renderTable);

        document.getElementById("expenseCategoryFilter")
            .addEventListener("change", renderTable);

        renderTable();
    }

    function openForm(expense) {
        const form = document.getElementById("expenseForm");

        form.reset();

        document.getElementById("expenseId").value = "";
        document.getElementById("expenseFormTitle").textContent = "Add New Expense";
        document.getElementById("expenseDate").value = today();

        if (expense) {
            document.getElementById("expenseFormTitle").textContent = "Edit Expense";

            document.getElementById("expenseId").value = expense.id;
            document.getElementById("expenseTitle").value = expense.title || "";
            document.getElementById("expenseCategory").value = expense.category || "Other";
            document.getElementById("expenseAmount").value = expense.amount ?? "";
            document.getElementById("expenseDate").value = expense.date || today();
            document.getElementById("expenseMethod").value = expense.method || "Cash";
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

        if (!title || !Number.isFinite(amount) || amount <= 0) {
            alert("Please enter a valid expense title and amount.");
            return;
        }

        if (!date || date > today()) {
            alert("Please select a valid expense date.");
            return;
        }

        const existing = id ? GymDB.find(MODULE, id) : null;

        const expenseData = {
            ...(existing || {}),
            title: title,
            category: document.getElementById("expenseCategory").value,
            amount: amount,
            date: date,
            method: document.getElementById("expenseMethod").value,
            notes: document.getElementById("expenseNotes").value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (id) {
            GymDB.update(MODULE, id, expenseData);
        } else {
            expenseData.id = GymDB.generateID("EXP");
            expenseData.createdAt = new Date().toISOString();
            GymDB.add(MODULE, expenseData);
        }

        closeForm();
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast(id ? "Expense updated successfully" : "Expense saved successfully");
        } else {
            alert(id ? "Expense updated successfully." : "Expense saved successfully.");
        }

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function deleteExpense(id) {
        const expense = GymDB.find(MODULE, id);
        if (!expense) return;

        if (!confirm("Are you sure you want to delete this expense record?")) {
            return;
        }

        GymDB.delete(MODULE, id);
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast("Expense deleted successfully");
        }

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function renderTable() {
        const table = document.getElementById("expensesTableBody");
        if (!table) return;

        const expenses = getExpenses();
        const month = currentMonth();
        const currentDay = today();

        const total = expenses.reduce((sum, item) => {
            return sum + Number(item.amount || 0);
        }, 0);

        const todayTotal = expenses
            .filter(item => item.date === currentDay)
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const monthTotal = expenses
            .filter(item => String(item.date || "").startsWith(month))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        document.getElementById("totalExpensesAmount").textContent = currency(total);
        document.getElementById("todayExpensesAmount").textContent = currency(todayTotal);
        document.getElementById("monthExpensesAmount").textContent = currency(monthTotal);

        const search = document.getElementById("expenseSearch").value
            .trim().toLowerCase();

        const dateFilter = document.getElementById("expenseDateFilter").value;
        const categoryFilter = document.getElementById("expenseCategoryFilter").value;

        const filtered = expenses.filter(item => {
            const matchesSearch =
                (item.title || "").toLowerCase().includes(search) ||
                (item.category || "").toLowerCase().includes(search);

            const matchesDate = !dateFilter || item.date === dateFilter;

            const matchesCategory =
                categoryFilter === "all" || item.category === categoryFilter;

            return matchesSearch && matchesDate && matchesCategory;
        }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

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
                <td><strong>${escapeHTML(item.title)}</strong></td>
                <td>
                    <span class="expense-category">
                        ${escapeHTML(item.category)}
                    </span>
                </td>
                <td>${escapeHTML(item.date)}</td>
                <td>${escapeHTML(item.method)}</td>
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

    return {
        render: render,
        refresh: renderTable
    };
})();

window.GymReports = (function () {
    const MODULE = "reports";

    function today() {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - offset * 60000)
            .toISOString().slice(0, 10);
    }

    function getData(collection) {
        return GymDB.getAll(collection) || [];
    }

    function money(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN");
    }

    function dateFormat(date) {
        if (!date) return "-";
        const d = new Date(date + "T00:00:00");
        if (isNaN(d)) return date;
        return d.toLocaleDateString("en-IN");
    }

    function getRange(type) {
        const end = new Date();
        const start = new Date();

        if (type === "daily") {
            // Today
        } else if (type === "weekly") {
            start.setDate(start.getDate() - 6);
        } else if (type === "monthly") {
            start.setDate(1);
        } else if (type === "yearly") {
            start.setMonth(0, 1);
        }

        const format = d => {
            const offset = d.getTimezoneOffset();
            return new Date(d.getTime() - offset * 60000)
                .toISOString().slice(0, 10);
        };

        return {
            from: format(start),
            to: format(end)
        };
    }

    function calculate(from, to) {
        const payments = getData("payments");
        const expenses = getData("expenses");
        const members = getData("members");
        const attendance = getData("attendance");

        const filteredPayments = payments.filter(p =>
            p.date >= from && p.date <= to
        );

        const filteredExpenses = expenses.filter(e =>
            e.date >= from && e.date <= to
        );

        const revenue = filteredPayments.reduce(
            (sum, p) => sum + Number(p.amount || 0), 0
        );

        const expenseTotal = filteredExpenses.reduce(
            (sum, e) => sum + Number(e.amount || 0), 0
        );

        const pending = members.reduce((sum, member) => {
            const paid = payments
                .filter(p => p.memberId === member.id)
                .reduce((total, p) => total + Number(p.amount || 0), 0);

            return sum + Math.max(0, Number(member.fees || 0) - paid);
        }, 0);

        const activeMembers = members.filter(m =>
            m.status === "active"
        ).length;

        const attendanceCount = attendance.filter(a =>
            a.date >= from && a.date <= to
        ).length;

        return {
            revenue,
            expenseTotal,
            profit: revenue - expenseTotal,
            pending,
            activeMembers,
            totalMembers: members.length,
            attendanceCount,
            payments: filteredPayments,
            expenses: filteredExpenses
        };
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");
        if (!root) return;

        root.innerHTML = `
            <div class="report-module">
                <div class="report-header">
                    <div>
                        <h2>Reports & Analytics</h2>
                        <p>Gym income, expenses and performance reports</p>
                    </div>
                    <button class="report-export" id="exportReportBtn">
                        Export CSV
                    </button>
                </div>

                <div class="report-filters">
                    <div>
                        <label>Report Period</label>
                        <select id="reportPeriod">
                            <option value="daily">Today</option>
                            <option value="weekly">Last 7 Days</option>
                            <option value="monthly" selected>This Month</option>
                            <option value="yearly">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    <div>
                        <label>From Date</label>
                        <input type="date" id="reportFrom">
                    </div>

                    <div>
                        <label>To Date</label>
                        <input type="date" id="reportTo">
                    </div>

                    <button id="generateReportBtn">Generate Report</button>
                </div>

                <div class="report-cards">
                    <div class="report-card">
                        <span>Total Collection</span>
                        <h3 id="reportRevenue">₹0</h3>
                    </div>

                    <div class="report-card">
                        <span>Total Expenses</span>
                        <h3 id="reportExpenses">₹0</h3>
                    </div>

                    <div class="report-card">
                        <span>Net Balance</span>
                        <h3 id="reportProfit">₹0</h3>
                    </div>

                    <div class="report-card">
                        <span>Pending Fees</span>
                        <h3 id="reportPending">₹0</h3>
                    </div>

                    <div class="report-card">
                        <span>Active Members</span>
                        <h3 id="reportActive">0</h3>
                    </div>

                    <div class="report-card">
                        <span>Attendance Records</span>
                        <h3 id="reportAttendance">0</h3>
                    </div>
                </div>

                <div class="report-section">
                    <h3>Collection Details</h3>
                    <div class="report-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Member</th>
                                    <th>Payment Method</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody id="reportPaymentsTable">
                                <tr><td colspan="4">No payment records</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="report-section">
                    <h3>Expense Details</h3>
                    <div class="report-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Expense</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody id="reportExpensesTable">
                                <tr><td colspan="4">No expense records</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        addStyles();
        setDefaultDates();
        attachEvents();
        generateReport();
    }

    function setDefaultDates() {
        const range = getRange("monthly");
        document.getElementById("reportFrom").value = range.from;
        document.getElementById("reportTo").value = range.to;
    }

    function attachEvents() {
        document.getElementById("reportPeriod").addEventListener("change", function () {
            const type = this.value;

            if (type !== "custom") {
                const range = getRange(type);
                document.getElementById("reportFrom").value = range.from;
                document.getElementById("reportTo").value = range.to;
                generateReport();
            }
        });

        document.getElementById("generateReportBtn")
            .addEventListener("click", generateReport);

        document.getElementById("exportReportBtn")
            .addEventListener("click", exportCSV);
    }

    function generateReport() {
        const from = document.getElementById("reportFrom").value;
        const to = document.getElementById("reportTo").value;

        if (!from || !to) {
            alert("Please select both dates.");
            return;
        }

        if (from > to) {
            alert("From date cannot be after To date.");
            return;
        }

        const data = calculate(from, to);

        document.getElementById("reportRevenue").textContent =
            money(data.revenue);

        document.getElementById("reportExpenses").textContent =
            money(data.expenseTotal);

        document.getElementById("reportProfit").textContent =
            money(data.profit);

        document.getElementById("reportPending").textContent =
            money(data.pending);

        document.getElementById("reportActive").textContent =
            data.activeMembers;

        document.getElementById("reportAttendance").textContent =
            data.attendanceCount;

        renderPaymentRows(data.payments);
        renderExpenseRows(data.expenses);
    }

    function renderPaymentRows(payments) {
        const tbody = document.getElementById("reportPaymentsTable");

        if (!payments.length) {
            tbody.innerHTML =
                `<tr><td colspan="4">No payment records found</td></tr>`;
            return;
        }

        tbody.innerHTML = payments.map(p => `
            <tr>
                <td>${dateFormat(p.date)}</td>
                <td>${escapeHTML(p.memberName || "Member")}</td>
                <td>${escapeHTML(p.method || "-")}</td>
                <td>${money(p.amount)}</td>
            </tr>
        `).join("");
    }

    function renderExpenseRows(expenses) {
        const tbody = document.getElementById("reportExpensesTable");

        if (!expenses.length) {
            tbody.innerHTML =
                `<tr><td colspan="4">No expense records found</td></tr>`;
            return;
        }

        tbody.innerHTML = expenses.map(e => `
            <tr>
                <td>${dateFormat(e.date)}</td>
                <td>${escapeHTML(e.title || "-")}</td>
                <td>${escapeHTML(e.category || "-")}</td>
                <td>${money(e.amount)}</td>
            </tr>
        `).join("");
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function exportCSV() {
        const from = document.getElementById("reportFrom").value;
        const to = document.getElementById("reportTo").value;

        if (!from || !to || from > to) {
            alert("Please select a valid date range.");
            return;
        }

        const data = calculate(from, to);

        const rows = [
            ["GYM PRO REPORT"],
            ["From", from],
            ["To", to],
            [],
            ["SUMMARY"],
            ["Total Collection", data.revenue],
            ["Total Expenses", data.expenseTotal],
            ["Net Balance", data.profit],
            ["Pending Fees", data.pending],
            ["Active Members", data.activeMembers],
            ["Attendance Records", data.attendanceCount],
            [],
            ["PAYMENTS"],
            ["Date", "Member", "Method", "Amount"]
        ];

        data.payments.forEach(p => {
            rows.push([
                p.date || "",
                p.memberName || "Member",
                p.method || "",
                Number(p.amount || 0)
            ]);
        });

        rows.push([]);
        rows.push(["EXPENSES"]);
        rows.push(["Date", "Title", "Category", "Amount"]);

        data.expenses.forEach(e => {
            rows.push([
                e.date || "",
                e.title || "",
                e.category || "",
                Number(e.amount || 0)
            ]);
        });

        const csv = rows.map(row =>
            row.map(value =>
                '"' + String(value ?? "").replace(/"/g, '""') + '"'
            ).join(",")
        ).join("\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `GYM-PRO-Report-${from}-to-${to}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    }

    function addStyles() {
        if (document.getElementById("gymReportStyles")) return;

        const style = document.createElement("style");
        style.id = "gymReportStyles";

        style.textContent = `
            .report-module {
                color: #f4f0ff;
                width: 100%;
            }

            .report-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 22px;
            }

            .report-header h2 {
                margin: 0 0 6px;
                font-size: 25px;
            }

            .report-header p {
                color: #aaa0c5;
                margin: 0;
            }

            .report-module button {
                border: 0;
                border-radius: 10px;
                padding: 12px 18px;
                background: linear-gradient(135deg,#a77aff,#7544d8);
                color: white;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px #0004;
            }

            .report-filters {
                display: flex;
                align-items: end;
                gap: 12px;
                flex-wrap: wrap;
                padding: 18px;
                background: #171326;
                border: 1px solid #302548;
                border-radius: 15px;
                margin-bottom: 20px;
            }

            .report-filters div {
                display: flex;
                flex-direction: column;
                gap: 7px;
                flex: 1;
                min-width: 130px;
            }

            .report-filters label {
                color: #bdb1d8;
                font-size: 13px;
            }

            .report-filters input,
            .report-filters select {
                width: 100%;
                box-sizing: border-box;
                padding: 11px;
                border-radius: 8px;
                border: 1px solid #403456;
                background: #211b32;
                color: white;
            }

            .report-cards {
                display: grid;
                grid-template-columns: repeat(3,minmax(0,1fr));
                gap: 15px;
                margin-bottom: 22px;
            }

            .report-card {
                background: linear-gradient(145deg,#211936,#171326);
                border: 1px solid #382950;
                border-radius: 14px;
                padding: 20px;
                box-shadow: 0 5px 15px #0003;
            }

            .report-card span {
                color: #b9adcf;
                font-size: 13px;
            }

            .report-card h3 {
                margin: 12px 0 0;
                font-size: 23px;
                overflow-wrap: anywhere;
            }

            .report-section {
                background: #171326;
                border: 1px solid #302548;
                border-radius: 14px;
                padding: 18px;
                margin-bottom: 20px;
            }

            .report-section h3 {
                margin: 0 0 15px;
            }

            .report-table-wrap {
                width: 100%;
                overflow-x: auto;
            }

            .report-section table {
                width: 100%;
                border-collapse: collapse;
                min-width: 520px;
            }

            .report-section th,
            .report-section td {
                padding: 13px;
                text-align: left;
                border-bottom: 1px solid #302548;
                font-size: 13px;
            }

            .report-section th {
                color: #bba6ed;
                background: #211a32;
            }

            .report-section td {
                color: #e8e0f6;
            }

            @media(max-width:700px) {
                .report-cards {
                    grid-template-columns: repeat(2,minmax(0,1fr));
                }

                .report-card {
                    padding: 15px;
                }

                .report-card h3 {
                    font-size: 19px;
                }
            }

            @media(max-width:420px) {
                .report-cards {
                    grid-template-columns: 1fr 1fr;
                    gap: 9px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh: generateReport
    };
})();

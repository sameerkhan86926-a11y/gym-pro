window.GymReports = (function () {
    "use strict";
    const MODULE = "reports";

    function today() {
        const d = new Date();
        const offset = d.getTimezoneOffset();

        return new Date(d.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 10);
    }

    function getData(collection) {
        return GymDB.getAll(collection) || [];
    }

    function money(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN");
    }

    function getDate(value) {
        if (!value) return "";

        return String(value).split("T")[0];
    }

    function dateFormat(date) {
        if (!date) return "-";

        const d = new Date(date + "T00:00:00");

        if (isNaN(d.getTime())) return date;

        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
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

    function notify(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
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

        function format(d) {
            const offset = d.getTimezoneOffset();

            return new Date(d.getTime() - offset * 60000)
                .toISOString()
                .slice(0, 10);
        }

        return {
            from: format(start),
            to: format(end)
        };
    }

    function getPaymentDate(payment) {
        return getDate(
            payment.date ||
            payment.paymentDate ||
            payment.createdAt
        );
    }

    function getExpenseDate(expense) {
        return getDate(
            expense.date ||
            expense.createdAt
        );
    }

    function getAttendanceDate(record) {
        return getDate(
            record.date ||
            record.checkInDate ||
            record.checkIn ||
            record.createdAt
        );
    }

    function isValidPayment(payment) {
        return payment.status !== "void";
    }

    function getPaymentAmount(payment) {
        const amount = Number(
            payment.paidAmount ??
            payment.amount ??
            payment.total ??
            0
        );

        if (String(payment.type || "").toLowerCase() === "refund") {
            return -amount;
        }

        return amount;
    }

    function getMemberStatus(member) {
        const status = String(member.status || "active").toLowerCase();

        if (
            status === "inactive" ||
            status === "deactivated" ||
            status === "paused" ||
            status === "cancelled"
        ) {
            return "inactive";
        }

        const expiry = getDate(
            member.expiryDate ||
            member.endDate
        );

        if (expiry && expiry < today()) {
            return "inactive";
        }

        return "active";
    }

    function getMemberPending(member, payments) {
        // Prefer the same billing calculation used by Payments module.
        if (
            window.GymPayments &&
            typeof window.GymPayments.getMemberBalance === "function"
        ) {
            const balance = window.GymPayments.getMemberBalance(member);

            if (
                balance &&
                balance.pending !== undefined &&
                Number.isFinite(Number(balance.pending))
            ) {
                return Math.max(0, Number(balance.pending));
            }
        }

        // Fallback for older records.
        const memberPayments = payments.filter(function (payment) {
            return String(payment.memberId) === String(member.id) &&
                isValidPayment(payment);
        });

        let finalFees;

        if (
            member.billingFinalFees !== undefined &&
            member.billingFinalFees !== null &&
            member.billingFinalFees !== ""
        ) {
            finalFees = Number(member.billingFinalFees);
        } else {
            const savedBilling = memberPayments.find(function (payment) {
                return payment.billingFinalFees !== undefined &&
                    payment.billingFinalFees !== null;
            });

            if (savedBilling) {
                finalFees = Number(savedBilling.billingFinalFees);
            } else {
                finalFees = Number(member.fees || member.amount || 0);
            }
        }

        const received = memberPayments.reduce(function (total, payment) {
            return total + getPaymentAmount(payment);
        }, 0);

        return Math.max(0, finalFees - received);
    }

    function calculate(from, to) {
        const payments = getData("payments");
        const expenses = getData("expenses");
        const members = getData("members");
        const attendance = getData("attendance");

        const filteredPayments = payments.filter(function (payment) {
            const date = getPaymentDate(payment);

            return isValidPayment(payment) &&
                date >= from &&
                date <= to;
        });

        const filteredExpenses = expenses.filter(function (expense) {
            const date = getExpenseDate(expense);

            return date >= from && date <= to;
        });

        const filteredAttendance = attendance.filter(function (record) {
            const date = getAttendanceDate(record);

            return date >= from && date <= to;
        });

        const revenue = filteredPayments.reduce(function (sum, payment) {
            return sum + getPaymentAmount(payment);
        }, 0);

        const expenseTotal = filteredExpenses.reduce(function (sum, expense) {
            return sum + Number(expense.amount || 0);
        }, 0);

        const pending = members.reduce(function (sum, member) {
            return sum + getMemberPending(member, payments);
        }, 0);

        const activeMembers = members.filter(function (member) {
            return getMemberStatus(member) === "active";
        }).length;

        return {
            revenue,
            expenseTotal,
            profit: revenue - expenseTotal,
            pending,
            activeMembers,
            totalMembers: members.length,
            attendanceCount: filteredAttendance.length,
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
                        <h2>Business Reports & Financial Analytics</h2>
                        <p>Analyze fee collections, operational expenses, net profit and gym activity.</p>
                    </div>

                    <div class="report-header-actions">
                        <button class="report-export-btn" id="exportReportBtn">
                            Export CSV
                        </button>
                        <button class="report-sec-btn" id="printReportBtn">
                            Print Report
                        </button>
                    </div>
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

                    <button id="generateReportBtn" class="report-primary-btn">
                        Generate Report
                    </button>

                </div>

                <div class="report-cards">

                    <div class="report-card">
                        <div class="report-card-top">
                            <span>Total Collection</span>
                            <div class="report-card-dot" style="background:#168653;"></div>
                        </div>
                        <h3 id="reportRevenue" style="color:#168653;">₹0</h3>
                    </div>

                    <div class="report-card">
                        <div class="report-card-top">
                            <span>Total Expenses</span>
                            <div class="report-card-dot" style="background:#d71920;"></div>
                        </div>
                        <h3 id="reportExpenses" style="color:#d71920;">₹0</h3>
                    </div>

                    <div class="report-card">
                        <div class="report-card-top">
                            <span>Net Balance (Profit / Loss)</span>
                            <div class="report-card-dot" style="background:#2879d0;"></div>
                        </div>
                        <h3 id="reportProfit">₹0</h3>
                    </div>

                    <div class="report-card">
                        <div class="report-card-top">
                            <span>Pending Member Fees</span>
                            <div class="report-card-dot" style="background:#d97706;"></div>
                        </div>
                        <h3 id="reportPending">₹0</h3>
                    </div>

                    <div class="report-card">
                        <div class="report-card-top">
                            <span>Active Members</span>
                            <div class="report-card-dot" style="background:#168653;"></div>
                        </div>
                        <h3 id="reportActive">0</h3>
                    </div>

                    <div class="report-card">
                        <div class="report-card-top">
                            <span>Attendance Check-ins</span>
                            <div class="report-card-dot" style="background:#2879d0;"></div>
                        </div>
                        <h3 id="reportAttendance">0</h3>
                    </div>

                </div>

                <div class="report-section">

                    <div class="report-section-header">
                        <h3>Collection Details</h3>
                        <p>All fee payments received during the selected date range</p>
                    </div>

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
                                <tr>
                                    <td colspan="4" class="report-empty">No payment records</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

                <div class="report-section">

                    <div class="report-section-header">
                        <h3>Expense Details</h3>
                        <p>All operational expenses recorded during the selected date range</p>
                    </div>

                    <div class="report-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Expense Title</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>

                            <tbody id="reportExpensesTable">
                                <tr>
                                    <td colspan="4" class="report-empty">No expense records</td>
                                </tr>
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
        document.getElementById("reportPeriod")
            .addEventListener("change", function () {
                const type = this.value;

                if (type !== "custom") {
                    const range = getRange(type);

                    document.getElementById("reportFrom").value = range.from;
                    document.getElementById("reportTo").value = range.to;

                    generateReport();
                }
            });

        // Agar user manually date change kare toh dropdown "custom" par set ho jaye
        ["reportFrom", "reportTo"].forEach(function (id) {
            document.getElementById(id).addEventListener("change", function () {
                document.getElementById("reportPeriod").value = "custom";
            });
        });

        document.getElementById("generateReportBtn")
            .addEventListener("click", generateReport);

        document.getElementById("exportReportBtn")
            .addEventListener("click", exportCSV);

        document.getElementById("printReportBtn")
            .addEventListener("click", function () {
                window.print();
            });
    }

    function generateReport() {
        const fromElement = document.getElementById("reportFrom");
        const toElement = document.getElementById("reportTo");

        if (!fromElement || !toElement) return;

        const from = fromElement.value;
        const to = toElement.value;

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

        const profitEl = document.getElementById("reportProfit");
        profitEl.textContent = money(data.profit);
        profitEl.style.color = data.profit >= 0 ? "#168653" : "#d71920";

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

        if (!tbody) return;

        if (!payments.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="report-empty">No payment records found for this period.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payments.map(function (payment) {
            return `
                <tr>
                    <td>${dateFormat(getPaymentDate(payment))}</td>
                    <td><strong style="color:#202124;">${escapeHTML(payment.memberName || "Member")}</strong></td>
                    <td><span class="report-pill blue">${escapeHTML(payment.method || "-")}</span></td>
                    <td><strong style="color:#168653;">${money(getPaymentAmount(payment))}</strong></td>
                </tr>
            `;
        }).join("");
    }

    function renderExpenseRows(expenses) {
        const tbody = document.getElementById("reportExpensesTable");

        if (!tbody) return;

        if (!expenses.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="report-empty">No expense records found for this period.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = expenses.map(function (expense) {
            return `
                <tr>
                    <td>${dateFormat(getExpenseDate(expense))}</td>
                    <td><strong style="color:#202124;">${escapeHTML(expense.title || "-")}</strong></td>
                    <td><span class="report-pill red">${escapeHTML(expense.category || "-")}</span></td>
                    <td><strong style="color:#d71920;">${money(expense.amount)}</strong></td>
                </tr>
            `;
        }).join("");
    }

    function safeCSV(value) {
        let text = String(value ?? "");

        // Prevent spreadsheet formula injection.
        if (/^[\s]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
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
            ["Total Members", data.totalMembers],
            ["Attendance Records", data.attendanceCount],
            [],
            ["PAYMENTS"],
            ["Date", "Member", "Method", "Amount"]
        ];

        data.payments.forEach(function (payment) {
            rows.push([
                getPaymentDate(payment),
                payment.memberName || "Member",
                payment.method || "",
                getPaymentAmount(payment)
            ]);
        });

        rows.push([]);
        rows.push(["EXPENSES"]);
        rows.push(["Date", "Title", "Category", "Amount"]);

        data.expenses.forEach(function (expense) {
            rows.push([
                getExpenseDate(expense),
                expense.title || "",
                expense.category || "",
                Number(expense.amount || 0)
            ]);
        });

        const csv = rows.map(function (row) {
            return row.map(safeCSV).join(",");
        }).join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "GYM-PRO-Report-" + from + "-to-" + to + ".csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        notify("Report CSV exported successfully.");

        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function addStyles() {
        if (document.getElementById("gymReportStyles")) return;

        const style = document.createElement("style");

        style.id = "gymReportStyles";

        style.textContent = `
            .report-module {
                color: #202124;
                width: 100%;
                padding: 2px 0 25px;
            }

            .report-header {
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

            .report-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .report-header p {
                color: #737985;
                font-size: 11.5px;
                margin: 0;
            }

            .report-header-actions {
                display: flex;
                gap: 9px;
                flex-wrap: wrap;
            }

            .report-primary-btn,
            .report-export-btn {
                border: 0;
                border-radius: 9px;
                padding: 11px 18px;
                background: linear-gradient(135deg, #e3262e, #c51019);
                color: #ffffff;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(215, 25, 32, 0.18);
                transition: all 0.2s ease;
            }

            .report-primary-btn:hover,
            .report-export-btn:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
                transform: translateY(-1px);
            }

            .report-sec-btn {
                padding: 11px 16px;
                border: 1px solid #dfe2e8;
                border-radius: 9px;
                background: #ffffff;
                color: #303640;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .report-sec-btn:hover {
                background: #fff4f4;
                border-color: #f2bfc1;
                color: #d71920;
            }

            .report-filters {
                display: flex;
                align-items: flex-end;
                gap: 14px;
                flex-wrap: wrap;
                padding: 18px 20px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .report-filters div {
                display: flex;
                flex-direction: column;
                gap: 6px;
                flex: 1;
                min-width: 150px;
            }

            .report-filters label {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .report-filters input,
            .report-filters select {
                width: 100%;
                box-sizing: border-box;
                padding: 10px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                font-weight: 600;
                outline: none;
            }

            .report-filters input:focus,
            .report-filters select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .report-cards {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .report-card {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .report-card:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .report-card-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .report-card span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .report-card-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .report-card h3 {
                margin: 0;
                font-size: 25px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
                overflow-wrap: anywhere;
            }

            .report-section {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .report-section-header {
                margin-bottom: 16px;
            }

            .report-section-header h3 {
                margin: 0 0 3px;
                font-size: 15px;
                font-weight: 800;
                color: #202124;
            }

            .report-section-header p {
                margin: 0;
                font-size: 11px;
                color: #737985;
            }

            .report-table-wrap {
                width: 100%;
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .report-section table {
                width: 100%;
                border-collapse: collapse;
                min-width: 540px;
                background: #ffffff;
            }

            .report-section th,
            .report-section td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
                font-size: 11.5px;
                color: #454c57;
            }

            .report-section th {
                color: #69717e;
                background: #f8f9fb;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .report-section tbody tr:hover {
                background: #fffafa;
            }

            .report-pill {
                display: inline-block;
                padding: 4px 9px;
                border-radius: 20px;
                font-size: 10.5px;
                font-weight: 700;
            }

            .report-pill.blue {
                background: #edf5ff;
                color: #2879d0;
            }

            .report-pill.red {
                background: #fff0f0;
                color: #d71920;
            }

            .report-empty {
                text-align: center !important;
                padding: 32px 15px !important;
                color: #8a909a !important;
                font-size: 12px;
            }

            @media(max-width:750px) {
                .report-cards {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .report-card {
                    padding: 16px;
                }

                .report-card h3 {
                    font-size: 20px;
                }
            }

            @media(max-width:450px) {
                .report-cards {
                    grid-template-columns: 1fr;
                }

                .report-header-actions {
                    width: 100%;
                }

                .report-header-actions button {
                    flex: 1;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh: generateReport,
        calculate
    };
})();

window.GymPayments = (function () {
    const MODULE = "payments";

    function getPayments() {
        return GymDB.getAll(MODULE) || [];
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
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
        if (document.getElementById("gymPaymentsStyles")) return;

        const style = document.createElement("style");
        style.id = "gymPaymentsStyles";

        style.textContent = `
            .payments-wrap { padding:5px 0 25px; }

            .payments-header {
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:15px;
                margin-bottom:22px;
            }

            .payments-header h2 { margin:0 0 6px; }
            .payments-header p { margin:0; opacity:.7; }

            .payments-stats {
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:15px;
                margin-bottom:22px;
            }

            .payments-stat {
                padding:20px;
                border-radius:14px;
                background:rgba(255,255,255,.05);
                border:1px solid rgba(255,255,255,.08);
            }

            .payments-stat span {
                display:block;
                opacity:.7;
                font-size:13px;
                margin-bottom:9px;
            }

            .payments-stat strong { font-size:24px; }

            .payments-section {
                margin-top:25px;
                padding:18px;
                border-radius:14px;
                background:rgba(255,255,255,.035);
                border:1px solid rgba(255,255,255,.08);
            }

            .payments-section h3 { margin-top:0; }

            .payments-toolbar {
                display:flex;
                flex-wrap:wrap;
                gap:12px;
                margin-bottom:18px;
            }

            .payments-toolbar input,
            .payments-toolbar select {
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
            }

            .payments-table-wrap { overflow-x:auto; }

            .payments-table {
                width:100%;
                min-width:750px;
                border-collapse:collapse;
            }

            .payments-table th,
            .payments-table td {
                padding:14px;
                text-align:left;
                border-bottom:1px solid rgba(255,255,255,.08);
            }

            .payments-table th {
                font-size:12px;
                opacity:.7;
                text-transform:uppercase;
            }

            .payment-method-badge {
                display:inline-block;
                padding:5px 10px;
                border-radius:20px;
                background:rgba(120,90,220,.15);
                color:#c7adff;
                font-size:11px;
            }

            .payment-action {
                padding:7px 11px;
                border:0;
                border-radius:7px;
                cursor:pointer;
                color:white;
                background:#a93650;
            }

            .payments-empty {
                text-align:center;
                padding:30px 15px;
                opacity:.65;
            }

            .payment-modal {
                position:fixed;
                inset:0;
                z-index:9999;
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                background:rgba(0,0,0,.75);
            }

            .payment-modal-box {
                width:100%;
                max-width:470px;
                max-height:90vh;
                overflow-y:auto;
                padding:24px;
                border-radius:16px;
                background:#211a32;
                border:1px solid rgba(255,255,255,.12);
            }

            .payment-modal-box h3 { margin-top:0; }

            .payment-form label {
                display:block;
                margin:14px 0 7px;
                font-size:13px;
            }

            .payment-form input,
            .payment-form select,
            .payment-form textarea {
                width:100%;
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
            }

            .payment-form textarea {
                min-height:70px;
                resize:vertical;
            }

            .payment-form-actions {
                display:flex;
                gap:10px;
                margin-top:20px;
            }

            .payment-form-actions button {
                flex:1;
                padding:12px;
                border:0;
                border-radius:9px;
                cursor:pointer;
                color:white;
                background:#8055d9;
                font-weight:600;
            }

            .payment-form-actions .cancel { background:#494253; }

            .payment-balance {
                margin-top:12px;
                padding:12px;
                border-radius:9px;
                background:rgba(255,255,255,.06);
                font-size:14px;
            }

            @media(max-width:650px) {
                .payments-stats { grid-template-columns:1fr; }
            }
        `;

        document.head.appendChild(style);
    }

    function render() {
        injectStyles();

        const container = document.getElementById("modulePlaceholder");
        if (!container) return;

        container.innerHTML = `
            <div class="payments-wrap">

                <div class="payments-header">
                    <div>
                        <h2>Payments & Fees</h2>
                        <p>Manage member fees and payment records.</p>
                    </div>

                    <button class="btn btn-primary" id="addPaymentBtn">
                        + Receive Payment
                    </button>
                </div>

                <div class="payments-stats">
                    <div class="payments-stat">
                        <span>Total Collection</span>
                        <strong id="totalPaymentsAmount">₹0</strong>
                    </div>

                    <div class="payments-stat">
                        <span>Today's Collection</span>
                        <strong id="todayPaymentsAmount">₹0</strong>
                    </div>

                    <div class="payments-stat">
                        <span>This Month Collection</span>
                        <strong id="monthPaymentsAmount">₹0</strong>
                    </div>
                </div>

                <div class="payments-section">
                    <h3>Payment History</h3>

                    <div class="payments-toolbar">
                        <input type="search" id="paymentSearch"
                            placeholder="Search member name or ID...">

                        <input type="date" id="paymentDateFilter">

                        <select id="paymentMethodFilter">
                            <option value="all">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div class="payments-table-wrap">
                        <table class="payments-table">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Member ID</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="paymentsTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="payments-section">
                    <h3>Pending Member Fees</h3>

                    <div class="payments-table-wrap">
                        <table class="payments-table">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Member ID</th>
                                    <th>Membership Fees</th>
                                    <th>Paid</th>
                                    <th>Pending</th>
                                </tr>
                            </thead>
                            <tbody id="pendingFeesTable"></tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div class="payment-modal" id="paymentModal">
                <div class="payment-modal-box">
                    <h3>Receive Member Payment</h3>

                    <form class="payment-form" id="paymentForm">

                        <label>Select Member *</label>
                        <select id="paymentMember" required>
                            <option value="">Choose Member</option>
                        </select>

                        <div class="payment-balance" id="paymentMemberBalance">
                            Select a member to see their fee details.
                        </div>

                        <label>Payment Amount (₹) *</label>
                        <input type="number" id="paymentAmount"
                            min="0.01" step="0.01"
                            placeholder="Enter amount" required>

                        <label>Payment Method *</label>
                        <select id="paymentMethod" required>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="Other">Other</option>
                        </select>

                        <label>Payment Date</label>
                        <input type="date" id="paymentDate"
                            value="${today()}" required>

                        <label>Notes / Transaction ID</label>
                        <textarea id="paymentNotes"
                            placeholder="Optional details"></textarea>

                        <div class="payment-form-actions">
                            <button type="submit">Save Payment</button>
                            <button type="button" class="cancel"
                                id="cancelPaymentBtn">Cancel</button>
                        </div>

                    </form>
                </div>
            </div>
        `;

        document.getElementById("addPaymentBtn")
            .addEventListener("click", openForm);

        document.getElementById("cancelPaymentBtn")
            .addEventListener("click", closeForm);

        document.getElementById("paymentForm")
            .addEventListener("submit", savePayment);

        document.getElementById("paymentMember")
            .addEventListener("change", updateMemberBalance);

        document.getElementById("paymentSearch")
            .addEventListener("input", renderTables);

        document.getElementById("paymentDateFilter")
            .addEventListener("change", renderTables);

        document.getElementById("paymentMethodFilter")
            .addEventListener("change", renderTables);

        renderTables();
    }

    function getMemberPayments(memberId) {
        return getPayments().filter(payment =>
            payment.memberId === memberId
        );
    }

    function getMemberPaid(memberId) {
        return getMemberPayments(memberId).reduce((total, payment) => {
            return total + Number(payment.amount || 0);
        }, 0);
    }

    function getMemberBalance(member) {
        const fees = Number(member.fees || 0);
        const paid = getMemberPaid(member.id);

        return {
            fees: fees,
            paid: paid,
            pending: Math.max(0, fees - paid)
        };
    }

    function openForm() {
        const members = getMembers();

        const select = document.getElementById("paymentMember");

        select.innerHTML = `
            <option value="">Choose Member</option>
            ${members.map(member => `
                <option value="${escapeHTML(member.id)}">
                    ${escapeHTML(member.name)} (${escapeHTML(member.id)})
                </option>
            `).join("")}
        `;

        document.getElementById("paymentForm").reset();
        document.getElementById("paymentDate").value = today();
        document.getElementById("paymentMemberBalance").textContent =
            "Select a member to see their fee details.";

        document.getElementById("paymentModal").style.display = "flex";
    }

    function closeForm() {
        document.getElementById("paymentModal").style.display = "none";
    }

    function updateMemberBalance() {
        const memberId = document.getElementById("paymentMember").value;
        const member = GymDB.find("members", memberId);

        const box = document.getElementById("paymentMemberBalance");

        if (!member) {
            box.textContent = "Select a member to see their fee details.";
            return;
        }

        const balance = getMemberBalance(member);

        box.innerHTML = `
            Membership Fees: <strong>${currency(balance.fees)}</strong><br>
            Total Paid: <strong>${currency(balance.paid)}</strong><br>
            Pending: <strong>${currency(balance.pending)}</strong>
        `;
    }

    function savePayment(event) {
        event.preventDefault();

        const memberId = document.getElementById("paymentMember").value;
        const member = GymDB.find("members", memberId);

        const amount = Number(document.getElementById("paymentAmount").value);
        const date = document.getElementById("paymentDate").value;

        if (!member) {
            alert("Please select a valid member.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        if (!date || date > today()) {
            alert("Please select a valid payment date.");
            return;
        }

        const balance = getMemberBalance(member);

        if (amount > balance.pending) {
            const confirmExtra = confirm(
                "This payment is greater than the member's calculated pending fee. Do you want to save it as an advance payment?"
            );

            if (!confirmExtra) return;
        }

        const payment = {
            id: GymDB.generateID("PAY"),
            memberId: member.id,
            memberName: member.name || "",
            amount: amount,
            method: document.getElementById("paymentMethod").value,
            date: date,
            notes: document.getElementById("paymentNotes").value.trim(),
            createdAt: new Date().toISOString()
        };

        GymDB.add(MODULE, payment);

        closeForm();
        renderTables();

        if (typeof window.showToast === "function") {
            window.showToast("Payment saved successfully");
        } else {
            alert("Payment saved successfully.");
        }

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function deletePayment(id) {
        const payment = GymDB.find(MODULE, id);
        if (!payment) return;

        if (!confirm(
            "Delete this payment record? The member's calculated paid and pending amounts will change."
        )) return;

        GymDB.delete(MODULE, id);

        renderTables();

        if (typeof window.showToast === "function") {
            window.showToast("Payment record deleted");
        }

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function renderTables() {
        const table = document.getElementById("paymentsTableBody");
        if (!table) return;

        const payments = getPayments();
        const currentDay = today();
        const month = currentMonth();

        const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const todayTotal = payments
            .filter(p => p.date === currentDay)
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const monthTotal = payments
            .filter(p => String(p.date || "").startsWith(month))
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        document.getElementById("totalPaymentsAmount").textContent = currency(total);
        document.getElementById("todayPaymentsAmount").textContent = currency(todayTotal);
        document.getElementById("monthPaymentsAmount").textContent = currency(monthTotal);

        const search = document.getElementById("paymentSearch").value
            .trim().toLowerCase();

        const dateFilter = document.getElementById("paymentDateFilter").value;
        const methodFilter = document.getElementById("paymentMethodFilter").value;

        const filtered = payments.filter(payment => {
            const matchesSearch =
                (payment.memberName || "").toLowerCase().includes(search) ||
                (payment.memberId || "").toLowerCase().includes(search);

            const matchesDate = !dateFilter || payment.date === dateFilter;

            const matchesMethod =
                methodFilter === "all" || payment.method === methodFilter;

            return matchesSearch && matchesDate && matchesMethod;
        }).sort((a, b) => {
            return String(b.date || "").localeCompare(String(a.date || ""));
        });

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="payments-empty">
                        No payment records found.
                    </td>
                </tr>
            `;
        } else {
            table.innerHTML = filtered.map(payment => `
                <tr>
                    <td><strong>${escapeHTML(payment.memberName)}</strong></td>
                    <td>${escapeHTML(payment.memberId)}</td>
                    <td>${escapeHTML(payment.date)}</td>
                    <td><strong>${currency(payment.amount)}</strong></td>
                    <td>
                        <span class="payment-method-badge">
                            ${escapeHTML(payment.method)}
                        </span>
                    </td>
                    <td>
                        <button class="payment-action"
                            data-delete-payment="${escapeHTML(payment.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        table.querySelectorAll("[data-delete-payment]").forEach(button => {
            button.addEventListener("click", function () {
                deletePayment(this.dataset.deletePayment);
            });
        });

        renderPendingFees();
    }

    function renderPendingFees() {
        const table = document.getElementById("pendingFeesTable");
        if (!table) return;

        const members = getMembers();

        const pendingMembers = members.map(member => ({
            member: member,
            balance: getMemberBalance(member)
        })).filter(item => item.balance.pending > 0);

        if (!pendingMembers.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="payments-empty">
                        No pending member fees found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = pendingMembers.map(item => `
            <tr>
                <td><strong>${escapeHTML(item.member.name)}</strong></td>
                <td>${escapeHTML(item.member.id)}</td>
                <td>${currency(item.balance.fees)}</td>
                <td>${currency(item.balance.paid)}</td>
                <td><strong>${currency(item.balance.pending)}</strong></td>
            </tr>
        `).join("");
    }

    return {
        render: render,
        refresh: renderTables
    };
})();

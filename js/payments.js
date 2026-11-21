window.GymPayments = (function () {
    const MODULE = "payments";

    function getPayments() {
        return GymDB.getAll(MODULE) || [];
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
    }

    function getDiscounts() {
        return GymDB.getAll("discounts") || [];
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

    function getMemberPayments(memberId) {
        return getPayments().filter(payment =>
            payment.memberId === memberId &&
            payment.status !== "void"
        );
    }

    function getLatestRenewal(member) {
        const list = Array.isArray(member?.renewals) ? member.renewals : [];
        return list.length ? list[list.length - 1] : null;
    }

    // Current billing cycle ke payments (agar renew hua hai toh renewal ke baad wale)
    function getCurrentCyclePayments(member) {
        const all = getMemberPayments(member.id);
        const latestRenewal = getLatestRenewal(member);

        if (!latestRenewal || !latestRenewal.renewedAt) {
            return all;
        }

        const renewalTime = new Date(latestRenewal.renewedAt).getTime();
        if (isNaN(renewalTime)) return all;

        return all.filter(payment => {
            const pTime = payment.createdAt
                ? new Date(payment.createdAt).getTime()
                : new Date(payment.date + "T12:00:00").getTime();
            return !isNaN(pTime) && pTime >= renewalTime;
        });
    }

    function getActiveDiscounts(memberId) {
        const current = today();

        return getDiscounts()
            .filter(discount => {
                return discount.memberId === memberId &&
                    discount.status !== "inactive" &&
                    (!discount.startDate || discount.startDate <= current) &&
                    (!discount.endDate || discount.endDate >= current);
            })
            .sort((a, b) => {
                return String(b.createdAt || "")
                    .localeCompare(String(a.createdAt || ""));
            });
    }

    function getActiveDiscount(memberId) {
        return getActiveDiscounts(memberId)[0] || null;
    }

    function calculateDiscount(fees, discount) {
        if (!discount) return 0;

        let amount = 0;

        if (discount.type === "percentage") {
            amount = fees * Number(discount.value || 0) / 100;
        } else {
            amount = Number(discount.value || 0);
        }

        return Math.min(fees, Math.max(0, amount));
    }

    function getBilling(member, selectedDiscountId) {
        const cyclePayments = getCurrentCyclePayments(member);

        if (
            member.billingFinalFees !== undefined &&
            member.billingFinalFees !== null &&
            member.billingFinalFees !== ""
        ) {
            return {
                fees: Number(member.billingOriginalFees ?? member.fees ?? 0),
                discount: Number(member.billingDiscountAmount || 0),
                finalFees: Number(member.billingFinalFees),
                discountName: member.billingDiscountName || "",
                discountReason: member.billingDiscountReason || "",
                discountId: member.billingDiscountId || "",
                locked: true
            };
        }

        const oldPayment = cyclePayments.find(payment =>
            payment.billingFinalFees !== undefined
        );

        if (oldPayment) {
            return {
                fees: Number(oldPayment.billingOriginalFees || member.fees || 0),
                discount: Number(oldPayment.billingDiscountAmount || 0),
                finalFees: Number(oldPayment.billingFinalFees || member.fees || 0),
                discountName: oldPayment.billingDiscountName || "",
                discountReason: oldPayment.billingDiscountReason || "",
                discountId: oldPayment.billingDiscountId || "",
                locked: true
            };
        }

        const fees = Number(member.fees || 0);

        if (cyclePayments.length > 0) {
            return {
                fees,
                discount: 0,
                finalFees: fees,
                discountName: "",
                discountReason: "",
                discountId: "",
                locked: true
            };
        }

        let discount = null;

        if (selectedDiscountId) {
            discount = getActiveDiscounts(member.id).find(item =>
                item.id === selectedDiscountId
            ) || null;
        } else {
            discount = getActiveDiscount(member.id);
        }

        const discountAmount = calculateDiscount(fees, discount);

        let discountName = "";

        if (discount) {
            discountName = discount.type === "percentage"
                ? Number(discount.value) + "%"
                : currency(discount.value);
        }

        return {
            fees,
            discount: discountAmount,
            finalFees: Math.max(0, fees - discountAmount),
            discountName,
            discountReason: discount?.reason || "",
            discountId: discount?.id || "",
            discountRecord: discount,
            locked: false
        };
    }

    function getMemberPaid(member) {
        const m = typeof member === "string"
            ? GymDB.find("members", member) || { id: member }
            : member;

        return getCurrentCyclePayments(m).reduce((total, payment) => {
            return total + Number(payment.amount || 0);
        }, 0);
    }

    function getMemberBalance(member, selectedDiscountId) {
        const billing = getBilling(member, selectedDiscountId);
        const paid = getMemberPaid(member);

        return {
            fees: billing.fees,
            discount: billing.discount,
            finalFees: billing.finalFees,
            paid,
            pending: Math.max(0, billing.finalFees - paid),
            advance: Math.max(0, paid - billing.finalFees),
            billing
        };
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymPaymentsStyles")) return;

        const style = document.createElement("style");
        style.id = "gymPaymentsStyles";

        style.textContent = `
            .payments-wrap {
                padding: 2px 0 25px;
            }

            .payments-header {
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

            .payments-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .payments-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .payments-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }

            .payments-stat {
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .payments-stat:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .payments-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .payments-stat span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .payments-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .payments-stat strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .payments-section {
                margin-top: 20px;
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .payments-section-header {
                margin-bottom: 16px;
            }

            .payments-section-header h3 {
                margin: 0 0 3px;
                font-size: 15px;
                font-weight: 800;
                color: #202124;
            }

            .payments-section-header p {
                margin: 0;
                font-size: 11px;
                color: #737985;
            }

            .payments-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 18px;
            }

            .payments-toolbar input,
            .payments-toolbar select {
                padding: 11px 14px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
                transition: all 0.2s ease;
            }

            .payments-toolbar input[type="search"] {
                flex: 1;
                min-width: 210px;
            }

            .payments-toolbar select {
                min-width: 150px;
                font-weight: 600;
            }

            .payments-toolbar input:focus,
            .payments-toolbar select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .payments-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }

            .payments-table {
                width: 100%;
                min-width: 820px;
                border-collapse: collapse;
                background: #ffffff;
            }

            .payments-table th,
            .payments-table td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
            }

            .payments-table th {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                background: #f8f9fb;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .payments-table td {
                font-size: 11.5px;
                color: #454c57;
                vertical-align: middle;
            }

            .payments-table tbody tr:hover {
                background: #fffafa;
            }

            .payment-id-pill {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }

            .payment-renew-tag {
                display: inline-block;
                margin-left: 6px;
                padding: 2px 7px;
                border-radius: 5px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 9.5px;
                font-weight: 700;
            }

            .payment-type-tag {
                display: inline-block;
                margin-top: 3px;
                font-size: 10px;
                font-weight: 600;
                color: #8a909a;
                text-transform: capitalize;
            }

            .payment-method-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 10.5px;
                font-weight: 700;
            }

            .payment-pending-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 6px;
                background: #fff0f0;
                color: #d71920;
                font-size: 11.5px;
                font-weight: 800;
            }

            .payment-action {
                padding: 6px 10px;
                border: 1px solid #f5c6c8;
                border-radius: 7px;
                cursor: pointer;
                font-size: 10.5px;
                font-weight: 600;
                color: #d71920;
                background: #fff0f0;
                transition: all 0.18s ease;
            }

            .payment-action:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }

            .payment-action.collect {
                background: #e9f8f0;
                border-color: #bfe7d1;
                color: #168653;
            }

            .payment-action.collect:hover {
                background: #168653;
                border-color: #168653;
                color: #ffffff;
            }

            .payments-empty {
                text-align: center;
                padding: 34px 15px;
                color: #8a909a;
                font-size: 12px;
            }

            /* MODAL */
            .payment-modal {
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

            .payment-modal-box {
                width: 100%;
                max-width: 510px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 26px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
            }

            .payment-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 14px;
                border-bottom: 1px solid #edf0f3;
            }

            .payment-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 800;
                color: #202124;
            }

            .payment-modal-close {
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

            .payment-modal-close:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }

            .payment-form label {
                display: block;
                margin: 14px 0 6px;
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
            }

            .payment-form input,
            .payment-form select,
            .payment-form textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 11px 13px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #ffffff;
                color: #202124;
                font-size: 12.5px;
                outline: none;
            }

            .payment-form input:focus,
            .payment-form select:focus,
            .payment-form textarea:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .payment-form textarea {
                min-height: 68px;
                resize: vertical;
            }

            .payment-form-actions {
                display: flex;
                gap: 12px;
                margin-top: 22px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }

            .payment-form-actions button {
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

            .payment-form-actions button:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }

            .payment-form-actions .cancel {
                background: #f3f4f6;
                color: #454c57;
                border: 1px solid #dfe2e8;
                box-shadow: none;
            }

            .payment-form-actions .cancel:hover {
                background: #e7e9ee;
            }

            .payment-balance {
                margin-top: 12px;
                padding: 14px 16px;
                border-radius: 10px;
                background: #f8f9fb;
                border: 1px solid #e7e9ee;
                color: #303640;
                font-size: 12px;
                line-height: 1.85;
            }

            .payment-balance .discount-line {
                color: #168653;
            }

            .payment-balance .pending-line {
                display: inline-block;
                margin-top: 4px;
                padding-top: 6px;
                border-top: 1px dashed #dfe2e8;
                width: 100%;
                color: #d71920;
                font-size: 13.5px;
            }

            .payment-type-options {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-top: 6px;
            }

            .payment-type-options button {
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #454c57;
                padding: 10px 6px;
                border-radius: 8px;
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .payment-type-options button:hover {
                background: #fff4f4;
                border-color: #f2bfc1;
            }

            .payment-type-options button.selected {
                background: #fff0f0;
                color: #d71920;
                border-color: #d71920;
                font-weight: 700;
                box-shadow: 0 2px 8px rgba(215, 25, 32, 0.1);
            }

            .payment-discount-note {
                margin-top: 7px;
                font-size: 11px;
                color: #737985;
                line-height: 1.5;
            }

            .payment-locked-note {
                display: block;
                padding: 8px 10px;
                border-radius: 7px;
                background: #fff8eb;
                border: 1px solid #f7dfad;
                color: #9a6700;
                font-weight: 600;
            }

            @media(max-width:650px) {
                .payments-stats {
                    grid-template-columns: 1fr;
                }

                .payments-header .btn {
                    width: 100%;
                }

                .payment-modal-box {
                    padding: 18px;
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
            <div class="payments-wrap">

                <div class="payments-header">
                    <div>
                        <h2>Fees & Payment Collections</h2>
                        <p>Record member payments, manage discounts and track pending dues.</p>
                    </div>

                    <button class="btn btn-primary" id="addPaymentBtn">
                        + Receive Payment
                    </button>
                </div>

                <div class="payments-stats">

                    <div class="payments-stat">
                        <div class="payments-stat-top">
                            <span>Total Collection</span>
                            <div class="payments-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="totalPaymentsAmount">₹0</strong>
                    </div>

                    <div class="payments-stat">
                        <div class="payments-stat-top">
                            <span>Today's Collection</span>
                            <div class="payments-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="todayPaymentsAmount">₹0</strong>
                    </div>

                    <div class="payments-stat">
                        <div class="payments-stat-top">
                            <span>This Month Collection</span>
                            <div class="payments-stat-dot" style="background:#2879d0;"></div>
                        </div>
                        <strong id="monthPaymentsAmount">₹0</strong>
                    </div>

                </div>

                <div class="payments-section">

                    <div class="payments-section-header">
                        <h3>Payment History</h3>
                        <p>Complete log of received member fees and transactions</p>
                    </div>

                    <div class="payments-toolbar">

                        <input type="search"
                            id="paymentSearch"
                            placeholder="Search member name or ID...">

                        <input type="date"
                            id="paymentDateFilter">

                        <select id="paymentMethodFilter">
                            <option value="all">All Payment Methods</option>
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

                    <div class="payments-section-header">
                        <h3>Pending Member Fees</h3>
                        <p>Members with remaining balance due for their active billing cycle</p>
                    </div>

                    <div class="payments-table-wrap">
                        <table class="payments-table">

                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Member ID</th>
                                    <th>Original Fees</th>
                                    <th>Discount</th>
                                    <th>Final Fees</th>
                                    <th>Paid</th>
                                    <th>Pending</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody id="pendingFeesTable"></tbody>

                        </table>
                    </div>
                </div>

            </div>

            <div class="payment-modal" id="paymentModal">

                <div class="payment-modal-box">

                    <div class="payment-modal-header">
                        <h3>Receive Member Payment</h3>
                        <button type="button" class="payment-modal-close" id="closePaymentX" aria-label="Close">✕</button>
                    </div>

                    <form class="payment-form" id="paymentForm">

                        <label>Select Member *</label>

                        <select id="paymentMember" required>
                            <option value="">Choose Member</option>
                        </select>

                        <label>Select Existing Discount</label>

                        <select id="paymentDiscount">
                            <option value="">No Discount</option>
                        </select>

                        <div class="payment-discount-note" id="paymentDiscountNote">
                            Select a member to see available discounts.
                        </div>

                        <div class="payment-balance" id="paymentMemberBalance">
                            Select a member to see their fee details.
                        </div>

                        <label>Payment Type</label>

                        <div class="payment-type-options">

                            <button type="button"
                                data-payment-type="full"
                                class="selected">
                                Full Payment
                            </button>

                            <button type="button"
                                data-payment-type="part">
                                Part Payment
                            </button>

                            <button type="button"
                                data-payment-type="advance">
                                Advance
                            </button>

                        </div>

                        <input type="hidden"
                            id="paymentType"
                            value="full">

                        <label>Payment Amount (₹) *</label>

                        <input type="number"
                            id="paymentAmount"
                            min="0.01"
                            step="0.01"
                            placeholder="Enter amount"
                            required>

                        <label>Payment Method *</label>

                        <select id="paymentMethod" required>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="Other">Other</option>
                        </select>

                        <label>Payment Date</label>

                        <input type="date"
                            id="paymentDate"
                            value="${today()}"
                            required>

                        <label>Notes / Transaction ID</label>

                        <textarea id="paymentNotes"
                            placeholder="Optional details (e.g. UPI Ref No.)"></textarea>

                        <div class="payment-form-actions">

                            <button type="submit">
                                Save Payment
                            </button>

                            <button type="button"
                                class="cancel"
                                id="cancelPaymentBtn">
                                Cancel
                            </button>

                        </div>

                    </form>
                </div>
            </div>
        `;

        document.getElementById("addPaymentBtn")
            .addEventListener("click", () => openForm());

        document.getElementById("cancelPaymentBtn")
            .addEventListener("click", closeForm);

        document.getElementById("closePaymentX")
            .addEventListener("click", closeForm);

        document.getElementById("paymentForm")
            .addEventListener("submit", savePayment);

        document.getElementById("paymentMember")
            .addEventListener("change", updateMemberBalance);

        document.getElementById("paymentDiscount")
            .addEventListener("change", updateMemberBalance);

        document.getElementById("paymentSearch")
            .addEventListener("input", renderTables);

        document.getElementById("paymentDateFilter")
            .addEventListener("change", renderTables);

        document.getElementById("paymentMethodFilter")
            .addEventListener("change", renderTables);

        document.querySelectorAll("[data-payment-type]").forEach(button => {
            button.addEventListener("click", () => {
                setPaymentType(button.dataset.paymentType);
            });
        });

        renderTables();
    }

    function openForm(preselectedMemberId = "") {
        const members = getMembers();
        const select = document.getElementById("paymentMember");

        select.innerHTML = `
            <option value="">Choose Member</option>

            ${members.map(member => `
                <option value="${escapeHTML(member.id)}">
                    ${escapeHTML(member.name)}
                    (${escapeHTML(member.id)})
                </option>
            `).join("")}
        `;

        document.getElementById("paymentForm").reset();

        document.getElementById("paymentDate").value = today();

        document.getElementById("paymentMemberBalance").textContent =
            "Select a member to see their fee details.";

        document.getElementById("paymentDiscount").innerHTML =
            '<option value="">No Discount</option>';

        document.getElementById("paymentDiscountNote").textContent =
            "Select a member to see available discounts.";

        setPaymentType("full");

        document.getElementById("paymentAmount").value = "";

        document.getElementById("paymentModal").style.display = "flex";

        if (preselectedMemberId) {
            select.value = preselectedMemberId;
            updateMemberBalance();
        }
    }

    function closeForm() {
        document.getElementById("paymentModal").style.display = "none";
    }

    function setPaymentType(type) {
        document.getElementById("paymentType").value = type;

        document.querySelectorAll("[data-payment-type]").forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.paymentType === type
            );
        });

        updatePaymentAmount();
    }

    function updatePaymentAmount() {
        const type = document.getElementById("paymentType").value;
        const memberId = document.getElementById("paymentMember").value;

        const member = GymDB.find("members", memberId);
        const amountInput = document.getElementById("paymentAmount");

        if (!member) return;

        const selectedDiscountId =
            document.getElementById("paymentDiscount").value;

        const balance = getMemberBalance(member, selectedDiscountId);

        if (type === "full") {
            amountInput.value = balance.pending > 0
                ? balance.pending.toFixed(2)
                : "";
        } else {
            amountInput.value = "";
        }
    }

    function updateDiscountOptions(member) {
        const select = document.getElementById("paymentDiscount");
        const note = document.getElementById("paymentDiscountNote");

        if (!select || !note) return;

        const balance = getMemberBalance(member);
        const activeDiscounts = getActiveDiscounts(member.id);

        if (balance.billing.locked) {
            select.innerHTML = `
                <option value="${escapeHTML(balance.billing.discountId)}">
                    ${balance.billing.discount > 0
                        ? escapeHTML(balance.billing.discountName)
                        : "No Discount"}
                </option>
            `;

            select.disabled = true;

            note.innerHTML = `
                <span class="payment-locked-note">
                    Billing is locked because a payment has already been recorded.
                    This discount cannot be changed for this billing cycle.
                </span>
            `;

            return;
        }

        select.disabled = false;

        const previousValue = select.value;

        select.innerHTML = `
            <option value="">No Discount</option>

            ${activeDiscounts.map(discount => {
                const amount = discount.type === "percentage"
                    ? Number(discount.value) + "%"
                    : currency(discount.value);

                const reason = discount.reason
                    ? " - " + discount.reason
                    : "";

                return `
                    <option value="${escapeHTML(discount.id)}">
                        ${escapeHTML(amount + reason)}
                    </option>
                `;
            }).join("")}
        `;

        const stillAvailable = activeDiscounts.some(discount =>
            discount.id === previousValue
        );

        if (stillAvailable) {
            select.value = previousValue;
        } else if (activeDiscounts.length) {
            select.value = activeDiscounts[0].id;
        } else {
            select.value = "";
        }

        if (!activeDiscounts.length) {
            note.textContent =
                "No active discount found for this member. You can receive payment without a discount.";
        } else {
            note.textContent =
                activeDiscounts.length + " active discount(s) available for this member.";
        }
    }

    function updateMemberBalance() {
        const memberId = document.getElementById("paymentMember").value;
        const member = GymDB.find("members", memberId);

        const box = document.getElementById("paymentMemberBalance");

        if (!member) {
            box.textContent = "Select a member to see their fee details.";

            document.getElementById("paymentAmount").value = "";

            document.getElementById("paymentDiscount").innerHTML =
                '<option value="">No Discount</option>';

            document.getElementById("paymentDiscountNote").textContent =
                "Select a member to see available discounts.";

            return;
        }

        updateDiscountOptions(member);

        const selectedDiscountId =
            document.getElementById("paymentDiscount").value;

        const balance = getMemberBalance(member, selectedDiscountId);

        const discountText = balance.discount > 0
            ? currency(balance.discount)
            : "No Discount";

        box.innerHTML = `
            Original Membership Fees:
            <strong style="color:#202124;">${currency(balance.fees)}</strong><br>

            <span class="discount-line">
                Discount Applied: <strong>${discountText}</strong>
            </span><br>

            Final Payable Fees:
            <strong style="color:#202124;">${currency(balance.finalFees)}</strong><br>

            Total Paid (Current Cycle):
            <strong style="color:#168653;">${currency(balance.paid)}</strong><br>

            <span class="pending-line">
                Remaining Pending Due:
                <strong>${currency(balance.pending)}</strong>
            </span>
            ${balance.advance > 0
                ? `<br><span style="color:#2879d0;">Advance Paid: <strong>${currency(balance.advance)}</strong></span>`
                : ""}
            ${balance.billing.discountReason
                ? `<br><small style="color:#737985;">Discount Reason: ${escapeHTML(balance.billing.discountReason)}</small>`
                : ""}
        `;

        updatePaymentAmount();
    }

    function savePayment(event) {
        event.preventDefault();

        const memberId = document.getElementById("paymentMember").value;
        const member = GymDB.find("members", memberId);

        const amount = Number(
            document.getElementById("paymentAmount").value
        );

        const date = document.getElementById("paymentDate").value;

        const paymentType =
            document.getElementById("paymentType").value;

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

        const selectedDiscountId =
            document.getElementById("paymentDiscount").value;

        const balance = getMemberBalance(member, selectedDiscountId);

        if (balance.pending <= 0 && paymentType !== "advance") {
            alert("This member has no pending fee. Select Advance if you want to record an advance payment.");
            return;
        }

        if (paymentType === "part" && amount >= balance.pending) {
            alert("For Part Payment, enter an amount less than the pending fee. Select Full Payment if paying the complete balance.");
            return;
        }

        if (paymentType === "full" && amount > balance.pending) {
            alert("Full Payment amount cannot be greater than the pending fee. Select Advance to record an advance payment.");
            return;
        }

        if (paymentType === "advance" && amount <= balance.pending) {
            const confirmAdvance = confirm(
                "This amount is not greater than the pending fee. Do you still want to record it as an advance payment?"
            );

            if (!confirmAdvance) return;
        }

        const billing = balance.billing;

        if (!billing.locked) {
            const updated = GymDB.update("members", member.id, {
                billingOriginalFees: billing.fees,
                billingDiscountAmount: billing.discount,
                billingFinalFees: billing.finalFees,
                billingDiscountName: billing.discountName,
                billingDiscountReason: billing.discountReason,
                billingDiscountId: billing.discountId || "",
                billingLockedAt: new Date().toISOString()
            });

            if (!updated) {
                alert("Could not save member billing details. Payment was not saved.");
                return;
            }
        }

        const payment = {
            id: GymDB.generateID("PAY"),

            memberId: member.id,
            memberName: member.name || "",

            amount,
            method: document.getElementById("paymentMethod").value,
            date,

            paymentType,

            billingOriginalFees: billing.fees,
            billingDiscountAmount: billing.discount,
            billingFinalFees: billing.finalFees,
            billingDiscountName: billing.discountName,
            billingDiscountReason: billing.discountReason,
            billingDiscountId: billing.discountId || "",

            notes: document.getElementById("paymentNotes")
                .value.trim(),

            status: "completed",
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
            "Delete this payment record? The member's paid and pending amounts will change."
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

        const payments = getPayments().filter(payment =>
            payment.status !== "void"
        );

        const currentDay = today();
        const month = currentMonth();

        const total = payments.reduce((sum, p) =>
            sum + Number(p.amount || 0), 0
        );

        const todayTotal = payments
            .filter(p => p.date === currentDay)
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const monthTotal = payments
            .filter(p => String(p.date || "").startsWith(month))
            .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        document.getElementById("totalPaymentsAmount").textContent =
            currency(total);

        document.getElementById("todayPaymentsAmount").textContent =
            currency(todayTotal);

        document.getElementById("monthPaymentsAmount").textContent =
            currency(monthTotal);

        const search = document.getElementById("paymentSearch")
            .value.trim().toLowerCase();

        const dateFilter =
            document.getElementById("paymentDateFilter").value;

        const methodFilter =
            document.getElementById("paymentMethodFilter").value;

        const filtered = payments.filter(payment => {
            const matchesSearch =
                (payment.memberName || "").toLowerCase().includes(search) ||
                (payment.memberId || "").toLowerCase().includes(search);

            const matchesDate =
                !dateFilter || payment.date === dateFilter;

            const matchesMethod =
                methodFilter === "all" ||
                payment.method === methodFilter;

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
                    <td>
                        <strong style="color:#202124;">${escapeHTML(payment.memberName)}</strong>
                    </td>

                    <td>
                        <span class="payment-id-pill">${escapeHTML(payment.memberId)}</span>
                    </td>

                    <td>${escapeHTML(payment.date)}</td>

                    <td>
                        <strong style="color:#168653;">${currency(payment.amount)}</strong>
                        <br>
                        <span class="payment-type-tag">${escapeHTML(payment.paymentType || "payment")}</span>
                    </td>

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
            member,
            balance: getMemberBalance(member)
        })).filter(item => item.balance.pending > 0);

        if (!pendingMembers.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="payments-empty">
                        No pending member fees found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = pendingMembers.map(item => {
            const isRenewed = Boolean(getLatestRenewal(item.member));

            return `
                <tr>
                    <td>
                        <strong style="color:#202124;">${escapeHTML(item.member.name)}</strong>
                        ${isRenewed ? `<span class="payment-renew-tag">Renewal</span>` : ""}
                    </td>

                    <td>
                        <span class="payment-id-pill">${escapeHTML(item.member.id)}</span>
                    </td>

                    <td>${currency(item.balance.fees)}</td>

                    <td style="color:#168653;font-weight:600;">${currency(item.balance.discount)}</td>

                    <td><strong>${currency(item.balance.finalFees)}</strong></td>

                    <td>${currency(item.balance.paid)}</td>

                    <td>
                        <span class="payment-pending-badge">
                            ${currency(item.balance.pending)}
                        </span>
                    </td>

                    <td>
                        <button class="payment-action collect"
                            data-collect-member="${escapeHTML(item.member.id)}">
                            Collect
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        table.querySelectorAll("[data-collect-member]").forEach(button => {
            button.addEventListener("click", function () {
                openForm(this.dataset.collectMember);
            });
        });
    }

    return {
        render,
        refresh: renderTables,
        getMemberBalance
    };
})();

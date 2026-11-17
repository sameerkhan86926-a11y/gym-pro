/* =====================================
   GYM PRO - MAIN JAVASCRIPT
   Version 1.0.0
===================================== */

document.addEventListener("DOMContentLoaded", function () {

    // Check database
    if (typeof GymDB === "undefined") {
        alert("Database file load nahi hui. js/database.js check karein.");
        return;
    }

    GymDB.init();

    const today = new Date();

    // Page information
    const pages = {
        dashboard: {
            title: "Dashboard",
            subtitle: "Welcome to your gym management system"
        },
        members: {
            title: "Members",
            subtitle: "Manage all gym members"
        },
        membership: {
            title: "Membership Plans",
            subtitle: "Create and manage membership plans"
        },
        discounts: {
            title: "Discounts",
            subtitle: "Manage member discounts"
        },
        payments: {
            title: "Fees & Payments",
            subtitle: "Manage collections and pending fees"
        },
        attendance: {
            title: "Attendance",
            subtitle: "Track daily member attendance"
        },
        expiry: {
            title: "Expiry Management",
            subtitle: "Manage expiring and expired memberships"
        },
        trainers: {
            title: "Trainers",
            subtitle: "Manage gym trainers"
        },
        expenses: {
            title: "Expenses",
            subtitle: "Track gym expenses"
        },
        reports: {
            title: "Reports & Analytics",
            subtitle: "View gym business reports"
        },
        biometric: {
            title: "Biometric Device",
            subtitle: "Fingerprint device integration"
        },
        backup: {
            title: "Backup & Restore",
            subtitle: "Protect and restore your gym data"
        },
        settings: {
            title: "Settings",
            subtitle: "Customize your gym management system"
        }
    };

    // Date display
    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // Utility functions
    function getToday() {
        return new Date().toISOString().split("T")[0];
    }

    function getDate(value) {
        if (!value) return "";

        return String(value).split("T")[0];
    }

    function formatCurrency(amount) {
        return "₹" + Number(amount || 0).toLocaleString("en-IN");
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[char];
        });
    }

    function showToast(message) {
        const toast = document.getElementById("toast");

        if (!toast) {
            alert(message);
            return;
        }

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(window.gymToastTimer);

        window.gymToastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 3000);
    }

    function getPaymentDate(payment) {
        return getDate(
            payment.paymentDate ||
            payment.date ||
            payment.createdAt
        );
    }

    function getMemberExpiry(member) {
        return getDate(
            member.expiryDate ||
            member.endDate
        );
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

        const expiry = getMemberExpiry(member);

        if (expiry && expiry < getToday()) {
            return "inactive";
        }

        return "active";
    }

    // Dashboard calculations
    function updateDashboard() {

        const members = GymDB.getAll("members");
        const payments = GymDB.getAll("payments");
        const attendance = GymDB.getAll("attendance");

        const todayDate = getToday();

        const currentMonth = todayDate.substring(0, 7);

        const activeMembers = members.filter(function (member) {
            return getMemberStatus(member) === "active";
        });

        const todayAttendance = attendance.filter(function (record) {
            const recordDate = getDate(
                record.date ||
                record.checkInDate ||
                record.createdAt
            );

            return recordDate === todayDate;
        });

        const monthlyPayments = payments.filter(function (payment) {
            return getPaymentDate(payment).startsWith(currentMonth);
        });

        const monthlyRevenue = monthlyPayments.reduce(function (total, payment) {

            const amount = Number(
                payment.paidAmount ??
                payment.amount ??
                payment.total ??
                0
            );

            if (String(payment.type || "").toLowerCase() === "refund") {
                return total - amount;
            }

            return total + amount;

        }, 0);

        const pendingFees = members.reduce(function (total, member) {

            return total + Number(
                member.pendingAmount ??
                member.balance ??
                member.dueAmount ??
                0
            );

        }, 0);

        const expiringMembers = members.filter(function (member) {

            const expiry = getMemberExpiry(member);

            if (!expiry || getMemberStatus(member) !== "active") {
                return false;
            }

            const days = Math.ceil(
                (new Date(expiry + "T00:00:00") -
                new Date(todayDate + "T00:00:00")) / 86400000
            );

            return days >= 0 && days <= 7;

        });

        // Update dashboard cards
        setText("totalMembers", members.length);
        setText("activeMembers", activeMembers.length);
        setText("todayAttendance", todayAttendance.length);
        setText("monthlyRevenue", formatCurrency(monthlyRevenue));
        setText("pendingFees", formatCurrency(pendingFees));
        setText("expiringMembers", expiringMembers.length);

        renderRecentMembers(members);
        renderMembershipAlerts(expiringMembers);
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    // Recent members
    function renderRecentMembers(members) {

        const table = document.getElementById("recentMembers");

        if (!table) return;

        if (!members.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:25px;">
                        No members registered yet.
                    </td>
                </tr>
            `;

            return;
        }

        const sortedMembers = [...members].sort(function (a, b) {
            return new Date(b.createdAt || b.joiningDate || 0) -
                   new Date(a.createdAt || a.joiningDate || 0);
        });

        table.innerHTML = sortedMembers.slice(0, 5).map(function (member) {

            const name = escapeHTML(member.name || "Unnamed");
            const phone = escapeHTML(member.phone || "-");
            const plan = escapeHTML(member.planName || member.plan || "-");

            const status = getMemberStatus(member);

            return `
                <tr>
                    <td>${name}</td>
                    <td>${phone}</td>
                    <td>${plan}</td>
                    <td>
                        <span class="status-badge ${status}">
                            ${status.toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;

        }).join("");
    }

    // Membership alerts
    function renderMembershipAlerts(members) {

        const container = document.getElementById("membershipAlerts");

        if (!container) return;

        if (!members.length) {
            container.innerHTML = `
                <div class="empty-state">
                    No memberships expiring in the next 7 days.
                </div>
            `;

            return;
        }

        container.innerHTML = members.map(function (member) {

            const expiry = getMemberExpiry(member);

            const days = Math.ceil(
                (new Date(expiry + "T00:00:00") -
                new Date(getToday() + "T00:00:00")) / 86400000
            );

            let message = days === 0
                ? "Expires today"
                : "Expires in " + days + " days";

            return `
                <div class="alert-item">
                    <div>
                        <strong>${escapeHTML(member.name || "Member")}</strong>
                        <p>${escapeHTML(member.phone || "")}</p>
                    </div>
                    <span>${message}</span>
                </div>
            `;

        }).join("");
    }

    // Navigation
    function openPage(pageName) {

        if (!pages[pageName]) return;

        document.querySelectorAll(".nav-item").forEach(function (item) {
            item.classList.remove("active");
        });

        const activeItem = document.querySelector(
            '.nav-item[data-page="' + pageName + '"]'
        );

        if (activeItem) {
            activeItem.classList.add("active");
        }

        setText("pageTitle", pages[pageName].title);
        setText("pageSubtitle", pages[pageName].subtitle);

        if (pageName === "dashboard") {
            updateDashboard();
        } else {
            showComingSoon(pageName);
        }

        // Close mobile sidebar
        const sidebar = document.querySelector(".sidebar");

        if (sidebar) {
            sidebar.classList.remove("open");
        }
    }

    // Temporary page content
    function showComingSoon(pageName) {

        const existing = document.getElementById("modulePlaceholder");

        if (existing) {
            existing.remove();
        }

        const main = document.querySelector(".main-content");

        if (!main) return;

        const placeholder = document.createElement("div");

        placeholder.id = "modulePlaceholder";

        placeholder.innerHTML = `
            <div class="module-placeholder">
                <div class="module-icon">GP</div>
                <h2>${escapeHTML(pages[pageName].title)}</h2>
                <p>
                    This module is being developed.
                    It will be available in the next development phase.
                </p>
                <button type="button" id="backToDashboard">
                    Back to Dashboard
                </button>
            </div>
        `;

        main.appendChild(placeholder);

        const backButton = document.getElementById("backToDashboard");

        if (backButton) {
            backButton.addEventListener("click", function () {
                openPage("dashboard");
            });
        }
    }

    // Navigation click events
    document.querySelectorAll(".nav-item[data-page]").forEach(function (item) {

        item.addEventListener("click", function (event) {

            event.preventDefault();

            const page = item.dataset.page;

            openPage(page);
        });
    });

    // Quick action buttons
    document.querySelectorAll("[data-action]").forEach(function (button) {

        button.addEventListener("click", function () {

            const action = button.dataset.action;

            const actionPages = {
                "add-member": "members",
                "collect-payment": "payments",
                "mark-attendance": "attendance",
                "add-discount": "discounts"
            };

            if (actionPages[action]) {
                openPage(actionPages[action]);
            }

        });
    });

    // Mobile sidebar toggle
    const menuToggle = document.getElementById("menuToggle");

    if (menuToggle) {

        menuToggle.addEventListener("click", function () {

            const sidebar = document.querySelector(".sidebar");

            if (sidebar) {
                sidebar.classList.toggle("open");
            }

        });
    }

    // Notification button
    const notificationButton = document.getElementById("notificationButton");

    if (notificationButton) {
        notificationButton.addEventListener("click", function () {
            showToast("Notification center will be available soon.");
        });
    }

    // Initial dashboard load
    updateDashboard();

    console.log("GYM PRO initialized successfully.");

});

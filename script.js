/* =====================================
GYM PRO - MAIN JAVASCRIPT
Version 1.0.3
===================================== */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // DATABASE CHECK
    if (typeof GymDB === "undefined") {
        alert("Database file not loaded. Check js/database.js");
        return;
    }

    GymDB.init();

    // ELEMENTS
    const dashboardContent = document.getElementById("dashboardContent");
    const modulePlaceholder = document.getElementById("modulePlaceholder");
    const sidebar = document.getElementById("sidebar");

    // PAGE INFORMATION
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

    // DATE HELPERS
    function getToday() {
        const date = new Date();

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function getDate(value) {
        if (!value) return "";
        return String(value).split("T")[0];
    }

    const dateElement = document.getElementById("currentDate");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // GENERAL HELPERS
    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
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

    function formatCurrency(amount) {
        return "₹" + Number(amount || 0).toLocaleString("en-IN");
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

    // Expose showToast globally so all modules can use it
    window.showToast = showToast;

    // MEMBER HELPERS
    function getMemberExpiry(member) {
        return getDate(member.expiryDate || member.endDate);
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

    // PAYMENT HELPERS
    function getMemberPending(member, payments) {
        const memberPayments = payments.filter(function (payment) {
            return String(payment.memberId) === String(member.id) &&
                payment.status !== "void";
        });

        let finalFees = null;

        // Use the same billing calculation as Payments module.
        if (
            window.GymPayments &&
            typeof window.GymPayments.getMemberBalance === "function"
        ) {
            const balance = window.GymPayments.getMemberBalance(member);

            if (
                balance &&
                Number.isFinite(Number(balance.finalFees))
            ) {
                finalFees = Number(balance.finalFees);
            }
        }

        // Fallback to saved billing snapshot.
        if (finalFees === null) {
            if (
                member.billingFinalFees !== undefined &&
                member.billingFinalFees !== null &&
                member.billingFinalFees !== ""
            ) {
                finalFees = Number(member.billingFinalFees);
            } else {
                const billingPayment = memberPayments.find(function (payment) {
                    return payment.billingFinalFees !== undefined &&
                        payment.billingFinalFees !== null;
                });

                if (billingPayment) {
                    finalFees = Number(billingPayment.billingFinalFees);
                } else {
                    finalFees = Number(member.fees || member.amount || 0);
                }
            }
        }

        // Total received payments.
        const received = memberPayments.reduce(function (total, payment) {
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

        return Math.max(0, finalFees - received);
    }

    // DASHBOARD
    function updateDashboard() {
        const members = GymDB.getAll("members") || [];
        const payments = GymDB.getAll("payments") || [];
        const attendance = GymDB.getAll("attendance") || [];

        const today = getToday();
        const currentMonth = today.substring(0, 7);

        // TOTAL MEMBERS
        const totalMembers = members.length;

        // ACTIVE MEMBERS
        const activeMembers = members.filter(function (member) {
            return getMemberStatus(member) === "active";
        }).length;

        // TODAY ATTENDANCE
        const todayAttendance = attendance.filter(function (record) {
            const recordDate = getDate(
                record.date ||
                record.checkInDate ||
                record.createdAt
            );

            return recordDate === today;
        }).length;

        // MONTHLY REVENUE
        const monthlyRevenue = payments
            .filter(function (payment) {
                const paymentDate = getDate(
                    payment.paymentDate ||
                    payment.date ||
                    payment.createdAt
                );

                return paymentDate.startsWith(currentMonth) &&
                    payment.status !== "void";
            })
            .reduce(function (total, payment) {
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

        // PENDING FEES AFTER DISCOUNT
        const pendingFees = members.reduce(function (total, member) {
            return total + getMemberPending(member, payments);
        }, 0);

        // EXPIRING MEMBERS
        const expiringMembers = members.filter(function (member) {
            const expiry = getMemberExpiry(member);

            if (!expiry || getMemberStatus(member) !== "active") {
                return false;
            }

            const todayDate = new Date(today + "T00:00:00");
            const expiryDate = new Date(expiry + "T00:00:00");

            const days = Math.ceil(
                (expiryDate - todayDate) / 86400000
            );

            return days >= 0 && days <= 7;
        });

        // UPDATE DASHBOARD CARDS
        setText("totalMembers", totalMembers);
        setText("activeMembers", activeMembers);
        setText("todayAttendance", todayAttendance);
        setText("monthlyRevenue", formatCurrency(monthlyRevenue));
        setText("pendingFees", formatCurrency(pendingFees));
        setText("expiringMembers", expiringMembers.length);

        renderRecentMembers(members);
        renderMembershipAlerts(expiringMembers);
    }

    // RECENT MEMBERS
    function renderRecentMembers(members) {
        const table = document.getElementById("recentMembers");

        if (!table) return;

        if (!members.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
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

    // MEMBERSHIP ALERTS
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

            const todayDate = new Date(getToday() + "T00:00:00");
            const expiryDate = new Date(expiry + "T00:00:00");

            const days = Math.ceil(
                (expiryDate - todayDate) / 86400000
            );

            const message = days === 0
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

    // EXPOSE DASHBOARD REFRESH
    window.updateGymDashboard = updateDashboard;

    // MODULE ROUTER
    function loadModule(pageName) {
        const modules = {
            members: window.GymMembers,
            membership: window.GymPlans,
            discounts: window.GymDiscounts,
            payments: window.GymPayments,
            attendance: window.GymAttendance,
            expiry: window.GymNotifications,
            trainers: window.GymTrainers,
            expenses: window.GymExpenses,
            reports: window.GymReports,
            settings: window.GymSettings,
            backup: window.GymSettings
        };

        const module = modules[pageName];

        if (module && typeof module.render === "function") {
            module.render();
            return true;
        }

        return false;
    }

    // BIOMETRIC PLACEHOLDER
    function showBiometricPage() {
        if (!modulePlaceholder) return;

        modulePlaceholder.innerHTML = `
            <div class="module-placeholder" style="padding:35px 20px;text-align:center;">
                <div style="font-size:42px;color:#ad8aff;margin-bottom:15px;">
                    ♧
                </div>

                <h2>Biometric Device</h2>

                <p style="color:#aaa;margin:15px auto;max-width:500px;line-height:1.7;">
                    Fingerprint device integration is not connected yet.
                    First, the device model and its supported software/API
                    need to be identified.
                </p>

                <div style="padding:15px;border:1px solid #39304e;border-radius:12px;margin:20px auto;max-width:450px;">
                    <strong>Current Status:</strong>
                    <span style="color:#ffbd59;"> Not Connected</span>
                </div>

                <p style="color:#999;font-size:13px;">
                    Manual attendance is available in the Attendance module.
                </p>

                <button type="button" id="biometricBack"
                    style="padding:12px 22px;border:0;border-radius:8px;background:#8154f7;color:white;cursor:pointer;margin-top:15px;">
                    Back to Dashboard
                </button>
            </div>
        `;

        const backButton = document.getElementById("biometricBack");

        if (backButton) {
            backButton.addEventListener("click", function () {
                openPage("dashboard");
            });
        }
    }

    // MODULE NOT AVAILABLE
    function showModuleError(pageName) {
        if (!modulePlaceholder) return;

        modulePlaceholder.innerHTML = `
            <div style="padding:35px 20px;text-align:center;">
                <h2>${escapeHTML(pages[pageName].title)}</h2>
                <p style="color:#aaa;margin:15px 0;">
                    This module could not be loaded.
                </p>
                <p style="color:#999;font-size:13px;">
                    Please check the JavaScript file and its connection.
                </p>
                <button type="button" id="moduleBack"
                    style="padding:12px 22px;border:0;border-radius:8px;background:#8154f7;color:white;cursor:pointer;">
                    Back to Dashboard
                </button>
            </div>
        `;

        const backButton = document.getElementById("moduleBack");

        if (backButton) {
            backButton.addEventListener("click", function () {
                openPage("dashboard");
            });
        }
    }

    // PAGE NAVIGATION
    function openPage(pageName, options = {}) {
        if (!pages[pageName]) return;

        // ACTIVE MENU
        document.querySelectorAll(".nav-item").forEach(function (item) {
            item.classList.remove("active");
        });

        const activeItem = document.querySelector(
            '.nav-item[data-page="' + pageName + '"]'
        );

        if (activeItem) {
            activeItem.classList.add("active");
        }

        // PAGE TITLE
        setText("pageTitle", pages[pageName].title);
        setText("pageSubtitle", pages[pageName].subtitle);

        // CONTENT DISPLAY
        if (dashboardContent) {
            dashboardContent.style.display =
                pageName === "dashboard" ? "" : "none";
        }

        if (modulePlaceholder) {
            modulePlaceholder.style.display =
                pageName === "dashboard" ? "none" : "block";
        }

        // LOAD PAGE
        if (pageName === "dashboard") {
            updateDashboard();
        } else if (pageName === "biometric") {
            showBiometricPage();
        } else {
            const loaded = loadModule(pageName);

            if (!loaded) {
                showModuleError(pageName);
            }
        }

        // CLOSE MOBILE SIDEBAR
        if (sidebar) {
            sidebar.classList.remove("open");
        }

        // QUICK ADD MEMBER
        if (options.addMember && pageName === "members") {
            setTimeout(function () {
                const addButton = document.getElementById("addMemberBtn");

                if (addButton) {
                    addButton.click();
                } else {
                    showToast("Members page opened. Use Add Member button.");
                }
            }, 100);
        }
    }

    // GLOBAL PAGE ACCESS
    window.openGymPage = openPage;

    // SIDEBAR AND PAGE BUTTONS
    document.querySelectorAll("[data-page]").forEach(function (item) {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            openPage(item.dataset.page);
        });
    });

    // QUICK ACTIONS
    document.querySelectorAll("[data-action]").forEach(function (button) {
        button.addEventListener("click", function () {
            const action = button.dataset.action;

            const actionPages = {
                "add-member": "members",
                "collect-payment": "payments",
                "mark-attendance": "attendance",
                "add-discount": "discounts"
            };

            if (action === "add-member") {
                openPage("members", { addMember: true });
            } else if (actionPages[action]) {
                openPage(actionPages[action]);
            }
        });
    });

    // MOBILE MENU
    const menuToggle = document.getElementById("menuToggle");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("open");
        });
    }

    // NOTIFICATION BUTTON
    const notificationButton = document.getElementById("notificationButton");

    if (notificationButton) {
        notificationButton.addEventListener("click", function () {
            openPage("expiry");
        });
    }

    // INITIALIZE
    openPage("dashboard");

    console.log("GYM PRO v1.0.3 initialized successfully.");
});

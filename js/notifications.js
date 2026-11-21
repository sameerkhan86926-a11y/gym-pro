window.GymNotifications = (function () {

    const MODULE = "notifications";

    function today() {
        const d = new Date();
        const offset = d.getTimezoneOffset();

        return new Date(d.getTime() - offset * 60000)
            .toISOString().slice(0, 10);
    }

    function getMembers() {
        return GymDB.getAll("members") || [];
    }

    function getNotifications() {
        return GymDB.getAll(MODULE) || [];
    }

    function saveNotifications(data) {
        GymDB.saveAll(MODULE, data);
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

    function dateFormat(date) {
        if (!date) return "-";

        const d = new Date(date + "T00:00:00");

        if (isNaN(d)) return date;

        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getExpiryStatus(expiryDate) {
        if (!expiryDate) return null;

        const current = new Date(today() + "T00:00:00");
        const expiry = new Date(expiryDate + "T00:00:00");

        if (isNaN(expiry)) return null;

        const days = Math.round(
            (expiry - current) / 86400000
        );

        if (days < 0) {
            return {
                type: "expired",
                label: "Expired (" + Math.abs(days) + "d ago)",
                days
            };
        }

        if (days === 0) {
            return {
                type: "today",
                label: "Expires Today",
                days
            };
        }

        if (days === 1) {
            return {
                type: "tomorrow",
                label: "Expires Tomorrow",
                days
            };
        }

        if (days <= 7) {
            return {
                type: "soon",
                label: "Expires in " + days + " days",
                days
            };
        }

        if (days <= 15) {
            return {
                type: "upcoming",
                label: "Expires in " + days + " days",
                days
            };
        }

        return null;
    }

    function getExpiryAlerts() {
        return getMembers()
            .filter(member =>
                String(member.status || "").toLowerCase() !== "inactive"
            )
            .map(member => {
                const status = getExpiryStatus(member.expiryDate);

                if (!status) return null;

                return {
                    member,
                    ...status
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.days - b.days);
    }

    function syncExpiryNotifications() {
        const alerts = getExpiryAlerts();
        const saved = getNotifications();
        let hasNew = false;

        alerts.forEach(alert => {
            const id = "expiry_" +
                alert.member.id + "_" +
                alert.member.expiryDate;

            const exists = saved.some(n => n.id === id);

            if (!exists) {
                saved.push({
                    id,
                    title: alert.label,
                    message: alert.member.name +
                        " membership " +
                        alert.label.toLowerCase(),
                    memberId: alert.member.id,
                    type: alert.type,
                    date: today(),
                    read: false,
                    createdAt: new Date().toISOString()
                });
                hasNew = true;
            }
        });

        if (hasNew) {
            saveNotifications(saved);
        }
    }

    // WhatsApp number formatting
    function getWhatsAppNumber(phone) {
        if (!phone) return "";

        let number = String(phone).replace(/\D/g, "");

        if (!number) return "";

        // Indian mobile number
        if (number.length === 10) {
            number = "91" + number;
        }

        // Already includes India's country code
        if (number.length === 12 && number.startsWith("91")) {
            return number;
        }

        // Other international numbers
        if (number.length >= 11 && number.length <= 15) {
            return number;
        }

        return "";
    }

    // WhatsApp reminder message
    function getWhatsAppMessage(alert) {
        const memberName = alert.member.name || "Member";
        const expiry = dateFormat(alert.member.expiryDate);

        if (alert.type === "expired") {
            return (
                `Hello ${memberName},\n\n` +
                `Your gym membership expired on ${expiry}.\n\n` +
                `Please contact us to renew your membership and continue your workout.\n\n` +
                `Thank you!\nGYM PRO`
            );
        }

        return (
            `Hello ${memberName},\n\n` +
            `This is a reminder that your gym membership will expire on ${expiry}.\n\n` +
            `Please renew your membership on time to continue your workout without interruption.\n\n` +
            `Thank you!\nGYM PRO`
        );
    }

    function sendWhatsAppReminder(memberId) {
        const alert = getExpiryAlerts().find(item =>
            item.member.id === memberId
        );

        if (!alert) {
            alert("Expiry information not found.");
            return;
        }

        const phone = getWhatsAppNumber(alert.member.phone);

        if (!phone) {
            alert("Valid WhatsApp mobile number is not available for this member.");
            return;
        }

        const message = getWhatsAppMessage(alert);

        const url =
            "https://wa.me/" +
            phone +
            "?text=" +
            encodeURIComponent(message);

        window.open(url, "_blank", "noopener,noreferrer");
    }

    function notify(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    function render() {
        const root = document.getElementById("modulePlaceholder");

        if (!root) return;

        root.innerHTML = `
            <div class="gym-notification-module">

                <div class="notification-heading">
                    <div>
                        <h2>Expiry Management & Renewal Alerts</h2>
                        <p>Track expiring memberships and send instant WhatsApp renewal reminders.</p>
                    </div>

                    <button id="markAllReadBtn" class="notif-primary-btn">
                        ✓ Mark All Read
                    </button>
                </div>

                <div class="notification-stats">

                    <div class="notif-stat-card">
                        <div class="notif-stat-top">
                            <span>Already Expired</span>
                            <div class="notif-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="expiredCount" style="color:#d71920;">0</strong>
                    </div>

                    <div class="notif-stat-card">
                        <div class="notif-stat-top">
                            <span>Expiring Today</span>
                            <div class="notif-stat-dot" style="background:#d97706;"></div>
                        </div>
                        <strong id="todayExpiryCount">0</strong>
                    </div>

                    <div class="notif-stat-card">
                        <div class="notif-stat-top">
                            <span>Next 7 Days</span>
                            <div class="notif-stat-dot" style="background:#2879d0;"></div>
                        </div>
                        <strong id="weekExpiryCount">0</strong>
                    </div>

                    <div class="notif-stat-card">
                        <div class="notif-stat-top">
                            <span>Unread Alerts</span>
                            <div class="notif-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="unreadCount">0</strong>
                    </div>

                </div>

                <div class="notification-section">

                    <div class="notification-section-header">
                        <h3>Membership Expiry Alerts</h3>
                        <p>Filter members by expiry window and send direct WhatsApp reminders</p>
                    </div>

                    <div class="expiry-filter">
                        <input
                            type="search"
                            id="expirySearch"
                            placeholder="Search member name, ID or phone..."
                        >

                        <select id="expiryFilter">
                            <option value="all">All Expiry Alerts</option>
                            <option value="expired">Already Expired</option>
                            <option value="today">Expires Today</option>
                            <option value="tomorrow">Expires Tomorrow</option>
                            <option value="soon">Next 7 Days</option>
                            <option value="upcoming">Next 8–15 Days</option>
                        </select>
                    </div>

                    <div id="expiryAlertsList" class="expiry-list-stack"></div>

                </div>

                <div class="notification-section">

                    <div class="notification-section-header">
                        <h3>Notification History</h3>
                        <p>System-generated alert logs</p>
                    </div>

                    <div id="notificationHistory" class="expiry-list-stack"></div>

                </div>

            </div>
        `;

        addStyles();
        attachEvents();
        refresh();
    }

    function refresh() {
        syncExpiryNotifications();

        const alerts = getExpiryAlerts();
        const notifications = getNotifications();

        const expired = alerts.filter(a =>
            a.type === "expired"
        ).length;

        const todayCount = alerts.filter(a =>
            a.type === "today"
        ).length;

        const week = alerts.filter(a =>
            a.days >= 0 && a.days <= 7
        ).length;

        const unread = notifications.filter(n =>
            !n.read
        ).length;

        const expiredElement = document.getElementById("expiredCount");
        const todayElement = document.getElementById("todayExpiryCount");
        const weekElement = document.getElementById("weekExpiryCount");
        const unreadElement = document.getElementById("unreadCount");

        if (expiredElement) expiredElement.textContent = expired;
        if (todayElement) todayElement.textContent = todayCount;
        if (weekElement) weekElement.textContent = week;
        if (unreadElement) unreadElement.textContent = unread;

        renderExpiryAlerts(alerts);
        renderHistory(notifications);
    }

    function renderExpiryAlerts(alerts) {
        const container = document.getElementById("expiryAlertsList");

        if (!container) return;

        const searchElement = document.getElementById("expirySearch");
        const filterElement = document.getElementById("expiryFilter");

        const search = searchElement
            ? searchElement.value.trim().toLowerCase()
            : "";

        const filter = filterElement
            ? filterElement.value
            : "all";

        const filtered = alerts.filter(alert => {
            const member = alert.member;

            const matchesSearch =
                String(member.name || "").toLowerCase().includes(search) ||
                String(member.phone || "").toLowerCase().includes(search) ||
                String(member.id || "").toLowerCase().includes(search);

            const matchesFilter =
                filter === "all" ||
                alert.type === filter;

            return matchesSearch && matchesFilter;
        });

        if (!filtered.length) {
            container.innerHTML = `
                <div class="notification-empty">
                    No membership expiry alerts found.
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(alert => {
            const phone = getWhatsAppNumber(alert.member.phone);

            return `
                <div class="expiry-alert ${escapeHTML(alert.type)}">

                    <div class="expiry-info">

                        <div class="expiry-member-row">
                            <strong>${escapeHTML(alert.member.name)}</strong>
                            <span class="expiry-id-pill">${escapeHTML(alert.member.id)}</span>
                        </div>

                        <div class="expiry-meta-row">
                            <span>Phone: <strong>${escapeHTML(alert.member.phone || "-")}</strong></span>
                            <span>•</span>
                            <span>Expiry Date: <strong>${dateFormat(alert.member.expiryDate)}</strong></span>
                        </div>

                    </div>

                    <div class="expiry-actions">

                        <span class="expiry-label">
                            ${escapeHTML(alert.label)}
                        </span>

                        ${
                            phone
                                ? `
                                    <button
                                        class="whatsapp-reminder-btn"
                                        data-whatsapp-id="${escapeHTML(alert.member.id)}"
                                    >
                                        WhatsApp Reminder
                                    </button>
                                `
                                : `
                                    <button
                                        class="whatsapp-reminder-btn disabled"
                                        type="button"
                                        disabled
                                    >
                                        No Valid Phone
                                    </button>
                                `
                        }

                    </div>

                </div>
            `;
        }).join("");

        container.querySelectorAll("[data-whatsapp-id]")
            .forEach(button => {
                button.addEventListener("click", function () {
                    sendWhatsAppReminder(this.dataset.whatsappId);
                });
            });
    }

    function renderHistory(notifications) {
        const container = document.getElementById("notificationHistory");

        if (!container) return;

        if (!notifications.length) {
            container.innerHTML = `
                <div class="notification-empty">
                    No notification logs yet.
                </div>
            `;
            return;
        }

        const sorted = [...notifications].sort((a, b) =>
            new Date(b.createdAt || b.date) -
            new Date(a.createdAt || a.date)
        );

        container.innerHTML = sorted.map(notification => `
            <div class="history-item ${notification.read ? "read" : "unread"}">

                <div>
                    <strong>${escapeHTML(notification.title)}</strong>
                    <p>${escapeHTML(notification.message)}</p>
                    <small>${dateFormat(notification.date)}</small>
                </div>

                <div class="history-actions">

                    <span class="history-badge ${notification.read ? "read" : "unread"}">
                        ${notification.read ? "Read" : "Unread"}
                    </span>

                    ${
                        notification.read
                            ? ""
                            : `
                                <button class="mark-read-btn" data-read-id="${escapeHTML(notification.id)}">
                                    Mark Read
                                </button>
                            `
                    }

                </div>

            </div>
        `).join("");

        container.querySelectorAll("[data-read-id]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    markRead(button.dataset.readId);
                });
            });
    }

    function markRead(id) {
        const notifications = getNotifications();

        const updated = notifications.map(n =>
            n.id === id
                ? { ...n, read: true }
                : n
        );

        saveNotifications(updated);
        refresh();
    }

    function markAllRead() {
        const notifications = getNotifications();

        saveNotifications(
            notifications.map(n => ({
                ...n,
                read: true
            }))
        );

        refresh();

        notify("All notifications marked as read.");
    }

    function attachEvents() {
        document.getElementById("markAllReadBtn")
            .addEventListener("click", markAllRead);

        document.getElementById("expirySearch")
            .addEventListener("input", () => {
                renderExpiryAlerts(getExpiryAlerts());
            });

        document.getElementById("expiryFilter")
            .addEventListener("change", () => {
                renderExpiryAlerts(getExpiryAlerts());
            });
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function addStyles() {
        if (document.getElementById("gymNotificationStyles")) return;

        const style = document.createElement("style");
        style.id = "gymNotificationStyles";

        style.textContent = `
            .gym-notification-module {
                color: #202124;
                width: 100%;
                padding: 2px 0 25px;
            }

            .notification-heading {
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

            .notification-heading h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }

            .notification-heading p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }

            .notif-primary-btn {
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

            .notif-primary-btn:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
                transform: translateY(-1px);
            }

            .notification-stats {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .notif-stat-card {
                padding: 18px 20px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }

            .notif-stat-card:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }

            .notif-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .notif-stat-card span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }

            .notif-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }

            .notif-stat-card strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }

            .notification-section {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }

            .notification-section-header {
                margin-bottom: 16px;
            }

            .notification-section-header h3 {
                margin: 0 0 3px;
                font-size: 15px;
                font-weight: 800;
                color: #202124;
            }

            .notification-section-header p {
                margin: 0;
                font-size: 11px;
                color: #737985;
            }

            .expiry-filter {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 16px;
            }

            .expiry-filter input,
            .expiry-filter select {
                padding: 11px 14px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                min-width: 190px;
                outline: none;
                transition: all 0.2s ease;
            }

            .expiry-filter input {
                flex: 1;
            }

            .expiry-filter select {
                font-weight: 600;
            }

            .expiry-filter input:focus,
            .expiry-filter select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }

            .expiry-list-stack {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .expiry-alert,
            .history-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                padding: 15px 16px;
                border-radius: 10px;
                background: #f8f9fb;
                border: 1px solid #edf0f3;
                transition: all 0.18s ease;
            }

            .expiry-alert:hover {
                background: #fffafa;
                border-color: #f2bfc1;
            }

            .expiry-alert.expired {
                background: #fff7f7;
                border-left: 4px solid #d71920;
            }

            .expiry-alert.today,
            .expiry-alert.tomorrow {
                background: #fffaf2;
                border-left: 4px solid #d97706;
            }

            .expiry-alert.soon,
            .expiry-alert.upcoming {
                border-left: 4px solid #2879d0;
            }

            .expiry-member-row {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 5px;
            }

            .expiry-member-row strong {
                font-size: 13.5px;
                color: #202124;
            }

            .expiry-id-pill {
                padding: 2px 7px;
                border-radius: 5px;
                background: #ffffff;
                border: 1px solid #dfe2e8;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }

            .expiry-meta-row {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                font-size: 11.5px;
                color: #737985;
            }

            .expiry-meta-row strong {
                color: #454c57;
                font-weight: 600;
            }

            .expiry-actions {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            .expiry-label {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 10.5px;
                font-weight: 700;
                background: #edf5ff;
                color: #2879d0;
                white-space: nowrap;
            }

            .expiry-alert.expired .expiry-label {
                background: #fff0f0;
                color: #d71920;
            }

            .expiry-alert.today .expiry-label,
            .expiry-alert.tomorrow .expiry-label {
                background: #fff3e0;
                color: #c26a00;
            }

            .whatsapp-reminder-btn {
                border: 0;
                border-radius: 8px;
                background: #168653;
                color: #ffffff;
                padding: 8px 14px;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                box-shadow: 0 3px 10px rgba(22, 134, 83, 0.18);
                transition: all 0.18s ease;
            }

            .whatsapp-reminder-btn:hover {
                background: #116b42;
                transform: translateY(-1px);
            }

            .whatsapp-reminder-btn.disabled {
                background: #e7e9ee;
                color: #8a909a;
                box-shadow: none;
                cursor: not-allowed;
                transform: none;
            }

            .history-item {
                background: #ffffff;
            }

            .history-item strong {
                font-size: 12.5px;
                color: #202124;
            }

            .history-item p {
                margin: 4px 0;
                color: #5f6672;
                font-size: 11.5px;
            }

            .history-item small {
                color: #8a909a;
                font-size: 10.5px;
            }

            .history-item.read {
                opacity: 0.7;
                background: #f8f9fb;
            }

            .history-actions {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .history-badge {
                padding: 4px 9px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
            }

            .history-badge.unread {
                background: #fff0f0;
                color: #d71920;
            }

            .history-badge.read {
                background: #f2f4f7;
                color: #69717e;
            }

            .mark-read-btn {
                padding: 6px 11px;
                border-radius: 7px;
                border: 1px solid #dfe2e8;
                background: #ffffff;
                color: #303640;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .mark-read-btn:hover {
                background: #fff0f0;
                border-color: #f2bfc1;
                color: #d71920;
            }

            .notification-empty {
                padding: 32px 15px;
                text-align: center;
                color: #8a909a;
                font-size: 12px;
            }

            @media(max-width:750px) {
                .notification-stats {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }

                .expiry-filter {
                    flex-direction: column;
                }

                .expiry-filter input,
                .expiry-filter select {
                    width: 100%;
                    box-sizing: border-box;
                }
            }

            @media(max-width:520px) {
                .expiry-alert,
                .history-item {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .expiry-actions {
                    width: 100%;
                    justify-content: space-between;
                }

                .notification-heading button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    return {
        render,
        refresh,
        getExpiryAlerts,
        sendWhatsAppReminder
    };
})();

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

    return d.toLocaleDateString("en-IN");
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
            label: "Expired",
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
        }
    });

    saveNotifications(saved);
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

    let message = "";

    if (alert.type === "expired") {
        message =
            `Hello ${memberName},\n\n` +
            `Your gym membership expired on ${expiry}.\n\n` +
            `Please contact us to renew your membership and continue your workout.\n\n` +
            `Thank you!\nGYM PRO`;
    } else {
        message =
            `Hello ${memberName},\n\n` +
            `This is a reminder that your gym membership will expire on ${expiry}.\n\n` +
            `Please renew your membership on time to continue your workout without interruption.\n\n` +
            `Thank you!\nGYM PRO`;
    }

    return message;
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

    syncExpiryNotifications();

    root.innerHTML = `
        <div class="gym-notification-module">

            <div class="notification-heading">
                <div>
                    <h2>Expiry Management</h2>
                    <p>Membership expiry reminders and WhatsApp alerts</p>
                </div>

                <button id="markAllReadBtn">
                    Mark All Read
                </button>
            </div>

            <div class="notification-stats">

                <div>
                    <span>Expired Members</span>
                    <strong id="expiredCount">0</strong>
                </div>

                <div>
                    <span>Expiring Today</span>
                    <strong id="todayExpiryCount">0</strong>
                </div>

                <div>
                    <span>Next 7 Days</span>
                    <strong id="weekExpiryCount">0</strong>
                </div>

                <div>
                    <span>Unread Alerts</span>
                    <strong id="unreadCount">0</strong>
                </div>

            </div>

            <div class="notification-section">

                <h3>Membership Expiry Alerts</h3>

                <div class="expiry-filter">
                    <input
                        type="search"
                        id="expirySearch"
                        placeholder="Search member name or phone..."
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

                <div id="expiryAlertsList"></div>

            </div>

            <div class="notification-section">

                <h3>Notification History</h3>

                <div id="notificationHistory"></div>

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

                    <strong>
                        ${escapeHTML(alert.member.name)}
                    </strong>

                    <span>
                        Member ID: ${escapeHTML(alert.member.id)}
                    </span>

                    <span>
                        Phone: ${escapeHTML(alert.member.phone || "-")}
                    </span>

                    <small>
                        Expiry Date:
                        ${dateFormat(alert.member.expiryDate)}
                    </small>

                </div>

                <div class="expiry-actions">

                    <div class="expiry-label">
                        ${escapeHTML(alert.label)}
                    </div>

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
                                    Number Unavailable
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
                No notifications yet.
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

                <span>
                    ${notification.read ? "Read" : "Unread"}
                </span>

                ${
                    notification.read
                        ? ""
                        : `
                            <button data-read-id="${escapeHTML(notification.id)}">
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

function addStyles() {
    if (document.getElementById("gymNotificationStyles")) return;

    const style = document.createElement("style");
    style.id = "gymNotificationStyles";

    style.textContent = `
        .gym-notification-module {
            color:#f4f0ff;
            width:100%;
        }

        .notification-heading {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            flex-wrap:wrap;
            margin-bottom:22px;
        }

        .notification-heading h2 {
            margin:0 0 6px;
            font-size:25px;
        }

        .notification-heading p {
            margin:0;
            color:#aaa0c5;
        }

        .gym-notification-module button {
            border:0;
            border-radius:9px;
            padding:10px 15px;
            background:linear-gradient(135deg,#a77aff,#7544d8);
            color:white;
            font-weight:600;
            cursor:pointer;
        }

        .notification-stats {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:14px;
            margin-bottom:22px;
        }

        .notification-stats div {
            padding:18px;
            background:#1c172b;
            border:1px solid #382950;
            border-radius:13px;
        }

        .notification-stats span {
            display:block;
            color:#b9adcf;
            font-size:13px;
        }

        .notification-stats strong {
            display:block;
            font-size:25px;
            margin-top:10px;
        }

        .notification-section {
            background:#171326;
            border:1px solid #302548;
            border-radius:14px;
            padding:18px;
            margin-bottom:20px;
        }

        .notification-section h3 {
            margin:0 0 16px;
        }

        .expiry-filter {
            display:flex;
            flex-wrap:wrap;
            gap:12px;
            margin-bottom:15px;
        }

        .expiry-filter input,
        .expiry-filter select {
            padding:11px;
            border-radius:9px;
            border:1px solid #403354;
            background:#211a32;
            color:white;
            min-width:180px;
            outline:none;
        }

        .expiry-alert,
        .history-item {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            padding:15px;
            border-bottom:1px solid #302548;
        }

        .expiry-info strong,
        .expiry-info span,
        .expiry-info small {
            display:block;
            margin-bottom:5px;
        }

        .expiry-info span,
        .expiry-info small {
            color:#b9adcf;
            font-size:13px;
        }

        .expiry-actions {
            display:flex;
            flex-direction:column;
            align-items:flex-end;
            gap:10px;
        }

        .expiry-label {
            color:#d9c7ff;
            font-size:13px;
            font-weight:700;
            text-align:right;
        }

        .expiry-alert.expired .expiry-label {
            color:#ff7777;
        }

        .expiry-alert.today .expiry-label {
            color:#ffbd66;
        }

        .expiry-alert.soon .expiry-label,
        .expiry-alert.tomorrow .expiry-label {
            color:#f3d16d;
        }

        .whatsapp-reminder-btn {
            background:#168b50 !important;
            padding:9px 13px !important;
            font-size:12px;
            white-space:nowrap;
        }

        .whatsapp-reminder-btn:hover {
            background:#0d713e !important;
        }

        .whatsapp-reminder-btn.disabled {
            background:#51495e !important;
            opacity:.6;
            cursor:not-allowed;
        }

        .history-item p {
            margin:6px 0;
            color:#c4b9d8;
            font-size:13px;
        }

        .history-item small {
            color:#9589ad;
        }

        .history-item.read {
            opacity:.65;
        }

        .history-actions {
            display:flex;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
            justify-content:flex-end;
            color:#b9adcf;
            font-size:12px;
        }

        .history-actions button {
            padding:7px 10px;
            font-size:12px;
        }

        .notification-empty {
            padding:25px;
            text-align:center;
            color:#aaa0c5;
        }

        @media(max-width:700px) {
            .notification-stats {
                grid-template-columns:repeat(2,minmax(0,1fr));
            }

            .expiry-filter {
                flex-direction:column;
            }

            .expiry-filter input,
            .expiry-filter select {
                width:100%;
                box-sizing:border-box;
            }
        }

        @media(max-width:450px) {
            .expiry-alert,
            .history-item {
                align-items:flex-start;
                flex-direction:column;
            }

            .expiry-actions {
                align-items:flex-start;
            }

            .expiry-label,
            .history-actions {
                text-align:left;
                justify-content:flex-start;
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

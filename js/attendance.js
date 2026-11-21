window.GymAttendance = (function () {

    const MODULE = "attendance";
    let durationInterval = null;

    function getRecords() {
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

    function formatDate(date) {
        if (!date) return "-";
        const parts = date.split("-");
        return parts.length === 3
            ? `${parts[2]}/${parts[1]}/${parts[0]}`
            : date;
    }

    function formatTime(date) {
        if (!date) return "-";
        return new Date(date).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDuration(checkIn, checkOut) {
        if (!checkIn) return "-";

        const start = new Date(checkIn).getTime();
        const end = checkOut
            ? new Date(checkOut).getTime()
            : Date.now();

        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
            return "-";
        }

        const minutes = Math.floor((end - start) / 60000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }

        return `${remainingMinutes}m`;
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

    function isEligibleMember(member) {
        if (!member) return false;

        const status = String(member.status || "").toLowerCase();
        if (status !== "active") return false;

        if (member.expiryDate && member.expiryDate < today()) {
            return false;
        }

        return true;
    }

    function getOpenRecord(memberId, date = today()) {
        return getRecords().find(record =>
            record.memberId === memberId &&
            record.date === date &&
            !record.checkOut
        ) || null;
    }

    function notify(message) {
        if (typeof window.showToast === "function") {
            window.showToast(message);
        } else {
            alert(message);
        }
    }

    // ==========================================
    // STYLES (PROFESSIONAL RED & WHITE THEME)
    // ==========================================

    function injectStyles() {
        if (document.getElementById("gymAttendanceStyles")) return;

        const style = document.createElement("style");
        style.id = "gymAttendanceStyles";

        style.textContent = `
            .attendance-wrap {
                padding: 2px 0 25px;
                color: #202124;
            }
            .attendance-header {
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
            .attendance-header h2 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 800;
                color: #202124;
            }
            .attendance-header p {
                margin: 0;
                color: #737985;
                font-size: 11.5px;
            }
            .attendance-stats {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .attendance-stat {
                padding: 20px;
                border-radius: 13px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
                transition: transform 0.2s ease, border-color 0.2s ease;
            }
            .attendance-stat:hover {
                transform: translateY(-2px);
                border-color: #efb7b9;
            }
            .attendance-stat-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            .attendance-stat span {
                color: #69717e;
                font-size: 11px;
                font-weight: 600;
            }
            .attendance-stat-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
            }
            .attendance-stat strong {
                display: block;
                font-size: 26px;
                font-weight: 800;
                color: #202124;
                letter-spacing: -0.6px;
            }
            .attendance-panel {
                background: #ffffff;
                border: 1px solid #e7e9ee;
                border-radius: 13px;
                padding: 20px;
                box-shadow: 0 4px 18px rgba(20, 25, 35, 0.045);
            }
            .attendance-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 18px;
            }
            .attendance-toolbar input,
            .attendance-toolbar select {
                padding: 11px 14px;
                border-radius: 9px;
                border: 1px solid #dfe2e8;
                background: #f8f9fb;
                color: #202124;
                font-size: 12px;
                outline: none;
                min-width: 155px;
                transition: all 0.2s ease;
            }
            .attendance-toolbar input[type="search"] {
                flex: 1;
                min-width: 210px;
            }
            .attendance-toolbar select {
                font-weight: 600;
            }
            .attendance-toolbar input:focus,
            .attendance-toolbar select:focus {
                background: #ffffff;
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }
            .attendance-table-wrap {
                overflow-x: auto;
                border-radius: 10px;
                border: 1px solid #edf0f3;
            }
            .attendance-table {
                width: 100%;
                min-width: 880px;
                border-collapse: collapse;
                background: #ffffff;
            }
            .attendance-table th,
            .attendance-table td {
                padding: 13px 12px;
                text-align: left;
                border-bottom: 1px solid #edf0f3;
                white-space: nowrap;
            }
            .attendance-table th {
                font-size: 10px;
                font-weight: 700;
                color: #69717e;
                background: #f8f9fb;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .attendance-table td {
                font-size: 11.5px;
                color: #454c57;
                vertical-align: middle;
            }
            .attendance-table tbody tr:hover {
                background: #fffafa;
            }
            .attendance-id-pill {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 5px;
                background: #f3f4f6;
                color: #5f6672;
                font-size: 10px;
                font-weight: 700;
            }
            .attendance-duration-pill {
                display: inline-block;
                padding: 3px 9px;
                border-radius: 6px;
                background: #edf5ff;
                color: #2879d0;
                font-size: 11px;
                font-weight: 700;
            }
            .attendance-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
                background: #e9f8f0;
                color: #168653;
            }
            .attendance-badge.out {
                background: #f2f4f7;
                color: #69717e;
            }
            .attendance-action {
                padding: 6px 12px;
                border: 1px solid #f5c6c8;
                border-radius: 7px;
                cursor: pointer;
                font-size: 10.5px;
                font-weight: 700;
                color: #d71920;
                background: #fff0f0;
                transition: all 0.18s ease;
            }
            .attendance-action.checkout:hover {
                background: #d71920;
                border-color: #d71920;
                color: #ffffff;
            }
            .attendance-empty {
                text-align: center;
                padding: 36px 15px;
                color: #8a909a;
                font-size: 12px;
            }
            /* MODAL */
            .attendance-modal {
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
            .attendance-modal-box {
                width: 100%;
                max-width: 450px;
                max-height: 92vh;
                overflow-y: auto;
                padding: 26px;
                border-radius: 16px;
                background: #ffffff;
                border: 1px solid #e7e9ee;
                box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
            }
            .attendance-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 14px;
                margin-bottom: 14px;
                border-bottom: 1px solid #edf0f3;
            }
            .attendance-modal-header h3 {
                margin: 0;
                font-size: 17px;
                font-weight: 800;
                color: #202124;
            }
            .attendance-modal-close {
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
            .attendance-modal-close:hover {
                background: #fff0f0;
                color: #d71920;
                border-color: #f2bfc1;
            }
            .attendance-modal-box label {
                display: block;
                margin: 14px 0 6px;
                font-size: 11.5px;
                font-weight: 600;
                color: #454c57;
            }
            .attendance-modal-box select,
            .attendance-modal-box input {
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
            .attendance-modal-box select:focus,
            .attendance-modal-box input:focus {
                border-color: #d71920;
                box-shadow: 0 0 0 3px rgba(215, 25, 32, 0.08);
            }
            .attendance-modal-actions {
                display: flex;
                gap: 12px;
                margin-top: 22px;
                padding-top: 16px;
                border-top: 1px solid #edf0f3;
            }
            .attendance-modal-actions button {
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
            .attendance-modal-actions button:hover {
                background: linear-gradient(135deg, #c9161e, #a90d15);
            }
            .attendance-modal-actions .cancel {
                background: #f3f4f6;
                color: #454c57;
                border: 1px solid #dfe2e8;
                box-shadow: none;
            }
            .attendance-modal-actions .cancel:hover {
                background: #e7e9ee;
            }
            .attendance-info {
                padding: 12px 14px;
                margin-top: 12px;
                border-radius: 9px;
                background: #fff5f5;
                border: 1px solid #f7d4d6;
                color: #454c57;
                font-size: 11.5px;
                line-height: 1.6;
            }
            @media(max-width:650px) {
                .attendance-stats {
                    grid-template-columns: 1fr;
                }
                .attendance-toolbar {
                    flex-direction: column;
                }
                .attendance-toolbar input,
                .attendance-toolbar select {
                    width: 100%;
                    box-sizing: border-box;
                }
                .attendance-header .btn {
                    width: 100%;
                }
                .attendance-modal-box {
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
            <div class="attendance-wrap">
                <div class="attendance-header">
                    <div>
                        <h2>Daily Attendance & Check-in Logs</h2>
                        <p>Track member check-ins, check-outs and live workout durations.</p>
                    </div>
                    <button class="btn btn-primary" id="manualAttendanceBtn">
                        + Manual Check-in
                    </button>
                </div>

                <div class="attendance-stats">
                    <div class="attendance-stat">
                        <div class="attendance-stat-top">
                            <span>Selected Date Check-ins</span>
                            <div class="attendance-stat-dot" style="background:#d71920;"></div>
                        </div>
                        <strong id="todayAttendanceCount">0</strong>
                    </div>
                    <div class="attendance-stat">
                        <div class="attendance-stat-top">
                            <span>Currently Inside Gym</span>
                            <div class="attendance-stat-dot" style="background:#168653;"></div>
                        </div>
                        <strong id="insideAttendanceCount">0</strong>
                    </div>
                    <div class="attendance-stat">
                        <div class="attendance-stat-top">
                            <span>Checked Out</span>
                            <div class="attendance-stat-dot" style="background:#8a909a;"></div>
                        </div>
                        <strong id="checkedOutCount">0</strong>
                    </div>
                </div>

                <div class="attendance-panel">
                    <div class="attendance-toolbar">
                        <input
                            type="search"
                            id="attendanceSearch"
                            placeholder="Search member name or ID..."
                        >
                        <input
                            type="date"
                            id="attendanceDate"
                            value="${today()}"
                            max="${today()}"
                        >
                        <select id="attendanceStatusFilter">
                            <option value="all">All Attendance</option>
                            <option value="inside">Currently Inside</option>
                            <option value="out">Checked Out</option>
                        </select>
                    </div>

                    <div class="attendance-table-wrap">
                        <table class="attendance-table">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Member ID</th>
                                    <th>Date</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="attendanceTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="attendance-modal" id="attendanceModal">
                <div class="attendance-modal-box">
                    <div class="attendance-modal-header">
                        <h3>Manual Member Check-in</h3>
                        <button type="button" class="attendance-modal-close" id="closeAttendanceX" aria-label="Close">✕</button>
                    </div>
                    <form id="attendanceForm">
                        <label>Select Active Member *</label>
                        <select id="attendanceMemberSelect" required>
                            <option value="">Choose Member</option>
                        </select>

                        <div class="attendance-info">
                            Only active members with valid (non-expired) memberships are eligible for check-in.
                        </div>

                        <label>Check-in Date</label>
                        <input
                            type="date"
                            id="attendanceCheckinDate"
                            value="${today()}"
                            min="${today()}"
                            max="${today()}"
                            required
                        >

                        <div class="attendance-modal-actions">
                            <button type="submit">Confirm Check-in</button>
                            <button type="button" class="cancel" id="closeAttendanceModal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = document.getElementById("attendanceModal");

        document.getElementById("manualAttendanceBtn")
            .addEventListener("click", openCheckinForm);

        document.getElementById("closeAttendanceModal")
            .addEventListener("click", closeCheckinForm);

        document.getElementById("closeAttendanceX")
            .addEventListener("click", closeCheckinForm);

        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeCheckinForm();
        });

        document.getElementById("attendanceForm")
            .addEventListener("submit", saveCheckin);

        document.getElementById("attendanceSearch")
            .addEventListener("input", renderTable);

        document.getElementById("attendanceDate")
            .addEventListener("change", renderTable);

        document.getElementById("attendanceStatusFilter")
            .addEventListener("change", renderTable);

        renderTable();

        // Har 1 minute mein live duration update karne ke liye
        if (durationInterval) clearInterval(durationInterval);
        durationInterval = setInterval(renderTable, 60000);
    }

    function openCheckinForm() {
        const select = document.getElementById("attendanceMemberSelect");
        const members = getMembers();
        const availableMembers = members.filter(isEligibleMember);

        if (!availableMembers.length) {
            alert("No active members available for check-in.");
            return;
        }

        select.innerHTML = `
            <option value="">Choose Member</option>
            ${availableMembers.map(member => `
                <option value="${escapeHTML(member.id)}">
                    ${escapeHTML(member.name)} (${escapeHTML(member.id)})
                </option>
            `).join("")}
        `;

        const dateInput = document.getElementById("attendanceCheckinDate");
        dateInput.value = today();
        dateInput.min = today();
        dateInput.max = today();

        document.getElementById("attendanceModal").style.display = "flex";
    }

    function closeCheckinForm() {
        document.getElementById("attendanceModal").style.display = "none";
    }

    function saveCheckin(event) {
        event.preventDefault();

        const memberId = document.getElementById("attendanceMemberSelect").value;
        const date = document.getElementById("attendanceCheckinDate").value;

        if (!memberId || !date) {
            alert("Please select a member and date.");
            return;
        }

        if (date !== today()) {
            alert("Check-in is only available for today's date.");
            return;
        }

        const member = GymDB.find("members", memberId);

        if (!isEligibleMember(member)) {
            alert("This member does not have an active membership.");
            return;
        }

        if (getOpenRecord(memberId, date)) {
            alert("This member is already checked in.");
            return;
        }

        const now = new Date().toISOString();

        const record = {
            id: GymDB.generateID("ATT"),
            memberId: member.id,
            memberName: member.name || "",
            date: date,
            checkIn: now,
            checkOut: "",
            createdAt: now
        };

        GymDB.add(MODULE, record);
        closeCheckinForm();
        renderTable();
        notify("Member checked in successfully.");

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function checkout(id) {
        const record = GymDB.find(MODULE, id);

        if (!record || record.checkOut) {
            alert("Attendance record not found or already checked out.");
            return;
        }

        if (record.date !== today()) {
            alert("Only today's attendance can be checked out.");
            return;
        }

        if (!confirm(`Confirm check-out for ${record.memberName || "this member"}?`)) {
            return;
        }

        const now = new Date().toISOString();

        GymDB.update(MODULE, id, {
            ...record,
            checkOut: now,
            updatedAt: now
        });

        renderTable();
        notify("Member checked out successfully.");

        if (typeof window.updateGymDashboard === "function") {
            window.updateGymDashboard();
        }
    }

    function renderTable() {
        const table = document.getElementById("attendanceTableBody");
        if (!table) return;

        const selectedDate = document.getElementById("attendanceDate").value;
        const search = document.getElementById("attendanceSearch").value.trim().toLowerCase();
        const statusFilter = document.getElementById("attendanceStatusFilter").value;

        const records = getRecords().filter(record => record.date === selectedDate);
        const currentlyInside = records.filter(record => !record.checkOut).length;
        const checkedOut = records.filter(record => !!record.checkOut).length;

        document.getElementById("todayAttendanceCount").textContent = records.length;
        document.getElementById("insideAttendanceCount").textContent = currentlyInside;
        document.getElementById("checkedOutCount").textContent = checkedOut;

        const filtered = records.filter(record => {
            const matchesSearch =
                String(record.memberName || "").toLowerCase().includes(search) ||
                String(record.memberId || "").toLowerCase().includes(search);

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "inside" && !record.checkOut) ||
                (statusFilter === "out" && !!record.checkOut);

            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="attendance-empty">
                        No attendance records found for this date.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(record => `
            <tr>
                <td><strong style="color:#202124;">${escapeHTML(record.memberName)}</strong></td>
                <td><span class="attendance-id-pill">${escapeHTML(record.memberId)}</span></td>
                <td>${formatDate(record.date)}</td>
                <td style="color:#168653;font-weight:600;">${formatTime(record.checkIn)}</td>
                <td>${record.checkOut ? formatTime(record.checkOut) : "-"}</td>
                <td><span class="attendance-duration-pill">${formatDuration(record.checkIn, record.checkOut)}</span></td>
                <td>
                    <span class="attendance-badge ${record.checkOut ? "out" : ""}">
                        ${record.checkOut ? "Checked Out" : "● Inside"}
                    </span>
                </td>
                <td>
                    ${!record.checkOut && record.date === today()
                        ? `<button class="attendance-action checkout" data-checkout="${escapeHTML(record.id)}">Check-out</button>`
                        : "-"
                    }
                </td>
            </tr>
        `).join("");

        table.querySelectorAll("[data-checkout]").forEach(button => {
            button.addEventListener("click", function () {
                checkout(this.dataset.checkout);
            });
        });
    }

    return {
        render: render,
        refresh: renderTable
    };
})();

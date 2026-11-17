window.GymAttendance = (function () {
    const MODULE = "attendance";

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
        return new Date(date + "T00:00:00").toLocaleDateString("en-IN");
    }

    function formatTime(date) {
        if (!date) return "-";
        return new Date(date).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
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
        if (document.getElementById("gymAttendanceStyles")) return;

        const style = document.createElement("style");
        style.id = "gymAttendanceStyles";

        style.textContent = `
            .attendance-wrap { padding: 5px 0 25px; }
            .attendance-header {
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:15px;
                margin-bottom:22px;
            }
            .attendance-header h2 { margin:0 0 6px; }
            .attendance-header p { margin:0; opacity:.7; }
            .attendance-stats {
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:15px;
                margin-bottom:22px;
            }
            .attendance-stat {
                padding:20px;
                border-radius:14px;
                background:rgba(255,255,255,.05);
                border:1px solid rgba(255,255,255,.08);
            }
            .attendance-stat span {
                display:block;
                opacity:.7;
                font-size:13px;
                margin-bottom:9px;
            }
            .attendance-stat strong { font-size:25px; }
            .attendance-toolbar {
                display:flex;
                flex-wrap:wrap;
                gap:12px;
                margin-bottom:18px;
            }
            .attendance-toolbar input,
            .attendance-toolbar select {
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
                outline:none;
            }
            .attendance-table-wrap {
                overflow-x:auto;
                border-radius:13px;
            }
            .attendance-table {
                width:100%;
                min-width:750px;
                border-collapse:collapse;
            }
            .attendance-table th,
            .attendance-table td {
                padding:14px;
                text-align:left;
                border-bottom:1px solid rgba(255,255,255,.08);
            }
            .attendance-table th {
                font-size:12px;
                opacity:.7;
                text-transform:uppercase;
            }
            .attendance-badge {
                display:inline-block;
                padding:5px 10px;
                border-radius:20px;
                font-size:11px;
                background:rgba(46,204,113,.13);
                color:#6ee7a0;
            }
            .attendance-badge.out {
                background:rgba(255,255,255,.1);
                color:#aaa;
            }
            .attendance-action {
                padding:7px 11px;
                border:0;
                border-radius:7px;
                margin:2px;
                cursor:pointer;
                color:white;
                background:#6845b8;
            }
            .attendance-action.checkout { background:#a93650; }
            .attendance-empty {
                text-align:center;
                padding:35px 15px;
                opacity:.65;
            }
            .attendance-modal {
                position:fixed;
                inset:0;
                z-index:9999;
                display:none;
                align-items:center;
                justify-content:center;
                padding:15px;
                background:rgba(0,0,0,.75);
            }
            .attendance-modal-box {
                width:100%;
                max-width:430px;
                padding:24px;
                border-radius:16px;
                background:#211a32;
                border:1px solid rgba(255,255,255,.12);
            }
            .attendance-modal-box h3 { margin-top:0; }
            .attendance-modal-box label {
                display:block;
                margin:14px 0 7px;
                font-size:13px;
            }
            .attendance-modal-box select,
            .attendance-modal-box input {
                width:100%;
                padding:12px;
                border-radius:9px;
                border:1px solid rgba(255,255,255,.13);
                background:#171324;
                color:white;
            }
            .attendance-modal-actions {
                display:flex;
                gap:10px;
                margin-top:20px;
            }
            .attendance-modal-actions button {
                flex:1;
                padding:12px;
                border:0;
                border-radius:9px;
                cursor:pointer;
                color:white;
                background:#8055d9;
                font-weight:600;
            }
            .attendance-modal-actions .cancel { background:#494253; }
            @media(max-width:650px) {
                .attendance-stats { grid-template-columns:1fr; }
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
                        <h2>Attendance Management</h2>
                        <p>Track member check-in and check-out.</p>
                    </div>

                    <button class="btn btn-primary" id="manualAttendanceBtn">
                        + Manual Check-in
                    </button>
                </div>

                <div class="attendance-stats">
                    <div class="attendance-stat">
                        <span>Today's Attendance</span>
                        <strong id="todayAttendanceCount">0</strong>
                    </div>

                    <div class="attendance-stat">
                        <span>Currently Inside</span>
                        <strong id="insideAttendanceCount">0</strong>
                    </div>

                    <div class="attendance-stat">
                        <span>Checked Out</span>
                        <strong id="checkedOutCount">0</strong>
                    </div>
                </div>

                <div class="attendance-toolbar">
                    <input type="search" id="attendanceSearch"
                        placeholder="Search member name or ID...">

                    <input type="date" id="attendanceDate" value="${today()}">

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
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody id="attendanceTableBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="attendance-modal" id="attendanceModal">
                <div class="attendance-modal-box">
                    <h3>Manual Member Check-in</h3>

                    <form id="attendanceForm">
                        <label>Select Member *</label>
                        <select id="attendanceMemberSelect" required>
                            <option value="">Choose Member</option>
                        </select>

                        <label>Check-in Date</label>
                        <input type="date" id="attendanceCheckinDate"
                            value="${today()}" required>

                        <div class="attendance-modal-actions">
                            <button type="submit">Check-in</button>
                            <button type="button" class="cancel"
                                id="closeAttendanceModal">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById("manualAttendanceBtn")
            .addEventListener("click", openCheckinForm);

        document.getElementById("closeAttendanceModal")
            .addEventListener("click", closeCheckinForm);

        document.getElementById("attendanceForm")
            .addEventListener("submit", saveCheckin);

        document.getElementById("attendanceSearch")
            .addEventListener("input", renderTable);

        document.getElementById("attendanceDate")
            .addEventListener("change", renderTable);

        document.getElementById("attendanceStatusFilter")
            .addEventListener("change", renderTable);

        renderTable();
    }

    function openCheckinForm() {
        const select = document.getElementById("attendanceMemberSelect");
        const members = getMembers();

        const availableMembers = members.filter(member => {
            const status = String(member.status || "").toLowerCase();
            return status === "active" && member.expiryDate >= today();
        });

        select.innerHTML = `
            <option value="">Choose Member</option>
            ${availableMembers.map(member => `
                <option value="${escapeHTML(member.id)}">
                    ${escapeHTML(member.name)} (${escapeHTML(member.id)})
                </option>
            `).join("")}
        `;

        if (!availableMembers.length) {
            alert("No active members available for check-in.");
            return;
        }

        document.getElementById("attendanceCheckinDate").value = today();
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
            alert("Manual check-in is only available for today's date.");
            return;
        }

        const member = GymDB.find("members", memberId);

        if (!member || String(member.status).toLowerCase() !== "active" ||
            !member.expiryDate || member.expiryDate < today()) {
            alert("This member does not have an active membership.");
            return;
        }

        const existing = getRecords().find(record =>
            record.memberId === memberId &&
            record.date === date &&
            !record.checkOut
        );

        if (existing) {
            alert("This member is already checked in.");
            return;
        }

        const record = {
            id: GymDB.generateID("ATT"),
            memberId: memberId,
            memberName: member.name || "",
            date: date,
            checkIn: new Date().toISOString(),
            checkOut: "",
            createdAt: new Date().toISOString()
        };

        GymDB.add(MODULE, record);

        closeCheckinForm();
        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast("Member checked in successfully");
        } else {
            alert("Member checked in successfully.");
        }
    }

    function checkout(id) {
        const record = GymDB.find(MODULE, id);

        if (!record || record.checkOut) return;

        if (record.date !== today()) {
            alert("Only today's attendance can be checked out.");
            return;
        }

        if (!confirm("Confirm member check-out?")) return;

        GymDB.update(MODULE, id, {
            ...record,
            checkOut: new Date().toISOString()
        });

        renderTable();

        if (typeof window.showToast === "function") {
            window.showToast("Member checked out successfully");
        }
    }

    function renderTable() {
        const table = document.getElementById("attendanceTableBody");
        if (!table) return;

        const selectedDate = document.getElementById("attendanceDate").value;
        const search = document.getElementById("attendanceSearch")
            .value.trim().toLowerCase();

        const statusFilter = document.getElementById("attendanceStatusFilter").value;

        const records = getRecords().filter(record => record.date === selectedDate);

        const currentlyInside = records.filter(record => !record.checkOut).length;
        const checkedOut = records.filter(record => !!record.checkOut).length;

        document.getElementById("todayAttendanceCount").textContent = records.length;
        document.getElementById("insideAttendanceCount").textContent = currentlyInside;
        document.getElementById("checkedOutCount").textContent = checkedOut;

        const filtered = records.filter(record => {
            const matchesSearch =
                (record.memberName || "").toLowerCase().includes(search) ||
                (record.memberId || "").toLowerCase().includes(search);

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "inside" && !record.checkOut) ||
                (statusFilter === "out" && !!record.checkOut);

            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="attendance-empty">
                        No attendance records found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(record => `
            <tr>
                <td><strong>${escapeHTML(record.memberName)}</strong></td>
                <td>${escapeHTML(record.memberId)}</td>
                <td>${formatDate(record.date)}</td>
                <td>${formatTime(record.checkIn)}</td>
                <td>${record.checkOut ? formatTime(record.checkOut) : "-"}</td>
                <td>
                    <span class="attendance-badge ${record.checkOut ? "out" : ""}">
                        ${record.checkOut ? "Checked Out" : "Inside"}
                    </span>
                </td>
                <td>
                    ${record.checkOut ? "-" : `
                        <button class="attendance-action checkout"
                            data-checkout="${escapeHTML(record.id)}">
                            Check-out
                        </button>
                    `}
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

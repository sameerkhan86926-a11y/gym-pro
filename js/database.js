/* =====================================
   GYM PRO - LOCAL DATABASE SYSTEM
   Version 1.0.0
===================================== */

const GymDB = {

    prefix: "gympro_",

    collections: [
        "members",
        "plans",
        "payments",
        "attendance",
        "discounts",
        "trainers",
        "expenses",
        "notifications",
        "activity",
        "settings"
    ],

    // DATABASE INITIALIZATION
    init() {
        this.collections.forEach(collection => {
            const key = this.prefix + collection;

            if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });

        if (!localStorage.getItem("gympro_initialized")) {
            localStorage.setItem("gympro_initialized", "true");
            console.log("GYM PRO Database Initialized");
        }
    },

    // GET ALL DATA
    getAll(collection) {
        try {
            return JSON.parse(
                localStorage.getItem(this.prefix + collection)
            ) || [];
        } catch (error) {
            console.error("Database Read Error:", error);
            return [];
        }
    },

    // SAVE COMPLETE COLLECTION
    saveAll(collection, data) {
        try {
            localStorage.setItem(
                this.prefix + collection,
                JSON.stringify(data)
            );

            return true;

        } catch (error) {
            console.error("Database Save Error:", error);
            alert("Storage full or unable to save data.");
            return false;
        }
    },

    // ADD NEW RECORD
    add(collection, record) {
        const records = this.getAll(collection);

        record.id = record.id || this.generateID(collection);
        record.createdAt = record.createdAt || new Date().toISOString();

        records.push(record);

        return this.saveAll(collection, records) ? record : null;
    },

    // FIND RECORD
    find(collection, id) {
        return this.getAll(collection).find(
            item => String(item.id) === String(id)
        ) || null;
    },

    // UPDATE RECORD
    update(collection, id, updates) {
        const records = this.getAll(collection);

        const index = records.findIndex(
            item => String(item.id) === String(id)
        );

        if (index === -1) return false;

        records[index] = {
            ...records[index],
            ...updates,
            id: records[index].id,
            updatedAt: new Date().toISOString()
        };

        return this.saveAll(collection, records);
    },

    // DELETE RECORD
    delete(collection, id) {
        const records = this.getAll(collection);

        const filtered = records.filter(
            item => String(item.id) !== String(id)
        );

        if (filtered.length === records.length) return false;

        return this.saveAll(collection, filtered);
    },

    // SEARCH RECORDS
    search(collection, query) {
        const records = this.getAll(collection);
        const value = String(query).toLowerCase().trim();

        if (!value) return records;

        return records.filter(record =>
            Object.values(record).some(item =>
                String(item).toLowerCase().includes(value)
            )
        );
    },

    // GENERATE UNIQUE ID
    generateID(collection) {
        const prefix = collection.slice(0, 3).toUpperCase();

        return prefix + "-" +
            Date.now().toString().slice(-8) +
            "-" +
            Math.floor(Math.random() * 1000);
    },

    // CLEAR COLLECTION
    clear(collection) {
        if (!this.collections.includes(collection)) return false;

        return this.saveAll(collection, []);
    },

    // DATABASE BACKUP
    exportData() {
        const backup = {};

        this.collections.forEach(collection => {
            backup[collection] = this.getAll(collection);
        });

        return {
            application: "GYM PRO",
            version: "1.0.0",
            backupDate: new Date().toISOString(),
            data: backup
        };
    },

    // RESTORE DATABASE
    importData(backup) {
        if (
            !backup ||
            backup.application !== "GYM PRO" ||
            !backup.data
        ) {
            return false;
        }

        const oldData = {};

        this.collections.forEach(collection => {
            oldData[collection] = this.getAll(collection);
        });

        try {
            this.collections.forEach(collection => {
                const data = backup.data[collection];

                if (!Array.isArray(data)) {
                    throw new Error("Invalid backup data");
                }

                this.saveAll(collection, data);
            });

            return true;

        } catch (error) {

            this.collections.forEach(collection => {
                this.saveAll(collection, oldData[collection]);
            });

            console.error("Restore Failed:", error);
            return false;
        }
    },

    // STORAGE INFORMATION
    getStorageInfo() {
        let total = 0;

        this.collections.forEach(collection => {
            total += new Blob([
                localStorage.getItem(this.prefix + collection) || ""
            ]).size;
        });

        return {
            bytes: total,
            kilobytes: (total / 1024).toFixed(2),
            megabytes: (total / 1048576).toFixed(2)
        };
    }

};

// START DATABASE
GymDB.init();

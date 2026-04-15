const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();

// Use PORT from environment variable (Render sets this)
const PORT = process.env.PORT || 3000;

/* ===============================
   Middleware
================================= */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Use a stronger secret from environment variable
app.use(session({
    secret: process.env.SESSION_SECRET || "medfinder_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === "production" // Use secure cookies in production
    }
}));

// Trust proxy for secure cookies on Render
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

/* ===============================
   Load Medicines
================================= */
function loadMedicines() {
    const filePath = path.join(__dirname, "medicines.json");
    if (!fs.existsSync(filePath)) {
        // Create initial data file if it doesn't exist
        const initialData = [];
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.error("Error loading medicines:", error);
        return [];
    }
}

/* ===============================
   Save Medicines
================================= */
function saveMedicines(data) {
    const filePath = path.join(__dirname, "medicines.json");
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error saving medicines:", error);
    }
}

/* ===============================
   Home Page
================================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* ===============================
   Search Medicines
================================= */
app.get("/search", (req, res) => {
    const location = req.query.location?.toLowerCase() || "";
    const medicineName = req.query.medicine?.toLowerCase() || "";
    const medicines = loadMedicines();

    const results = medicines.filter(m => {
        const matchesLocation = location ? m.location.toLowerCase().includes(location) : true;
        const matchesMedicine = medicineName ? m.medicine.toLowerCase().includes(medicineName) : true;
        return matchesLocation && matchesMedicine;
    });

    res.json(results);
});

/* ===============================
   Login Page
================================= */
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

/* ===============================
   Login System
================================= */
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    
    // Use environment variables for credentials in production
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "1234";

    if (username === adminUser && password === adminPass) {
        req.session.admin = true;
        res.redirect("/admin");
    } else {
        res.send("❌ Invalid credentials");
    }
});

/* ===============================
   Admin Dashboard Page
================================= */
app.get("/admin", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "admin.html"));
});

/* ===============================
   Dashboard Data API
================================= */
app.get("/dashboard-data", (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: "Unauthorized" });

    const medicines = loadMedicines();

    const totalMedicines = medicines.length;
    const totalStock = medicines.reduce((sum, m) => sum + (m.stock || 0), 0);
    const lowStock = medicines.filter(m => m.stock < 5);

    res.json({
        totalMedicines,
        totalStock,
        lowStock
    });
});

/* ===============================
   Manage Medicines Page
================================= */
app.get("/admin/manage", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "manage.html"));
});

/* ===============================
   API for Manage Page Data
================================= */
app.get("/manage-data", (req, res) => {
    if (!req.session.admin) return res.status(401).json({ error: "Unauthorized" });
    res.json(loadMedicines());
});

/* ===============================
   Add Medicine
================================= */
app.post("/add", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const { id, medicine, pharmacy, location, price, stock } = req.body;
    let medicines = loadMedicines();

    medicines.push({
        id: id || Date.now().toString(), // Generate ID if not provided
        medicine,
        pharmacy,
        location,
        price: parseInt(price) || 0,
        stock: parseInt(stock) || 0,
        lastUpdated: new Date().toISOString().split("T")[0]
    });

    saveMedicines(medicines);
    res.redirect("/admin/manage");
});

/* ===============================
   Delete Medicine
================================= */
app.post("/delete", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");

    const { id } = req.body;
    let medicines = loadMedicines();

    medicines = medicines.filter(m => m.id != id);

    saveMedicines(medicines);
    res.redirect("/admin/manage");
});

/* ===============================
   Logout
================================= */
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

/* ===============================
   Health Check Endpoint (for Render)
================================= */
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

/* ===============================
   Start Server
================================= */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

const app = express();

/* ===============================
   Middleware
================================= */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
    secret: "medfinder_secret_key",
    resave: false,
    saveUninitialized: true
}));

/* ===============================
   Load Medicines
================================= */
function loadMedicines() {
    if (!fs.existsSync("medicines.json")) return [];
    return JSON.parse(fs.readFileSync("medicines.json"));
}

/* ===============================
   Save Medicines
================================= */
function saveMedicines(data) {
    fs.writeFileSync("medicines.json", JSON.stringify(data, null, 2));
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
    const medicineName = req.query.medicine?.toLowerCase() || ""; // Get medicine name from query
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

    if (username === "admin" && password === "1234") {
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
    if (!req.session.admin) return res.redirect("/login");

    const medicines = loadMedicines();

    const totalMedicines = medicines.length;
    const totalStock = medicines.reduce((sum, m) => sum + m.stock, 0);
    const lowStock = medicines.filter(m => m.stock < 5);

    res.json({
        totalMedicines,
        totalStock,
        lowStock
    });
});

/* ===============================
   Manage Medicines Page (FIXED)
================================= */
app.get("/admin/manage", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "manage.html"));
});

/* ===============================
   API for Manage Page Data
================================= */
app.get("/manage-data", (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
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
        id,
        medicine,
        pharmacy,
        location,
        price: parseInt(price),
        stock: parseInt(stock),
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
   Start Server
================================= */
app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
});
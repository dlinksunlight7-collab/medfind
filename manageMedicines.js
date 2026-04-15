document.addEventListener("DOMContentLoaded", loadMedicines);

function getMedicines() {
    return JSON.parse(localStorage.getItem("medicines")) || [];
}

function saveMedicines(medicines) {
    localStorage.setItem("medicines", JSON.stringify(medicines));
}

function loadMedicines() {
    const medicineList = document.getElementById("medicineList");
    medicineList.innerHTML = "";

    const medicines = getMedicines();

    if (medicines.length === 0) {
        medicineList.innerHTML = `
            <tr>
                <td colspan="4">No medicines available</td>
            </tr>
        `;
        return;
    }

    medicines.forEach((medicine, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${medicine.name}</td>
            <td>₹ ${medicine.price}</td>
            <td>${medicine.quantity}</td>
            <td>
                <button class="delete-btn" onclick="deleteMedicine(${index})">
                    Delete
                </button>
            </td>
        `;

        medicineList.appendChild(row);
    });
}

function deleteMedicine(index) {
    let medicines = getMedicines();
    medicines.splice(index, 1);
    saveMedicines(medicines);
    loadMedicines();
}
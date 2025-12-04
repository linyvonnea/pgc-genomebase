const XLSX = require("xlsx");
const fs = require("fs");

// ------------------------------
// Convert flat dot-notation keys into nested objects
// ------------------------------
function buildNestedObject(flatObj) {
    const result = {};

    for (const flatKey in flatObj) {
        const value = flatObj[flatKey];

        // If key has no dot, assign directly
        if (!flatKey.includes(".")) {
            result[flatKey] = value;
            continue;
        }

        // Example: "client.createdAt._seconds"
        const parts = flatKey.split(".");
        let current = result;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            if (!current[part]) current[part] = {};

            if (isLast) {
                current[part] = value; // assign final value
            } else {
                current = current[part]; // go deeper
            }
        }
    }

    return result;
}

// ------------------------------
// MAIN SCRIPT
// ------------------------------



// Read Excel file
const workbook = XLSX.readFile("clients_json_excel_flatten.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];


// Convert to JSON
const json = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,           // <-- IMPORTANT: auto-convert serial numbers to dates
    dateNF: "yyyy-mm-dd"  // <-- choose your output format
});

// Convert all rows into nested objects
const nestedJson = json.map(row => buildNestedObject(row));

// Save JSON file
fs.writeFileSync("clients_converted.json", JSON.stringify(nestedJson, null, 4));

console.log("Excel converted to JSON!");
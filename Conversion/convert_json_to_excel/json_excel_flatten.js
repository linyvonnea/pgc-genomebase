const fs = require("fs");
const xlsx = require("xlsx");

// Load your JSON file
const json = JSON.parse(fs.readFileSync("clients.json", "utf8"));

// Flatten function
function flatten(obj, prefix = "", res = {}) {
  for (let key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      flatten(obj[key], newKey, res);
    } else {
      res[newKey] = obj[key];
    }
  }
  return res;
}

// Flatten all items
const flattened = json.map(item => flatten(item));

// Convert to Excel
const worksheet = xlsx.utils.json_to_sheet(flattened);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

xlsx.writeFile(workbook, "clients_json_excel_flatten.xlsx");

console.log("Done! File: clients_json_excel_flatten.xlsx");

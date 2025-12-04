const fs = require("fs");

function toArray(value) {
  if (!value || value === "") return [];
  return String(value).split(",").map(v => v.trim());
}

function toNumber(value) {
  if (!value || value === "") return 0;
  return Number(value);
}

function toBoolean(value) {
  if (value === "TRUE") return true;
  if (value === "FALSE") return false;
  return Boolean(value);
}

function toTimestamp(value) {
  return {
    _seconds: Number(value?._seconds || 0),
    _nanoseconds: Number(value?._nanoseconds || 0)
  };
}

function fixRecord(item) {
  return {
    id: item.id || "",
    cid: item.cid || "",
    pid: item.pid || "",
    name: item.name || "",
    affiliation: item.affiliation || "",
    affiliationAddress: item.affiliationAddress || "",
    designation: item.designation || "",
    email: item.email || "",
    phoneNumber: item.phoneNumber || "",
    status: item.status || "",
    sex: item.sex || "",
    year: toNumber(item.year),
    isContactPerson: toBoolean(item.isContactPerson),
    haveSubmitted: toBoolean(item.haveSubmitted),
    createdAt: toTimestamp(item.createdAt)
  };
}

// MAIN
const input = JSON.parse(fs.readFileSync("clients_converted.json", "utf8"));
const fixed = input.map(x => fixRecord(x));
fs.writeFileSync("fixed_clients_converted.json", JSON.stringify(fixed, null, 4));

console.log("✔ JSON cleaned and saved to fixed_clients_converted.json");

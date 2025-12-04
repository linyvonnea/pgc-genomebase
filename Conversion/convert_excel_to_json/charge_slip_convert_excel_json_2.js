const fs = require("fs");

function toArray(value) {
  if (!value || value === "") return [];
  return String(value).split(",").map(v => v.trim());
}

function toNumber(value) {
  if (!value || value === "") return 0;
  return Number(value);
}

function toTimestamp(value) {
  // Always return an object for compatibility
  return {
    _seconds: 0,
    _nanoseconds: 0
  };
}

function fixRecord(item) {
  return {
    id: item.id || "",

    approvedBy: {
      name: item.approvedBy?.name || "",
      position: item.approvedBy?.position || ""
    },

    categories: toArray(item.categories),

    chargeSlipNumber: item.chargeSlipNumber || "",
    cid: item.cid || "",

    client: {
      affiliation: item.client?.affiliation || "",
      affiliationAddress: item.client?.affiliationAddress || "",
      cid: item.client?.cid || "",
      createdAt: toTimestamp(item.client?.createdAt),
      designation: item.client?.designation || "",
      email: item.client?.email || "",
      name: item.client?.name || "",
      phoneNumber: item.client?.phoneNumber || "",
      pid: item.client?.pid || "",
      sex: item.client?.sex || "",
      year: toNumber(item.client?.year)
    },

    clientInfo: {
      designation: item.clientInfo?.designation || "",
      email: item.clientInfo?.email || "",
      institution: item.clientInfo?.institution || "",
      name: item.clientInfo?.name || ""
    },

    createdAt: item.createdAt || "",
    dateIssued: item.dateIssued || "",
    dateOfOR: item.dateOfOR || "",
    datePaid: item.datePaid || "",
    discount: item.discount || "",
    dvNumber: item.dvNumber || "",
    notes: item.notes || "",
    orNumber: item.orNumber || "",

    project: {
      clientNames: toArray(item.project?.clientNames),
      createdAt: toTimestamp(item.project?.createdAt),
      fundingCategory: item.project?.fundingCategory || "",
      fundingInstitution: item.project?.fundingInstitution || "",
      iid: item.project?.iid || "",
      lead: item.project?.lead || "",
      notes: item.project?.notes || "",
      personnelAssigned: item.project?.personnelAssigned || "",
      pid: item.project?.pid || "",
      projectTag: item.project?.projectTag || "",
      sendingInstitution: item.project?.sendingInstitution || "",
      servicerequested: toArray(item.project?.servicerequested),
      projectId: item.project?.projectId || "",
      referenceNumber: item.project?.referenceNumber || "",
      title: item.project?.title || ""
    },

    services: toArray(item.services),
    status: item.status || "",
    subtotal: toNumber(item.subtotal),
    total: toNumber(item.total),
    useInternalPrice: item.useInternalPrice || ""
  };
}

// ----- MAIN -----

const input = JSON.parse(fs.readFileSync("charge_slip_converted.json", "utf8"));
const fixed = input.map(x => fixRecord(x));
fs.writeFileSync("fixed_charge_slips.json", JSON.stringify(fixed, null, 4));

console.log("✔ JSON cleaned and saved to fixed.json");

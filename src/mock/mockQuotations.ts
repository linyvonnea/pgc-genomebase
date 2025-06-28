// src/mock/mockQuotations.ts
export const mockQuotations = [
  {
    id: "Q-2024-001",
    clientId: "CL-2024-001",
    type: "Laboratory",
    items: [
      {
        serviceName: "DNA Extraction",
        quantity: 10,
        unit: "sample",
        unitCost: 150,
        subtotal: 1500,
      },
      {
        serviceName: "16S Sequencing",
        quantity: 10,
        unit: "sample",
        unitCost: 500,
        subtotal: 5000,
      },
    ],
    total: 6500,
    status: "approved",
    generatedAt: new Date("2024-06-10"),
  },
  {
    id: "Q-2024-002",
    clientId: "CL-2024-002",
    type: "Equipment",
    items: [
        {
        serviceName: "Qubit Fluorometer",
        quantity: 2,
        unit: "run",
        unitCost: 500,
        subtotal: 1000,
        },
        {
        serviceName: "Thermal Cycler Use",
        quantity: 3,
        unit: "hour",
        unitCost: 200,
        subtotal: 600,
        },
    ],
    total: 1600,
    status: "submitted",
    generatedAt: new Date("2024-06-15"),
    }
];
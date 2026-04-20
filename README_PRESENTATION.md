# PGC GenomeBase: System Overview & Features
## A Unified Platform for Genomics Project Management

---

## Slide 1: Introduction
### PGC GenomeBase
*   **Purpose:** A specialized Next.js application designed to streamline genomics projects, quotations, and client relations.
*   **Core Technology:** Built with Next.js, Firebase (Firestore), and Tailwind CSS.
*   **Key Value:** Bridges the gap between internal lab operations and external client requests.

---

## Slide 2: Portal Architecture
### Seamless Access for All Users
*   **Dual-Portal System:** Dedicated environments for Admins and Clients.
- **Unified Auth:** Role-based redirection ensures users land in the right place.
- **Real-time Sync:** All data updates instantly across the platform via Firestore.

---

## Slide 3: Admin Portal - Operations
### The Heart of Management
*   **Dynamic Dashboard:** Real-time analytics of project lifecycles.
*   **Client & Project CRUD:** Complete control over managing research data and partner profiles.
*   **Inquiry Handling:** Efficient workflow for converting client inquiries into actionable projects.

---

## Slide 4: Admin Portal - Financial Tools
### Simplified Quotation & Billing
*   **Smart Quotations:** Generate, edit, and export official PDF quotes.
*   **Manual Override:** Flexibility to create custom quotes for unique research needs.
*   **Charge Slips:** Professional billing management linked directly to project data.
*   **Quotation Threads:** Internal communication logs for every financial document.

---

## Slide 5: Admin Portal - Security & Governance
### Control and Auditability
*   **Granular RBAC:** 16 permission modules with View/Create/Edit/Delete levels.
*   **Activity Logs:** Full audit trail of every significant change in the system.
*   **Approval Workflows:** Management of new member registrations.

---

## Slide 6: Admin Portal - Data Reliability
### Three-Tier Backup Strategy
1.  **Local Download:** Secure Firestore data locally on any device.
2.  **Server Backup:** Quick snapshots stored on Vercel.
3.  **Cloud Automation:** Weekly incremental backups to Google Drive (Every Friday at 6:00 PM).

---

## Slide 7: Client Portal - User Experience
### Empowering the Researcher
*   **Inquiry Requests:** Intuitive forms for starting new genomics services.
*   **Project Transparency:** Real-time status tracking for active samples.
*   **Resource Library:** One-click access to required sample forms and documentation templates.
*   **Document Vault:** Secure history of all received quotations and reports.

---

## Slide 8: Technical Excellence
### Robust & Reliable
*   **Type Safety:** 100% TypeScript for fewer bugs and better maintainability.
*   **Performance:** Optimized Next.js 15 architecture for fast page loads.
*   **Mobile Ready:** Responsive design for lab managers on the go.

---

## Slide 9: Conclusion
### Enhancing Genomic Research
*   PGC GenomeBase isn't just a database; it's a productivity multiplier for both the laboratory and the client.
*   **Scalable:** Designed to grow with your research volume.
*   **Secure:** Built-in protection for sensitive research data.

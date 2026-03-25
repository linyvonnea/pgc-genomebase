# PGC GenomeBase Features Documentation

This document provides a comprehensive overview of the features available in the PGC GenomeBase project, covering both the **Admin Portal** and the **Client Portal**.

---

## 1. Admin Portal
The Admin Portal is designed for internal staff to manage operations, configurations, and administrative tasks.

### Core Operations
*   **Dashboard:** Real-time analytics and system-wide overview of project statuses and activities.
*   **Client Management:** Full CRUD (Create, Read, Update, Delete) operations for managing client profiles and information.
*   **Project Tracking:** Comprehensive management of research projects, including status updates and timeline tracking.
*   **Inquiry Handling:** Review and respond to service inquiries submitted by clients.
*   **Quotation System:**
    *   Generate, edit, and view official quotations.
    *   Download quotations as PDF.
    *   **Manual Quotation:** Ability to create custom quotations outside the standard automated workflow.
    *   **Quotation Threads:** Integrated messaging system for internal discussions regarding specific quotes.
*   **Charge Slips:** Creation and management of billing documents associated with projects.
*   **Sample Forms:** Management of a library of sample forms required for service requests.

### Configuration & Management
*   **Service Catalog:** Manage the list of available services, including pricing and descriptions.
*   **Catalog Settings:** Global configuration for how the service catalog and quotations behave.
*   **Client Conformes:** Specialized tracking for client compliance and conformity documentation.

### Administration & Security
*   **Member Approvals:** Workflow for reviewing and approving new team member registrations or project access requests.
*   **User Management:** (Superadmins only) Manage admin accounts and assign roles.
*   **Role-Based Access Control (RBAC):**
    *   Define granular permissions (View, Create, Edit, Delete) for 16 different modules.
    *   Pre-defined roles: Superadmin, Admin, Moderator, Viewer.
*   **Activity Logs:** Audit trail tracking all significant actions performed within the system.
*   **Database Backup:** Multiple backup strategies:
    *   Manual download to local device.
    *   Server-side backups.
    *   Automated weekly backups to Google Drive (Superadmin only).

---

## 2. Client Portal
The Client Portal provides an interface for external users to interact with the services provided.

### Key Features
*   **Inquiry Submission:** Standardized form for clients to request information or services.
*   **Project Dashboard:** View the status and details of projects currently assigned to the client.
*   **Document Management:**
    *   **View Quotations:** Access and download received cost estimates.
    *   **Sample Forms:** Download required templates for sample submission.
    *   **Centralized Document Viewer:** Access all relevant project documents in one place.
*   **Profile Management:** Update client contact information and organizational details.

---

## 3. Technical Highlights
*   **Authentication & Routing:** Automatic redirection based on user role (Admins to Admin Portal, Clients to Client Portal).
*   **Type Safety:** Built with TypeScript for robust data handling and permission checking.
*   **Notifications:** Integrated notification center for real-time updates on approvals and project changes.
*   **Responsive Design:** Optimized for various devices using Tailwind CSS.

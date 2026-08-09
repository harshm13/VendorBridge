# VendorBridge 🌉

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js)
![HTML5](https://img.shields.io/badge/HTML5-Frontend-E34F26?logo=html5)

VendorBridge is a full-stack vendor management and procurement platform designed to streamline business workflows. From requesting quotations to final invoice approvals, this system centralizes the entire procurement lifecycle.

## 🚀 Features

* **Secure Access:** User authentication and account management.
* **Interactive Dashboard:** Centralized overview of procurement metrics and pending tasks.
* **End-to-End Procurement:**
  * **RFQs:** Generate and track Requests for Quotation.
  * **Quotations:** Receive and review incoming vendor quotes.
  * **Purchase Orders:** Issue and manage POs.
  * **Invoices:** Process and record vendor billing.
* **Approval Workflows:** Multi-tiered approval system for critical procurement tasks.
* **Vendor Directory:** Maintain comprehensive vendor profiles and transaction histories.

## 💻 Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla API integration)
* **Backend:** Node.js, Express.js (MVC Architecture)
* **Database:** SQL (Relational Database)

## 📁 Project Structure

```text
VendorBridge/
├── backend/                 # Node.js server and API
│   ├── config/              # Database connection settings
│   ├── controllers/         # Business logic (auth, invoices, POs, etc.)
│   ├── models/              # Database schemas
│   ├── routes/              # RESTful API endpoints
│   ├── server.js            # Main application entry point
│   ├── test-api.js          # API testing scripts
│   └── test-e2e.js          # End-to-end testing scripts
├── database/                # Database initialization
│   ├── data.json            # Seed/mock data
│   └── schema.sql           # SQL table definitions
└── frontend/                # Client-side web interface
    ├── css/                 # Stylesheets
    ├── js/                  # Client-side API logic
    └── *.html               # View templates
```
# 🛠️ Installation & Setup
# 1. Clone the repository

Bash
git clone [https://github.com/harshm13/VendorBridge.git](https://github.com/harshm13/VendorBridge.git)
cd VendorBridge
# 2. Initialize the Database

Open your preferred SQL database client.

Execute the script located at database/schema.sql to create the necessary tables.

(Optional) Import database/data.json to populate the database with dummy data for testing.

# 3. Start the Backend Server

Bash
cd backend
npm install
node server.js
# 4. Launch the Frontend

Open the frontend folder.

Launch index.html in your web browser, or use a local development server (e.g., VS Code Live Server) to serve the frontend files.

🧪 Testing
The backend includes automated testing scripts to ensure API stability. Run them with:

Bash
# Run API tests
node backend/test-api.js

# Run End-to-End tests (ensure server is running first)
node backend/test-e2e.js

# 👨‍💻 Author

Harsh Mehta

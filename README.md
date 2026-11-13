# VendorBridge 🌉

![Version](https://img.shields.io/badge/version-2.0.0-6366f1.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-10b981.svg?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express)
![Three.js](https://img.shields.io/badge/Three.js-3D_WebGL-000000?style=for-the-badge&logo=three.js)
![Aesthetics](https://img.shields.io/badge/UI%2FUX-MotionSites%20%2B%20ThreeUI-f59e0b?style=for-the-badge)

VendorBridge is an enterprise-grade Procurement & Vendor Management ERP system engineered with a next-generation **"Cosmic Quantum"** aesthetic inspired by [MotionSites AI](https://motionsites.ai/) and [ThreeUI](https://threeui.com/browse). From requisition broadcasting (RFQs) to AI bid evaluation, manager authorizations, purchase orders, and 18% GST invoice settlements, this platform unifies and accelerates the end-to-end procurement lifecycle.

---

## 🎨 Design System & Aesthetic Inspiration

VendorBridge synthesizes the visual excellence of **MotionSites AI** and **ThreeUI**:

* **3D Particle Constellation Mesh (ThreeUI)**: GPU-accelerated interactive WebGL background canvas with 60 FPS physics-driven particle nodes that gravitate toward cursor movement.
* **3D Interactive Perspective Tilt Cards (ThreeUI)**: Dynamic pitch and roll perspective transforms responding to mouse coordinates with real-time radial specular sheen tracking (`--mouse-x`, `--mouse-y`).
* **Iridescent Multi-Stop Gradient Badges (MotionSites)**: Radiant borders wrapping monospace tags (`Fresh Drops Everyday`, `Next-Gen Procurement Mesh`).
* **Animated Shimmering Headlines (MotionSites)**: Smooth multi-stop text gradient shift (`animate-gradient-shift`).
* **Curated Innovative Themes**: 5 built-in theme presets including Cosmic Obsidian Void, Midnight Sapphire Glass, High-Tech Cyber Emerald, Sunset Amber, and Starlight Clean.

---

## 🚀 Key Features

* **Multi-Tier Role-Based Access Control (RBAC)**: Dedicated workflows for **System Administrators**, **Approving Managers**, **Procurement Officers**, and **Vendor Partners**.
* **AI Requisition & Bid Intelligence**:
  * **Algorithmic Quotation Scoring**: Evaluates pricing vs. delivery speed with multi-factor weighting (60/40) and highlights AI Recommended value picks.
  * **AI Budget Estimator**: Benchmark unit costs and recommended delivery timeframes for draft RFQs.
* **End-to-End Procurement Lifecycle**:
  * **Supplier Directory**: Master vendor profiles, GSTIN validation, and contact hierarchies.
  * **RFQ Pipeline**: Create and publish procurement specifications with deadline countdowns.
  * **Side-by-Side Quotation Comparison**: Real-time matrix comparing lowest price, fastest delivery, and AI recommendations.
  * **Manager Approval Desk**: Authorization workflows with audit remarks and auto-provisioning of downstream POs.
  * **Automated Purchase Orders**: Instant generation of official POs with printable preview modals.
  * **Tax Compliant GST Billing**: Live auto-calculating 18% GST tax invoices linked to purchase orders.
* **Dual-Mode Hybrid Storage Engine**: Automatically connects to live MySQL databases when available, or seamlessly operates on high-speed JSON disk persistence (`database/data.json`) with zero setup.

---

## 💻 Tech Stack

* **Frontend**: HTML5, CSS3 (Custom Design System & Specular Glass Tokens), JavaScript (ES6+ Vanilla), Three.js (WebGL 3D Particles), FontAwesome 6.5.
* **Backend**: Node.js, Express.js (MVC & Service Architecture).
* **Security & Auth**: JSON Web Tokens (JWT), Bcrypt password hashing, Role-guard middleware.
* **Database Layer**: Dual-Mode Hybrid Engine (MySQL2 Connection Pool + High-Speed Persistent JSON Store).

---

## 📁 Project Structure

```text
VendorBridge/
├── backend/
│   ├── config/
│   │   └── db.js                 # Dual-mode database pool & JSON store router
│   ├── controllers/
│   │   ├── approvalController.js # Manager authorizations & PO provisioning
│   │   ├── authController.js     # User registration, login, profile & JWT
│   │   ├── dashboardController.js# Real-time analytics & telemetry stats
│   │   ├── invoiceController.js  # Tax billing & 18% GST calculation
│   │   ├── poController.js       # Purchase order issuance & tracking
│   │   ├── quotationController.js# Vendor bid submissions & comparisons
│   │   ├── rfqController.js      # Requisition creation & broadcasting
│   │   └── vendorController.js   # Supplier directory management
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & role authorization
│   │   └── errorHandler.js       # Centralized error handler
│   ├── models/
│   │   ├── approvalModel.js      # Approvals schema & transaction processing
│   │   ├── invoiceModel.js       # Invoices schema & numbering sequence
│   │   ├── poModel.js            # Purchase orders schema & sequence
│   │   ├── quotationModel.js     # Quotations schema & RFQ relations
│   │   ├── rfqModel.js           # RFQ schema & status tracking
│   │   ├── userModel.js          # User credentials & roles
│   │   └── vendorModel.js        # Vendor master records
│   ├── routes/
│   │   ├── aiRoutes.js           # AI bid analysis & budget estimation
│   │   ├── approvalRoutes.js     # Approvals endpoints
│   │   ├── authRoutes.js         # Authentication & profile endpoints
│   │   ├── dashboardRoutes.js    # Telemetry metrics endpoints
│   │   ├── invoiceRoutes.js      # Invoice endpoints
│   │   ├── poRoutes.js           # Purchase order endpoints
│   │   ├── quotationRoutes.js    # Quotation endpoints
│   │   ├── rfqRoutes.js          # RFQ endpoints
│   │   └── vendorRoutes.js       # Vendor endpoints
│   ├── services/
│   │   ├── aiService.js          # Heuristic AI quotation scoring & budget engine
│   │   └── dbStore.js            # Zero-latency hybrid storage engine
│   ├── tests/
│   │   ├── api.test.js           # API integration test runner
│   │   └── e2e.test.js           # End-to-end procurement lifecycle test runner
│   ├── .env.example              # Environment configuration template
│   ├── package.json              # Backend dependencies & test scripts
│   ├── seed.js                   # Database migration & seed utility
│   └── server.js                 # Express server & static route handlers
├── database/
│   ├── data.json                 # Seed and persistent storage data store
│   └── schema.sql                # Production MySQL relational schema
├── frontend/
│   ├── css/
│   │   ├── style.css             # Core design system tokens, themes & layout
│   │   └── components.css        # Modals, filter pills, tilt cards & AI cards
│   ├── js/
│   │   ├── api.js                # Client API service & session management
│   │   ├── appearance.js         # 5-preset persistent theme engine
│   │   ├── three-scene.js        # Three.js 3D particle constellation canvas
│   │   └── tilt.js               # 3D card perspective tilt & specular sheen
│   ├── approval.html             # Manager authorizations console
│   ├── dashboard.html            # Command center & KPI analytics
│   ├── index.html                # Flagship MotionSites / ThreeUI landing page
│   ├── invoice.html              # 18% GST tax invoice billing & print modal
│   ├── login.html                # Cosmic glass login with 1-click demo chips
│   ├── newaccount.html           # User account provisioning portal
│   ├── purchase-order.html       # Official purchase order registry & print modal
│   ├── quotations.html           # Bidding matrix & AI quotation analysis
│   ├── rfq.html                  # RFQ pipeline & AI budget estimator
│   └── vendor.html               # Supplier directory & onboarding
├── .gitignore                    # Environment & node_modules exclusion
└── README.md                     # Enterprise documentation
```

---

## 🛠️ Quick Start & Installation

### 1. Clone the repository
```bash
git clone https://github.com/harshm13/VendorBridge.git
cd VendorBridge
```

### 2. Install dependencies & configure environment
```bash
cd backend
npm install
cp .env.example .env
```

### 3. Start the application
```bash
npm start
```
The application will launch immediately at:
* **Web Interface**: `http://localhost:5000/`
* **API Health Check**: `http://localhost:5000/api/health`

*(Note: If MySQL is installed and running, set DB credentials in `backend/.env`. If MySQL is not running, VendorBridge runs automatically via its high-speed hybrid store in `database/data.json` with zero errors!)*

---

## 🔑 1-Click Demo Accounts

For rapid evaluation, 1-click login buttons are provided on the login page:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@vendorbridge.com` | `admin123` | Full access across all modules & settings |
| **Approving Manager** | `manager@vendorbridge.com` | `manager123` | Authorize / reject bids, issue POs |
| **Procurement Officer**| `procurement@vendorbridge.com` | `procurement123` | Create RFQs, inspect bids, issue POs |
| **Vendor Partner** | `abc@suppliers.com` | `vendor123` | Submit quotations, view POs, issue invoices |

---

## 🧪 Automated Testing

Automated integration and end-to-end lifecycle test suites are included:

```bash
# Run all automated tests
npm test

# Run API endpoint integration tests
npm run test:api

# Run End-to-End procurement lifecycle test
npm run test:e2e
```

---

## 👨‍💻 Author

**Harsh Mehta**  
* GitHub: [@harshm13](https://github.com/harshm13)  
* Repository: [VendorBridge](https://github.com/harshm13/VendorBridge)

License: MIT

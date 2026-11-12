CREATE DATABASE IF NOT EXISTS vendorbridge;
USE vendorbridge;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'procurement_officer', 'vendor', 'manager') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(30),
    gst_number VARCHAR(50),
    address TEXT,
    tier ENUM('tier1', 'tier2', 'verified') DEFAULT 'verified',
    country VARCHAR(80) DEFAULT 'United States',
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- RFQs table
CREATE TABLE IF NOT EXISTS rfqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'IT Hardware & Infrastructure',
    quantity INT,
    currency VARCHAR(10) DEFAULT 'USD',
    deadline DATE,
    created_by INT,
    status ENUM('draft', 'open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id INT,
    vendor_id INT,
    vendor_name VARCHAR(200),
    amount DECIMAL(14,2),
    currency VARCHAR(10) DEFAULT 'USD',
    delivery_days INT,
    notes TEXT,
    status ENUM('submitted', 'approved', 'rejected') DEFAULT 'submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT,
    rfq_title VARCHAR(255),
    vendor_name VARCHAR(200),
    amount DECIMAL(14,2),
    approved_by INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE,
    quotation_id INT,
    vendor_name VARCHAR(200),
    rfq_ref VARCHAR(150),
    total_amount DECIMAL(14,2),
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('pending', 'issued', 'approved', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE,
    purchase_order_id INT,
    vendor_name VARCHAR(200),
    product VARCHAR(255),
    quantity INT,
    unit_price DECIMAL(14,2),
    subtotal DECIMAL(14,2),
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_label VARCHAR(40) DEFAULT 'GST',
    tax DECIMAL(14,2),
    total_amount DECIMAL(14,2),
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('generated', 'paid') DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    category VARCHAR(50) DEFAULT 'system',
    action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    message TEXT,
    category VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Data for Initial Setup
INSERT IGNORE INTO users (id, name, email, password, role) VALUES
(1, 'Admin User', 'admin@vendorbridge.com', 'admin123', 'admin'),
(2, 'Manager Approver', 'manager@vendorbridge.com', 'manager123', 'manager'),
(3, 'Procurement Officer', 'procurement@vendorbridge.com', 'procurement123', 'procurement_officer'),
(4, 'ABC Vendor', 'abc@suppliers.com', 'vendor123', 'vendor');

INSERT IGNORE INTO vendors (id, user_id, company_name, contact_person, email, phone, gst_number, address, tier, country, currency, status) VALUES
(1, 4, 'ABC Global Suppliers', 'John Doe', 'abc@suppliers.com', '+1 (415) 555-0192', '29ABCDE1234F1Z5', '123 Industrial Estate, San Francisco, CA & Mumbai', 'tier1', 'United States', 'USD', 'active'),
(2, NULL, 'Nordic Tech Industries', 'Astrid Lindqvist', 'contact@nordictech.eu', '+46 8 501 234 00', 'SE556012345601', 'Kista Science Tower, Stockholm, Sweden', 'tier1', 'Sweden', 'EUR', 'active'),
(3, NULL, 'Apex Cloud Systems', 'Marcus Vance', 'sales@apexcloud.io', '+44 20 7946 0199', 'GB998123456', 'One Canada Square, Canary Wharf, London', 'tier2', 'United Kingdom', 'GBP', 'active'),
(4, NULL, 'Sakura Precision Corp', 'Kenji Takahashi', 'supply@sakuraprecision.jp', '+81 3 5555 0148', 'JP-T4010001123456', 'Minato-ku, Tokyo, Japan', 'verified', 'Japan', 'JPY', 'active');

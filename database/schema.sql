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
    phone VARCHAR(20),
    gst_number VARCHAR(50),
    address TEXT,
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- RFQs table
CREATE TABLE IF NOT EXISTS rfqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT,
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
    amount DECIMAL(10,2),
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
    amount DECIMAL(10,2),
    approved_by INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    remarks TEXT,
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
    rfq_ref VARCHAR(100),
    total_amount DECIMAL(10,2),
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
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    status ENUM('generated', 'paid') DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
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

INSERT IGNORE INTO vendors (id, user_id, company_name, contact_person, email, phone, gst_number, address, status) VALUES
(1, 4, 'ABC Suppliers', 'John Doe', 'abc@suppliers.com', '+91 9876543210', '29ABCDE1234F1Z5', '123 Industrial Estate, Mumbai', 'active'),
(2, NULL, 'Tech Industries', 'Sarah Smith', 'contact@techind.com', '+91 9812345678', '27TECH9876G1Z2', '456 Tech Park, Bengaluru', 'active'),
(3, NULL, 'Office Essentials', 'Mike Johnson', 'info@officeessentials.com', '+91 9988776655', '07OFFIC4321H1Z9', '789 Commercial Zone, Delhi', 'active');

INSERT IGNORE INTO rfqs (id, title, description, quantity, deadline, created_by, status) VALUES
(1, 'Laptop Procurement', 'High performance laptops for development team', 50, '2026-08-20', 3, 'open'),
(2, 'Office Furniture', 'Ergonomic chairs and executive desks', 100, '2026-08-25', 3, 'open'),
(3, 'Printer Supplies', 'LaserJet toner cartridges and heavy duty paper', 30, '2026-08-18', 3, 'closed');

INSERT IGNORE INTO quotations (id, rfq_id, vendor_id, vendor_name, amount, delivery_days, notes, status) VALUES
(1, 1, 1, 'ABC Suppliers', 480000.00, 7, 'Includes 3 years warranty and free delivery', 'approved'),
(2, 1, 2, 'Tech Industries', 510000.00, 5, 'Includes fast shipping and setup', 'submitted'),
(3, 1, 3, 'Office Essentials', 465000.00, 10, 'Standard warranty', 'submitted');

INSERT IGNORE INTO approvals (id, quotation_id, rfq_title, vendor_name, amount, approved_by, status, remarks) VALUES
(1, 1, 'RFQ001 - Laptop Procurement', 'ABC Suppliers', 480000.00, 2, 'pending', 'Best balance of pricing, warranty, and delivery time.');

INSERT IGNORE INTO purchase_orders (id, po_number, quotation_id, vendor_name, rfq_ref, total_amount, status) VALUES
(1, 'PO-2026-001', 1, 'ABC Suppliers', 'RFQ001', 480000.00, 'approved'),
(2, 'PO-2026-002', 2, 'Tech Industries', 'RFQ002', 510000.00, 'pending');

INSERT IGNORE INTO invoices (id, invoice_number, purchase_order_id, vendor_name, product, quantity, unit_price, subtotal, tax, total_amount, status) VALUES
(1, 'INV-2026-001', 1, 'ABC Suppliers', 'Development Laptops', 50, 9600.00, 480000.00, 86400.00, 566400.00, 'generated');

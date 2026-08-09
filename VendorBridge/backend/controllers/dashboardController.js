const Vendor = require('../models/vendorModel');
const RFQ = require('../models/rfqModel');
const Approval = require('../models/approvalModel');
const Invoice = require('../models/invoiceModel');
const PurchaseOrder = require('../models/poModel');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalVendors = await Vendor.count();
        const activeRfqs = await RFQ.countActive();
        const pendingApprovals = await Approval.countPending();
        const invoicesGenerated = await Invoice.count();

        const recentRfqs = (await RFQ.getAll()).slice(0, 5);
        const recentPos = (await PurchaseOrder.getAll()).slice(0, 5);

        res.status(200).json({
            stats: {
                totalVendors,
                activeRfqs,
                pendingApprovals,
                invoicesGenerated
            },
            recentRfqs,
            recentPos
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server error fetching dashboard stats' });
    }
};

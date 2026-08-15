const Approval = require('../models/approvalModel');

exports.getApprovals = async (req, res, next) => {
    try {
        const approvals = await Approval.getAll();
        res.status(200).json(approvals);
    } catch (error) {
        next(error);
    }
};

exports.updateApproval = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status ("approved" or "rejected") is required' });
        }

        const approved_by = req.user ? req.user.id : 1;

        const updated = await Approval.updateStatus(id, status, remarks, approved_by);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Approval record not found' });
        }

        res.status(200).json({ success: true, message: `Approval request ${status} successfully!` });
    } catch (error) {
        next(error);
    }
};

const Approval = require('../models/approvalModel');

exports.getApprovals = async (req, res) => {
    try {
        const approvals = await Approval.getAll();
        res.status(200).json(approvals);
    } catch (error) {
        console.error('Error fetching approvals:', error);
        res.status(500).json({ message: 'Server error fetching approvals' });
    }
};

exports.updateApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks, approved_by } = req.body;
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Valid status ("approved" or "rejected") is required' });
        }

        const updated = await Approval.updateStatus(id, status, remarks, approved_by);
        if (!updated) {
            return res.status(404).json({ message: 'Approval record not found' });
        }

        res.status(200).json({ message: `Approval request ${status} successfully!` });
    } catch (error) {
        console.error('Error updating approval:', error);
        res.status(500).json({ message: 'Server error updating approval' });
    }
};

const Approval = require('../models/approvalModel');
const Activity = require('../models/activityModel');

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
        const result = await Approval.updateStatus(id, status, remarks, approved_by);
        if (!result || !result.updated) {
            return res.status(404).json({ success: false, message: 'Approval record not found' });
        }

        const poMsg = result.createdPo ? ` Issued ${result.createdPo.po_number}.` : '';
        await Activity.log({
            user_id: approved_by,
            title: `Approval APP#${id} ${status.toUpperCase()}`,
            category: 'approval',
            action: `${result.approval.vendor_name} proposal (${result.approval.rfq_title}) ${status}.${poMsg}`
        });

        res.status(200).json({
            success: true,
            message: `Approval request ${status} successfully!${poMsg}`,
            po: result.createdPo
        });
    } catch (error) {
        next(error);
    }
};

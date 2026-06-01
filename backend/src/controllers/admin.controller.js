import db from '../models/index.js';
import logger from '../utils/logger.js';

const { User, Gym } = db;

export const getPendingOwners = async (req, res) => {
    try {
        const pendingOwners = await User.findAll({
            where: {
                role: 'owner',
                status: 'pending'
            },
            include: [{ // Include gym details to see which gym they are registering for
                model: Gym,
                attributes: ['gym_name', 'city', 'state']
            }],
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone', 'created_at']
        });

        res.json(pendingOwners);
    } catch (error) {
        logger.error('Error fetching pending owners:', error);
        res.status(500).json({ error: error.message });
    }
};

export const approveOwner = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await User.findByPk(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = 'active';
        await user.save();

        // Optionally trigger an email here using Make webhook to notify owner

        res.json({ success: true, message: 'Owner approved successfully' });
    } catch (error) {
        logger.error('Error approving owner:', error);
        res.status(500).json({ error: error.message });
    }
};

export const rejectOwner = async (req, res) => {
    try {
        const { user_id } = req.params;

        const user = await User.findByPk(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = 'rejected';
        await user.save();

        res.json({ success: true, message: 'Owner rejected successfully' });
    } catch (error) {
        logger.error('Error rejecting owner:', error);
        res.status(500).json({ error: error.message });
    }
};

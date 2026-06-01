import express from 'express';
import { getPendingOwners, approveOwner, rejectOwner } from '../controllers/admin.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// Middleware to ensure user is admin
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin only.' });
    }
};

router.use(authenticateToken);
router.use(verifyAdmin);

router.get('/pending-owners', getPendingOwners);
router.post('/approve/:user_id', approveOwner);
router.post('/reject/:user_id', rejectOwner);

export default router;

import express from 'express';
import { runMembershipExpiryJob } from '../cronJobs/membershipExpiryJob.js';

const router = express.Router();

router.post('/run-membership-expiry', async (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_JOB_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await runMembershipExpiryJob();
  res.json({ success: true });
});

export default router;

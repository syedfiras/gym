// src/backend/controllers/membership.controller.js
import db from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

const { Membership } = db; // Destructure the Membership model

export const updateExpiredMemberships = async () => {
  try {
    const today = new Date();
    // Set hours to 00:00:00.000 for consistent daily checks.
    // If end_date stores only date, comparing to start of today is correct.
    // If end_date stores time, consider end of day, or simply new Date()
    // to catch anything that passed by a millisecond. Let's use new Date() for precision.
    // today.setHours(0, 0, 0, 0); // Commented out for now, new Date() is more precise.

    const [updatedCount] = await Membership.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          end_date: { [Op.lt]: new Date() } // Where end_date is strictly less than current time
        }
      }
    );
    console.log(`[Membership Status Job] Updated ${updatedCount} memberships to 'expired' status.`);
    return updatedCount;
  } catch (error) {
    console.error('[Membership Status Job] Error updating expired memberships:', error);
    // Important: Re-throw or handle error appropriately if this is a cron job,
    // to ensure it doesn't silently fail.
    throw error;
  }
};

// You could expose an endpoint for this for testing/manual trigger (though not for production)
// app.post('/api/owner/update-expired-memberships', async (req, res) => {
//   try {
//     const count = await updateExpiredMemberships();
//     res.status(200).json({ message: `Successfully updated ${count} memberships.`, updatedCount: count });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
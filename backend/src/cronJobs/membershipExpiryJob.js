// backend/src/cronJobs/membershipExpiryJob.js

import db from '../models/index.js';
import { sendPushNotification } from '../utils/fcm.js';
import { triggerMakeWebhook } from '../utils/makeWebhook.js';

const {
  Member,
  Membership,
  MembershipPlan,
  PersonalTraining,
  Notification,
  User
} = db;

function logSection(title) {
  const now = new Date().toLocaleString('en-IN', { hour12: false });
  console.log('\n' + '='.repeat(60));
  console.log(`[JOB] ${title} | ${now}`);
  console.log('='.repeat(60));
}

export const runMembershipExpiryJob = async () => {
  logSection('START MEMBERSHIP & PERSONAL TRAINING EXPIRY JOB');

  try {
    /* ============================
       1️⃣ EXPIRE MEMBERSHIPS
    ============================ */
    const membershipsToExpire = await Membership.findAll({
      where: {
        status: 'active',
        end_date: { [db.Sequelize.Op.lt]: new Date() }
      }
    });

    if (membershipsToExpire.length > 0) {
      const ids = membershipsToExpire.map(m => m.membership_id);
      await Membership.update(
        { status: 'expired' },
        { where: { membership_id: ids } }
      );
      console.log(`[Membership] Expired ${ids.length} memberships`);
    }

    /* ============================
       2️⃣ NOTIFY FOR EXPIRED
    ============================ */
    for (const membership of membershipsToExpire) {
      const existing = await Notification.findOne({
        where: {
          membership_id: membership.membership_id,
          message: { [db.Sequelize.Op.like]: '%expired%' }
        }
      });
      if (existing) continue;

      const member = await Member.findByPk(membership.member_id);
      const plan = await MembershipPlan.findByPk(membership.plan_id);
      if (!member) continue;

      const message = `Membership for ${member.first_name} ${member.last_name || ''} (${plan?.plan_name || 'N/A'}) has expired!`;

      await Notification.create({
        gym_id: membership.gym_id,
        member_id: membership.member_id,
        membership_id: membership.membership_id,
        message,
        status: 'sent'
      });

      await triggerMakeWebhook({
        event: 'MEMBERSHIP_EXPIRED',
        gym_id: membership.gym_id,
        member: {
          id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          phone: member.phone,
          email: member.email
        },
        membership: {
          membership_id: membership.membership_id,
          plan_name: plan?.plan_name || 'N/A',
          end_date: membership.end_date
        }
      });

      const owners = await User.findAll({
        where: {
          gym_id: membership.gym_id,
          role: 'owner',
          fcm_token: { [db.Sequelize.Op.ne]: null }
        }
      });

      for (const owner of owners) {
        await sendPushNotification(
          owner.fcm_token,
          'Membership Expired',
          message,
          { membership_id: String(membership.membership_id) }
        );
      }
    }

    /* ============================
       3️⃣ EXPIRING IN 3 DAYS
    ============================ */
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await Membership.findAll({
      where: {
        status: 'active',
        end_date: {
          [db.Sequelize.Op.gte]: now,
          [db.Sequelize.Op.lte]: threeDaysFromNow
        }
      }
    });

    for (const membership of expiringSoon) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const existing = await Notification.findOne({
        where: {
          membership_id: membership.membership_id,
          message: { [db.Sequelize.Op.like]: '%expiring%' },
          created_at: { [db.Sequelize.Op.between]: [todayStart, todayEnd] }
        }
      });
      if (existing) continue;

      const member = await Member.findByPk(membership.member_id);
      const plan = await MembershipPlan.findByPk(membership.plan_id);
      if (!member) continue;

      const daysLeft = Math.ceil(
        (new Date(membership.end_date) - now) / (1000 * 60 * 60 * 24)
      );

      const expiryText = daysLeft === 0 ? 'is expiring today!' : `is expiring in ${daysLeft} day(s)!`;
      const message = `Membership for ${member.first_name} ${member.last_name || ''} (${plan?.plan_name || 'N/A'}) ${expiryText}`;

      await Notification.create({
        gym_id: membership.gym_id,
        member_id: membership.member_id,
        membership_id: membership.membership_id,
        message,
        status: 'sent'
      });

      const owners = await User.findAll({
        where: {
          gym_id: membership.gym_id,
          role: 'owner',
          fcm_token: { [db.Sequelize.Op.ne]: null }
        }
      });

      for (const owner of owners) {
        await sendPushNotification(
          owner.fcm_token,
          'Membership Expiring Soon',
          message,
          { membership_id: String(membership.membership_id) }
        );
      }
    }

    /* ============================
       4️⃣ PERSONAL TRAINING
    ============================ */
    await PersonalTraining.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          end_date: { [db.Sequelize.Op.lt]: new Date() }
        }
      }
    );

  } catch (error) {
    console.error('[ERROR] Membership expiry job:', error);
  }

  console.log('='.repeat(60) + '\n');
};

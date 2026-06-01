import db from '../models/index.js';

const { Membership, MembershipPlan, Transaction, Member } = db;

/**
 * Adds a membership for a member, calculates total, due, and payment status.
 * @param {Object} params - { member_id, plan_id, gym_id, start_date, end_date, payments: [{amount, type}], admission_fee }
 * @returns {Promise<Membership>}
 */
export async function addMembershipWithTransactions({ member_id, plan_id, gym_id, start_date, end_date, payments = [], admission_fee = 0 }) {
  // Fetch plan price
  const plan = await MembershipPlan.findByPk(plan_id);
  if (!plan) throw new Error('Membership plan not found');
  const planPrice = parseFloat(plan.price);
  const total = planPrice + parseFloat(admission_fee || 0);
  // Sum all payments
  const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const due = total - paid;
  // Create membership
  const membership = await Membership.create({
    member_id,
    plan_id,
    gym_id,
    start_date,
    end_date,
    actual_price_paid: paid,
    payment_status: due <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'due',
    status: 'active',
  });
  // Create transactions (membership payment, admission fee, etc.)
  for (const payment of payments) {
    await Transaction.create({
      gym_id,
      member_id,
      membership_id: membership.membership_id,
      amount: payment.amount,
      payment_method: payment.method,
      transaction_type: payment.type, // e.g., 'membership_payment', 'admission_fee'
      description: payment.description || '',
      transaction_date: payment.transaction_date || new Date(),
    });
  }
  // If admission fee is not included in payments, create a due transaction
  if (admission_fee && !payments.some(p => p.type === 'admission_fee')) {
    await Transaction.create({
      gym_id,
      member_id,
      membership_id: membership.membership_id,
      amount: admission_fee,
      payment_method: 'cash',
      transaction_type: 'admission_fee',
      description: 'Admission fee (due)',
      transaction_date: new Date(),
    });
  }
  return { membership, total, paid, due };
}

/**
 * Add a membership to an existing member (wrapper for addMembershipWithTransactions)
 */
export async function addMembershipToMember(params) {
  return addMembershipWithTransactions(params);
}

/**
 * Get all memberships for a member (with plan info)
 */
export async function getMembershipsForMember(member_id) {
  return Membership.findAll({
    where: { member_id },
    include: [{ model: MembershipPlan, attributes: ['plan_name', 'duration_months', 'price'] }],
    order: [['start_date', 'DESC']]
  });
} 
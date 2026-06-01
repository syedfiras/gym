import db from '../models/index.js';

const { Transaction, Member, Membership } = db;

/**
 * Add a transaction for a member (optionally linked to a membership)
 * @param {Object} params - { gym_id, member_id, membership_id, amount, payment_method, transaction_type, description, transaction_date }
 */
export async function addTransaction({ gym_id, member_id, membership_id = null, amount, payment_method, transaction_type, description = '', transaction_date = new Date() }) {
  return Transaction.create({
    gym_id,
    member_id,
    membership_id,
    amount,
    payment_method,
    transaction_type,
    description,
    transaction_date,
  });
}

/**
 * Get all transactions for a member
 */
export async function getTransactionsForMember(member_id) {
  return Transaction.findAll({
    where: { member_id },
    attributes: ['transaction_id', 'amount', 'payment_method', 'transaction_type', 'description', 'transaction_date'],
    order: [['transaction_date', 'DESC']]
  });
}

/**
 * Get all transactions for a membership
 */
export async function getTransactionsForMembership(membership_id) {
  return Transaction.findAll({
    where: { membership_id },
    order: [['transaction_date', 'DESC']]
  });
} 
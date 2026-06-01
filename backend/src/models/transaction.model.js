// src/models/transaction.model.js

export default (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    transaction_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gym_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'gyms', // table name
        key: 'gym_id'
      }
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'members', // table name
        key: 'member_id'
      }
    },
    membership_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be NULL if transaction is not for a membership payment
      references: {
        model: 'memberships', // table name
        key: 'membership_id'
      },
      comment: 'Links to a specific membership term if this transaction is for it'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'online_gateway'),
      allowNull: false,
      comment: 'Method of payment'
    },
    transaction_type: {
      type: DataTypes.ENUM('membership_payment', 'admission_fee', 'merchandise', 'personal_training', 'other_fee'),
      allowNull: false,
      comment: 'Type of transaction'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, // Optional description for the transaction
      comment: 'A brief description of the transaction (e.g., "Water bottle purchase", "Q3 Membership Fee")'
    },
    transaction_date: {
      type: DataTypes.DATE, // Use DATE for date only, or DATETIME for time precision
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'transactions',
    timestamps: true, // Includes created_at and updated_at
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations (will be linked in models/index.js)
  // Transaction.associate = (models) => {
  //   Transaction.belongsTo(models.Gym, { foreignKey: 'gym_id' });
  //   Transaction.belongsTo(models.Member, { foreignKey: 'member_id' });
  //   Transaction.belongsTo(models.Membership, { foreignKey: 'membership_id' });
  // };

  return Transaction;
};

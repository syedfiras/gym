// src/models/membership.model.js

export default (sequelize, DataTypes) => {
  const Membership = sequelize.define('Membership', {
    membership_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'members', // table name
        key: 'member_id'
      }
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'membership_plans', // table name
        key: 'plan_id'
      }
    },
    gym_id: { // Redundant but useful for direct filtering in multi-tenant queries
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'gyms', // table name
        key: 'gym_id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    actual_price_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'The actual price paid for this specific membership, can differ from plan price (discounts, etc.)'
    },
    payment_status: {
      type: DataTypes.ENUM('paid', 'due', 'partially_paid', 'refunded'),
      allowNull: false,
      defaultValue: 'due',
      comment: 'Current payment status for this membership term'
    },
    status: { // Overall status of the membership itself (active, expired, cancelled)
      type: DataTypes.ENUM('active', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Current status of the membership term (e.g., active, expired, cancelled early)'
    }
  }, {
    tableName: 'memberships',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations (will be linked in models/index.js)
  Membership.associate = (models) => {
    Membership.belongsTo(models.Member, { foreignKey: 'member_id' });
    Membership.belongsTo(models.MembershipPlan, { foreignKey: 'plan_id' });
    Membership.belongsTo(models.Gym, { foreignKey: 'gym_id' }); // Link to Gym for convenience
    Membership.hasMany(models.Transaction, { foreignKey: 'membership_id' });
  };

  return Membership;
};

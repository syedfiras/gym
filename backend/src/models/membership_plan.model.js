// src/models/membership_plan.model.js

export default (sequelize, DataTypes) => {
  const MembershipPlan = sequelize.define('MembershipPlan', {
    plan_id: {
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
    plan_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true // Optional description for the plan
    },
    duration_months: {
      type: DataTypes.INTEGER,
      allowNull: false, // e.g., 1 for 1 month, 3 for 3 months
      comment: 'Duration of the plan in months'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2), // Price with 2 decimal places
      allowNull: false
    },
    plan_type: {
      type: DataTypes.ENUM('gym', 'cardio', 'premium', 'personal_training', 'other'),
      allowNull: false,
      defaultValue: 'gym',
      comment: 'Type of the membership plan (e.g., gym access, cardio only, premium, PT sessions)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // Whether this plan is currently offered by the gym
      comment: 'Indicates if the plan is currently active and offered by the gym'
    }
  }, {
    tableName: 'membership_plans',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations (will be linked in models/index.js)
  // MembershipPlan.associate = (models) => {
  //   MembershipPlan.belongsTo(models.Gym, { foreignKey: 'gym_id' });
  //   MembershipPlan.hasMany(models.Membership, { foreignKey: 'plan_id' });
  // };

  return MembershipPlan;
};

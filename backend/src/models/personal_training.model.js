export default (sequelize, DataTypes) => {
  const PersonalTraining = sequelize.define('PersonalTraining', {
    pt_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gym_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: true // Optional trainer/staff assignment
    },
    duration_months: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    },
    notes: {
      type: DataTypes.TEXT
    },
    actual_price_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    payment_status: {
      type: DataTypes.ENUM('paid', 'due', 'partially_paid', 'refunded'),
      allowNull: false,
      defaultValue: 'due'
    }
  }, {
    tableName: 'personal_trainings',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  PersonalTraining.associate = (models) => {
    PersonalTraining.belongsTo(models.Gym, { foreignKey: 'gym_id' });
    PersonalTraining.belongsTo(models.Member, { foreignKey: 'member_id' });
    PersonalTraining.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'Trainer' });
  };

  return PersonalTraining;
};
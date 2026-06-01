export default (sequelize, DataTypes) => {
  const Staff = sequelize.define('Staff', {
    staff_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gym_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100)
    },
    staff_role: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'e.g. Trainer, Receptionist, Cleaner'
    },
    join_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    },
    notes: {
      type: DataTypes.TEXT
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'staff',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Staff.associate = (models) => {
    Staff.belongsTo(models.Gym, { foreignKey: 'gym_id' });
    Staff.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
  };

  return Staff;
};
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    phone: {
      type: DataTypes.STRING(50), // Standard format for phone numbers
      allowNull: true // Optional field
    },
    gym_id: {
      type: DataTypes.INTEGER,
      allowNull: true // Can be NULL for super-admin or temporary owner before gym creation
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    reset_password_token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('owner', 'staff', 'admin'), // Removed 'member', 'trainer' can be 'staff'
      allowNull: false,
      defaultValue: 'owner'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100)
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    fcm_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  User.associate = (models) => {
    User.belongsTo(models.Gym, { foreignKey: 'gym_id' });
  };

  return User;
};
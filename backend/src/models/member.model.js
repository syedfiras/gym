export default (sequelize, DataTypes) => {
  const Member = sequelize.define('Member', {
    member_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gym_id: {
      type: DataTypes.INTEGER,
      allowNull: false // Must be linked to a gym
    },
    // user_id removed - Members no longer have app accounts
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
    join_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    member_status: {
      type: DataTypes.ENUM('pending', 'active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'pending'
    },
    photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'members',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Member.associate = (models) => {
    Member.belongsTo(models.Gym, { foreignKey: 'gym_id' });
    // Member.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' }); // Removed
  };

  return Member;
};
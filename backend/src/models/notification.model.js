export default (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    notification_id: {
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
      allowNull: true
    },
    membership_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('sent', 'read'),
      allowNull: false,
      defaultValue: 'sent'
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.Gym, { foreignKey: 'gym_id' });
    Notification.belongsTo(models.Member, { foreignKey: 'member_id' });
    Notification.belongsTo(models.Membership, { foreignKey: 'membership_id' });
  };

  return Notification;
}; 
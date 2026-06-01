export default (sequelize, DataTypes) => {
  const Gym = sequelize.define('Gym', {
    gym_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gym_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING(100)
    },
    state: {
      type: DataTypes.STRING(100)
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'India'
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    contact_phone: {
      type: DataTypes.STRING(50)
    },
    unique_join_code: {
      type: DataTypes.STRING(30),
      allowNull: false
    }
  }, {
    tableName: 'gyms',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

    Gym.associate = (models) => {
    Gym.hasMany(models.User, { foreignKey: 'gym_id' });
    Gym.hasMany(models.Member, { foreignKey: 'gym_id' });
    };
  
  return Gym;
};
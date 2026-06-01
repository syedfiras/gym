// src/models/whatsapp_template.model.js

export default (sequelize, DataTypes) => {
  const WhatsAppTemplate = sequelize.define('WhatsAppTemplate', {
    template_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    gym_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'gyms',
        key: 'gym_id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'whatsapp_templates',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  WhatsAppTemplate.associate = (models) => {
    WhatsAppTemplate.belongsTo(models.Gym, { foreignKey: 'gym_id' });
  };

  return WhatsAppTemplate;
};
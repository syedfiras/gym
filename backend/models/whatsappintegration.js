'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WhatsAppIntegration extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  WhatsAppIntegration.init({
    gym_id: DataTypes.INTEGER,
    api_key: DataTypes.STRING,
    sender_id: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'WhatsAppIntegration',
  });
  return WhatsAppIntegration;
};
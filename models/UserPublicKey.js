const { sequelize, Sequelize } = require('../db');
const DataTypes = Sequelize.DataTypes;
const User = require('./User');

const UserPublicKey = sequelize.define('UserPublicKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true
});

// 定义关联关系
UserPublicKey.belongsTo(User, { foreignKey: 'userId' });

module.exports = UserPublicKey;
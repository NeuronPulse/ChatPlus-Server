const { sequelize, DataTypes } = require('../db');
const User = require('./User');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceType: {
    type: DataTypes.ENUM('web', 'mobile', 'desktop'),
    defaultValue: 'web'
  },
  lastActive: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// 定义关联关系
Device.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Device, { foreignKey: 'userId' });

module.exports = Device;
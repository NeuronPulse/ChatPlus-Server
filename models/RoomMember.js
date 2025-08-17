const { sequelize, Sequelize } = require('../db');
const DataTypes = Sequelize.DataTypes;
const User = require('./User');
const Room = require('./Room');

const RoomMember = sequelize.define('RoomMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    defaultValue: 'member'
  }
}, {
  timestamps: true
});

// 定义关联关系
RoomMember.belongsTo(User, { foreignKey: 'userId' });
RoomMember.belongsTo(Room, { foreignKey: 'roomId' });

module.exports = RoomMember;
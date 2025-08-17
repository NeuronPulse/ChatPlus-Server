const { sequelize, DataTypes } = require('../db');
const User = require('./User');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('private', 'group'),
    defaultValue: 'private'
  },
  avatar: {    type: DataTypes.STRING,    allowNull: true  },  announcement: {    type: DataTypes.TEXT,    allowNull: true  },  announcementUpdatedAt: {    type: DataTypes.DATE,    allowNull: true  }
}, {
  timestamps: true
});

// 定义关联关系
Room.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });

module.exports = Room;
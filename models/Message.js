const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const User = require('./User');
const Room = require('./Room');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'voice'),
    defaultValue: 'text'
  },
  encrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mentionedUsers: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('mentionedUsers');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('mentionedUsers', JSON.stringify(value));
    }
  }
}, {
  timestamps: true
});

// 定义关联关系
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(Room, { foreignKey: 'roomId' });

module.exports = Message;
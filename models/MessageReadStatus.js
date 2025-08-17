const { sequelize, Sequelize } = require('../db');
const DataTypes = Sequelize.DataTypes;
const Message = require('./Message');
const User = require('./User');

const MessageReadStatus = sequelize.define('MessageReadStatus', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read'),
    defaultValue: 'sent'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

// 定义关联关系
MessageReadStatus.belongsTo(Message, { foreignKey: 'messageId' });
MessageReadStatus.belongsTo(User, { foreignKey: 'userId' });

// 为Message模型添加关联
Message.hasMany(MessageReadStatus, { foreignKey: 'messageId' });

module.exports = MessageReadStatus;
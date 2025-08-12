const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const User = require('./User');
const Room = require('./Room');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filepath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filesize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  mimetype: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isVoiceMessage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

// 定义关联关系
File.belongsTo(User, { as: 'uploader', foreignKey: 'uploaderId' });
File.belongsTo(Room, { foreignKey: 'roomId' });

module.exports = File;
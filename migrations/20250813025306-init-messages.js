'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('text', 'image', 'file', 'voice'),
        defaultValue: 'text'
      },
      encrypted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      mentionedUsers: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isRecalled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      recalledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      editedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      originalContent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      senderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      roomId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Messages');
  }
};

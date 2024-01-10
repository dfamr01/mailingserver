const {Sequelize} = require('sequelize');
const config = require('../config');

const connection = new Sequelize(
  config.db,
  {
    dialect: 'postgres',
    logging: false
  }
);

module.exports = connection;

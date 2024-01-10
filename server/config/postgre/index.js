const logger = require('log4js').getLogger('connection');

const sequelizeConnection = require('./sequelizeConnection'); // create a posgre instance and connect to DB.
module.exports = sequelizeConnection.authenticate()
  .then(() => {
    require('../../shared/database/associations');

    return sequelizeConnection.sync(/*{ force: true }*/)
      .then((res) => {
        require('./triggers');
        return res;
      });
  }).catch((err) => {
    logger.error(err);
  });

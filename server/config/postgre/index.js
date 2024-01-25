const logger = require("log4js").getLogger("connection");

const sequelizeConnection = require("./sequelizeConnection"); // create a posgre instance and connect to DB.
module.exports = async () => {
    try {
        await sequelizeConnection.authenticate();
        require("../../shared/database/associations");
        const res = await sequelizeConnection.sync(/*{ force: true }*/);
        require("./triggers");
        return res;
    } catch (err) {
        logger.error(err);
    }
};

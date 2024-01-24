require("module-alias/register");

const logger = require("log4js").getLogger("Mailer");
// postgre should always go first
const postgre = require("./config/postgre");
const { sleep } = require("./shared/utils");
const { sendEmailDBEnqueued } = require("./helpers/mailer");

async function run() {
    sendEmailDBEnqueued();
}

async function runServer() {
    try {
        await postgre;
        await sleep(5000);
        await run();
    } catch (e) {
        logger.error("There was an error: ", e);
        process.exit(1);
    }
}

runServer();

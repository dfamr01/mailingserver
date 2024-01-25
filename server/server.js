require("module-alias/register"); //always at top
const config = require("config/config");

const sgMail = require("@sendgrid/mail");
const express = require("config/express");
const logger = require("log4js").getLogger("Mailer");
const postgre = require("./config/postgre");
const { sleep } = require("./shared/utils");
const emailer = require("./helpers/mailer");

sgMail.setApiKey(config.sendGrid_api);

async function run() {
    const emailInstance = emailer(sgMail).start();
}

async function runServer() {
    try {
        await postgre;
        await sleep(5000);
        express();
        await run();
    } catch (e) {
        logger.error("There was an error: ", e);
        process.exit(1);
    }
}

runServer();

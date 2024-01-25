const { Op, Sequelize } = require("sequelize");
const logger = require("config/log4js")("mailer");
const sequelize = require("../config/postgre/sequelizeConnection");
const { EMAIL_QUEUE_STATUS, MAX_SEND_RETRY, EMAIL_URGENCY } = require("../shared/config/constants");
const EmailQueue = require("../shared/database/models/emailQueue.model");
const { getPostDeliveryMethodNames } = require("../utils/mailer.utils");
const { getAllOccurrencesAboutToStart } = require("./mailer.helpers");
const { BATCH_EMAIL_LIMIT, WAIT_TIME_GENERAL, WAIT_SCHEDULE_TIME } = require("../utils/mailer.constants");

class Mailer {
    constructor(emailService) {
        this.emailService = emailService;
    }

    async sendMail(mailOptions) {
        logger.info("Sending email");
        return this.emailService.send(mailOptions);
    }

    handleEmailQueue = async (email, t) => {
        const { id, mailerParams, postDeliveryMethod, postDeliveryParams } = email;
        logger.info("trying to send mail id: ", id);
        const options = { transaction: t };

        try {
            logger.info("trying to send mail: ", id);
            if (mailerParams) {
                await this.sendMail(mailerParams);
                logger.info("Sent mail successfully");
            } else {
                logger.error("no mailerParams", email);
            }

            email.status = EMAIL_QUEUE_STATUS.SUCCESS.key;
            await email.save(options);
        } catch (e) {
            logger.error("Error sending mail error: ", e);
            logger.info("Error sending mail msg: ", e?.response?.body || e);
            email.retries++;
            logger.info("Progressing retries: ", email.retries);
            await email.save(options);
        }

        logger.info("performing post delivery methods");
        const postDeliveryMethods = getPostDeliveryMethodNames();
        if (
            postDeliveryMethods.hasOwnProperty(postDeliveryMethod) &&
            typeof postDeliveryMethods[postDeliveryMethod] === "function"
        ) {
            postDeliveryParams
                ? await postDeliveryMethod[postDeliveryMethod](postDeliveryParams)
                : await postDeliveryMethod[postDeliveryMethod]();
        }
    };

    sendEmailBatch = async (whereQuery) => {
        try {
            await sequelize.transaction(async (t) => {
                for (let page = 0; true; page++) {
                    const query = {
                        where: {
                            status: [EMAIL_QUEUE_STATUS.QUEUED.key, EMAIL_QUEUE_STATUS.FAILURE.key],
                            retries: { [Op.lt]: MAX_SEND_RETRY },
                            ...whereQuery,
                        },
                        order: [["urgency", "ASC"]],
                        offset: page * BATCH_EMAIL_LIMIT,
                        limit: BATCH_EMAIL_LIMIT,
                        lock: t.LOCK.UPDATE,
                        transaction: t,
                    };

                    logger.info("Finding queues ", query);

                    const emailQueue = await EmailQueue.findAll(query);

                    if (!emailQueue?.length) {
                        logger.info("emailQueue: nothing to send page", page);
                        return true;
                    } else {
                        logger.info("Found ", emailQueue?.length);
                    }

                    const queuePromises = emailQueue.map((email) => this.handleEmailQueue(email, t));

                    const allSettledRes = await Promise.allSettled(queuePromises);
                    const successfullySend = allSettledRes.filter((it) => it.status === "fulfilled").length;

                    logger.info("finished sending all the emails total ", successfullySend);
                }
            });
        } catch (e) {
            logger.error("sendEmailBatch: exception ", e.message);
        }
    };

    removeSuccessesEmails = async () => {
        try {
            logger.info("removeSuccessesEmails: start");

            await sequelize.transaction(async (t) => {
                await EmailQueue.destroy({
                    where: {
                        status: EMAIL_QUEUE_STATUS.SUCCESS.key,
                        createdAt: {
                            [Op.lte]: Sequelize.literal("now() - 24 * interval '1 hour'"),
                        },
                    },
                    transaction: t,
                });
            });
        } catch (e) {
            logger.error("removeSuccessesEmails: exception ", e.message);
        }
        logger.info("removeSuccessesEmails: done");
        logger.info("-----------------------------");

        setTimeout(this.removeSuccessesEmails, WAIT_TIME_GENERAL);
    };

    sendEmailDBEnqueuedGeneral = async () => {
        logger.info("sendEmailDBEnqueuedGeneral: start");

        try {
            const urgencies = Object.values(EMAIL_URGENCY);
            for (let urgency of urgencies) {
                await this.sendEmailBatch({
                    urgency,
                    status: [EMAIL_QUEUE_STATUS.FAILURE.key],
                });

                await this.sendEmailBatch({
                    urgency,
                    status: [EMAIL_QUEUE_STATUS.QUEUED.key],
                    scheduleAt: null,
                });
            }
        } catch ({ message }) {
            logger.error("sendEmailDBEnqueuedGeneral: exception ", message);
        }

        logger.info("sendEmailDBEnqueuedGeneral: finished");
        setTimeout(this.sendEmailDBEnqueuedGeneral, WAIT_TIME_GENERAL);
    };

    sendEmailDBEnqueuedScheduled = async () => {
        try {
            logger.info("sendEmailDBEnqueuedScheduled: start");
            await this.sendEmailBatch({
                status: [EMAIL_QUEUE_STATUS.QUEUED.key],
                scheduleAt: {
                    [Op.lte]: new Date(),
                },
            });
        } catch ({ message }) {
            logger.info("sendEmailDBEnqueuedScheduled: exception ", message);
        }
        logger.info("sendEmailDBEnqueuedScheduled: finished");

        setTimeout(this.sendEmailDBEnqueuedScheduled, WAIT_SCHEDULE_TIME);
    };

    enqueueEventAboutToStart = () => {
        const now = new Date();
        now.setSeconds(0, 0);

        const res = getAllOccurrencesAboutToStart(now);
    };

    start = async () => {
        this.sendEmailDBEnqueuedGeneral();
        this.sendEmailDBEnqueuedScheduled();
        this.removeSuccessesEmails();
    };
}

module.exports = (emailService) => {
    return new Mailer(emailService);
};

// module.exports.Mailer = Mailer;

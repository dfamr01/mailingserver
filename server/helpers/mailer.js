const sgMail = require("@sendgrid/mail");
const { Op, Sequelize } = require("sequelize");
const logger = require("../config/log4js")("mailer");
const config = require("../config/config");
const sequelize = require("../config/postgre/sequelizeConnection");
const { EMAIL_QUEUE_STATUS, MAX_SEND_RETRY, EMAIL_URGENCY } = require("../shared/config/constants");
const EmailQueue = require("../shared/database/models/emailQueue.model");
const { getPostDeliveryMethodNames } = require("../utils/mailer.utils");
const { getAllOccurrencesAboutToStart } = require("./mailer.helpers");
const { BATCH_EMAIL_LIMIT, WAIT_TIME_GENERAL, WAIT_SCHEDULE_TIME } = require("../utils/mailer.constants");

sgMail.setApiKey(config.sendGrid_api);

function sendMail(mailOptions) {
    logger.info("Sending email");
    return sgMail.send(mailOptions);
}

async function sendEmailDBEnqueuedImplement(whereQuery) {
    logger.info("after whereQuery: ", whereQuery);

    await sequelize.transaction(async (t) => {
        try {
            const options = { transaction: t };

            // eslint-disable-next-line no-constant-condition
            for (let page = 0; true; page++) {
                // do mailer stuff.

                const query = {
                    where: {
                        // status: [EMAIL_QUEUE_STATUS.SUCCESS.key, EMAIL_QUEUE_STATUS.FAILURE.key],
                        status: [EMAIL_QUEUE_STATUS.QUEUED.key, EMAIL_QUEUE_STATUS.FAILURE.key],
                        retries: {
                            [Op.lt]: MAX_SEND_RETRY,
                        },
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
                if (!emailQueue || !emailQueue.length) {
                    logger.info("emailQueue: nothing to send page", page);
                    return true;
                }

                const queuePromises = emailQueue.map(async (email) => {
                    const { id, mailerParams, postDeliveryMethod, postDeliveryParams } = email;

                    logger.info("trying to send mail id: ", id);

                    try {
                        logger.info("trying to send mail: ");
                        console.log("trying to send mail: ");
                        if (mailerParams) {
                            await sendMail(mailerParams);
                            logger.info("Sent mail successfully");
                        } else {
                            logger.error("no mailerParams", email);
                        }

                        email.status = EMAIL_QUEUE_STATUS.SUCCESS.key;
                        await email.save(options);
                    } catch (e) {
                        logger.info("Error sending mail: ", (e && e.response && e.response.body) || e);
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
                });

                const allSettledRes = await Promise.allSettled(queuePromises);
                const successfullySend = allSettledRes.filter((it) => it.status === "fulfilled").length;

                logger.info("finished sending all the emails total ", successfullySend);
            } //for
        } catch (e) {
            logger.error("sendEmailDBEnqueuedImplement: exception ", e.message);
        }
    });

    logger.info("sendEmailDBEnqueuedImplement: done");
    logger.info("-----------------------------");
}

// cleanup
async function removeSuccessesEmails() {
    try {
        logger.info("removeSuccessesEmails: start");

        await sequelize.transaction(async (t) => {
            // delete all successful mails in the past 24h
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

    setTimeout(removeSuccessesEmails, WAIT_TIME_GENERAL);
}

// send all the emails that are not scheduled
async function sendEmailDBEnqueuedGeneral() {
    logger.info("sendEmailDBEnqueuedGeneral: start");

    try {
        const urgencies = Object.values(EMAIL_URGENCY);
        for (let urgency of urgencies) {
            // send all the failed emails
            await sendEmailDBEnqueuedImplement({
                urgency,
                status: [EMAIL_QUEUE_STATUS.FAILURE.key],
            });

            // send all the enqueued none schedule
            await sendEmailDBEnqueuedImplement({
                urgency,
                status: [EMAIL_QUEUE_STATUS.QUEUED.key],
                // status: [EMAIL_QUEUE_STATUS.SUCCESS.key],
                scheduleAt: null,
            });
        }
    } catch ({ message }) {
        logger.error("sendEmailDBEnqueuedGeneral: exception ", message);
    }

    logger.info("sendEmailDBEnqueuedGeneral: finished");
    setTimeout(sendEmailDBEnqueuedGeneral, WAIT_TIME_GENERAL);
}

// send all the emails that need to be at specific time
async function sendEmailDBEnqueuedScheduled() {
    try {
        logger.info("sendEmailDBEnqueuedScheduled: start");
        await sendEmailDBEnqueuedImplement({
            status: [EMAIL_QUEUE_STATUS.QUEUED.key],
            scheduleAt: {
                [Op.lte]: new Date(),
            },
        });
    } catch ({ message }) {
        logger.info("sendEmailDBEnqueuedScheduled: exception ", message);
    }
    logger.info("sendEmailDBEnqueuedScheduled: finished");

    setTimeout(sendEmailDBEnqueuedScheduled, WAIT_SCHEDULE_TIME);
}

async function enqueueEventAboutToStart() {
    const now = new Date();
    // now.setMinutes(now.getMinutes() - MINUTES_TO_START_OF_EVENT);
    now.setSeconds(0, 0);

    const res = getAllOccurrencesAboutToStart(now);
}

// async function fun() {
//   const query = {
//     where: {
//       status: [EMAIL_QUEUE_STATUS.QUEUED.key, EMAIL_QUEUE_STATUS.FAILURE.key],
//       // scheduleAt: new Date("2024-03-20 10:51:50.688+00"),
//       metaData: {
//         [Op.contains]: {
//           UserId: 2
//         }
//       }
//     }
//   };
//
//   const emailQueue = await EmailQueue.findAll(query);
//   console.log('emailQueue', emailQueue)
// }

async function sendEmailDBEnqueued() {
    sendEmailDBEnqueuedGeneral();
    sendEmailDBEnqueuedScheduled();
    removeSuccessesEmails();
}

exports.sendMail = sendMail;
exports.sendEmailDBEnqueued = sendEmailDBEnqueued;

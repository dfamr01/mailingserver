const logger = require("../config/log4js")("mailer.helpers");

const { Occurrence, UserSetting } = require("../shared/database/models");
const { Event } = require("../shared/database/models");
const { EVENT_STATUS } = require("../shared/config/constants");
const EventRegistration = require("../shared/database/models/eventRegistration.model");
const User = require("../shared/database/models/user.model");

/**
 * get all the occurrences that start at the given date
 * @param  {Date} date the occurrence start
 * @return {array}      Array that contain the occurrences
 */
async function getAllOccurrencesAboutToStart(date) {
    try {
        const query = {
            where: {
                status: EVENT_STATUS.PUBLISHED.key,
                isLive: true,
            },
            // include: ['Occurrences']
            include: [
                {
                    model: Occurrence,
                    // where: {date},
                    include: [
                        {
                            model: EventRegistration,
                            include: [
                                {
                                    model: User,
                                    include: [
                                        {
                                            model: UserSetting,
                                            attributes: ["timezone"],
                                        },
                                    ],
                                    attributes: ["id", "email"],
                                },
                            ],
                            attributes: ["id"],
                        },
                    ],
                    where: {
                        date: date,
                        // date: {
                        //   // [Op.eq]: (now)
                        //   [Op.eq]: (now)
                        //   // [Op.eq]: (date3)
                        //   // [Op.eq]: (new Date(date2.toISOString()))
                        //   // [Op.gte]: literal(`now()`)
                        // }            // date: '2024-03-20 10:51:50.688+00'
                        // date: new Date('2024-03-20 10:51:50.688+00')
                    },
                    required: true,
                    attributes: ["id", "date"],
                },
            ],

            // ,include: [
            //   {
            //     model: Occurrence,
            //     required: true,
            //     attributes: ['id', 'date']
            //   }
            // ]
        };
        const res = await Event.findAll(query);
        console.log("res", res);
        // const occs = await Occurrence.findAll(query);
        return res;
    } catch ({ message }) {
        logger.error("getAllOccurrencesAboutToStart: exception occurred ", message);
        return [];
    }
}

exports.getAllOccurrencesAboutToStart = getAllOccurrencesAboutToStart;

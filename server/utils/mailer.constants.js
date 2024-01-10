const ENQUEUE_INTERVAL_TIME = 90 * 1000 //need to be more than a 60 as there is a zeroing of the seconds

// todo: maybe change to a trigger vs an ending loop or a cronjob
const BATCH_EMAIL_LIMIT = 20;
const WAIT_TIME_GENERAL = 5 * 1000 //5sec
const WAIT_SCHEDULE_TIME = 1 * 60 * 1000 //5min

module.exports = {
    ENQUEUE_INTERVAL_TIME,
    BATCH_EMAIL_LIMIT,
    WAIT_TIME_GENERAL,
    WAIT_SCHEDULE_TIME,
}
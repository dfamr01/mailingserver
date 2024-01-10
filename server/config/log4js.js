const log4js = require('log4js');
log4js.configure({
  appenders: {
    console: {type: 'console'},
    dateFile: {type: 'dateFile', filename: 'logs/app.log', pattern: '-yyyy-MM-dd'},
    server: {type: 'file', filename: 'logs/server.log', category: 'server'},
    http: {type: 'file', filename: 'logs/http.log', category: 'http'}
  },
  categories: {
    default: {appenders: ['console'], level: 'all'},
    dateFile: {appenders: ['dateFile'], level: 'error'},
    server: {appenders: ['server'], level: 'error'},
    http: {appenders: ['console'], level: 'error'}
  },
});

module.exports = function (name) {
  let level = '';
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
    level = 'all';
  } else if (process.env.NODE_ENV === 'test') {
    level = 'fatal';
  } else {
    level = 'warn';
  }

  const logger = log4js.getLogger(name);
  logger.level = level;
  return logger;
};

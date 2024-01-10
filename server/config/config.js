const url = require('url');
require('./dotenv')(); // load ENV vars
require('./log4js')(); // config logger

const {
  //general
  PORT,
  APP_NAME,

  // DB
  DB_HOST,
  DB_USER,
  DB_PWD,
  DB_NAME,
  DB_PORT,

  //SendGrid mail
  SENDGRID_API_KEY

} = process.env;

const auth = DB_USER && DB_PWD ?
  `${DB_USER}:${DB_PWD}` :
  '';

const db = url.format({
  protocol: 'postgres',
  slashes: true,
  hostname: DB_HOST,
  port: DB_PORT,
  pathname: DB_NAME,
  auth
});

module.exports = {
  appName: APP_NAME,
  port: PORT || 3000,
  db,
  logger: {
    formatHttp: ':method :url :status :content-length',
    nolog: /\.(gif|jpe?g|png|css|woff2?)$/
  },
  sendGrid_api: SENDGRID_API_KEY,
};

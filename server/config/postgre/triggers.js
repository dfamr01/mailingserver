const sequelizeConnection = require('./sequelizeConnection'); // create a posgre instance and connect to DB.
/*
sequelizeConnection.query(
  'CREATE OR REPLACE FUNCTION notify_lottery_end() ' +
  'RETURNS trigger AS $$' +
  'BEGIN ' +
  ' IF NEW.status = \'close\' THEN ' +
  '   PERFORM pg_notify(\'lottery_end\', TG_TABLE_NAME || \',id,\' || NEW.id );' +
  ' END IF;' +
  ' RETURN new;' +
  'END;' +
  '$$ LANGUAGE plpgsql;' +
  'DROP TRIGGER IF EXISTS "lottery_end" ON "Lotteries";' +
  'CREATE TRIGGER "lottery_end" AFTER UPDATE ON "Lotteries" FOR EACH ROW EXECUTE PROCEDURE notify_lottery_end();'
);
*/

const { Pool, types } = require('pg');

// A ledger's month is a calendar day (DATE). Read as a JavaScript Date it became a timestamp at
// local midnight, which is the previous day in UTC on any server east of Greenwich - and so the
// previous MONTH once it is turned back into a date. Kept as the text Postgres sends: YYYY-MM-DD.
types.setTypeParser(1082, (v) => v);
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'rbac_user',
  password: process.env.DB_PASSWORD || 'rbac_password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'percentage_calc',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;

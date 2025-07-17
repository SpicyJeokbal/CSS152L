/* const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.zpmpocivwucsjuzkgmky',
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  database: 'postgres',
  password: 'QaZWsX2904',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool; */


const { Pool } = require('pg');

const pool = new Pool({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432, //5432
  database: "postgres",
  user: "postgres.heceotsazrqtejxmbsux",
  pool_mode: "session",
  password: "9QOc3onAnN!",
  ssl: {
    rejectUnauthorized: false  // required by Supabase
  }
});

module.exports = pool





/* postgresql://postgres.zouskdlpzpyqlpzumqyn:[PoLsD2904]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres */

/* postgresql://postgres.zpmpocivwucsjuzkgmky:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres */


/* const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'db.zpmpocivwucsjuzkgmky.supabase.co',
  database: 'postgres',
  password: 'QaZWsX2904',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool; */
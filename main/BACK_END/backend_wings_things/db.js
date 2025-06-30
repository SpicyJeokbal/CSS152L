const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.zpmpocivwucsjuzkgmky',
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  database: 'postgres',
  password: 'password',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

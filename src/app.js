const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({
      ok: true,
      service: 'grs-routr-backend',
      db: 'up',
      now: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get('/tenants', async (_req, res) => {
  const result = await pool.query(
    'SELECT id, name, code, is_active, created_at FROM tenants ORDER BY id'
  );
  res.json(result.rows);
});

app.get('/domains', async (_req, res) => {
  const result = await pool.query(`
    SELECT d.id, d.domain_uri, d.description, d.is_active, t.name AS tenant_name
    FROM domains d
    JOIN tenants t ON t.id = d.tenant_id
    ORDER BY d.id
  `);
  res.json(result.rows);
});

app.get('/sip-users', async (_req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.username, u.auth_username, u.display_name, u.extension,
           u.is_active, d.domain_uri, t.name AS tenant_name
    FROM sip_users u
    JOIN domains d ON d.id = u.domain_id
    JOIN tenants t ON t.id = u.tenant_id
    ORDER BY u.id
  `);
  res.json(result.rows);
});

const port = Number(process.env.PORT || 3010);
app.listen(port, '0.0.0.0', () => {
console.log('grs-routr-backend listening on ' + port);
});

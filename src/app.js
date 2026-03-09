const express = require('express');
const cors = require('cors');
const pool = require('./db');

const tenantsRoutes = require('./routes/tenants.routes');
const domainsRoutes = require('./routes/domains.routes');
const usersRoutes = require('./routes/users.routes');
const peersRoutes = require('./routes/peers.routes');
const dialRoutesRoutes = require('./routes/dial-routes.routes');
const syncRoutes = require('./routes/sync.routes');
const routrDomainsRoutes = require('./routes/routr-domains.routes');
const routrCredentialsRoutes = require('./routes/routr-credentials.routes');
const routrAgentsRoutes = require('./routes/routr-agents.routes');

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

app.use('/tenants', tenantsRoutes);
app.use('/domains', domainsRoutes);
app.use('/sip-users', usersRoutes);
app.use('/peers', peersRoutes);
app.use('/dial-routes', dialRoutesRoutes);
app.use('/sync', syncRoutes);
app.use('/routr/domains', routrDomainsRoutes);
app.use('/routr/credentials', routrCredentialsRoutes);
app.use('/routr/agents', routrAgentsRoutes);

const port = Number(process.env.PORT || 3010);
app.listen(port, '0.0.0.0', () => {
  console.log('grs-routr-backend listening on ' + port);
});
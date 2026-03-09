const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.tenant_id, u.domain_id, u.username, u.auth_username,
             u.display_name, u.extension, u.is_active, u.created_at,
             d.domain_uri, t.name AS tenant_name
      FROM sip_users u
      JOIN domains d ON d.id = u.domain_id
      JOIN tenants t ON t.id = u.tenant_id
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      tenant_id,
      domain_id,
      username,
      auth_username,
      secret,
      display_name = null,
      extension = null,
      is_active = true,
    } = req.body;

    if (!tenant_id || !domain_id || !username || !auth_username || !secret) {
      return res.status(400).json({
        ok: false,
        error: 'tenant_id, domain_id, username, auth_username y secret son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO sip_users
       (tenant_id, domain_id, username, auth_username, secret, display_name, extension, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, domain_id, username, auth_username, display_name, extension, is_active, created_at`,
      [tenant_id, domain_id, username, auth_username, secret, display_name, extension, is_active]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

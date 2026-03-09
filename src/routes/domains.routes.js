const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.domain_uri, d.description, d.is_active, d.created_at,
             d.tenant_id, t.name AS tenant_name
      FROM domains d
      JOIN tenants t ON t.id = d.tenant_id
      ORDER BY d.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant_id, domain_uri, description = null, is_active = true } = req.body;

    if (!tenant_id || !domain_uri) {
      return res.status(400).json({
        ok: false,
        error: 'tenant_id y domain_uri son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO domains (tenant_id, domain_uri, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, domain_uri, description, is_active, created_at`,
      [tenant_id, domain_uri, description, is_active]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

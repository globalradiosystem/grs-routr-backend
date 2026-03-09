const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tenant_id, name, contact_addr, transport, username, is_active, created_at
       FROM peers
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      tenant_id = null,
      name,
      contact_addr,
      transport = 'udp',
      username = null,
      secret = null,
      is_active = true,
    } = req.body;

    if (!name || !contact_addr) {
      return res.status(400).json({
        ok: false,
        error: 'name y contact_addr son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO peers
       (tenant_id, name, contact_addr, transport, username, secret, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, name, contact_addr, transport, username, is_active, created_at`,
      [tenant_id, name, contact_addr, transport, username, secret, is_active]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
 
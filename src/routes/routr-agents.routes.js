const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ref, name, username, domain_ref, credentials_ref,
              privacy, enabled, created_at
       FROM routr_agents
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
      ref,
      name,
      username,
      domain_ref,
      credentials_ref,
      privacy = 'None',
      enabled = true,
    } = req.body;

    if (!ref || !name || !username || !domain_ref || !credentials_ref) {
      return res.status(400).json({
        ok: false,
        error: 'ref, name, username, domain_ref y credentials_ref son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO routr_agents
       (ref, name, username, domain_ref, credentials_ref, privacy, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, ref, name, username, domain_ref, credentials_ref, privacy, enabled, created_at`,
      [ref, name, username, domain_ref, credentials_ref, privacy, enabled]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
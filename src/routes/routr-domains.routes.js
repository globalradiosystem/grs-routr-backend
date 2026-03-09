const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ref, name, domain_uri, is_active, created_at
       FROM routr_domains
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ref, name, domain_uri, is_active = true } = req.body;

    if (!ref || !name || !domain_uri) {
      return res.status(400).json({
        ok: false,
        error: 'ref, name y domain_uri son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO routr_domains (ref, name, domain_uri, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, ref, name, domain_uri, is_active, created_at`,
      [ref, name, domain_uri, is_active]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
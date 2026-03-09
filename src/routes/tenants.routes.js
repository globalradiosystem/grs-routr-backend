const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, code, is_active, created_at FROM tenants ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, code, is_active = true } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        ok: false,
        error: 'name y code son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO tenants (name, code, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, name, code, is_active, created_at`,
      [name, code, is_active]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
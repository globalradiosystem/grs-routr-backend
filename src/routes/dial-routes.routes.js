const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tenant_id, name, pattern, target_type, target_value,
              priority, is_active, created_at
       FROM dial_routes
       ORDER BY priority ASC, id ASC`
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
      pattern,
      target_type,
      target_value,
      priority = 100,
      is_active = true,
    } = req.body;

    if (!name || !pattern || !target_type || !target_value) {
      return res.status(400).json({
        ok: false,
        error: 'name, pattern, target_type y target_value son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO dial_routes
       (tenant_id, name, pattern, target_type, target_value, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, name, pattern, target_type, target_value, priority, is_active, created_at`,
      [tenant_id, name, pattern, target_type, target_value, priority, is_active]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
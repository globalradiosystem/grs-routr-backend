const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, domain_ref, rule, number_ref, priority, created_at
       FROM routr_domain_egress_policies
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
      domain_ref,
      rule,
      number_ref,
      priority = 100,
    } = req.body;

    if (!domain_ref || !rule || !number_ref) {
      return res.status(400).json({
        ok: false,
        error: 'domain_ref, rule y number_ref son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO routr_domain_egress_policies
       (domain_ref, rule, number_ref, priority)
       VALUES ($1,$2,$3,$4)
       RETURNING id, domain_ref, rule, number_ref, priority, created_at`,
      [domain_ref, rule, number_ref, priority]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
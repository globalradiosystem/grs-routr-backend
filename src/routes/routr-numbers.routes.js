const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ref, name, trunk_ref, tel_url, aor_link,
              session_affinity_header, extra_headers, enabled, created_at
       FROM routr_numbers
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
      trunk_ref,
      tel_url,
      aor_link,
      session_affinity_header = null,
      extra_headers = null,
      enabled = true,
    } = req.body;

    if (!ref || !name || !trunk_ref || !tel_url || !aor_link) {
      return res.status(400).json({
        ok: false,
        error: 'ref, name, trunk_ref, tel_url y aor_link son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO routr_numbers
       (ref, name, trunk_ref, tel_url, aor_link, session_affinity_header, extra_headers, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, ref, name, trunk_ref, tel_url, aor_link,
                 session_affinity_header, extra_headers, enabled, created_at`,
      [ref, name, trunk_ref, tel_url, aor_link, session_affinity_header, extra_headers, enabled]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
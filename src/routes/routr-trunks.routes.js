const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ref, name, inbound_uri, send_register, credentials_ref,
              outbound_host, outbound_port, outbound_transport, outbound_user,
              enabled, created_at
       FROM routr_trunks
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
      inbound_uri,
      send_register = false,
      credentials_ref = null,
      outbound_host = null,
      outbound_port = null,
      outbound_transport = 'udp',
      outbound_user = null,
      enabled = true,
    } = req.body;

    if (!ref || !name || !inbound_uri) {
      return res.status(400).json({
        ok: false,
        error: 'ref, name e inbound_uri son obligatorios',
      });
    }

    const result = await pool.query(
      `INSERT INTO routr_trunks
       (ref, name, inbound_uri, send_register, credentials_ref, outbound_host,
        outbound_port, outbound_transport, outbound_user, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, ref, name, inbound_uri, send_register, credentials_ref,
                 outbound_host, outbound_port, outbound_transport, outbound_user,
                 enabled, created_at`,
      [
        ref,
        name,
        inbound_uri,
        send_register,
        credentials_ref,
        outbound_host,
        outbound_port,
        outbound_transport,
        outbound_user,
        enabled,
      ]
    );

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
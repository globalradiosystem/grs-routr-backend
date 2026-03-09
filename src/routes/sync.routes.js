const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../db');

const router = express.Router();

function q(value) {
  return JSON.stringify(value ?? '');
}

router.post('/routr-legacy', async (_req, res) => {
  try {
    const configPath = process.env.ROUTR_CONFIG_PATH || '/routr-config';

    const domainsResult = await pool.query(`
      SELECT id, domain_uri
      FROM domains
      WHERE is_active = true
      ORDER BY id
    `);

    const usersResult = await pool.query(`
      SELECT u.id, u.username, u.auth_username, u.secret, u.display_name, u.extension,
             d.domain_uri
      FROM sip_users u
      JOIN domains d ON d.id = u.domain_id
      WHERE u.is_active = true
      ORDER BY u.id
    `);

    const peersResult = await pool.query(`
      SELECT id, name, contact_addr, username, secret
      FROM peers
      WHERE is_active = true
      ORDER BY id
    `);

    const routesResult = await pool.query(`
      SELECT id, name, pattern, target_type, target_value, priority
      FROM dial_routes
      WHERE is_active = true
      ORDER BY priority ASC, id ASC
    `);

    const domainsYaml = domainsResult.rows
      .map((d) => `- apiVersion: v1beta1
  kind: Domain
  metadata:
    name: ${q(`Domain ${d.domain_uri}`)}
  spec:
    context:
      domainUri: ${q(d.domain_uri)}`)
      .join('\n');

    const agentsYaml = usersResult.rows
      .map((u) => `- apiVersion: v1beta1
  kind: Agent
  metadata:
    name: ${q(`user${u.username}`)}
  spec:
    username: ${q(u.username)}
    domain: ${q(u.domain_uri)}
    credentials:
      username: ${q(u.auth_username)}
      secret: ${q(u.secret)}`)
      .join('\n');

    const peersYaml = peersResult.rows
      .map((p) => {
        const creds = p.username && p.secret
          ? `
    credentials:
      username: ${q(p.username)}
      secret: ${q(p.secret)}`
          : '';

        return `- apiVersion: v1beta1
  kind: Peer
  metadata:
    name: ${q(p.name)}
  spec:
    contactAddr: ${q(p.contact_addr)}${creds}`;
      })
      .join('\n');

    const numbersYaml = routesResult.rows
      .filter((r) => r.target_type === 'peer')
      .map((r) => {
        const escapedPattern = String(r.pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `- apiVersion: v1beta1
  kind: Number
  metadata:
    name: ${q(r.name)}
  spec:
    location:
      peer: ${q(r.target_value)}
    ingressPolicy:
      rule: ".*"
    egressPolicy:
      rule: ${q(`^${escapedPattern}$`)}`;
      })
      .join('\n');

    await fs.writeFile(path.join(configPath, 'domains.yml'), (domainsYaml ? domainsYaml + '\n' : '[]\n'));
    await fs.writeFile(path.join(configPath, 'agents.yml'), (agentsYaml ? agentsYaml + '\n' : '[]\n'));
    await fs.writeFile(path.join(configPath, 'peers.yml'), (peersYaml ? peersYaml + '\n' : '[]\n'));
    await fs.writeFile(path.join(configPath, 'numbers.yml'), (numbersYaml ? numbersYaml + '\n' : '[]\n'));

    res.json({
      ok: true,
      written: {
        domains: domainsResult.rows.length,
        agents: usersResult.rows.length,
        peers: peersResult.rows.length,
        routes: routesResult.rows.length,
      },
      path: configPath,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
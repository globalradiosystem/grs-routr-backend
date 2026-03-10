const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const pool = require('../db');

const router = express.Router();

function q(value) {
  return JSON.stringify(value ?? '');
}

router.post('/modern-files', async (_req, res) => {
  try {
    const configPath = process.env.ROUTR_MODERN_CONFIG_PATH || '/routr-modern-config';

    const domainsResult = await pool.query(`
      SELECT ref, name, domain_uri
      FROM routr_domains
      WHERE is_active = true
      ORDER BY id
    `);

    const credentialsResult = await pool.query(`
      SELECT ref, name, username, secret
      FROM routr_credentials
      WHERE is_active = true
      ORDER BY id
    `);

    const agentsResult = await pool.query(`
      SELECT ref, name, username, domain_ref, credentials_ref, privacy, enabled
      FROM routr_agents
      WHERE enabled = true
      ORDER BY id
    `);

    const trunksResult = await pool.query(`
      SELECT ref, name, inbound_uri, send_register, credentials_ref,
             outbound_host, outbound_port, outbound_transport, outbound_user, enabled
      FROM routr_trunks
      WHERE enabled = true
      ORDER BY id
    `);

    const numbersResult = await pool.query(`
      SELECT ref, name, trunk_ref, tel_url, aor_link,
             session_affinity_header, extra_headers, enabled
      FROM routr_numbers
      WHERE enabled = true
      ORDER BY id
    `);

    const policiesResult = await pool.query(`
      SELECT domain_ref, rule, number_ref, priority
      FROM routr_domain_egress_policies
      ORDER BY domain_ref, priority, id
    `);

    const policyMap = new Map();
    for (const row of policiesResult.rows) {
      if (!policyMap.has(row.domain_ref)) policyMap.set(row.domain_ref, []);
      policyMap.get(row.domain_ref).push(row);
    }

    const domainsYaml = domainsResult.rows
      .map((d) => {
        const policies = policyMap.get(d.ref) || [];
        const egressPolicies = policies.length
          ? `
      egressPolicies:
${policies
  .map(
    (p) => `        - rule: ${q(p.rule)}
          numberRef: ${q(p.number_ref)}`
  )
  .join('\n')}`
          : '';

        return `- apiVersion: v2beta1
  kind: Domain
  ref: ${q(d.ref)}
  metadata:
    name: ${q(d.name)}
  spec:
    context:
      domainUri: ${q(d.domain_uri)}${egressPolicies}`;
      })
      .join('\n');

    const credentialsYaml = credentialsResult.rows
  .map(
    (c) => `- apiVersion: v2beta1
  kind: Credentials
  ref: ${q(c.ref)}
  metadata:
    name: ${q(c.name)}
  spec:
    credentials:
      username: ${q(c.username)}
      password: ${q(c.secret)}`
  )
  .join('\n');

    const agentsYaml = agentsResult.rows
      .map(
        (a) => `- apiVersion: v2beta1
  kind: Agent
  ref: ${q(a.ref)}
  metadata:
    name: ${q(a.name)}
  spec:
    username: ${q(a.username)}
    domainRef: ${q(a.domain_ref)}
    credentialsRef: ${q(a.credentials_ref)}
    privacy: ${q(a.privacy || 'None')}`
      )
      .join('\n');

    const trunksYaml = trunksResult.rows
      .map((t) => {
        const credentialsRef = t.credentials_ref
          ? `\n    credentialsRef: ${q(t.credentials_ref)}`
          : '';

        const outboundUris =
          t.outbound_host && t.outbound_port
            ? `
      uris:
        - uri:
            user: ${q(t.outbound_user || '')}
            host: ${q(t.outbound_host)}
            port: ${t.outbound_port}
            transport: ${q(t.outbound_transport || 'udp')}
          enabled: true`
            : `
      uris: []`;

        return `- apiVersion: v2beta1
  kind: Trunk
  ref: ${q(t.ref)}
  metadata:
    name: ${q(t.name)}
  spec:
    inbound:
      uri: ${q(t.inbound_uri)}
    outbound:
      sendRegister: ${t.send_register ? 'true' : 'false'}${credentialsRef}${outboundUris}`;
      })
      .join('\n');

    const numbersYaml = numbersResult.rows
      .map((n) => {
        const affinity = n.session_affinity_header
          ? `\n      sessionAffinityHeader: ${q(n.session_affinity_header)}`
          : '';

        const extraHeaders = n.extra_headers
          ? `\n      extraHeaders: ${q(n.extra_headers)}`
          : '';

        return `- apiVersion: v2beta1
  kind: Number
  ref: ${q(n.ref)}
  metadata:
    name: ${q(n.name)}
  spec:
    trunkRef: ${q(n.trunk_ref)}
    location:
      telUrl: ${q(n.tel_url)}
      aorLink: ${q(n.aor_link)}${affinity}${extraHeaders}`;
      })
      .join('\n');

    await fs.mkdir(configPath, { recursive: true });

    await fs.writeFile(
      path.join(configPath, 'domains.yaml'),
      domainsYaml ? domainsYaml + '\n' : '[]\n'
    );
    await fs.writeFile(
      path.join(configPath, 'credentials.yaml'),
      credentialsYaml ? credentialsYaml + '\n' : '[]\n'
    );
    await fs.writeFile(
      path.join(configPath, 'agents.yaml'),
      agentsYaml ? agentsYaml + '\n' : '[]\n'
    );
    await fs.writeFile(
      path.join(configPath, 'trunks.yaml'),
      trunksYaml ? trunksYaml + '\n' : '[]\n'
    );
    await fs.writeFile(
      path.join(configPath, 'numbers.yaml'),
      numbersYaml ? numbersYaml + '\n' : '[]\n'
    );

    res.json({
      ok: true,
      path: configPath,
      written: {
        domains: domainsResult.rows.length,
        credentials: credentialsResult.rows.length,
        agents: agentsResult.rows.length,
        trunks: trunksResult.rows.length,
        numbers: numbersResult.rows.length,
        policies: policiesResult.rows.length,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
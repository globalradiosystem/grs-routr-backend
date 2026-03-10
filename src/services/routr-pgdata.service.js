const pool = require('../db');
const {
  buildDomain,
  buildCredentials,
  buildAgent,
  buildTrunk,
  buildNumber,
} = require('../utils/routr-resource-builders');

async function exportModelFromDatabase() {
  const domainsResult = await pool.query(`
    SELECT id, ref, name, domain_uri, is_active, created_at
    FROM routr_domains
    WHERE is_active = true
    ORDER BY id
  `);

  const credentialsResult = await pool.query(`
    SELECT id, ref, name, username, secret, is_active, created_at
    FROM routr_credentials
    WHERE is_active = true
    ORDER BY id
  `);

  const agentsResult = await pool.query(`
    SELECT id, ref, name, username, domain_ref, credentials_ref, privacy, enabled, created_at
    FROM routr_agents
    WHERE enabled = true
    ORDER BY id
  `);

  const trunksResult = await pool.query(`
    SELECT id, ref, name, inbound_uri, send_register, credentials_ref,
           outbound_host, outbound_port, outbound_transport, outbound_user,
           enabled, created_at
    FROM routr_trunks
    WHERE enabled = true
    ORDER BY id
  `);

  const numbersResult = await pool.query(`
    SELECT id, ref, name, trunk_ref, tel_url, aor_link,
           session_affinity_header, extra_headers, enabled, created_at
    FROM routr_numbers
    WHERE enabled = true
    ORDER BY id
  `);

  const policiesResult = await pool.query(`
    SELECT id, domain_ref, rule, number_ref, priority, created_at
    FROM routr_domain_egress_policies
    ORDER BY domain_ref, priority, id
  `);

  const policyMap = new Map();

  for (const policy of policiesResult.rows) {
    if (!policyMap.has(policy.domain_ref)) {
      policyMap.set(policy.domain_ref, []);
    }
    policyMap.get(policy.domain_ref).push(policy);
  }

  const domains = domainsResult.rows.map((domain) =>
    buildDomain(domain, policyMap.get(domain.ref) || [])
  );

  const credentials = credentialsResult.rows.map(buildCredentials);
  const agents = agentsResult.rows.map(buildAgent);
  const trunks = trunksResult.rows.map(buildTrunk);
  const numbers = numbersResult.rows.map(buildNumber);

  return {
    summary: {
      domains: domains.length,
      credentials: credentials.length,
      agents: agents.length,
      trunks: trunks.length,
      numbers: numbers.length,
      policies: policiesResult.rows.length,
    },
    resources: {
      domains,
      credentials,
      agents,
      trunks,
      numbers,
    },
  };
}

module.exports = {
  exportModelFromDatabase,
};
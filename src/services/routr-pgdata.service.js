const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const pool = require('../db');
const {
  buildDomain,
  buildCredentials,
  buildAgent,
  buildTrunk,
  buildNumber,
} = require('../utils/routr-resource-builders');

const PROTO_DIR = process.env.ROUTR_PROTOS_PATH || '/opt/grs-routr/protos';
const PGDATA_TARGET = process.env.ROUTR_PGDATA_TARGET || 'grs-routr-pgdata:51907';

function loadProto(filename) {
  const packageDefinition = protoLoader.loadSync(path.join(PROTO_DIR, filename), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  });
  return grpc.loadPackageDefinition(packageDefinition);
}

function promisifyClient(client, method, payload) {
  return new Promise((resolve, reject) => {
    client[method](payload, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

function getDomainsClient() {
  const proto = loadProto('domains.proto');
  return new proto.fonoster.routr.connect.domains.v2beta1.Domains(
    PGDATA_TARGET,
    grpc.credentials.createInsecure()
  );
}

function getCredentialsClient() {
  const proto = loadProto('credentials.proto');
  return new proto.fonoster.routr.connect.credentials.v2beta1.CredentialsService(
    PGDATA_TARGET,
    grpc.credentials.createInsecure()
  );
}

function getAgentsClient() {
  const proto = loadProto('agents.proto');
  return new proto.fonoster.routr.connect.agents.v2beta1.Agents(
    PGDATA_TARGET,
    grpc.credentials.createInsecure()
  );
}

function getTrunksClient() {
  const proto = loadProto('trunks.proto');
  return new proto.fonoster.routr.connect.trunks.v2beta1.Trunks(
    PGDATA_TARGET,
    grpc.credentials.createInsecure()
  );
}

function getNumbersClient() {
  const proto = loadProto('numbers.proto');
  return new proto.fonoster.routr.connect.numbers.v2beta1.Numbers(
    PGDATA_TARGET,
    grpc.credentials.createInsecure()
  );
}

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

async function listExistingRefs() {
  const domainsClient = getDomainsClient();
  const credentialsClient = getCredentialsClient();
  const agentsClient = getAgentsClient();
  const trunksClient = getTrunksClient();
  const numbersClient = getNumbersClient();

  const [domains, credentials, agents, trunks, numbers] = await Promise.all([
    promisifyClient(domainsClient, 'List', { page_size: 500, page_token: '' }),
    promisifyClient(credentialsClient, 'List', { page_size: 500, page_token: '' }),
    promisifyClient(agentsClient, 'List', { page_size: 500, page_token: '' }),
    promisifyClient(trunksClient, 'List', { page_size: 500, page_token: '' }),
    promisifyClient(numbersClient, 'List', { page_size: 500, page_token: '' }),
  ]);

  return {
    domains: domains.items || [],
    credentials: credentials.items || [],
    agents: agents.items || [],
    trunks: trunks.items || [],
    numbers: numbers.items || [],
  };
}

async function pushModelFromDatabase() {
  const existing = await listExistingRefs();

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
    SELECT ref, name, inbound_uri, send_register, outbound_host, outbound_port,
           outbound_transport, outbound_user, credentials_ref
    FROM routr_trunks
    WHERE enabled = true
    ORDER BY id
  `);

  const numbersResult = await pool.query(`
    SELECT ref, name, tel_url, aor_link, trunk_ref, session_affinity_header
    FROM routr_numbers
    WHERE enabled = true
    ORDER BY id
  `);

  const policiesResult = await pool.query(`
    SELECT domain_ref, rule, number_ref, priority
    FROM routr_domain_egress_policies
    ORDER BY domain_ref, priority, id
  `);

  const domainRefMap = new Map(existing.domains.map((d) => [d.name, d.ref]));
  const credRefMap = new Map(existing.credentials.map((c) => [c.name, c.ref]));
  const agentRefMap = new Map(existing.agents.map((a) => [a.name, a.ref]));
  const trunkRefMap = new Map(existing.trunks.map((t) => [t.name, t.ref]));
  const numberRefMap = new Map(existing.numbers.map((n) => [n.name, n.ref]));

  const domainsClient = getDomainsClient();
  const credentialsClient = getCredentialsClient();
  const agentsClient = getAgentsClient();
  const trunksClient = getTrunksClient();
  const numbersClient = getNumbersClient();

  const created = {
    domains: [],
    credentials: [],
    agents: [],
    trunks: [],
    numbers: [],
    updated_domains: [],
  };

  for (const row of domainsResult.rows) {
    if (domainRefMap.has(row.name)) continue;
    const res = await promisifyClient(domainsClient, 'Create', {
      name: row.name,
      domain_uri: row.domain_uri,
    });
    domainRefMap.set(row.name, res.ref);
    created.domains.push(res);
  }

  for (const row of credentialsResult.rows) {
    if (credRefMap.has(row.name)) continue;
    const res = await promisifyClient(credentialsClient, 'Create', {
      name: row.name,
      username: row.username,
      password: row.secret,
    });
    credRefMap.set(row.name, res.ref);
    created.credentials.push(res);
  }

  for (const row of agentsResult.rows) {
    if (agentRefMap.has(row.name)) continue;

    const domain = domainsResult.rows.find((d) => d.ref === row.domain_ref);
    const cred = credentialsResult.rows.find((c) => c.ref === row.credentials_ref);
    if (!domain || !cred) continue;

    const res = await promisifyClient(agentsClient, 'Create', {
      name: row.name,
      username: row.username,
      privacy: (row.privacy || 'NONE').toUpperCase(),
      enabled: true,
      domain_ref: domainRefMap.get(domain.name),
      credentials_ref: credRefMap.get(cred.name),
      max_contacts: 1,
      expires: 3600,
    });
    agentRefMap.set(row.name, res.ref);
    created.agents.push(res);
  }

  for (const row of trunksResult.rows) {
    if (trunkRefMap.has(row.name)) continue;

    const res = await promisifyClient(trunksClient, 'Create', {
      api_version: 'v2',
      name: row.name,
      send_register: !!row.send_register,
      inbound_uri: row.inbound_uri,
      uris: [
        {
          host: row.outbound_host,
          port: row.outbound_port,
          transport: (row.outbound_transport || 'UDP').toUpperCase(),
          user: row.outbound_user || '',
          weight: 1,
          priority: 1,
          enabled: true,
        },
      ],
    });

    trunkRefMap.set(row.name, res.ref);
    created.trunks.push(res);
  }

  for (const row of numbersResult.rows) {
    if (numberRefMap.has(row.name)) continue;

    const trunk = trunksResult.rows.find((t) => t.ref === row.trunk_ref);
    if (!trunk) continue;

    const res = await promisifyClient(numbersClient, 'Create', {
      api_version: 'v2',
      name: row.name,
      tel_url: row.tel_url,
      aor_link: row.aor_link,
      city: 'Santander',
      country: 'Spain',
      country_iso_code: 'ES',
      session_affinity_header: row.session_affinity_header || '',
      trunk_ref: trunkRefMap.get(trunk.name),
    });

    numberRefMap.set(row.name, res.ref);
    created.numbers.push(res);
  }

  for (const row of domainsResult.rows) {
  const policies = policiesResult.rows.filter((p) => p.domain_ref === row.ref);
  if (!policies.length) continue;

  const desiredPolicies = [];
  const seenPolicies = new Set();

  for (const p of policies) {
    const number = numbersResult.rows.find((n) => n.ref === p.number_ref);
    if (!number) continue;

    const mappedNumberRef = numberRefMap.get(number.name);
    if (!mappedNumberRef) continue;

    const key = `${p.rule}::${mappedNumberRef}`;
    if (seenPolicies.has(key)) continue;

    seenPolicies.add(key);
    desiredPolicies.push({
      rule: p.rule,
      number_ref: mappedNumberRef,
    });
  }

  const currentDomain = existing.domains.find((d) => d.name === row.name);
  const currentPolicies = (currentDomain?.egress_policies || [])
    .map((p) => ({
      rule: p.rule,
      number_ref: p.number_ref,
    }));

  const normalize = (arr) =>
    arr
      .map((p) => `${p.rule}::${p.number_ref}`)
      .sort()
      .join('|');

  if (normalize(currentPolicies) === normalize(desiredPolicies)) {
    continue;
  }

  const payload = {
    ref: domainRefMap.get(row.name),
    name: row.name,
    egress_policies: desiredPolicies,
  };

  const res = await promisifyClient(domainsClient, 'Update', payload);
  created.updated_domains.push(res);
}

  return {
    summary: {
      domains_created: created.domains.length,
      credentials_created: created.credentials.length,
      agents_created: created.agents.length,
      trunks_created: created.trunks.length,
      numbers_created: created.numbers.length,
      domains_updated: created.updated_domains.length,
    },
    created,
  };
}

module.exports = {
  exportModelFromDatabase,
  pushModelFromDatabase,
};
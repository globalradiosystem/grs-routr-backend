function buildDomain(domain, policies = []) {
  return {
    apiVersion: 'v2beta1',
    kind: 'Domain',
    ref: domain.ref,
    metadata: {
      name: domain.name,
    },
    spec: {
      context: {
        domainUri: domain.domain_uri,
        egressPolicies: policies.map((p) => ({
          rule: p.rule,
          numberRef: p.number_ref,
        })),
      },
    },
  };
}

function buildCredentials(credentials) {
  return {
    apiVersion: 'v2beta1',
    kind: 'Credentials',
    ref: credentials.ref,
    metadata: {
      name: credentials.name,
    },
    spec: {
      credentials: {
        username: credentials.username,
        password: credentials.secret,
      },
    },
  };
}

function buildAgent(agent) {
  return {
    apiVersion: 'v2beta1',
    kind: 'Agent',
    ref: agent.ref,
    metadata: {
      name: agent.name,
    },
    spec: {
      username: agent.username,
      domainRef: agent.domain_ref,
      credentialsRef: agent.credentials_ref,
      privacy: agent.privacy || 'None',
    },
  };
}

function buildTrunk(trunk) {
  const spec = {
    inbound: {
      uri: trunk.inbound_uri,
    },
    outbound: {
      sendRegister: Boolean(trunk.send_register),
      uris: [],
    },
  };

  if (trunk.credentials_ref) {
    spec.outbound.credentialsRef = trunk.credentials_ref;
  }

  if (trunk.outbound_host && trunk.outbound_port) {
    spec.outbound.uris.push({
      uri: {
        user: trunk.outbound_user || '',
        host: trunk.outbound_host,
        port: trunk.outbound_port,
        transport: trunk.outbound_transport || 'udp',
      },
      enabled: true,
    });
  }

  return {
    apiVersion: 'v2beta1',
    kind: 'Trunk',
    ref: trunk.ref,
    metadata: {
      name: trunk.name,
    },
    spec,
  };
}

function buildNumber(number) {
  const location = {
    telUrl: number.tel_url,
    aorLink: number.aor_link,
  };

  if (number.session_affinity_header) {
    location.sessionAffinityHeader = number.session_affinity_header;
  }

  if (number.extra_headers) {
    location.extraHeaders = number.extra_headers;
  }

  return {
    apiVersion: 'v2beta1',
    kind: 'Number',
    ref: number.ref,
    metadata: {
      name: number.name,
    },
    spec: {
      trunkRef: number.trunk_ref,
      location,
    },
  };
}

module.exports = {
  buildDomain,
  buildCredentials,
  buildAgent,
  buildTrunk,
  buildNumber,
};
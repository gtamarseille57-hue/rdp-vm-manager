const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function safeResolveConfigPath(configPath) {
  if (!configPath) return path.resolve(process.cwd(), 'config/vm-template.yml');
  return path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath);
}

function loadVmDefinitions(filePath) {
  const resolvedPath = safeResolveConfigPath(filePath);

  if (!fs.existsSync(resolvedPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = yaml.load(raw) || { vms: [] };
    const list = Array.isArray(parsed.vms) ? parsed.vms : [];

    return list.map((vm, index) => ({
      id: vm.name ? vm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `vm-${index + 1}`,
      provider: vm.provider || 'azure',
      location: vm.location || 'westeurope',
      sku: vm.sku || 'Standard_D2s_v3',
      image: vm.image || 'Win2022Datacenter',
      adminUser: vm.adminUser || 'adminuser',
      password: vm.password || 'P@ssw0rd!123',
      name: vm.name || `vm-${index + 1}`,
      rdp: {
        enabled: vm.rdp?.enabled !== false,
        port: vm.rdp?.port || 3389,
      },
      tailscale: {
        enabled: Boolean(vm.tailscale?.enabled),
        hostname: vm.tailscale?.hostname || vm.name || `vm-${index + 1}`,
        authKey: vm.tailscale?.authKey || process.env.TAILSCALE_AUTH_KEY || '',
      },
      github: {
        requiredOrg: vm.github?.requiredOrg || '',
        requiredTeam: vm.github?.requiredTeam || '',
      },
      status: 'ready',
      createdAt: new Date().toISOString(),
      connection: {
        host: vm.name ? `${vm.name}.internal` : `vm-${index + 1}.internal`,
        port: vm.rdp?.port || 3389,
      },
    }));
  } catch (error) {
    console.error('Erreur de lecture du fichier YAML :', error.message);
    return [];
  }
}

function createVm(spec = {}) {
  const normalized = {
    id: spec.name ? spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `vm-${Date.now()}`,
    provider: spec.provider || 'azure',
    location: spec.location || 'westeurope',
    sku: spec.sku || 'Standard_D2s_v3',
    image: spec.image || 'Win2022Datacenter',
    adminUser: spec.adminUser || 'adminuser',
    password: spec.password || 'P@ssw0rd!123',
    name: spec.name || `vm-${Date.now()}`,
    rdp: {
      enabled: spec.rdp?.enabled !== false,
      port: spec.rdp?.port || 3389,
    },
    tailscale: {
      enabled: Boolean(spec.tailscale?.enabled),
      hostname: spec.tailscale?.hostname || spec.name || `vm-${Date.now()}`,
      authKey: spec.tailscale?.authKey || process.env.TAILSCALE_AUTH_KEY || '',
    },
    github: {
      requiredOrg: spec.github?.requiredOrg || '',
      requiredTeam: spec.github?.requiredTeam || '',
    },
    status: 'provisioning',
    createdAt: new Date().toISOString(),
    connection: {
      host: spec.name ? `${spec.name}.internal` : `vm-${Date.now()}.internal`,
      port: spec.rdp?.port || 3389,
    },
  };

  if (normalized.provider === 'azure') {
    normalized.providerMessage = 'Demande de création validée pour Azure. Connectez le provisionneur Azure CLI ou un workflow de déploiement réel.';
  } else if (normalized.provider === 'aws') {
    normalized.providerMessage = 'Demande de création validée pour AWS EC2. À connecter à votre pipeline de provisionnement.';
  } else {
    normalized.providerMessage = 'Mode démonstration actif. Cette VM a été créée localement sans provisionnement cloud réel.';
  }

  if (normalized.tailscale.enabled) {
    normalized.tailscale.status = 'pending-join';
  } else {
    normalized.tailscale.status = 'disabled';
  }

  return normalized;
}

module.exports = {
  loadVmDefinitions,
  createVm,
};

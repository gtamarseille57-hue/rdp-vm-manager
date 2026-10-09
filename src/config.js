const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
  tailscaleAuthKey: process.env.TAILSCALE_AUTH_KEY || '',
  tailscaleTailnet: process.env.TAILSCALE_TAILNET || '',
  provider: process.env.PROVIDER || 'azure',
  vmConfigPath: process.env.VM_CONFIG_PATH || './config/vm-template.yml',
};

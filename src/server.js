const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { loadVmDefinitions, createVm } = require('./services/vm-manager');
const config = require('./config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

if (config.githubClientId && config.githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.githubClientId,
        clientSecret: config.githubClientSecret,
        callbackURL: config.githubCallbackUrl,
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName || profile.username,
          avatar: profile.photos?.[0]?.value,
        });
      }
    )
  );
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  if (!config.githubClientId || !config.githubClientSecret) {
    return res.status(401).json({
      error: 'GitHub OAuth n’est pas configuré. Ajoutez GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET dans votre .env.',
    });
  }

  return res.redirect('/');
}

app.get('/', (req, res) => {
  const user = req.user ? req.user.displayName : null;
  const githubReady = Boolean(config.githubClientId && config.githubClientSecret);

  const html = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RDP VM Manager</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: white; }
          .wrap { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #111827; border: 1px solid #334155; border-radius: 16px; padding: 20px; margin: 20px 0; }
          a.button { display: inline-block; margin: 10px 10px 0 0; padding: 10px 16px; border-radius: 10px; text-decoration: none; color: white; background: #2563eb; }
          code { background: #0b1220; padding: 2px 6px; border-radius: 6px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
          .stat { padding: 18px; border: 1px solid #374151; border-radius: 12px; background: #1f2937; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>RDP VM Manager</h1>
          <div class="card">
            <p>Créer des PC virtuels RDP depuis un fichier YAML, avec un accès GitHub et une connexion Tailscale.</p>
            ${user ? `<p>Connecté en tant que <strong>${user}</strong></p>` : ''}
            ${githubReady ? `<a class="button" href="/auth/github">Se connecter avec GitHub</a>` : '<p><code>GitHub OAuth non configuré</code>. Ajoutez GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET.</p>'}
            <a class="button" href="/api/vms">Liste des VMs</a>
            <a class="button" href="/dashboard">Dashboard</a>
          </div>

          <div class="grid">
            <div class="stat">
              <h3>YAML</h3>
              <p>Les machines sont définies dans <code>config/vm-template.yml</code>.</p>
            </div>
            <div class="stat">
              <h3>GitHub</h3>
              <p>Le service supporte l’authentification OAuth avec GitHub.</p>
            </div>
            <div class="stat">
              <h3>Tailscale</h3>
              <p>Les VMs peuvent rejoindre un tailnet privé avec un auth key.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  res.send(html);
});

app.get('/auth/github', (req, res, next) => {
  if (!config.githubClientId || !config.githubClientSecret) {
    return res.status(400).send('GitHub OAuth non configuré.');
  }
  return passport.authenticate('github', { scope: ['read:user', 'user:email'] })(req, res, next);
});

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', async (req, res) => {
  const machines = loadVmDefinitions(config.vmConfigPath);
  const html = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dashboard - RDP VM Manager</title>
        <style>
          body { font-family: Arial, sans-serif; background: #020817; color: white; margin: 0; padding: 20px; }
          .container { max-width: 1100px; margin: 0 auto; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #334155; padding: 12px; text-align: left; }
          th { background: #0f172a; }
          tr:nth-child(even) { background: #111827; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 10px 14px; text-decoration: none; border-radius: 8px; margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Dashboard - RDP VM Manager</h1>
          <a class="button" href="/">Accueil</a>
          <a class="button" href="/api/vms">JSON</a>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Provider</th>
                <th>RDP</th>
                <th>Tailscale</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${machines.length === 0 ? '<tr><td colspan="5">Aucune VM dans le fichier YAML.</td></tr>' : machines.map((vm) => `
                <tr>
                  <td>${vm.name}</td>
                  <td>${vm.provider}</td>
                  <td>${vm.rdp.enabled ? `${vm.rdp.port}` : 'désactivé'}</td>
                  <td>${vm.tailscale.enabled ? vm.tailscale.hostname : 'désactivé'}</td>
                  <td>${vm.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  res.send(html);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rdp-vm-manager',
    provider: config.provider,
    githubConfigured: Boolean(config.githubClientId && config.githubClientSecret),
    tailscaleConfigured: Boolean(config.tailscaleAuthKey || config.tailscaleTailnet),
  });
});

app.get('/api/vms', (req, res) => {
  const machines = loadVmDefinitions(config.vmConfigPath);
  res.json({ count: machines.length, machines });
});

app.post('/api/vms/create', (req, res) => {
  try {
    const vm = createVm(req.body || {});
    res.status(201).json({
      ok: true,
      message: 'VM préparée pour provisioning',
      vm,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
});

app.listen(config.port, () => {
  console.log(`RDP VM Manager lancé sur http://localhost:${config.port}`);
  console.log(`Fichier YAML : ${config.vmConfigPath}`);
});

# RDP VM Manager

Application de démonstration pour créer et gérer des machines virtuelles RDP à partir d’un fichier YAML, avec une authentification GitHub et une connexion Tailscale optionnelle.

## Fonctionnalités

- Définition des VMs dans un fichier YAML
- Création d’une VM RDP via API HTTP
- Authentification GitHub (OAuth)
- Intégration Tailscale pour connecter les machines au réseau privé
- Support de providers multiples : Azure / AWS / Proxmox / démonstration locale
- Dashboard minimal pour visualiser les machines

## Architecture

- Backend Node.js / Express
- Lecture du fichier YAML dans `config/vm-template.yml`
- API REST pour lister et créer des VMs
- Passport GitHub OAuth pour l’authentification

## Démarrage rapide

1. Installez les dépendances :

```bash
npm install
```

2. Copiez le fichier d’environnement :

```bash
cp .env.example .env
```

3. Configurez les variables GitHub et Tailscale dans le fichier `.env`.

4. Démarrez l’application :

```bash
npm start
```

5. Ouvrez :

- http://localhost:3000/
- http://localhost:3000/api/health

## Exemple de fichier YAML

Le fichier `config/vm-template.yml` contient un exemple de configuration. Voici un modèle :

```yaml
vms:
  - name: dev-rdp-01
    provider: azure
    location: westeurope
    sku: Standard_D2s_v3
    image: Win2022Datacenter
    adminUser: adminuser
    password: P@ssw0rd!123
    rdp:
      enabled: true
      port: 3389
    tailscale:
      enabled: true
      hostname: dev-rdp-01
      authKey: ${TAILSCALE_AUTH_KEY}
    github:
      requiredOrg: my-org
      requiredTeam: vm-admin
```

## API

### GET /api/health

Vérifie si le service est en ligne.

### GET /api/vms

Liste les machines configurées.

### POST /api/vms/create

Crée une VM à partir d’un JSON fourni :

```json
{
  "name": "dev-rdp-02",
  "provider": "azure",
  "location": "westeurope",
  "sku": "Standard_D2s_v3",
  "image": "Win2022Datacenter",
  "adminUser": "adminuser",
  "password": "P@ssw0rd!123",
  "rdp": { "enabled": true, "port": 3389 },
  "tailscale": { "enabled": true, "hostname": "dev-rdp-02" }
}
```

## Authentification GitHub

Pour activer la connexion GitHub :

1. Créez une OAuth App sur GitHub
2. Renseignez `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
3. Redémarrez le service
4. Allez sur `/auth/github`

## Tailscale

La configuration Tailscale est conçue pour autoriser des machines à rejoindre un tailnet secure. Dans un vrai environnement, il faut :

- générer une auth key Tailscale
- appliquer le `authKey` dans le job de provisionnement
- autoriser le tailnet dans le dashboard Tailscale
- configurer le service de machine pour se connecter au réseau privé

## Sécurité

- Ne stockez jamais les secrets dans le dépôt
- Utilisez des variables d’environnement et un secret manager
- Limitez les accès GitHub aux groupes autorisés

## Point important

Cette version est un starter fonctionnel. Elle permet de démontrer la logique de création, d’authentification GitHub et d’intégration Tailscale. Pour la production, il faudra brancher un vrai provisionneur cloud (Azure CLI, AWS EC2, etc.) et sécuriser les identifiants.

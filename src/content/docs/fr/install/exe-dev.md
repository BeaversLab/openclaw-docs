---
summary: "Exécuter le OpenClaw Gateway sur exe.dev (VM + proxy HTTPS) pour un accès distant"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

Objectif : OpenClaw Gateway fonctionnant sur une VM exe.dev, accessible depuis votre ordinateur portable via : `https://<vm-name>.exe.xyz`

Cette page suppose l'image par défaut **exeuntu** d'exe.dev. Si vous avez choisi une autre distribution, adaptez les packages en conséquence.

## Chemin rapide pour débutant

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. Remplissez votre clé/jeton d'authentification si nécessaire
3. Cliquez sur "Agent" à côté de votre VM et attendez que Shelley termine le provisionnement
4. Ouvrez `https://<vm-name>.exe.xyz/` et authentifiez-vous avec le secret partagé configuré (ce guide utilise l'authentification par jeton par défaut, mais l'authentification par mot de passe fonctionne également si vous modifiez `gateway.auth.mode`)
5. Approuvez toutes les demandes d'appariement d'appareil en attente avec `openclaw devices approve <requestId>`

## Ce dont vous avez besoin

- compte exe.dev
- `ssh exe.dev` accès aux machines virtuelles [exe.dev](https://exe.dev) (facultatif)

## Installation automatisée avec Shelley

Shelley, l'agent d'[exe.dev](https://exe.dev), peut installer OpenClaw instantanément avec notre
invite. L'invite utilisée est la suivante :

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## Installation manuelle

## 1) Créer la VM

Depuis votre appareil :

```bash
ssh exe.dev new
```

Puis connectez-vous :

```bash
ssh <vm-name>.exe.xyz
```

<Tip>Conservez cette VM **stateful**. OpenClaw stocke OpenClaw`openclaw.json`, `auth-profiles.json` par agent, les sessions et l'état des channel/provider sous `~/.openclaw/`, ainsi que l'espace de travail sous `~/.openclaw/workspace/`.</Tip>

## 2) Installer les prérequis (sur la VM)

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) Installer OpenClaw

Exécutez le script d'installation de OpenClaw :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) Configurer nginx pour proxifier OpenClaw vers le port 8000

Modifiez `/etc/nginx/sites-enabled/default` avec

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Écraser les en-têtes de transfert au lieu de préserver les chaînes fournies par le client.
OpenClaw fait confiance aux métadonnées d'IP transférées uniquement via les proxys explicitement configurés,
et les chaînes de type `X-Forwarded-For` sont considérées comme un risque de durcissement.

## 5) Accéder à OpenClaw et accorder des privilèges

Accédez à `https://<vm-name>.exe.xyz/` (voir la sortie de l'interface de contrôle lors de l'onboarding). Si une authentification est demandée, collez le
secret partagé configuré depuis la VM. Ce guide utilise l'authentification par jeton, récupérez donc `gateway.auth.token`
avec `openclaw config get gateway.auth.token` (ou générez-en un avec `openclaw doctor --generate-gateway-token`).
Si vous avez modifié la passerelle pour une authentification par mot de passe, utilisez `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` à la place.
Approuvez les appareils avec `openclaw devices list` et `openclaw devices approve <requestId>`. En cas de doute, utilisez Shelley depuis votre navigateur !

## Configuration du canal distant

Pour les hôtes distants, privilégiez un seul appel `config patch` plutôt que de nombreux appels SSH vers `config set`. Conservez les jetons réels dans l'environnement de la VM ou `~/.openclaw/.env`, et placez uniquement des SecretRefs dans `openclaw.json`.

Sur la VM, faites en sorte que l'environnement du service contienne les secrets dont il a besoin :

```bash
cat >> ~/.openclaw/.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=sk-...
EOF
```

Depuis votre machine locale, créez un fichier patch et redirigez-le vers la VM :

```json5
// openclaw.remote.patch.json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --dry-run' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw gateway restart && openclaw health'
```

Utilisez `--replace-path` lorsqu'une liste d'autorisation imbriquée doit devenir exactement la valeur du correctif, par exemple lors du remplacement d'une liste d'autorisation de channel Discord :

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

## Accès à distance

L'accès à distance est géré par l'authentification d'[exe.dev](https://exe.dev). Par défaut, le trafic HTTP provenant du port 8000 est transféré vers `https://<vm-name>.exe.xyz` avec authentification par e-mail.

## Mise à jour

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

Guide : [Mise à jour](/fr/install/updating)

## Connexes

- [Passerelle distante](/fr/gateway/remote)
- [Vue d'ensemble de l'installation](/fr/install)

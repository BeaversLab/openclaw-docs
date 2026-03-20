---
summary: "Run OpenClaw Gateway 24/7 on a cheap Hetzner VPS (Docker) with durable state and baked-in binaries"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## Goal

Run a persistent OpenClaw Gateway on a Hetzner VPS using Docker, with durable state, baked-in binaries, and safe restart behavior.

If you want “OpenClaw 24/7 for ~$5”, this is the simplest reliable setup.
Hetzner pricing changes; pick the smallest Debian/Ubuntu VPS and scale up if you hit OOMs.

Security model reminder:

- Company-shared agents are fine when everyone is in the same trust boundary and the runtime is business-only.
- Keep strict separation: dedicated VPS/runtime + dedicated accounts; no personal Apple/Google/browser/password-manager profiles on that host.
- If users are adversarial to each other, split by gateway/host/OS user.

See [Security](/fr/gateway/security) and [VPS hosting](/fr/vps).

## What are we doing (simple terms)?

- Rent a small Linux server (Hetzner VPS)
- Install Docker (isolated app runtime)
- Start the OpenClaw Gateway in Docker
- Persist `~/.openclaw` + `~/.openclaw/workspace` on the host (survives restarts/rebuilds)
- Access the Control UI from your laptop via an SSH tunnel

The Gateway can be accessed via:

- SSH port forwarding from your laptop
- Direct port exposure if you manage firewalling and tokens yourself

This guide assumes Ubuntu or Debian on Hetzner.  
If you are on another Linux VPS, map packages accordingly.
For the generic Docker flow, see [Docker](/fr/install/docker).

---

## Quick path (experienced operators)

1. Provision Hetzner VPS
2. Install Docker
3. Clone OpenClaw repository
4. Create persistent host directories
5. Configure `.env` and `docker-compose.yml`
6. Bake required binaries into the image
7. `docker compose up -d`
8. Verify persistence and Gateway access

---

## What you need

- Hetzner VPS with root access
- SSH access from your laptop
- Basic comfort with SSH + copy/paste
- ~20 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants du fournisseur optionnels
  - QR WhatsApp
  - Jeton de bot Telegram
  - Gmail OAuth

---

## 1) Provisionner le VPS

Créez un VPS Ubuntu ou Debian chez Hetzner.

Connectez-vous en tant que root :

```bash
ssh root@YOUR_VPS_IP
```

Ce guide suppose que le VPS est persistant.
Ne le traitez pas comme une infrastructure éphémère.

---

## 2) Installer Docker (sur le VPS)

```bash
apt-get update
apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sh
```

Vérifiez :

```bash
docker --version
docker compose version
```

---

## 3) Cloner le dépôt OpenClaw

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

Ce guide suppose que vous allez construire une image personnalisée pour garantir la persistance des binaires.

---

## 4) Créer des répertoires hôtes persistants

Les conteneurs Docker sont éphémères.
Tout état de longue durée doit résider sur l'hôte.

```bash
mkdir -p /root/.openclaw/workspace

# Set ownership to the container user (uid 1000):
chown -R 1000:1000 /root/.openclaw
```

---

## 5) Configurer les variables d'environnement

Créez `.env` à la racine du dépôt.

```bash
OPENCLAW_IMAGE=openclaw:latest
OPENCLAW_GATEWAY_TOKEN=change-me-now
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789

OPENCLAW_CONFIG_DIR=/root/.openclaw
OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.openclaw
```

Générez des secrets robustes :

```bash
openssl rand -hex 32
```

**Ne commettez pas ce fichier.**

---

## 6) Configuration Docker Compose

Créez ou mettez à jour `docker-compose.yml`.

```yaml
services:
  openclaw-gateway:
    image: ${OPENCLAW_IMAGE}
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - HOME=/home/node
      - NODE_ENV=production
      - TERM=xterm-256color
      - OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND}
      - OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT}
      - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
      - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
      - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
      - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    volumes:
      - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
    ports:
      # Recommended: keep the Gateway loopback-only on the VPS; access via SSH tunnel.
      # To expose it publicly, remove the `127.0.0.1:` prefix and firewall accordingly.
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT}",
        "--allow-unconfigured",
      ]
```

`--allow-unconfigured` n'est là que pour la commodité de l'amorçage, il ne remplace pas une configuration de passerelle appropriée. Définissez toujours l'authentification (`gateway.auth.token` ou mot de passe) et utilisez des paramètres de liaison sûrs pour votre déploiement.

---

## 7) Étapes d'exécution de VM partagée Docker

Utilisez le guide d'exécution partagé pour le flux d'hôte Docker commun :

- [Intégrer les binaires requis dans l'image](/fr/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [Construire et lancer](/fr/install/docker-vm-runtime#build-and-launch)
- [Ce qui persiste où](/fr/install/docker-vm-runtime#what-persists-where)
- [Mises à jour](/fr/install/docker-vm-runtime#updates)

---

## 8) Accès spécifique à Hetzner

Après les étapes de construction et de lancement partagées, établissez un tunnel depuis votre ordinateur portable :

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

Ouvrez :

`http://127.0.0.1:18789/`

Collez votre jeton de passerelle.

---

La carte de persistance partagée se trouve dans [Docker VM Runtime](/fr/install/docker-vm-runtime#what-persists-where).

## Infrastructure as Code (Terraform)

Pour les équipes préférant les flux de travail infrastructure-as-code, une configuration Terraform maintenue par la communauté fournit :

- Configuration Terraform modulaire avec gestion d'état à distance
- Provisionnement automatisé via cloud-init
- Scripts de déploiement (amorçage, déploiement, sauvegarde/restauration)
- Durcissement de la sécurité (pare-feu, UFW, accès SSH uniquement)
- Configuration de tunnel SSH pour l'accès à la passerelle

**Dépôts :**

- Infrastructure : [openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Config Docker : [openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

Cette approche complète la configuration Docker ci-dessus avec des déploiements reproductibles, une infrastructure versionnée et une récupération automatisée en cas de sinistre.

> **Remarque :** Entretenu par la communauté. Pour les problèmes ou les contributions, consultez les liens vers les dépôts ci-dessus.

import fr from "/components/footer/fr.mdx";

<fr />

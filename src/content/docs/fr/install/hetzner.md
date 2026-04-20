---
summary: "Exécuter la passerelle OpenClaw 24/7 sur un VPS Gateway peu coûteux (Hetzner) avec un état durable et des binaires intégrés"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw sur Hetzner (Docker, Guide VPS de production)

## Objectif

Exécuter une passerelle OpenClaw Gateway persistante sur un VPS Hetzner en utilisant Docker, avec un état durable, des binaires intégrés et un comportement de redémarrage sécurisé.

Si vous souhaitez « OpenClaw 24/7 pour environ 5 $ », c'est la configuration fiable la plus simple.
Les tarifs de Hetzner changent ; choisissez le plus petit VPS Debian/Ubuntu et augmentez l'échelle si vous rencontrez des erreurs de mémoire insuffisante (OOM).

Rappel du modèle de sécurité :

- Les agents partagés par l'entreprise sont acceptables lorsque tout le monde se trouve dans la même limite de confiance et que l'environnement d'exécution est uniquement professionnel.
- Maintenez une séparation stricte : VPS/environnement d'exécution dédié + comptes dédiés ; aucun profil personnel Apple/Google/navigateur/gestionnaire de mots de passe sur cet hôte.
- Si les utilisateurs sont antagonistes les uns envers les autres, séparez par passerelle/hôte/utilisateur du système d'exploitation.

Voir [Sécurité](/fr/gateway/security) et [Hébergement VPS](/fr/vps).

## Que faisons-nous (en termes simples) ?

- Louer un petit serveur Linux (VPS Hetzner)
- Installer Docker (environnement d'exécution d'application isolé)
- Démarrer la passerelle OpenClaw Gateway dans Docker
- Persister `~/.openclaw` + `~/.openclaw/workspace` sur l'hôte (survit aux redémarrages/réinstallations)
- Accéder à l'interface de contrôle depuis votre ordinateur portable via un tunnel SSH

Cet état `~/.openclaw` monté comprend `openclaw.json`, `agents/<agentId>/agent/auth-profiles.json` par agent, et `.env`.

Le Gateway est accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide suppose Ubuntu ou Debian sur Hetzner.  
Si vous êtes sur un autre VPS Linux, mappez les packages en conséquence.
Pour le flux générique Docker, voir [Docker](/fr/install/docker).

---

## Accès rapide (opérateurs expérimentés)

1. Provisionner le VPS Hetzner
2. Installer Docker
3. Cloner le dépôt OpenClaw
4. Créer des répertoires persistants sur l'hôte
5. Configurer `.env` et `docker-compose.yml`
6. Intégrer les binaires requis dans l'image
7. `docker compose up -d`
8. Vérifier la persistance et l'accès au Gateway

---

## Ce dont vous avez besoin

- VPS Hetzner avec accès root
- Accès SSH depuis votre ordinateur portable
- Confort de base avec SSH + copier/coller
- ~20 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants du fournisseur en option
  - QR WhatsApp
  - Jeton de bot Telegram
  - OAuth Gmail

---

<Steps>
  <Step title="Provisionner le VPS">
    Créez un VPS Ubuntu ou Debian chez Hetzner.

    Connectez-vous en tant que root :

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    Ce guide suppose que le VPS est avec état.
    Ne le traitez pas comme une infrastructure éphémère.

  </Step>

  <Step title="Installer Docker (sur le VPS)">
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

  </Step>

  <Step title="Cloner le dépôt OpenClaw">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    Ce guide suppose que vous allez construire une image personnalisée pour garantir la persistance des binaires.

  </Step>

  <Step title="Créer des répertoires persistants sur l'hôte">
    Les conteneurs Docker sont éphémères.
    Tout état de longue durée doit résider sur l'hôte.

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="Configurer les variables d'environnement">
    Créez `.env` à la racine du dépôt.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Laissez `OPENCLAW_GATEWAY_TOKEN` vide à moins que vous ne souhaitiez explicitement
    le gérer via `.env` ; OpenClaw écrit un jeton de passerelle aléatoire dans
    la configuration au premier démarrage. Générez un mot de passe de trousseau et collez-le dans
    `GOG_KEYRING_PASSWORD` :

    ```bash
    openssl rand -hex 32
    ```

    **Ne commettez pas ce fichier.**

    Ce fichier `.env` est destiné à l'environnement d'exécution/conteneur tel que `OPENCLAW_GATEWAY_TOKEN`.
    L'authentification stockée par le fournisseur OAuth/Clé-API réside dans le
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` monté.

  </Step>

  <Step title="Configuration Docker Compose">
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

    `--allow-unconfigured` n'est là que pour la commodité de l'amorçage, il ne remplace pas une configuration de passerelle appropriée. Définissez toujours l'authentification (`gateway.auth.token` ou mot de passe) et utilisez des paramètres de liaison sécurisés pour votre déploiement.

  </Step>

  <Step title="Étapes d'exécution VM Docker partagées">
    Utilisez le guide d'exécution partagé pour le flux hôte Docker commun :

    - [Intégrer les binaires requis dans l'image](/fr/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construire et lancer](/fr/install/docker-vm-runtime#build-and-launch)
    - [Ce qui persiste où](/fr/install/docker-vm-runtime#what-persists-where)
    - [Mises à jour](/fr/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Accès spécifique à Hetzner">
    Après les étapes de construction et de lancement partagées, établissez un tunnel depuis votre ordinateur portable :

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    Ouvrez :

    `http://127.0.0.1:18789/`

    Collez le secret partagé configuré. Ce guide utilise le jeton de passerelle par
    défaut ; si vous avez passé à l'authentification par mot de passe, utilisez plutôt ce mot de passe.

  </Step>
</Steps>

La carte de persistance partagée réside dans [Docker VM Runtime](/fr/install/docker-vm-runtime#what-persists-where).

## Infrastructure as Code (Terraform)

Pour les équipes préférant les workflows d'infrastructure-as-code, une configuration Terraform maintenue par la communauté fournit :

- Configuration Terraform modulaire avec gestion d'état à distance
- Approvisionnement automatisé via cloud-init
- Scripts de déploiement (amorçage, déploiement, sauvegarde/restauration)
- Durcissement de la sécurité (pare-feu, UFW, accès SSH uniquement)
- Configuration du tunnel SSH pour l'accès à la passerelle

**Dépôts :**

- Infrastructure : [openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Configuration Docker : [openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

Cette approche complète la configuration Docker ci-dessus avec des déploiements reproductibles, une infrastructure sous contrôle de version et une récupération automatisée en cas de sinistre.

> **Note :** Entretenu par la communauté. Pour les problèmes ou les contributions, consultez les liens vers les dépôts ci-dessus.

## Étapes suivantes

- Configurer les canaux de messagerie : [Canaux](/fr/channels)
- Configurer le Gateway : [Configuration du Gateway](/fr/gateway/configuration)
- Garder OpenClaw à jour : [Mise à jour](/fr/install/updating)

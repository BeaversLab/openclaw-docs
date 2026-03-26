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

La passerelle Gateway est accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide suppose Ubuntu ou Debian sur Hetzner.  
Si vous êtes sur un autre VPS Linux, mappez les paquets en conséquence.
Pour le flux générique Docker, voir [Docker](/fr/install/docker).

---

## Chemin rapide (opérateurs expérimentés)

1. Provisionner le VPS Hetzner
2. Installer Docker
3. Cloner le dépôt OpenClaw
4. Créer des répertoires hôtes persistants
5. Configurer `.env` et `docker-compose.yml`
6. Intégrer les binaires requis dans l'image
7. `docker compose up -d`
8. Vérifier la persistance et l'accès à la passerelle Gateway

---

## Ce dont vous avez besoin

- VPS Hetzner avec accès root
- Accès SSH depuis votre ordinateur portable
- Une certaine aisance avec SSH + copier/coller
- ~20 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants du fournisseur facultatifs
  - QR WhatsApp
  - Jeton de bot Telegram
  - OAuth Gmail

---

<Steps>
  <Step title="Provisionner le VPS">
    Créez un VPS Ubuntu ou Debian sur Hetzner.

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
    OPENCLAW_GATEWAY_TOKEN=change-me-now
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=change-me-now
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Générez des secrets forts :

    ```bash
    openssl rand -hex 32
    ```

    **Ne commettez pas ce fichier.**

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

    `--allow-unconfigured` est uniquement pour la commodité de l'amorçage, ce n'est pas un remplacement pour une configuration de passerelle appropriée. Définissez toujours l'authentification (`gateway.auth.token` ou mot de passe) et utilisez des paramètres de liaison sûrs pour votre déploiement.

  </Step>

  <Step title="Étapes d'exécution de VM Docker partagées">
    Utilisez le guide d'exécution partagé pour le flux d'hôte Docker courant :

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

    Collez votre jeton de passerelle.

  </Step>
</Steps>

La carte de persistance partagée se trouve dans [Docker VM Runtime](/fr/install/docker-vm-runtime#what-persists-where).

## Infrastructure as Code (Terraform)

Pour les équipes préférant les workflows d'infrastructure-as-code, une configuration Terraform maintenue par la communauté fournit :

- Configuration Terraform modulaire avec gestion d'état à distance
- Approvisionnement automatisé via cloud-init
- Scripts de déploiement (amorçage, déploiement, sauvegarde/restauration)
- Durcissement de la sécurité (pare-feu, UFW, accès SSH uniquement)
- Configuration de tunnel SSH pour l'accès à la passerelle

**Dépôts :**

- Infrastructure : [openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Configuration Docker : [openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

Cette approche complète la configuration Docker ci-dessus avec des déploiements reproductibles, une infrastructure versionnée et une récupération après sinistre automatisée.

> **Remarque :** Maintenu par la communauté. Pour les problèmes ou les contributions, consultez les liens de dépôt ci-dessus.

## Étapes suivantes

- Configurez les canaux de messagerie : [Canaux](/fr/channels)
- Configurez la passerelle : [Configuration de la passerelle](/fr/gateway/configuration)
- Gardez OpenClaw à jour : [Mise à jour](/fr/install/updating)

import fr from "/components/footer/fr.mdx";

<fr />

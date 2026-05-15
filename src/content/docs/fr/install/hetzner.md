---
summary: "OpenClawGatewayHetznerDockerExécuter OpenClaw Gateway 24/7 sur un VPS Hetzner économique (Docker) avec un état durable et des binaires intégrés"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "HetznerHetzner"
---

## Objectif

Exécuter un OpenClaw Gateway persistant sur un VPS Hetzner en utilisant Docker, avec un état durable, des binaires intégrés et un comportement de redémarrage sécurisé.

Si vous souhaitez « OpenClaw 24/7 pour ~5 $ », c'est la configuration la plus simple et la plus fiable.
Les tarifs Hetzner peuvent changer ; choisissez le plus petit VPS Debian/Ubuntu et augmentez l'échelle si vous rencontrez des erreurs de mémoire insuffisante (OOM).

Rappel du modèle de sécurité :

- Les agents partagés en entreprise conviennent lorsque tout le monde se trouve dans la même limite de confiance et que l'exécution est exclusivement professionnelle.
- Maintenez une séparation stricte : VPS/exécution dédiés + comptes dédiés ; aucun profil personnel Apple/Google/navigateur/gestionnaire de mots de passe sur cet hôte.
- Si les utilisateurs sont adversaires les uns envers les autres, séparez par passerelle/hôte/utilisateur du système d'exploitation.

Voir [Sécurité](/fr/gateway/security) et [Hébergement VPS](/fr/vps).

## Que faisons-nous (en termes simples) ?

- Louer un petit serveur Linux (VPS Hetzner)
- Installer Docker (environnement d'exécution d'application isolé)
- Démarrer l'OpenClaw Gateway dans Docker
- Persister `~/.openclaw` + `~/.openclaw/workspace` sur l'hôte (survit aux redémarrages/reconstructions)
- Accéder à l'interface de contrôle depuis votre ordinateur portable via un tunnel SSH

Cet état `~/.openclaw` monté inclut `openclaw.json`, `agents/<agentId>/agent/auth-profiles.json` par agent,
et `.env`.

Le Gateway est accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide suppose Ubuntu ou Debian sur Hetzner.  
Si vous êtes sur un autre VPS Linux, adaptez les paquets en conséquence.
Pour le flux générique Docker, voir [Docker](/fr/install/docker).

---

## Chemin rapide (opérateurs expérimentés)

1. Provisionner le VPS Hetzner
2. Installer Docker
3. Cloner le dépôt OpenClaw
4. Créer des répertoires persistants sur l'hôte
5. Configurer `.env` et `docker-compose.yml`
6. Intégrer les binaires requis dans l'image
7. `docker compose up -d`
8. Vérifier la persistance et l'accès à la Gateway

---

## Ce dont vous avez besoin

- VPS Hetzner avec accès root
- Accès SSH depuis votre ordinateur portable
- Confort de base avec SSH + copier/coller
- ~20 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants de provider optionnels
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

    Vérifier :

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
    Tout état durable doit résider sur l'hôte.

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

    Définissez `OPENCLAW_GATEWAY_TOKEN` lorsque vous souhaitez gérer le jeton de passerelle stable
    via `.env` ; sinon configurez `gateway.auth.token`OpenClaw avant
    de compter sur les clients à travers les redémarrages. Si aucune source n'existe, OpenClaw utilise
    un jeton uniquement à l'exécution pour ce démarrage. Générez un mot de passe de trousseau et collez-le
    dans `GOG_KEYRING_PASSWORD` :

    ```bash
    openssl rand -hex 32
    ```

    **Ne commitez pas ce fichier.**

    Ce fichier `.env` est pour l'environnement conteneur/exécution tel que `OPENCLAW_GATEWAY_TOKEN`OAuthAPI.
    L'authentification stockée du fournisseur par OAuth/clé API réside dans le
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` monté.

  </Step>

  <Step title="DockerConfiguration Docker Compose">
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

    `--allow-unconfigured` n'est qu'une commodité pour l'amorçage, ce n'est pas un remplacement pour une configuration de passerelle appropriée. Définissez toujours l'authentification (`gateway.auth.token` ou mot de passe) et utilisez des paramètres de liaison sûrs pour votre déploiement.

  </Step>

  <Step title="DockerÉtapes d'exécution VM Docker partagées"Docker>
    Utilisez le guide d'exécution partagé pour le flux d'hôte Docker courant :

    - [Intégrer les binaires requis dans l'image](/fr/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construire et lancer](/fr/install/docker-vm-runtime#build-and-launch)
    - [Ce qui persiste où](/fr/install/docker-vm-runtime#what-persists-where)
    - [Mises à jour](/fr/install/docker-vm-runtime#updates)

  </Step>

  <Step title="HetznerAccès spécifique à Hetzner">
    Après les étapes communes de construction et de lancement, effectuez la configuration suivante pour ouvrir le tunnel :

    **Prérequis :** Assurez-vous que la configuration sshd de votre VPS autorise le transfert TCP. Si vous
    avez durci votre configuration SSH, vérifiez `/etc/ssh/sshd_config` et définissez :

    ```
    AllowTcpForwarding local
    ```

    `local` autorise les transferts locaux `ssh -L` depuis votre ordinateur portable tout en bloquant
    les transferts distants depuis le serveur. Le définir sur `no` fera échouer le tunnel
    avec :
    `channel 3: open failed: administratively prohibited: open failed`

    Après avoir confirmé que le transfert TCP est activé, redémarrez le service SSH
    (`systemctl restart ssh`) et exécutez le tunnel depuis votre ordinateur portable :

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    Ouvrez :

    `http://127.0.0.1:18789/`

    Collez le secret partagé configuré. Ce guide utilise le jeton de passerelle par
    défaut ; si vous avez basculé vers l'authentification par mot de passe, utilisez plutôt ce mot de passe.

  </Step>
</Steps>

La carte de persistance partagée réside dans [Docker VM Runtime](Docker/en/install/docker-vm-runtime#what-persists-where).

## Infrastructure as Code (Terraform)

Pour les équipes préférant les workflows d'infrastructure-as-code, une configuration Terraform maintenue par la communauté fournit :

- Configuration Terraform modulaire avec gestion d'état à distance
- Approvisionnement automatisé via cloud-init
- Scripts de déploiement (bootstrap, deploy, backup/restore)
- Durcissement de la sécurité (pare-feu, UFW, accès SSH uniquement)
- Configuration du tunnel SSH pour l'accès à la passerelle

**Dépôts :**

- Infrastructure : [openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Configuration Docker : [openclaw-docker-config](Dockerhttps://github.com/andreesg/openclaw-docker-config)

Cette approche complète la configuration Docker ci-dessus avec des déploiements reproductibles, une infrastructure versionnée et une récupération automatisée après sinistre.

<Note>Maintenu par la communauté. Pour les problèmes ou les contributions, consultez les liens de dépôt ci-dessus.</Note>

## Étapes suivantes

- Configurer les canaux de messagerie : [Canaux](/fr/channels)
- Configurer la passerelle : [Configuration de la passerelle](GatewayGateway/en/gateway/configuration)
- Gardez OpenClaw à jour : [Mise à jour](/fr/install/updating)

## Connexes

- [Aperçu de l'installation](/fr/install)
- [Fly.io](/fr/install/fly)
- [Docker](/fr/install/docker)
- [Hébergement VPS](/fr/vps)

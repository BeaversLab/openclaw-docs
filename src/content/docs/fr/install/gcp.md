---
summary: "Exécuter la passerelle OpenClaw 24/7 sur une VM Gateway Compute Engine (GCP) avec un état persistant"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

Exécutez un OpenClaw Gateway persistant sur une VM Compute Engine GCP en utilisant Docker, avec un état durable, des binaires intégrés et un comportement de redémarrage sûr.

Si vous voulez "OpenClaw 24/7 pour ~$5-12/mo", c'est une configuration fiable sur Google Cloud.
La tarification varie selon le type de machine et la région ; choisissez la plus petite VM adaptée à votre charge de travail et augmentez l'échelle si vous rencontrez des erreurs de mémoire insuffisante (OOM).

## Que faisons-nous (termes simples) ?

- Créez un projet GCP et activez la facturation
- Créez une VM Compute Engine
- Installez Docker (environnement d'exécution d'application isolé)
- Démarrez le OpenClaw Gateway dans Docker
- Rendez persistant `~/.openclaw` + `~/.openclaw/workspace` sur l'hôte (survit aux redémarrages/reconstructions)
- Accédez à l'interface de contrôle depuis votre ordinateur portable via un tunnel SSH

Cet état `~/.openclaw` monté inclut `openclaw.json`, `agents/<agentId>/agent/auth-profiles.json`
par agent, et `.env`.

Le Gateway est accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide utilise Debian sur Compute Engine GCP.
Ubuntu fonctionne également ; adaptez les packages en conséquence.
Pour le flux générique Docker, voir [Docker](/fr/install/docker).

---

## Chemin rapide (opérateurs expérimentés)

1. Créez un projet GCP + activez l'API Compute Engine
2. Créez une VM Compute Engine (e2-small, Debian 12, 20 Go)
3. Connectez-vous en SSH à la VM
4. Installez Docker
5. Clonez le dépôt OpenClaw
6. Créez des répertoires persistants sur l'hôte
7. Configurez `.env` et `docker-compose.yml`
8. Intégrez les binaires requis, construisez et lancez

---

## Ce dont vous avez besoin

- Compte GCP (éligible au niveau gratuit pour e2-micro)
- gcloud CLI installé (ou utilisez Cloud Console)
- Accès SSH depuis votre ordinateur portable
- Confort de base avec SSH + copier/coller
- ~20-30 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants de fournisseur facultatifs
  - QR WhatsApp
  - Jeton de bot Telegram
  - OAuth Gmail

---

<Steps>
  <Step title="Installer la gcloud CLI (ou utiliser la Console)">
    **Option A : gcloud CLI** (recommandé pour l'automatisation)

    Installer à partir de [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

    Initialiser et authentifier :

    ```bash
    gcloud init
    gcloud auth login
    ```

    **Option B : Cloud Console**

    Toutes les étapes peuvent être effectuées via l'interface Web sur [https://console.cloud.google.com](https://console.cloud.google.com)

  </Step>

  <Step title="Créer un projet GCP">
    **CLI :**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    Activer la facturation sur [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) (requis pour Compute Engine).

    Activer le Compute Engine API :

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **Console :**

    1. Aller dans IAM et administration > Créer un projet
    2. Nommer le projet et le créer
    3. Activer la facturation pour le projet
    4. Naviguer vers API et services > Activer les API > rechercher "Compute Engine API" > Activer

  </Step>

  <Step title="Créer la VM">
    **Types de machines :**

    | Type      | Spécifications               | Coût               | Notes                                            |
    | --------- | ---------------------------- | ------------------ | ------------------------------------------------ |
    | e2-medium | 2 vCPU, 4 Go RAM             | ~25 $/mo           | Le plus fiable pour les builds Docker locaux        |
    | e2-small  | 2 vCPU, 2 Go RAM             | ~12 $/mo           | Minimum recommandé pour le build Docker         |
    | e2-micro  | 2 vCPU (partagés), 1 Go RAM | Éligible au niveau gratuit | Échoue souvent avec le build Docker OOM (exit 137) |

    **CLI :**

    ```bash
    gcloud compute instances create openclaw-gateway \
      --zone=us-central1-a \
      --machine-type=e2-small \
      --boot-disk-size=20GB \
      --image-family=debian-12 \
      --image-project=debian-cloud
    ```

    **Console :**

    1. Aller dans Compute Engine > Instances de VM > Créer une instance
    2. Nom : `openclaw-gateway`
    3. Région : `us-central1`, Zone : `us-central1-a`
    4. Type de machine : `e2-small`
    5. Disque de démarrage : Debian 12, 20 Go
    6. Créer

  </Step>

  <Step title="SSH dans la VM">
    **CLI :**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **Console :**

    Cliquez sur le bouton "SSH" à côté de votre VM dans le tableau de bord Compute Engine.

    Remarque : La propagation de la clé SSH peut prendre 1 à 2 minutes après la création de la VM. Si la connexion est refusée, attendez et réessayez.

  </Step>

  <Step title="Installer Docker (sur la VM)">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    Déconnectez-vous puis reconnectez-vous pour que le changement de groupe prenne effet :

    ```bash
    exit
    ```

    Puis SSH à nouveau :

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
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
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="Configurer les variables d'environnement">
    Créez `.env` à la racine du dépôt.

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
    OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Définissez `OPENCLAW_GATEWAY_TOKEN` lorsque vous souhaitez gérer le jeton de passerelle stable
    via `.env` ; sinon configurez `gateway.auth.token` avant
    de dépendre des clients après les redémarrages. Si aucune source n'existe, OpenClaw utilise
    un jeton d'exécution uniquement pour ce démarrage. Générez un mot de passe de trousseau et collez-le
    dans `GOG_KEYRING_PASSWORD` :

    ```bash
    openssl rand -hex 32
    ```

    **Ne commitez pas ce fichier.**

    Ce fichier `.env` est pour l'environnement de conteneur/d'exécution tel que `OPENCLAW_GATEWAY_TOKEN`.
    L'authentification stockée du fournisseur OAuth/clé API réside dans le
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
          # Recommended: keep the Gateway loopback-only on the VM; access via SSH tunnel.
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

    `--allow-unconfigured` n'est destiné qu'à la commodité du démarrage initial, il ne remplace pas une configuration de passerelle appropriée. Définissez toujours l'authentification (`gateway.auth.token` ou mot de passe) et utilisez des paramètres de liaison sûrs pour votre déploiement.

  </Step>

  <Step title="DockerÉtapes d'exécution VM partagée Docker"Docker>
    Utilisez le guide d'exécution partagée pour le flux d'hôte Docker courant :

    - [Intégrer les binaires requis dans l'image](/fr/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construire et lancer](/fr/install/docker-vm-runtime#build-and-launch)
    - [Ce qui persiste où](/fr/install/docker-vm-runtime#what-persists-where)
    - [Mises à jour](/fr/install/docker-vm-runtime#updates)

  </Step>

  <Step title="GCPNotes de lancement spécifiques au GCP"GCP>
    Sur GCP, si la construction échoue avec `Killed` ou `exit code 137` pendant `pnpm install --frozen-lockfile`, la VM n'a plus de mémoire. Utilisez `e2-small` minimum, ou `e2-medium` pour des premières constructions plus fiables.

    Lors de la liaison au LAN (`OPENCLAW_GATEWAY_BIND=lan`), configurez une origine de navigateur approuvée avant de continuer :

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    Si vous avez modifié le port de la passerelle, remplacez `18789` par votre port configuré.

  </Step>

  <Step title="Accès depuis votre ordinateur portable">
    Créez un tunnel SSH pour transférer le port du Gateway :

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    Ouvrez dans votre navigateur :

    `http://127.0.0.1:18789/`

    Réimprimez un lien propre vers le tableau de bord :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    Si l'interface utilisateur demande une authentification par secret partagé, collez le jeton ou le mot de passe configuré dans les paramètres de l'interface de contrôle. Ce flux Docker écrit un jeton par défaut ; si vous modifiez la configuration du conteneur pour utiliser une authentification par mot de passe, utilisez plutôt ce mot de passe.

    Si l'interface de contrôle affiche `unauthorized` ou `disconnected (1008): pairing required`, approuvez l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Vous avez besoin à nouveau de la référence de persistance partagée et de mise à jour ?
    Voir [Docker VM Runtime](/fr/install/docker-vm-runtime#what-persists-where) et [Mises à jour du runtime de VM Docker](/fr/install/docker-vm-runtime#updates).

  </Step>
</Steps>

---

## Dépannage

**Connexion SSH refusée**

La propagation de la clé SSH peut prendre 1 à 2 minutes après la création de la VM. Attendez et réessayez.

**Problèmes de connexion OS**

Vérifiez votre profil de connexion OS :

```bash
gcloud compute os-login describe-profile
```

Assurez-vous que votre compte dispose des autorisations IAM requises (Compute OS Login ou Compute OS Admin Login).

**Mémoire insuffisante (OOM)**

Si la build Docker échoue avec `Killed` et `exit code 137`, la VM a été arrêtée pour manque de mémoire. Passez à e2-small (minimum) ou e2-medium (recommandé pour des builds locales fiables) :

```bash
# Stop the VM first
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# Change machine type
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# Start the VM
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## Comptes de service (bonne pratique de sécurité)

Pour un usage personnel, votre compte utilisateur par défaut fonctionne parfaitement.

Pour l'automatisation ou les pipelines CI/CD, créez un compte de service dédié avec des autorisations minimales :

1. Créez un compte de service :

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Accordez le rôle Administrateur d'instance de calcul (ou un rôle personnalisé plus restreint) :

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Évitez d'utiliser le rôle Propriétaire pour l'automatisation. Appliquez le principe du moindre privilège.

Voir [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) pour les détails sur les rôles IAM.

---

## Étapes suivantes

- Configurez les canaux de messagerie : [Canaux](/fr/channels)
- Associez des appareils locaux en tant que nœuds : [Nœuds](/fr/nodes)
- Configurez le Gateway : [Configuration du Gateway](/fr/gateway/configuration)

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Azure](/fr/install/azure)
- [Hébergement VPS](/fr/vps)

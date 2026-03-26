---
summary: "Exécuter la passerelle OpenClaw 24/7 sur une VM Gateway Compute Engine (GCP) avec un état persistant"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw sur GCP Compute Engine (Docker, Guide VPS de production)

## Objectif

Exécuter une passerelle OpenClaw Gateway persistante sur une VM GCP Compute Engine en utilisant Docker, avec un état durable, des binaires intégrés et un comportement de redémarrage sûr.

Si vous souhaitez "OpenClaw 24/7 pour environ 5-12 $/mo", c'est une configuration fiable sur Google Cloud.
La tarification varie selon le type de machine et la région ; choisissez la plus petite VM adaptée à votre charge de travail et augmentez l'échelle si vous rencontrez des erreurs de mémoire insuffisante (OOM).

## Que faisons-nous (termes simples) ?

- Créer un projet GCP et activer la facturation
- Créer une VM Compute Engine
- Installer Docker (runtime d'application isolé)
- Démarrer la passerelle OpenClaw Gateway dans Docker
- Persister `~/.openclaw` + `~/.openclaw/workspace` sur l'hôte (survit aux redémarrages/reconstructions)
- Accéder à l'interface de contrôle depuis votre ordinateur portable via un tunnel SSH

La Gateway peut être accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide utilise Debian sur GCP Compute Engine.
Ubuntu fonctionne également ; adaptez les packages en conséquence.
Pour le flux générique Docker, consultez [Docker](/fr/install/docker).

---

## Chemin rapide (opérateurs expérimentés)

1. Créer un projet GCP + activer l'API Compute Engine
2. Créer une VM Compute Engine (e2-small, Debian 12, 20 Go)
3. Se connecter en SSH à la VM
4. Installer Docker
5. Cloner le dépôt OpenClaw
6. Créer des répertoires hôtes persistants
7. Configurer `.env` et `docker-compose.yml`
8. Intégrer les binaires requis, construire et lancer

---

## Ce dont vous avez besoin

- Compte GCP (éligible à la offre gratuite pour e2-micro)
- CLI gcloud installé (ou utiliser Cloud Console)
- Accès SSH depuis votre ordinateur portable
- Confort de base avec SSH + copier/coller
- ~20-30 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants de fournisseur facultatifs
  - QR WhatsApp
  - Jeton de bot Telegram
  - Gmail OAuth

---

<Steps>
  <Step title="Installer gcloud CLI (ou utiliser la Console)">
    **Option A : gcloud CLI** (recommandé pour l'automatisation)

    Installer à partir de [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

    Initialiser et authentifier :

    ```bash
    gcloud init
    gcloud auth login
    ```

    **Option B : Cloud Console**

    Toutes les étapes peuvent être effectuées via l'interface Web à [https://console.cloud.google.com](https://console.cloud.google.com)

  </Step>

  <Step title="Créer un projet GCP">
    **CLI :**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    Activer la facturation sur [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) (requis pour Compute Engine).

    Activer l'API Compute Engine :

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **Console :**

    1. Aller dans IAM & Admin > Créer un projet
    2. Le nommer et créer
    3. Activer la facturation pour le projet
    4. Naviguer vers API et services > Activer les API > rechercher "Compute Engine API" > Activer

  </Step>

  <Step title="Créer la VM">
    **Types de machines :**

    | Type      | Specs                    | Coût               | Notes                                        |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4Go RAM          | ~25$/mo            | Le plus fiable pour les builds Docker locaux        |
    | e2-small  | 2 vCPU, 2Go RAM          | ~12$/mo            | Minimum recommandé pour le build Docker         |
    | e2-micro  | 2 vCPU (partagé), 1Go RAM | Éligible au niveau gratuit | Échoue souvent avec le build Docker OOM (exit 137) |

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
    5. Disque de démarrage : Debian 12, 20Go
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

    Déconnectez-vous et reconnectez-vous pour que le changement de groupe prenne effet :

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
    OPENCLAW_GATEWAY_TOKEN=change-me-now
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
    OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

    GOG_KEYRING_PASSWORD=change-me-now
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    Générez des secrets forts :

    ```bash
    openssl rand -hex 32
    ```

    **Ne commitez pas ce fichier.**

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

    `--allow-unconfigured` n'est là que pour la commodité de l'amorçage, il ne remplace pas une configuration de passerelle appropriée. Définissez toujours l'authentification (`gateway.auth.token` ou mot de passe) et utilisez des paramètres de liaison sûrs pour votre déploiement.

  </Step>

  <Step title="Étapes d'exécution VM partagée Docker">
    Utilisez le guide d'exécution partagée pour le flux commun de l'hôte Docker :

    - [Intégrer les binaires requis dans l'image](/fr/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [Construire et lancer](/fr/install/docker-vm-runtime#build-and-launch)
    - [Ce qui persiste où](/fr/install/docker-vm-runtime#what-persists-where)
    - [Mises à jour](/fr/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Notes de lancement spécifiques à GCP">
    Sur GCP, si le build échoue avec `Killed` ou `exit code 137` pendant `pnpm install --frozen-lockfile`, la machine virtuelle manque de mémoire. Utilisez `e2-small` minimum, ou `e2-medium` pour des premiers builds plus fiables.

    Lors de la liaison au LAN (`OPENCLAW_GATEWAY_BIND=lan`), configurez une origine de navigateur approuvée avant de continuer :

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    Si vous avez modifié le port de la passerelle, remplacez `18789` par votre port configuré.

  </Step>

  <Step title="Accès depuis votre ordinateur portable">
    Créez un tunnel SSH pour rediriger le port de la Gateway :

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    Ouvrez dans votre navigateur :

    `http://127.0.0.1:18789/`

    Récupérez un nouveau lien de tableau de bord tokenisé :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    Collez le jeton depuis cette URL.

    Si l'interface de contrôle affiche `unauthorized` ou `disconnected (1008): pairing required`, approuvez l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Besoin de nouveau de la référence de persistance partagée et de mise à jour ?
    Consultez [Runtime VM Docker](/fr/install/docker-vm-runtime#what-persists-where) et [Mises à jour du runtime VM Docker](/fr/install/docker-vm-runtime#updates).

  </Step>
</Steps>

---

## Dépannage

**Connexion SSH refusée**

La propagation des clés SSH peut prendre 1 à 2 minutes après la création de la VM. Attendez et réessayez.

**Problèmes de connexion OS**

Vérifiez votre profil de connexion OS :

```bash
gcloud compute os-login describe-profile
```

Assurez-vous que votre compte dispose des autorisations IAM requises (Compute OS Login ou Compute OS Admin Login).

**Plus de mémoire (OOM)**

Si le build Docker échoue avec `Killed` et `exit code 137`, la VM a été tuée par OOM. Passez à e2-small (minimum) ou e2-medium (recommandé pour des builds locaux fiables) :

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

Pour un usage personnel, votre compte utilisateur par défaut convient parfaitement.

Pour l'automatisation ou les pipelines CI/CD, créez un compte de service dédié avec des autorisations minimales :

1. Créer un compte de service :

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Accorder le rôle Administrateur d'instance Compute (ou un rôle personnalisé plus restreint) :

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Évitez d'utiliser le rôle Propriétaire pour l'automatisation. Appliquez le principe du moindre privilège.

Voir [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) pour plus de détails sur les rôles IAM.

---

## Étapes suivantes

- Configurer les canaux de messagerie : [Canaux](/fr/channels)
- Associer les appareils locaux en tant que nœuds : [Nœuds](/fr/nodes)
- Configurer le Gateway : [Configuration du Gateway](/fr/gateway/configuration)

import fr from "/components/footer/fr.mdx";

<fr />

---
summary: "Exécuter la passerelle OpenClaw Gateway 24/7 sur une VM GCP Compute Engine (Docker) avec un état durable"
read_when:
  - Vous souhaitez exécuter OpenClaw 24/7 sur GCP
  - Vous souhaitez une passerelle (Gateway) de qualité production, toujours active, sur votre propre VM
  - Vous souhaitez un contrôle total sur la persistance, les binaires et le comportement de redémarrage
title: "GCP"
---

# OpenClaw sur GCP Compute Engine (Docker, Guide VPS de production)

## Objectif

Exécuter une passerelle (Gateway) OpenClaw Gateway persistante sur une VM GCP Compute Engine en utilisant Docker, avec un état durable, des binaires intégrés et un comportement de redémarrage sécurisé.

Si vous souhaitez "OpenClaw 24/7 pour ~5-12 $/mo", cette est une configuration fiable sur Google Cloud.
La tarification varie selon le type de machine et la région ; choisissez la plus petite VM adaptée à votre charge de travail et augmentez l'échelle si vous rencontrez des erreurs de mémoire insuffisante (OOM).

## Que faisons-nous (en termes simples) ?

- Créer un projet GCP et activer la facturation
- Créer une VM Compute Engine
- Installer Docker (environnement d'exécution d'application isolé)
- Démarrer la passerelle (Gateway) OpenClaw Gateway dans Docker
- Persister `~/.openclaw` + `~/.openclaw/workspace` sur l'hôte (survit aux redémarrages/reconstructions)
- Accéder à l'interface de contrôle depuis votre ordinateur portable via un tunnel SSH

La passerelle (Gateway) est accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide utilise Debian sur GCP Compute Engine.
Ubuntu fonctionne également ; adaptez les packages en conséquence.
Pour le flux générique Docker, voir [Docker](/fr/install/docker).

---

## Chemin rapide (pour les opérateurs expérimentés)

1. Créer un projet GCP + activer l'API Compute Engine
2. Créer une VM Compute Engine (e2-small, Debian 12, 20 Go)
3. Se connecter en SSH à la VM
4. Installer Docker
5. Cloner le dépôt OpenClaw
6. Créer des répertoires hôtes persistants
7. Configurer `.env` et `docker-compose.yml`
8. Intégrer les binaires requis, compiler et lancer

---

## Ce dont vous avez besoin

- Compte GCP (éligible au niveau gratuit pour e2-micro)
- CLI gcloud installé (ou utiliser Cloud Console)
- Accès SSH depuis votre ordinateur portable
- Une aisance de base avec SSH + copier/coller
- ~20-30 minutes
- Docker et Docker Compose
- Identifiants d'authentification du modèle
- Identifiants du fournisseur (provider) facultatifs
  - QR WhatsApp
  - Jeton de bot Telegram
  - OAuth Gmail

---

## 1) Installer la CLI gcloud (ou utiliser la Console)

**Option A : gcloud CLI** (recommandé pour l'automatisation)

Installer depuis https://cloud.google.com/sdk/docs/install

Initialiser et authentifier :

```bash
gcloud init
gcloud auth login
```

**Option B : Cloud Console**

Toutes les étapes peuvent être effectuées via l'interface Web sur https://console.cloud.google.com

---

## 2) Créer un projet GCP

**CLI :**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

Activez la facturation sur https://console.cloud.google.com/billing (requis pour Compute Engine).

Activez l'API Compute Engine :

```bash
gcloud services enable compute.googleapis.com
```

**Console :**

1. Accédez à IAM et administration > Créer un projet
2. Nommez-le et créez-le
3. Activez la facturation pour le projet
4. Accédez à API et services > Activer les API > recherchez « Compute Engine API » > Activer

---

## 3) Créer la VM

**Types de machine :**

| Type     | Spécifications                    | Coût               | Remarques              |
| -------- | ------------------------ | ------------------ | ------------------ |
| e2-small | 2 vCPU, 2 Go RAM          | ~12 $/mois            | Recommandé        |
| e2-micro | 2 vCPU (partagé), 1 Go RAM | Éligible au niveau gratuit | Peut manquer de mémoire sous charge |

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

1. Accédez à Compute Engine > Instances de VM > Créer une instance
2. Nom : `openclaw-gateway`
3. Région : `us-central1`, Zone : `us-central1-a`
4. Type de machine : `e2-small`
5. Disque de démarrage : Debian 12, 20 Go
6. Créer

---

## 4) Se connecter en SSH à la VM

**CLI :**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**Console :**

Cliquez sur le bouton « SSH » à côté de votre VM dans le tableau de bord Compute Engine.

Remarque : La propagation de la clé SSH peut prendre 1 à 2 minutes après la création de la VM. Si la connexion est refusée, attendez et réessayez.

---

## 5) Installer Docker (sur la VM)

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

Reconnectez-vous ensuite en SSH :

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

Vérifier :

```bash
docker --version
docker compose version
```

---

## 6) Cloner le dépôt OpenClaw

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

Ce guide suppose que vous allez créer une image personnalisée pour garantir la persistance des binaires.

---

## 7) Créer des répertoires persistants sur l'hôte

Les conteneurs Docker sont éphémères.
Tous les états durables doivent résider sur l'hôte.

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) Configurer les variables d'environnement

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

**Ne commettez pas ce fichier.**

---

## 9) Configuration Docker Compose

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

      # Optional: only if you run iOS/Android nodes against this VM and need Canvas host.
      # If you expose this publicly, read /gateway/security and firewall accordingly.
      # - "18793:18793"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT}",
      ]
```

---

## 10) Intégrer les binaires requis dans l'image (critique)

Installer des binaires dans un conteneur en cours d'exécution est un piège.
Tout ce qui est installé au moment de l'exécution sera perdu au redémarrage.

Tous les binaires externes requis par les compétences doivent être installés au moment de la construction de l'image.

Les exemples ci-dessous montrent uniquement trois binaires courants :

- `gog` pour l'accès Gmail
- `goplaces` pour Google Places
- `wacli` pour WhatsApp

Il s'agit d'exemples, pas d'une liste complète.
Vous pouvez installer autant de binaires que nécessaire en utilisant le même modèle.

Si vous ajoutez de nouvelles compétences plus tard qui dépendent de binaires supplémentaires, vous devez :

1. Mettre à jour le Dockerfile
2. Reconstruire l'image
3. Redémarrer les conteneurs

**Exemple de Dockerfile**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 11) Build and launch

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Verify binaries:

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

Expected output:

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 12) Verify Gateway

```bash
docker compose logs -f openclaw-gateway
```

Success:

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) Access from your laptop

Create an SSH tunnel to forward the Gateway port:

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

Open in your browser:

`http://127.0.0.1:18789/`

Paste your gateway token.

---

## What persists where (source of truth)

OpenClaw runs in Docker, but Docker is not the source of truth.
All long-lived state must survive restarts, rebuilds, and reboots.

| Component           | Location                          | Persistence mechanism  | Notes                            |
| ------------------- | --------------------------------- | ---------------------- | -------------------------------- |
| Gateway config      | `/home/node/.openclaw/`           | Host volume mount      | Includes `openclaw.json`, tokens |
| Model auth profiles | `/home/node/.openclaw/`           | Host volume mount      | OAuth tokens, API keys           |
| Skill configs       | `/home/node/.openclaw/skills/`    | Host volume mount      | Skill-level state                |
| Agent workspace     | `/home/node/.openclaw/workspace/` | Host volume mount      | Code and agent artifacts         |
| WhatsApp session    | `/home/node/.openclaw/`           | Host volume mount      | Preserves QR login               |
| Gmail keyring       | `/home/node/.openclaw/`           | Host volume + password | Requires `GOG_KEYRING_PASSWORD`  |
| External binaries   | `/usr/local/bin/`                 | Docker image           | Must be baked at build time      |
| Node runtime        | Container filesystem              | Docker image           | Rebuilt every image build        |
| OS packages         | Container filesystem              | Docker image           | Do not install at runtime        |
| Docker container    | Ephemeral                         | Restartable            | Safe to destroy                  |

---

## Updates

To update OpenClaw on the VM:

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

---

## Troubleshooting

**SSH connection refused**

SSH key propagation can take 1-2 minutes after VM creation. Wait and retry.

**OS Login issues**

Check your OS Login profile:

```bash
gcloud compute os-login describe-profile
```

Ensure your account has the required IAM permissions (Compute OS Login or Compute OS Admin Login).

**Out of memory (OOM)**

If using e2-micro and hitting OOM, upgrade to e2-small or e2-medium:

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

## Service accounts (security best practice)

For personal use, your default user account works fine.

For automation or CI/CD pipelines, create a dedicated service account with minimal permissions:

1. Create a service account:

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Grant Compute Instance Admin role (or narrower custom role):
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Avoid using the Owner role for automation. Use the principle of least privilege.

See https://cloud.google.com/iam/docs/understanding-roles for IAM role details.

---

## Étapes suivantes

- Configurer les canaux de messagerie : [Canaux](/fr/channels)
- Associer les appareils locaux en tant que nœuds : [Nœuds](/fr/nodes)
- Configurer le Gateway : [configuration Gateway](/fr/gateway/configuration)

import en from "/components/footer/en.mdx";

<en />

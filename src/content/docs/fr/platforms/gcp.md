---
summary: "Exécuter la passerelle OpenClaw 24/7 sur une VM GCP Compute Engine (Docker) avec un état durable"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw sur GCP Compute Engine (Docker, Guide VPS de production)

## Objectif

Exécuter une passerelle OpenClaw persistante sur une VM GCP Compute Engine en utilisant Docker, avec un état durable, des binaires intégrés et un comportement de redémarrage sûr.

Si vous voulez "OpenClaw 24/7 pour ~5-12 $/mo", c'est une configuration fiable sur Google Cloud.
Les tarifs varient selon le type de machine et la région ; choisissez la plus petite VM adaptée à votre charge de travail et augmentez l'échelle si vous rencontrez des erreurs de mémoire insuffisante (OOM).

## Que faisons-nous (termes simples) ?

- Créer un projet GCP et activer la facturation
- Créer une VM Compute Engine
- Installer Docker (environnement d'exécution d'application isolé)
- Démarrer la passerelle OpenClaw dans Docker
- Persister `~/.openclaw` + `~/.openclaw/workspace` sur l'hôte (survit aux redémarrages/reconstructions)
- Accéder à l'interface de contrôle depuis votre ordinateur portable via un tunnel SSH

La passerelle est accessible via :

- Transfert de port SSH depuis votre ordinateur portable
- Exposition directe du port si vous gérez vous-même le pare-feu et les jetons

Ce guide utilise Debian sur GCP Compute Engine.
Ubuntu fonctionne également ; adaptez les packages en conséquence.
Pour le flux générique Docker, voir [Docker](/fr/install/docker).

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
- CLI gcloud installée (ou utilisez Cloud Console)
- Accès SSH depuis votre ordinateur portable
- Aisance de base avec SSH + copier/coller
- ~20-30 minutes
- Docker et Docker Compose
- Informations d'authentification du modèle
- Informations d'identification du fournisseur (optionnelles)
  - QR WhatsApp
  - Jeton de bot Telegram
  - OAuth Gmail

---

## 1) Installer la CLI gcloud (ou utiliser la Console)

**Option A : gcloud CLI** (recommandé pour l'automatisation)

Installer à partir de https://cloud.google.com/sdk/docs/install

Initialiser et authentifier :

```bash
gcloud init
gcloud auth login
```

**Option B : Cloud Console**

Toutes les étapes peuvent être effectuées via l'interface web sur https://console.cloud.google.com

---

## 2) Créer un projet GCP

**CLI :**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

Activer la facturation sur https://console.cloud.google.com/billing (requis pour Compute Engine).

Activer le API Compute Engine :

```bash
gcloud services enable compute.googleapis.com
```

**Console :**

1. Accéder à IAM & Admin > Créer un projet
2. Nommez-le et créez-le
3. Activer la facturation pour le projet
4. Accéder à API et services > Activer les API > rechercher "Compute Engine API" > Activer

---

## 3) Créer la VM

**Types de machines :**

| Type     | Spécifications             | Coût                       | Notes                               |
| -------- | -------------------------- | -------------------------- | ----------------------------------- |
| e2-small | 2 vCPU, 2Go RAM            | ~12 $/mois                 | Recommandé                          |
| e2-micro | 2 vCPU (partagés), 1Go RAM | Éligible au niveau gratuit | Peut manquer de mémoire sous charge |

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

1. Accéder à Compute Engine > Instances de VM > Créer une instance
2. Nom : `openclaw-gateway`
3. Région : `us-central1`, Zone : `us-central1-a`
4. Type de machine : `e2-small`
5. Disque de démarrage : Debian 12, 20Go
6. Créer

---

## 4) Se connecter en SSH à la VM

**CLI :**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**Console :**

Cliquez sur le bouton "SSH" à côté de votre VM dans le tableau de bord Compute Engine.

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

Puis reconnectez-vous en SSH :

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
Tout état de longue durée doit résider sur l'hôte.

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

Générer des secrets forts :

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
    command: ["node", "dist/index.js", "gateway", "--bind", "${OPENCLAW_GATEWAY_BIND}", "--port", "${OPENCLAW_GATEWAY_PORT}"]
```

---

## 10) Intégrer les binaires requis dans l'image (critique)

L'installation de binaires dans un conteneur en cours d'exécution est un piège.
Tout ce qui est installé au moment de l'exécution sera perdu au redémarrage.

Tous les binaires externes requis par les compétences doivent être installés au moment de la création de l'image.

Les exemples ci-dessous ne montrent que trois binaires courants :

- `gog` pour l'accès Gmail
- `goplaces` pour Google Places
- `wacli` pour WhatsApp

Ce sont des exemples, pas une liste complète.
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

## 11) Construire et lancer

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Vérifier les binaires :

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

Sortie attendue :

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 12) Vérifier Gateway

```bash
docker compose logs -f openclaw-gateway
```

Succès :

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) Accéder depuis votre ordinateur portable

Créer un tunnel SSH pour rediriger le port Gateway :

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

Ouvrir dans votre navigateur :

`http://127.0.0.1:18789/`

Collez votre jeton de passerelle.

---

## Ce qui persiste où (source de vérité)

OpenClaw s'exécute dans Docker, mais Docker n'est pas la source de vérité.
Tout état à longue durée de vie doit survivre aux redémarrages, reconstructions et redémarrages.

| Composant                    | Emplacement                       | Mécanisme de persistance   | Notes                                          |
| ---------------------------- | --------------------------------- | -------------------------- | ---------------------------------------------- |
| Config Gateway               | `/home/node/.openclaw/`           | Montage de volume hôte     | Inclut `openclaw.json`, jetons                 |
| Profils d'auth de modèle     | `/home/node/.openclaw/`           | Montage de volume hôte     | Jeton OAuth, clés API                          |
| Configs de compétence        | `/home/node/.openclaw/skills/`    | Montage de volume hôte     | État au niveau de la compétence                |
| Espace de travail de l'agent | `/home/node/.openclaw/workspace/` | Montage de volume hôte     | Code et artefacts de l'agent                   |
| Session WhatsApp             | `/home/node/.openclaw/`           | Montage de volume hôte     | Préserve la connexion QR                       |
| Trousseau de clés Gmail      | `/home/node/.openclaw/`           | Volume hôte + mot de passe | Nécessite `GOG_KEYRING_PASSWORD`               |
| Binaires externes            | `/usr/local/bin/`                 | Image Docker               | Doit être intégré au moment de la construction |
| Runtime Node                 | Système de fichiers de conteneur  | Image Docker               | Reconstruit à chaque création d'image          |
| Paquets OS                   | Système de fichiers de conteneur  | Image Docker               | Ne pas installer à l'exécution                 |
| Conteneur Docker             | Éphémère                          | Redémarrable               | Sûr à détruire                                 |

---

## Mises à jour

Pour mettre à jour OpenClaw sur la VM :

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

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

**Dépassement de mémoire (OOM)**

Si vous utilisez e2-micro et rencontrez des erreurs OOM, passez à e2-small ou e2-medium :

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

1. Créez un compte de service :

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Accordez le rôle Compute Instance Admin (ou un rôle personnalisé plus restreint) :
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Évitez d'utiliser le rôle Propriétaire pour l'automatisation. Appliquez le principe du moindre privilège.

Consultez https://cloud.google.com/iam/docs/understanding-roles pour plus de détails sur les rôles IAM.

---

## Étapes suivantes

- Configurez les canaux de messagerie : [Canaux](/fr/channels)
- Associez les appareils locaux en tant que nœuds : [Nœuds](/fr/nodes)
- Configurez le Gateway : [Configuration Gateway](/fr/gateway/configuration)

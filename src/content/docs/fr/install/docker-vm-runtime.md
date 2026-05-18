---
summary: "Étapes d'exécution partagées de VM Docker pour les hôtes OpenClaw Gateway à longue durée de vie"
read_when:
  - You are deploying OpenClaw on a cloud VM with Docker
  - You need the shared binary bake, persistence, and update flow
title: "Docker VM runtime"
---

Étapes d'exécution partagées pour les installations Docker basées sur VM telles que GCP, Hetzner et des fournisseurs de VPS similaires.

## Intégrer les binaires requis dans l'image

Installer des binaires à l'intérieur d'un conteneur en cours d'exécution est un piège.
Tout ce qui est installé au moment de l'exécution sera perdu au redémarrage.

Tous les binaires externes requis par les compétences doivent être installés au moment de la construction de l'image.

Les exemples ci-dessous ne montrent que trois binaires courants :

- `gog` (depuis `gogcli`) pour l'accès Gmail
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
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI (gogcli — installs as `gog`)
# Copy the current Linux asset URL from https://github.com/steipete/gogcli/releases
RUN curl -L https://github.com/steipete/gogcli/releases/latest/download/gogcli_linux_amd64.tar.gz \
  | tar -xzO gog > /usr/local/bin/gog; \
  chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
# Copy the current Linux asset URL from https://github.com/steipete/goplaces/releases
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_linux_amd64.tar.gz \
  | tar -xzO goplaces > /usr/local/bin/goplaces; \
  chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
# Copy the current Linux asset URL from https://github.com/steipete/wacli/releases
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli-linux-amd64.tar.gz \
  | tar -xzO wacli > /usr/local/bin/wacli; \
  chmod +x /usr/local/bin/wacli

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

<Note>Les URL ci-dessus sont des exemples. Pour les VM basées sur ARM, choisissez les actifs `arm64`. Pour des constructions reproductibles, figez les URL de version.</Note>

## Construire et lancer

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Si la construction échoue avec `Killed` ou `exit code 137` pendant `pnpm install --frozen-lockfile`, la VM est à court de mémoire.
Utilisez une classe de machine plus grande avant de réessayer.

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

Vérifier la passerelle :

```bash
docker compose logs -f openclaw-gateway
```

Sortie attendue :

```
[gateway] listening on ws://0.0.0.0:18789
```

## Ce qui persiste et où

OpenClaw s'exécute dans Docker, mais Docker n'est pas la source de vérité.
Tout état de longue durée doit survivre aux redémarrages, reconstructions et reboots.

| Composant                          | Emplacement                                            | Mécanisme de persistance   | Notes                                                                                  |
| ---------------------------------- | ------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------- |
| Config Gateway                     | `/home/node/.openclaw/`                                | Montage de volume hôte     | Inclut `openclaw.json`, `.env`                                                         |
| Profils d'auth de modèle           | `/home/node/.openclaw/agents/`                         | Montage de volume hôte     | `agents/<agentId>/agent/auth-profiles.json` (OAuth, clés API)                          |
| Clé de profil d'authentification   | `/home/node/.config/openclaw/`                         | Montage de volume hôte     | Clé de chiffrement locale pour le matériel du jeton de profil d'authentification OAuth |
| Configurations de compétences      | `/home/node/.openclaw/skills/`                         | Montage de volume hôte     | État au niveau de la compétence                                                        |
| Espace de travail de l'agent       | `/home/node/.openclaw/workspace/`                      | Montage de volume hôte     | Code et artefacts de l'agent                                                           |
| Session WhatsApp                   | `/home/node/.openclaw/`                                | Montage de volume hôte     | Préserve la connexion QR                                                               |
| Trousseau de clés Gmail            | `/home/node/.openclaw/`                                | Volume hôte + mot de passe | Nécessite `GOG_KEYRING_PASSWORD`                                                       |
| Packages de plugins                | `/home/node/.openclaw/npm`, `/home/node/.openclaw/git` | Montage de volume hôte     | Racines des packages de plugins téléchargeables                                        |
| Binaires externes                  | `/usr/local/bin/`                                      | Docker image               | Doit être inclus lors de la compilation                                                |
| Runtime Node                       | Système de fichiers conteneur                          | Image Docker               | Reconstruit à chaque construction d'image                                              |
| Packages du système d'exploitation | Système de fichiers du conteneur                       | Image Docker               | Ne pas installer lors de l'exécution                                                   |
| Conteneur Docker                   | Éphémère                                               | Redémarrable               | Sûr à détruire                                                                         |

## Mises à jour

Pour mettre à jour OpenClaw sur la VM :

```bash
git pull
docker compose build
docker compose up -d
```

## Connexes

- [Docker](/fr/install/docker)
- [Podman](/fr/install/podman)
- [ClawDock](/fr/install/clawdock)

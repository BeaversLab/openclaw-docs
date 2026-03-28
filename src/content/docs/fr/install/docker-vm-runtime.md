---
summary: "Étapes d'exécution partagées de VM Docker pour les hôtes OpenClaw Gateway à longue durée de vie"
read_when:
  - You are deploying OpenClaw on a cloud VM with Docker
  - You need the shared binary bake, persistence, and update flow
title: "Docker VM Runtime"
---

# Docker VM Runtime

Étapes d'exécution partagées pour les installations Docker basées sur une VM telles que GCP, Hetzner et des fournisseurs de VPS similaires.

## Intégrer les binaires requis dans l'image

Installer des binaires dans un conteneur en cours d'exécution est un piège.
Tout ce qui est installé au moment de l'exécution sera perdu au redémarrage.

Tous les binaires externes requis par les compétences (skills) doivent être installés au moment de la construction de l'image.

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
FROM node:24-bookworm

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

<Note>Les URLs de téléchargement ci-dessus sont pour x86_64 (amd64). Pour les VM basées sur ARM (par ex. Hetzner ARM, GCP Tau T2A), remplacez les URLs de téléchargement par les variantes ARM64 appropriées depuis la page de publication de chaque outil.</Note>

## Construire et lancer

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Si la construction échoue avec `Killed` ou `exit code 137` pendant `pnpm install --frozen-lockfile`, la VM n'a plus de mémoire.
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

Vérifier Gateway :

```bash
docker compose logs -f openclaw-gateway
```

Sortie attendue :

```
[gateway] listening on ws://0.0.0.0:18789
```

## Ce qui persiste où

OpenClaw s'exécute dans Docker, mais Docker n'est pas la source de vérité.
Tout état de longue durée doit survivre aux redémarrages, reconstructions et reboots.

| Composant                    | Emplacement                       | Mécanisme de persistance   | Notes                                         |
| ---------------------------- | --------------------------------- | -------------------------- | --------------------------------------------- |
| Config Gateway               | `/home/node/.openclaw/`           | Montage de volume hôte     | Inclut `openclaw.json`, jetons                |
| Profils d'auth de modèle     | `/home/node/.openclaw/`           | Montage de volume hôte     | Jeton OAuth, clés API                         |
| Configs de compétence        | `/home/node/.openclaw/skills/`    | Montage de volume hôte     | État au niveau de la compétence               |
| Espace de travail de l'agent | `/home/node/.openclaw/workspace/` | Montage de volume hôte     | Code et artefacts d'agent                     |
| Session WhatsApp             | `/home/node/.openclaw/`           | Montage de volume hôte     | Préserve la connexion QR                      |
| Trousseau de clés Gmail      | `/home/node/.openclaw/`           | Volume hôte + mot de passe | Nécessite `GOG_KEYRING_PASSWORD`              |
| Binaires externes            | `/usr/local/bin/`                 | Image Docker               | Doit être inclus au moment de la construction |
| Runtime Node                 | Système de fichiers conteneur     | Image Docker               | Reconstruit à chaque construction d'image     |
| Paquets OS                   | Système de fichiers conteneur     | Image Docker               | Ne pas installer à l'exécution                |
| Conteneur Docker             | Éphémère                          | Redémarrable               | Sûr à détruire                                |

## Mises à jour

Pour mettre à jour OpenClaw sur la VM :

```bash
git pull
docker compose build
docker compose up -d
```

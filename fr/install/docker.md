---
summary: "Configuration et onboarding optionnels basés sur Docker pour OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker (optionnel)

Docker est **optionnel**. Utilisez-le uniquement si vous souhaitez une passerelle conteneurisée ou pour valider le flux Docker.

## Docker est-il fait pour moi ?

- **Oui** : vous souhaitez un environnement de passerelle isolé et éphémère ou exécuter OpenClaw sur un hôte sans installation locale.
- **Non** : vous exécutez sur votre propre machine et vous voulez simplement la boucle de dev la plus rapide. Utilisez plutôt le flux d'installation normal.
- **Note sur le sandboxing** : le sandboxing de l'agent utilise également Docker, mais cela **ne** nécessite **pas** que la passerelle complète s'exécute dans Docker. Voir [Sandboxing](/fr/gateway/sandboxing).

Ce guide couvre :

- Passerelle conteneurisée (OpenClaw complet dans Docker)
- Agent Sandbox par session (passerelle hôte + outils d'agent isolés par Docker)

Détails du sandboxing : [Sandboxing](/fr/gateway/sandboxing)

## Configuration requise

- Docker Desktop (ou Docker Engine) + Docker Compose v2
- Au moins 2 Go de RAM pour la build de l'image (`pnpm install` peut être tué par OOM sur des hôtes de 1 Go avec le code de sortie 137)
- Assez d'espace disque pour les images + les journaux
- Si vous l'exécutez sur un VPS/hôte public, consultez
  [Durcissement de la sécurité pour l'exposition réseau](/fr/gateway/security#04-network-exposure-bind--port--firewall),
  en particulier la stratégie de pare-feu Docker `DOCKER-USER`.

## Passerelle conteneurisée (Docker Compose)

### Démarrage rapide (recommandé)

<Note>
  Les valeurs par défaut de Docker ici supposent des modes de liaison (`lan`/`loopback`), et non des
  alias d'hôte. Utilisez les valeurs du mode de liaison dans `gateway.bind` (par exemple `lan` ou
  `loopback`), et non des alias d'hôte comme `0.0.0.0` ou `localhost`.
</Note>

Depuis la racine du dépôt :

```bash
./docker-setup.sh
```

Ce script :

- construit localement l'image de la passerelle (ou tire une image distante si `OPENCLAW_IMAGE` est défini)
- exécute l'assistant d'onboarding
- affiche des conseils de configuration optionnels pour le provider
- démarre la passerelle via Docker Compose
- génère un jeton de passerelle et l'écrit dans `.env`

Env vars facultatives :

- `OPENCLAW_IMAGE` — utiliser une image distante au lieu de la construire localement (par ex. `ghcr.io/openclaw/openclaw:latest`)
- `OPENCLAW_DOCKER_APT_PACKAGES` — installer des paquets apt supplémentaires lors de la construction
- `OPENCLAW_EXTENSIONS` — préinstaller les dépendances des extensions au moment de la construction (noms d'extensions séparés par des espaces, par ex. `diagnostics-otel matrix`)
- `OPENCLAW_EXTRA_MOUNTS` — ajouter des montages de liaison d'hôte supplémentaires
- `OPENCLAW_HOME_VOLUME` — rendre persistant `/home/node` dans un volume nommé
- `OPENCLAW_SANDBOX` — activer l'amorçage de la bac à sable de la passerelle Docker. Seules les valeurs de vérité explicites l'activent : `1`, `true`, `yes`, `on`
- `OPENCLAW_INSTALL_DOCKER_CLI` — transmission de l'argument de construction pour les constructions d'images locales (`1` installe le Docker CLI dans l'image). `docker-setup.sh` définit cela automatiquement lorsque `OPENCLAW_SANDBOX=1` pour les constructions locales.
- `OPENCLAW_DOCKER_SOCKET` — remplacer le chemin du socket Docker (par défaut : chemin `DOCKER_HOST=unix://...`, sinon `/var/run/docker.sock`)
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` — break-glass : autoriser les cibles `ws://` de réseau privé de confiance
  pour les chemins client CLI/onboarding (par défaut, boucle locale uniquement)
- `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` — désactiver les indicateurs de durcissement du navigateur de conteneur
  `--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu` lorsque vous avez besoin
  de la compatibilité WebGL/3D.
- `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` — garder les extensions activées lorsque les flux du navigateur
  les nécessitent (par défaut, les extensions restent désactivées dans le navigateur bac à sable).
- `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` — définir la limite du processus de rendu
  Chromium ; définir sur `0` pour ignorer l'indicateur et utiliser le comportement par défaut de Chromium.

Une fois terminé :

- Ouvrez `http://127.0.0.1:18789/` dans votre navigateur.
- Collez le jeton dans l'interface de contrôle (Settings → token).
- Vous avez besoin de l'URL à nouveau ? Exécutez `docker compose run --rm openclaw-cli dashboard --no-open`.

### Activer le bac à sable de l'agent pour la passerelle Docker (optionnel)

`docker-setup.sh` peut également amorcer `agents.defaults.sandbox.*` pour les déploiements
Docker.

Activer avec :

```bash
export OPENCLAW_SANDBOX=1
./docker-setup.sh
```

Chemin de socket personnalisé (par exemple, Docker sans racine) :

```bash
export OPENCLAW_SANDBOX=1
export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
./docker-setup.sh
```

Remarques :

- Le script monte `docker.sock` uniquement après la réussite des prérequis du bac à sable.
- Si la configuration du bac à sable ne peut pas être terminée, le script réinitialise
  `agents.defaults.sandbox.mode` à `off` pour éviter une configuration de bac à sable
  obsolète/corrompue lors des nouvelles exécutions.
- Si `Dockerfile.sandbox` est manquant, le script affiche un avertissement et continue ;
  construisez `openclaw-sandbox:bookworm-slim` avec `scripts/sandbox-setup.sh` si
  nécessaire.
- Pour les valeurs `OPENCLAW_IMAGE` non locales, l'image doit déjà contenir la prise en charge de l'interface de ligne de commande
  Docker pour l'exécution du bac à sable.

### Automatisation/CI (non interactif, sans bruit TTY)

Pour les scripts et l'IC, désactivez l'allocation de pseudo-TTY Compose avec `-T` :

```bash
docker compose run -T --rm openclaw-cli gateway probe
docker compose run -T --rm openclaw-cli devices list --json
```

Si votre automatisation n'exporte aucune variable de session Claude, les laisser non définies résout maintenant par défaut
à des valeurs vides dans `docker-compose.yml` pour éviter les avertissements répétés « variable is not set ».

### Note de sécurité réseau partagé (CLI + passerelle)

`openclaw-cli` utilise `network_mode: "service:openclaw-gateway"` afin que les commandes CLI puissent
atteindre de manière fiable la passerelle via `127.0.0.1` dans Docker.

Considérez cela comme une limite de confiance partagée : la liaison de bouclage n'est pas une isolation entre ces deux
conteneurs. Si vous avez besoin d'une séparation plus forte, exécutez les commandes à partir d'un chemin réseau de conteneur/hôte distinct
au lieu du service `openclaw-cli` groupé.

Pour réduire l'impact si le processus CLI est compromis, la configuration compose supprime
`NET_RAW`/`NET_ADMIN` et active `no-new-privileges` sur `openclaw-cli`.

Il écrit config/workspace sur l'hôte :

- `~/.openclaw/`
- `~/.openclaw/workspace`

Vous exécutez sur un VPS ? Voir [Hetzner (Docker VPS)](/fr/install/hetzner).

### Utiliser une image distante (ignorer la construction locale)

Les images officielles préconstruites sont publiées à :

- [Package GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)

Utilisez le nom d'image `ghcr.io/openclaw/openclaw` (et non les images Docker Hub
au nom similaire).

Balises courantes :

- `main` — dernière construction de `main`
- `<version>` — constructions de balises de version (par exemple `2026.2.26`)
- `latest` — dernière balise de version stable

### Métadonnées de l'image de base

L'image Docker principale utilise actuellement :

- `node:24-bookworm`

L'image docker publie désormais des annotations d'image de base OCI (sha256 est un exemple,
et pointe vers la liste de manifestes multi-arch épinglés pour cette balise) :

- `org.opencontainers.image.base.name=docker.io/library/node:24-bookworm`
- `org.opencontainers.image.base.digest=sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`
- `org.opencontainers.image.source=https://github.com/openclaw/openclaw`
- `org.opencontainers.image.url=https://openclaw.ai`
- `org.opencontainers.image.documentation=https://docs.openclaw.ai/install/docker`
- `org.opencontainers.image.licenses=MIT`
- `org.opencontainers.image.title=OpenClaw`
- `org.opencontainers.image.description=OpenClaw gateway and CLI runtime container image`
- `org.opencontainers.image.revision=<git-sha>`
- `org.opencontainers.image.version=<tag-or-main>`
- `org.opencontainers.image.created=<rfc3339 timestamp>`

Référence : [Annotations d'image OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md)

Contexte de version : l'historique des balises de ce référentiel utilise déjà Bookworm dans
`v2026.2.22` et les balises 2026 antérieures (par exemple `v2026.2.21`, `v2026.2.9`).

Par défaut, le script de configuration construit l'image à partir de la source. Pour extraire une image
préconstruite à la place, définissez `OPENCLAW_IMAGE` avant d'exécuter le script :

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./docker-setup.sh
```

Le script détecte que `OPENCLAW_IMAGE` n'est pas la valeur par défaut `openclaw:local` et
exécute `docker pull` au lieu de `docker build`. Tout le reste (onboarding,
démarrage de la passerelle, génération de jeton) fonctionne de la même manière.

`docker-setup.sh` s'exécute toujours à partir de la racine du référentiel car il utilise le fichier `docker-compose.yml` et les fichiers auxiliaires locaux. `OPENCLAW_IMAGE` évite le temps de construction de l'image locale ; il ne remplace pas le workflow compose/setup.

### Assistants de shell (optionnel)

Pour une gestion quotidienne plus facile de Docker, installez `ClawDock` :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
```

**Ajoutez à votre configuration de shell (zsh) :**

```bash
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Utilisez ensuite `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Exécutez `clawdock-help` pour toutes les commandes.

Consultez le [README de l'assistant `ClawDock`](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md) pour plus de détails.

### Flux manuel (compose)

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

Remarque : exécutez `docker compose ...` à partir de la racine du dépôt. Si vous avez activé `OPENCLAW_EXTRA_MOUNTS` ou `OPENCLAW_HOME_VOLUME`, le script de configuration écrit `docker-compose.extra.yml` ; incluez-le lors de l'exécution de Compose ailleurs :

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml <command>
```

### Jeton d'interface de contrôle + appairage (Docker)

Si vous voyez « non autorisé » ou « déconnecté (1008) : appairage requis », récupérez un lien de tableau de bord frais et approuvez l'appareil du navigateur :

```bash
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

Plus de détails : [Tableau de bord](/fr/web/dashboard), [Appareils](/fr/cli/devices).

### Montages supplémentaires (optionnel)

Si vous souhaitez monter des répertoires d'hôte supplémentaires dans les conteneurs, définissez `OPENCLAW_EXTRA_MOUNTS` avant d'exécuter `docker-setup.sh`. Cela accepte une liste séparée par des virgules de montages de liaison Docker et les applique à la fois à `openclaw-gateway` et à `openclaw-cli` en générant `docker-compose.extra.yml`.

Exemple :

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

Notes :

- Les chemins doivent être partagés avec Docker Desktop sur macOS/Windows.
- Chaque entrée doit être `source:target[:options]` sans espaces, tabulations ou sauts de ligne.
- Si vous modifiez `OPENCLAW_EXTRA_MOUNTS`, réexécutez `docker-setup.sh` pour régénérer le fichier compose supplémentaire.
- `docker-compose.extra.yml` est généré. Ne le modifiez pas manuellement.

### Conserver l'intégralité du répertoire personnel du conteneur (optionnel)

Si vous voulez que `/home/node` persiste lors de la recréation du conteneur, définissez un volume nommé via `OPENCLAW_HOME_VOLUME`. Cela crée un volume Docker et le monte sur `/home/node`, tout en conservant les montages de liaison standards pour config/workspace. Utilisez ici un volume nommé (pas un chemin de liaison); pour les montages de liaison, utilisez `OPENCLAW_EXTRA_MOUNTS`.

Exemple :

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

Vous pouvez combiner cela avec des montages supplémentaires :

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

Remarques :

- Les volumes nommés doivent correspondre à `^[A-Za-z0-9][A-Za-z0-9_.-]*$`.
- Si vous modifiez `OPENCLAW_HOME_VOLUME`, relancez `docker-setup.sh` pour régénérer le fichier compose supplémentaire.
- Le volume nommé persiste jusqu'à ce qu'il soit supprimé avec `docker volume rm <name>`.

### Installer des packages apt supplémentaires (facultatif)

Si vous avez besoin de packages système dans l'image (par exemple, des outils de build ou des bibliothèques multimédias), définissez `OPENCLAW_DOCKER_APT_PACKAGES` avant d'exécuter `docker-setup.sh`. Cela installe les packages lors de la construction de l'image, ils persistent donc même si le conteneur est supprimé.

Exemple :

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

Remarques :

- Cela accepte une liste de noms de packages apt séparés par des espaces.
- Si vous modifiez `OPENCLAW_DOCKER_APT_PACKAGES`, relancez `docker-setup.sh` pour reconstruire l'image.

### Préinstaller les dépendances des extensions (facultatif)

Les extensions ayant leur propre `package.json` (par exemple `diagnostics-otel`, `matrix`, `msteams`) installent leurs dépendances npm au premier chargement. Pour intégrer ces dépendances à l'image à la place, définissez `OPENCLAW_EXTENSIONS` avant d'exécuter `docker-setup.sh` :

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel matrix"
./docker-setup.sh
```

Ou lors de la construction directe :

```bash
docker build --build-arg OPENCLAW_EXTENSIONS="diagnostics-otel matrix" .
```

Remarques :

- Cela accepte une liste de noms de répertoires d'extensions séparés par des espaces (sous `extensions/`).
- Seules les extensions ayant un `package.json` sont concernées; les plugins légers n'en ayant pas sont ignorés.
- Si vous modifiez `OPENCLAW_EXTENSIONS`, relancez `docker-setup.sh` pour reconstruire l'image.

### Conteneur pour utilisateur avancé / complet (optionnel)

L'image Docker par défaut est axée sur la **sécurité** et s'exécute en tant qu'utilisateur non-root `node`. Cela réduit la surface d'attaque, mais cela signifie :

- pas d'installation de paquets système à l'exécution
- pas de Homebrew par défaut
- pas de navigateurs Chromium/Playwright inclus

Si vous souhaitez un conteneur plus complet, utilisez ces options d'activation :

1. **Conserver `/home/node`** afin que les téléchargements du navigateur et les caches des outils soient conservés :

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

2. **Intégrer les dépendances système dans l'image** (reproductible + persistant) :

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"
./docker-setup.sh
```

3. **Installer les navigateurs Playwright sans `npx`** (évite les conflits de remplacement npm) :

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Si vous avez besoin que Playwright installe des dépendances système, reconstruisez l'image avec `OPENCLAW_DOCKER_APT_PACKAGES` au lieu d'utiliser `--with-deps` à l'exécution.

4. **Conserver les téléchargements des navigateurs Playwright** :

- Définissez `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` dans `docker-compose.yml`.
- Assurez-vous que `/home/node` persiste via `OPENCLAW_HOME_VOLUME`, ou montez `/home/node/.cache/ms-playwright` via `OPENCLAW_EXTRA_MOUNTS`.

### Permissions + EACCES

L'image s'exécute en tant que `node` (uid 1000). Si vous voyez des erreurs de permissions sur `/home/node/.openclaw`, assurez-vous que vos montages de liaison d'hôte sont détenus par l'uid 1000.

Exemple (hôte Linux) :

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si vous choisissez de l'exécuter en root pour plus de commodité, vous acceptez le compromis de sécurité.

### Reconstructions plus rapides (recommandé)

Pour accélérer les reconstructions, organisez votre Dockerfile afin que les couches de dépendances soient mises en cache. Cela évite de réexécuter `pnpm install` sauf si les fichiers de verrouillage changent :

```dockerfile
FROM node:24-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# Cache dependencies unless package metadata changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

### Configuration des canaux (optionnel)

Utilisez le conteneur CLI pour configurer les canaux, puis redémarrez la passerelle si nécessaire.

WhatsApp (QR) :

```bash
docker compose run --rm openclaw-cli channels login
```

Telegram (jeton de bot) :

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"
```

Discord (jeton de bot) :

```bash
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

Documentation : [WhatsApp](/fr/channels/whatsapp), [Telegram](/fr/channels/telegram), [Discord](/fr/channels/discord)

### OpenAI Codex OAuth (Docker sans interface)

Si vous choisissez OpenAI Codex OAuth dans l'assistant, cela ouvre une URL de navigateur et tente de capturer un rappel sur `http://127.0.0.1:1455/auth/callback`. Dans Docker ou les configurations sans interface graphique, ce rappel peut afficher une erreur de navigateur. Copiez l'URL de redirection complète sur laquelle vous atterrissez et collez-la dans l'assistant pour terminer l'authentification.

### Contrôles de santé

Points de terminaison de sonde de conteneur (aucune authentification requise) :

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
```

Alias : `/health` et `/ready`.

`/healthz` est une sonde de vivacité superficielle pour « le processus de passerelle est actif ».
`/readyz` reste prêt pendant le délai de grâce de démarrage, puis passe à `503` uniquement si les canaux gérés requis sont toujours déconnectés après le délai de grâce ou se déconnectent ultérieurement.

L'image Docker inclut un `HEALTHCHECK` intégré qui effectue un ping sur `/healthz` en arrière-plan. En termes simples : Docker vérifie continuellement si OpenClaw est toujours réactif. Si les contrôles échouent de manière répétée, Docker marque le conteneur comme `unhealthy`, et les systèmes d'orchestration (stratégie de redémarrage Docker Compose, Swarm, Kubernetes, etc.) peuvent le redémarrer ou le remplacer automatiquement.

Instantané de santé approfondi authentifié (passerelle + canaux) :

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### Test de fumée E2E (Docker)

```bash
scripts/e2e/onboard-docker.sh
```

### Test de fumée d'importation QR (Docker)

```bash
pnpm test:docker:qr
```

### LAN vs boucle locale (Docker Compose)

`docker-setup.sh` définit `OPENCLAW_GATEWAY_BIND=lan` par défaut afin que l'accès de l'hôte à `http://127.0.0.1:18789` fonctionne avec la publication de ports Docker.

- `lan` (par défaut) : le navigateur de l'hôte + la CLI de l'hôte peuvent atteindre le port de passerelle publié.
- `loopback` : seuls les processus à l'intérieur de l'espace de noms réseau du conteneur peuvent atteindre directement la passerelle ; l'accès au port publié par l'hôte peut échouer.

Le script de configuration définit également `gateway.mode=local` après l'intégration afin que les commandes de la Docker CLI ciblent par défaut la boucle locale.

Note relative à l'ancienne configuration : utilisez les valeurs du mode de liaison dans `gateway.bind` (`lan` / `loopback` /
`custom` / `tailnet` / `auto`), et non les alias d'hôte (`0.0.0.0`, `127.0.0.1`,
`localhost`, `::`, `::1`).

Si vous voyez des erreurs `Gateway target: ws://172.x.x.x:18789` ou répétées `pairing required`
à partir des commandes Docker CLI, exécutez :

```bash
docker compose run --rm openclaw-cli config set gateway.mode local
docker compose run --rm openclaw-cli config set gateway.bind lan
docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
```

### Notes

- La liaison de la Gateway est par défaut `lan` pour l'utilisation du conteneur (`OPENCLAW_GATEWAY_BIND`).
- Le CMD du Dockerfile utilise `--allow-unconfigured` ; une configuration montée avec `gateway.mode` et non `local` démarrera quand même. Remplacez le CMD pour appliquer la garde.
- Le conteneur de passerelle est la source de vérité pour les sessions (`~/.openclaw/agents/<agentId>/sessions/`).

### Modèle de stockage

- **Données persistantes de l'hôte :** Docker Compose monte `OPENCLAW_CONFIG_DIR` dans `/home/node/.openclaw` et `OPENCLAW_WORKSPACE_DIR` dans `/home/node/.openclaw/workspace` par liaison, ces chemins survivent donc au remplacement du conteneur.
- **tmpfs éphémère du bac à sable :** lorsque `agents.defaults.sandbox` est activé, les conteneurs du bac à sable utilisent `tmpfs` pour `/tmp`, `/var/tmp` et `/run`. Ces montages sont distincts de la pile Compose de niveau supérieur et disparaissent avec le conteneur du bac à sable.
- **Points chauds de croissance du disque :** surveillez `media/`, `agents/<agentId>/sessions/sessions.json`, les fichiers JSONL de transcription, `cron/runs/*.jsonl` et les journaux de fichiers tournants sous `/tmp/openclaw/` (ou votre `logging.file` configuré). Si vous exécutez également l'application macOS en dehors de Docker, ses journaux de service sont à nouveau séparés : `~/.openclaw/logs/gateway.log`, `~/.openclaw/logs/gateway.err.log` et `/tmp/openclaw/openclaw-gateway.log`.

## Sandbox d'agent (passerelle hôte + outils Docker)

Pour aller plus loin : [Sandboxing](/fr/gateway/sandboxing)

### Ce qu'il fait

Lorsque `agents.defaults.sandbox` est activé, les **sessions non principales** exécutent des outils dans un conteneur Docker. La passerelle reste sur votre hôte, mais l'exécution de l'outil est isolée :

- portée : `"agent"` par défaut (un conteneur + un espace de travail par agent)
- portée : `"session"` pour une isolation par session
- dossier de l'espace de travail par portée monté sur `/workspace`
- accès facultatif à l'espace de travail de l'agent (`agents.defaults.sandbox.workspaceAccess`)
- stratégie d'autorisation/refus des outils (le refus l'emporte)
- les médias entrants sont copiés dans l'espace de travail du sandbox actif (`media/inbound/*`) afin que les outils puissent les lire (avec `workspaceAccess: "rw"`, cela atterrit dans l'espace de travail de l'agent)

Avertissement : `scope: "shared"` désactive l'isolation inter-session. Toutes les sessions partagent un conteneur et un espace de travail.

### Profils de sandbox par agent (multi-agent)

Si vous utilisez le routage multi-agent, chaque agent peut remplacer les paramètres de sandbox et d'outils :
`agents.list[].sandbox` et `agents.list[].tools` (ainsi que `agents.list[].tools.sandbox.tools`). Cela vous permet d'exécuter des niveaux d'accès mixtes sur une passerelle :

- Accès complet (agent personnel)
- Outils en lecture seule + espace de travail en lecture seule (agent famille/travail)
- Aucun outil de système de fichiers/shell (agent public)

Voir [Sandbox et outils multi-agents](/fr/tools/multi-agent-sandbox-tools) pour des exemples,
l'ordre de priorité et le dépannage.

### Comportement par défaut

- Image : `openclaw-sandbox:bookworm-slim`
- Un conteneur par agent
- Accès à l'espace de travail de l'agent : `workspaceAccess: "none"` (par défaut) utilise `~/.openclaw/sandboxes`
  - `"ro"` conserve l'espace de travail du bac à sable à `/workspace` et monte l'espace de travail de l'agent en lecture seule à `/agent` (désactive `write`/`edit`/`apply_patch`)
  - `"rw"` monte l'espace de travail de l'agent en lecture/écriture à `/workspace`
- Nettoyage automatique : inactif > 24 h OU âge > 7 j
- Réseau : `none` par défaut (acceptez explicitement si vous avez besoin d'un trafic sortant)
  - `host` est bloqué.
  - `container:<id>` est bloqué par défaut (risque de jointure d'espace de noms).
- Autorisation par défaut : `exec`, `process`, `read`, `write`, `edit`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- Refus par défaut : `browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway`

### Activer le sandboxing

Si vous prévoyez d'installer des paquets dans `setupCommand`, notez :

- `docker.network` par défaut est `"none"` (pas de trafic sortant).
- `docker.network: "host"` est bloqué.
- `docker.network: "container:<id>"` est bloqué par défaut.
- Contournement de secours : `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.
- `readOnlyRoot: true` bloque les installations de paquets.
- `user` doit être la racine pour `apt-get` (omettez `user` ou définissez `user: "0:0"`).
  OpenClaw recrée automatiquement les conteneurs lorsque `setupCommand` (ou la configuration docker) change
  à moins que le conteneur n'ait été **utilisé récemment** (environ 5 minutes). Les conteneurs à chaud
  consignent un avertissement avec la commande exacte `openclaw sandbox recreate ...`.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent is default)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7, // 0 disables max-age pruning
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

Les paramètres de durcissement se trouvent sous `agents.defaults.sandbox.docker` :
`network`, `user`, `pidsLimit`, `memory`, `memorySwap`, `cpus`, `ulimits`,
`seccompProfile`, `apparmorProfile`, `dns`, `extraHosts`,
`dangerouslyAllowContainerNamespaceJoin` (break-glass uniquement).

Multi-agent : remplacer `agents.defaults.sandbox.{docker,browser,prune}.*` par agent via `agents.list[].sandbox.{docker,browser,prune}.*`
(ignoré lorsque `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` est `"shared"`).

### Construire l'image de bac à sable par défaut

```bash
scripts/sandbox-setup.sh
```

Cela construit `openclaw-sandbox:bookworm-slim` en utilisant `Dockerfile.sandbox`.

### Image commune de bac à sable (facultatif)

Si vous souhaitez une image de bac à sable avec des outils de construction courants (Node, Go, Rust, etc.), construisez l'image commune :

```bash
scripts/sandbox-common-setup.sh
```

Cela construit `openclaw-sandbox-common:bookworm-slim`. Pour l'utiliser :

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "openclaw-sandbox-common:bookworm-slim" } },
    },
  },
}
```

### Image du navigateur de bac à sable

Pour exécuter l'outil de navigateur dans le bac à sable, construisez l'image du navigateur :

```bash
scripts/sandbox-browser-setup.sh
```

Cela construit `openclaw-sandbox-browser:bookworm-slim` en utilisant
`Dockerfile.sandbox-browser`. Le conteneur exécute Chromium avec CDP activé et
un observateur noVNC facultatif (headful via Xvfb).

Remarques :

- Headful (Xvfb) réduit le blocage des bots par rapport à headless.
- Headless peut toujours être utilisé en définissant `agents.defaults.sandbox.browser.headless=true`.
- Aucun environnement de bureau complet (GNOME) n'est nécessaire ; Xvfb fournit l'affichage.
- Les conteneurs de navigateur utilisent par défaut un réseau Docker dédié (`openclaw-sandbox-browser`) au lieu du `bridge` global.
- L'option `agents.defaults.sandbox.browser.cdpSourceRange` facultative restreint l'ingress CDP au niveau du conteneur par CIDR (par exemple `172.21.0.1/32`).
- L'accès observateur noVNC est protégé par mot de passe par défaut ; OpenClaw fournit une URL de jeton d'observateur à courte durée de vie qui sert une page d'amorçage locale et conserve le mot de passe dans le fragment d'URL (au lieu de la requête URL).
- Les valeurs par défaut de démarrage du conteneur de navigateur sont prudentes pour les charges de travail partagées/conteneurisées, notamment :
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-software-rasterizer`
  - `--disable-gpu`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--metrics-recording-only`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--disable-extensions`
  - Si `agents.defaults.sandbox.browser.noSandbox` est défini, `--no-sandbox` et
    `--disable-setuid-sandbox` sont également ajoutés.
  - Les trois indicateurs de durcissement graphique ci-dessus sont facultatifs. Si votre charge de travail a besoin
    de WebGL/3D, définissez `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` pour exécuter sans
    `--disable-3d-apis`, `--disable-software-rasterizer` et `--disable-gpu`.
  - Le comportement des extensions est contrôlé par `--disable-extensions` et peut être désactivé
    (active les extensions) via `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` pour
    les pages dépendantes des extensions ou les workflows lourds en extensions.
  - `--renderer-process-limit=2` est également configurable avec
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT` ; définissez `0` pour laisser Chromium choisir sa
    limite de processus par défaut lorsque la concurrence du navigateur doit être ajustée.

Les valeurs par défaut sont appliquées par défaut dans l'image groupée. Si vous avez besoin de drapeaux Chromium différents, utilisez une image de navigateur personnalisée et fournissez votre propre point d'entrée.

Utiliser la config :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true },
      },
    },
  },
}
```

Image de navigateur personnalisée :

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-openclaw-browser" } },
    },
  },
}
```

Lorsqu'il est activé, l'agent reçoit :

- une URL de contrôle du navigateur de bac à sable (pour l'outil `browser`)
- une URL noVNC (si activé et headless=false)

Rappelez-vous : si vous utilisez une liste d'autorisation pour les outils, ajoutez `browser` (et supprimez-le de deny) sinon l'outil reste bloqué.
Les règles de nettoyage (`agents.defaults.sandbox.prune`) s'appliquent également aux conteneurs de navigateur.

### Image de bac à sable personnalisée

Créez votre propre image et pointez la configuration vers celle-ci :

```bash
docker build -t my-openclaw-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-openclaw-sbx" } },
    },
  },
}
```

### Stratégie d'outil (autoriser/refuser)

- `deny` prime sur `allow`.
- Si `allow` est vide : tous les outils (sauf deny) sont disponibles.
- Si `allow` n'est pas vide : seuls les outils dans `allow` sont disponibles (moins deny).

### Stratégie de nettoyage

Deux commandes :

- `prune.idleHours` : supprimer les conteneurs non utilisés depuis X heures (0 = désactiver)
- `prune.maxAgeDays` : supprimer les conteneurs âgés de plus de X jours (0 = désactiver)

Exemple :

- Garder les sessions occupées mais limiter la durée de vie :
  `idleHours: 24`, `maxAgeDays: 7`
- Ne jamais nettoyer :
  `idleHours: 0`, `maxAgeDays: 0`

### Notes de sécurité

- Le mur rigide ne s'applique qu'aux **outils** (exec/read/write/edit/apply_patch).
- Les outils réservés à l'hôte tels que navigateur/caméra/canvas sont bloqués par défaut.
- Autoriser `browser` dans le bac à sable **brise l'isolement** (le navigateur s'exécute sur l'hôte).

## Dépannage

- Image manquante : construisez avec [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) ou définissez `agents.defaults.sandbox.docker.image`.
- Conteneur non en cours d'exécution : il sera créé automatiquement à la demande par session.
- Erreurs de permission dans le bac à sable : définissez `docker.user` sur un UID:GID correspondant à la propriété de votre espace de travail monté (ou faites un chown du dossier de l'espace de travail).
- Outils personnalisés introuvables : OpenClaw exécute les commandes avec `sh -lc` (shell de connexion), ce qui
  approvisionne `/etc/profile` et peut réinitialiser PATH. Définissez `docker.env.PATH` pour ajouter en préambule vos
  chemins d'outils personnalisés (p. ex., `/custom/bin:/usr/local/share/npm-global/bin`), ou ajoutez
  un script sous `/etc/profile.d/` dans votre Dockerfile.

import fr from "/components/footer/fr.mdx";

<fr />

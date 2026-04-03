---
summary: "Configuration et intégration optionnelles basées sur Docker pour OpenClaw"
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
- **Sandboxing note** : l'isolation de l'agent utilise également Docker, mais cela **ne** nécessite pas que la passerelle complète s'exécute dans Docker. Voir [Sandboxing](/en/gateway/sandboxing).

## Prérequis

- Docker Desktop (ou Docker Engine) + Docker Compose v2
- Au moins 2 Go de RAM pour la compilation de l'image (`pnpm install` peut être tué par OOM sur des hôtes de 1 Go avec le code de sortie 137)
- Assez d'espace disque pour les images et les journaux
- Si vous utilisez un VPS/hôte public, consultez
  [Sécurisation renforcée pour l'exposition au réseau](/en/gateway/security),
  en particulier la stratégie de pare-feu Docker `DOCKER-USER`.

## Passerelle conteneurisée

<Steps>
  <Step title="Créer l'image">
    À partir de la racine du dépôt, exécutez le script de configuration :

    ```bash
    ./scripts/docker/setup.sh
    ```

    Cela crée l'image de la passerelle localement. Pour utiliser une image préconstruite à la place :

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Les images préconstruites sont publiées sur le
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Balises courantes : `main`, `latest`, `<version>` (ex. `2026.2.26`).

  </Step>

  <Step title="Compléter l'onboarding">
    Le script de configuration exécute l'onboarding automatiquement. Il va :

    - demander les clés API du provider
    - générer un jeton de passerelle et l'écrire dans `.env`
    - démarrer la passerelle via API Compose

    Lors de la configuration, l'onboarding pré-démarrage et les écritures de configuration s'exécutent directement via `openclaw-gateway`. `openclaw-cli` est destiné aux commandes que vous exécutez après que le conteneur de la passerelle existe déjà.

  </Step>

  <Step title="Ouvrir l'interface de contrôle">
    Ouvrez `http://127.0.0.1:18789/` dans votre navigateur et collez le jeton dans
    Paramètres.

    Besoin de l'URL à nouveau ?

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configurer les canaux (optionnel)">
    Utilisez le conteneur CLI pour ajouter des canaux de messagerie :

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    Docs : [WhatsApp](/en/channels/whatsapp), [Telegram](/en/channels/telegram), [Discord](/en/channels/discord)

  </Step>
</Steps>

### Flux manuel

Si vous préférez exécuter chaque étape vous-même au lieu d'utiliser le script de configuration :

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.mode local
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.bind lan
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.controlUi.allowedOrigins \
  '["http://localhost:18789","http://127.0.0.1:18789"]' --strict-json
docker compose up -d openclaw-gateway
```

<Note>Exécutez `docker compose` à partir de la racine du dépôt. Si vous avez activé `OPENCLAW_EXTRA_MOUNTS` ou `OPENCLAW_HOME_VOLUME`, le script de configuration écrit `docker-compose.extra.yml` ; incluez-le avec `-f docker-compose.yml -f docker-compose.extra.yml`.</Note>

<Note>Because `openclaw-cli` shares `openclaw-gateway`'s network namespace, it is a post-start tool. Before `docker compose up -d openclaw-gateway`, run onboarding and setup-time config writes through `openclaw-gateway` with `--no-deps --entrypoint node`.</Note>

### Variables d'environnement

Le script d'installation accepte ces variables d'environnement optionnelles :

| Variable                       | Objet                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | Utiliser une image distante au lieu de construire localement                                         |
| `OPENCLAW_DOCKER_APT_PACKAGES` | Installer des paquets apt supplémentaires lors de la construction (séparés par des espaces)          |
| `OPENCLAW_EXTENSIONS`          | Préinstaller les dépendances d'extension au moment de la construction (noms séparés par des espaces) |
| `OPENCLAW_EXTRA_MOUNTS`        | Extra host bind mounts (comma-separated `source:target[:opts]`)                                      |
| `OPENCLAW_HOME_VOLUME`         | Persist `/home/node` in a named Docker volume                                                        |
| `OPENCLAW_SANDBOX`             | Opt in to sandbox bootstrap (`1`, `true`, `yes`, `on`)                                               |
| `OPENCLAW_DOCKER_SOCKET`       | Remplacer le chemin du socket Docker                                                                 |

### Contrôles de santé

Points de terminaison de sonde de conteneur (aucune authentification requise) :

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

L'image Docker inclut un `HEALTHCHECK` intégré qui effectue un ping sur `/healthz`.
Si les vérifications continuent d'échouer, Docker marque le conteneur comme `unhealthy` et
les systèmes d'orchestration peuvent le redémarrer ou le remplacer.

Instantané de santé profonde authentifié :

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs boucle locale

`scripts/docker/setup.sh` définit `OPENCLAW_GATEWAY_BIND=lan` par défaut, de sorte que l'accès de l'hôte à
`http://127.0.0.1:18789` fonctionne avec la publication de ports Docker.

- `lan` (par défaut) : le navigateur de l'hôte et le CLI de l'hôte peuvent atteindre le port de passerelle publié.
- `loopback` : seuls les processus à l'intérieur de l'espace de noms réseau du conteneur peuvent atteindre
  directement la passerelle.

<Note>Utilisez les valeurs du mode bind dans `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), et non les alias d'hôte comme `0.0.0.0` ou `127.0.0.1`.</Note>

### Stockage et persistance

Docker Compose monte `OPENCLAW_CONFIG_DIR` dans `/home/node/.openclaw` et
`OPENCLAW_WORKSPACE_DIR` dans `/home/node/.openclaw/workspace`, ces chemins
donc survivent au remplacement du conteneur.

Pour tous les détails sur la persistance des déploiements VM, voir
[Docker VM Runtime - What persists where](/en/install/docker-vm-runtime#what-persists-where).

**Points chauds de croissance du disque :** surveillez `media/`, les fichiers JSONL de session, `cron/runs/*.jsonl`,
et les journaux de fichiers tournants sous `/tmp/openclaw/`.

### Assistants de shell (facultatif)

Pour une gestion plus facile de Docker au quotidien, installez `ClawDock` :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si vous avez installé ClawDock à partir de l'ancien chemin brut `scripts/shell-helpers/clawdock-helpers.sh`, réexécutez la commande d'installation ci-dessus afin que votre fichier d'assistance local suive le nouvel emplacement.

Ensuite, utilisez `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Exécutez
`clawdock-help` pour toutes les commandes.
Consultez [ClawDock](/en/install/clawdock) pour le guide complet de l'assistant.

<AccordionGroup>
  <Accordion title="Activer le bac à sable de l'agent pour la passerelle Docker">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Chemin de socket personnalisé (ex. Docker sans racine) :

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    Le script monte `docker.sock` uniquement une fois les prérequis du bac à sable remplis. Si
    la configuration du bac à sable ne peut pas être terminée, le script réinitialise `agents.defaults.sandbox.mode`
    à `off`.

  </Accordion>

  <Accordion title="Automatisation / CI (non-interactif)">
    Désactivez l'allocation de pseudo-TTY Compose avec `-T` :

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Note de sécurité pour le réseau partagé">`openclaw-cli` utilise `network_mode: "service:openclaw-gateway"` afin que les commandes CLI puissent atteindre la passerelle via `127.0.0.1`. Traitez cela comme une frontière de confiance partagée. La configuration compose abandonne `NET_RAW`/`NET_ADMIN` et active `no-new-privileges` sur `openclaw-cli`.</Accordion>

  <Accordion title="Autorisations et EACCES">
    L'image s'exécute en tant que `node` (uid 1000). Si vous rencontrez des erreurs de permissions sur
    `/home/node/.openclaw`, assurez-vous que vos montages de liaison (bind mounts) de l'hôte appartiennent à l'uid 1000 :

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="Reconstructions plus rapides">
    Ordonnez votre Dockerfile afin que les couches de dépendances soient mises en cache. Cela évite de réexécuter
    `pnpm install` sauf si les fichiers de verrouillage (lockfiles) changent :

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
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

  </Accordion>

  <Accordion title="Options de conteneur pour utilisateurs avancés">
    L'image par défaut privilégie la sécurité et s'exécute en tant que `node` non-root. Pour un conteneur
    plus complet :

    1. **Persister `/home/node`** : `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **Intégrer les dépendances système** : `export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **Installer les navigateurs Playwright** :
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **Persister les téléchargements du navigateur** : définissez
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` et utilisez
       `OPENCLAW_HOME_VOLUME` ou `OPENCLAW_EXTRA_MOUNTS`.

  </Accordion>

<Accordion title="OpenAI Codex OAuth (headless Docker)">Si vous choisissez OpenAI Codex OAuth dans l'assistant, il ouvre une URL de navigateur. Dans Docker ou les configurations sans interface (headless), copiez l'URL de redirection complète sur laquelle vous atterrissez et collez-la dans l'assistant pour terminer l'authentification.</Accordion>

  <Accordion title="Métadonnées de l'image de base">
    L'image principale Docker utilise `node:24-bookworm` et publie des annotations d'image de base OCI, notamment `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source` et d'autres. Voir
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### Exécution sur un VPS ?

Voir [Hetzner (VPS Docker)](/en/install/hetzner) et
[Docker VM Runtime](/en/install/docker-vm-runtime) pour les étapes de déploiement sur VM partagée,
y compris l'intégration binaire, la persistance et les mises à jour.

## Agent Sandbox

Lorsque `agents.defaults.sandbox` est activé, la passerelle exécute les outils de l'agent
(shell, lecture/écriture de fichiers, etc.) dans des conteneurs Docker isolés, tandis que la
passerelle elle-même reste sur l'hôte. Cela vous offre une cloison étanche autour des sessions d'agent
non fiables ou multi-locataires sans conteneuriser l'ensemble de la passerelle.

La portée du bac à sable (sandbox) peut être par agent (par défaut), par session, ou partagée. Chaque portée
obtient son propre espace de travail monté sur `/workspace`. Vous pouvez également configurer
les stratégies d'autorisation/refus des outils, l'isolation réseau, les limites de ressources et les
conteneurs de navigateur.

Pour la configuration complète, les images, les notes de sécurité et les profils multi-agents, consultez :

- [Sandboxing](/en/gateway/sandboxing) -- référence complète du bac à sable
- [OpenShell](/en/gateway/openshell) -- accès interactif au shell des conteneurs du bac à sable
- [Multi-Agent Sandbox and Tools](/en/tools/multi-agent-sandbox-tools) -- redéfinitions par agent

### Activation rapide

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

Générez l'image de bac à sable par défaut :

```bash
scripts/sandbox-setup.sh
```

## Dépannage

<AccordionGroup>
  <Accordion title="Image manquante ou conteneur du bac à sable ne démarre pas">
    Générez l'image du bac à sable avec
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    ou définissez `agents.defaults.sandbox.docker.image` sur votre image personnalisée.
    Les conteneurs sont créés automatiquement par session à la demande.
  </Accordion>

<Accordion title="Erreurs de permission dans le bac à sable">Définissez `docker.user` sur un UID:GID correspondant à la propriété de votre espace de travail monté, ou exécutez chown sur le dossier de l'espace de travail.</Accordion>

<Accordion title="Outils personnalisés introuvables dans le bac à sable">OpenClaw exécute les commandes avec `sh -lc` (shell de connexion), qui sourcelise `/etc/profile` et peut réinitialiser le PATH. Définissez `docker.env.PATH` pour ajouter vos chemins d'outils personnalisés, ou ajoutez un script sous `/etc/profile.d/` dans votre Dockerfile.</Accordion>

<Accordion title="OOM-killed pendant la génération de l'image (exit 137)">La VM nécessite au moins 2 Go de RAM. Utilisez une classe de machine plus grande et réessayez.</Accordion>

  <Accordion title="Non autorisé ou appairage requis dans l'interface de contrôle">
    Récupérez un lien frais vers le tableau de bord et approuvez l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Plus de détails : [Tableau de bord](/en/web/dashboard), [Appareils](/en/cli/devices).

  </Accordion>

  <Accordion title="La cible de la Gateway affiche ws://172.x.x.x ou des erreurs d'appairage depuis la Docker CLI">
    Réinitialisez le mode de passerelle et la liaison :

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Connexes

- [Vue d'ensemble de l'installation](/en/install) — toutes les méthodes d'installation
- [Podman](/en/install/podman) — alternative Podman à Docker
- [ClawDock](/en/install/clawdock) — configuration communautaire Docker Compose
- [Mises à jour](/en/install/updating) — garder OpenClaw à jour
- [Configuration](/en/gateway/configuration) — configuration de la passerelle après l'installation

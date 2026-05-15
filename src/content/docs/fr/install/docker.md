---
summary: "DockerOpenClawInstallation et onboarding optionnels basés sur Docker pour OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "DockerDocker"
---

Docker est **optionnel**. Utilisez-le uniquement si vous souhaitez une passerelle conteneurisée ou pour valider le flux Docker.

## Docker est-il fait pour moi ?

- **Oui** : vous souhaitez un environnement de passerelle isolé et éphémère, ou exécuter OpenClaw sur un hôte sans installation locale.
- **Non** : vous exécutez sur votre propre machine et vous voulez simplement la boucle de développement la plus rapide. Utilisez plutôt le flux d'installation normal.
- **Note de sandboxing** : le backend de sandboxing par défaut utilise Docker lorsque le sandboxing est activé, mais le sandboxing est désactivé par défaut et n'exige **pas** que la passerelle complète s'exécute dans Docker. Les backends de sandboxing SSH et OpenShell sont également disponibles. Voir [Sandboxing](DockerDocker/en/gateway/sandboxing).

## Prérequis

- Docker Desktop (ou Docker Engine) + Docker Compose v2
- Au moins 2 Go de RAM pour la build de l'image (`pnpm install` peut être tué pour manque de mémoire sur des hôtes de 1 Go avec le code de sortie 137)
- Assez d'espace disque pour les images et les journaux
- Si vous exécutez sur un VPS/hôte public, revoyez
  [Durcissement de la sécurité pour l'exposition réseau](/fr/gateway/securityDocker),
  en particulier la stratégie de pare-feu Docker `DOCKER-USER`.

## Passerelle conteneurisée

<Steps>
  <Step title="Construire l'image">
    Depuis la racine du dépôt, exécutez le script de configuration :

    ```bash
    ./scripts/docker/setup.sh
    ```

    Cela construit l'image de la passerelle localement. Pour utiliser une image préconstruite à la place :

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```GitHub

    Les images préconstruites sont publiées sur le
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Balises courantes : `main`, `latest`, `<version>` (par ex. `2026.2.26`).

  </Step>

  <Step title="Terminer l'onboarding"API>
    Le script de configuration exécute l'onboarding automatiquement. Il va :

    - demander les clés API du provider
    - générer un jeton de passerelle et l'écrire dans `.env`Docker
    - démarrer la passerelle via Docker Compose

    Pendant la configuration, l'onboarding et les écritures de configuration avant démarrage s'exécutent via
    `openclaw-gateway` directement. `openclaw-cli` est destiné aux commandes que vous exécutez après
    que le conteneur de la passerelle existe déjà.

  </Step>

  <Step title="Open the Control UI">
    Open `http://127.0.0.1:18789/` in your browser and paste the configured
    shared secret into Settings. The setup script writes a token to `.env` by
    default; if you switch the container config to password auth, use that
    password instead.

    Need the URL again?

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configure channels (optional)">
    Use the CLI container to add messaging channels:

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    Docs: [WhatsApp](/fr/channels/whatsapp), [Telegram](/fr/channels/telegram), [Discord](/fr/channels/discord)

  </Step>
</Steps>

### Flux manuel

Si vous préférez exécuter chaque étape vous-même au lieu d'utiliser le script de configuration :

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>Run `docker compose` from the repo root. If you enabled `OPENCLAW_EXTRA_MOUNTS` or `OPENCLAW_HOME_VOLUME`, the setup script writes `docker-compose.extra.yml`; include it with `-f docker-compose.yml -f docker-compose.extra.yml`.</Note>

<Note>Because `openclaw-cli` shares `openclaw-gateway`'s network namespace, it is a post-start tool. Before `docker compose up -d openclaw-gateway`, run onboarding and setup-time config writes through `openclaw-gateway` with `--no-deps --entrypoint node`.</Note>

### Variables d'environnement

Le script de configuration accepte ces variables d'environnement optionnelles :

| Variable                                   | Objectif                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | Utiliser une image distante au lieu de construire localement                                 |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | Installer des packages apt supplémentaires lors de la construction (séparés par des espaces) |
| `OPENCLAW_EXTENSIONS`                      | Include selected bundled plugin helpers at build time                                        |
| `OPENCLAW_EXTRA_MOUNTS`                    | Extra host bind mounts (comma-separated `source:target[:opts]`)                              |
| `OPENCLAW_HOME_VOLUME`                     | Persist `/home/node` in a named Docker volume                                                |
| `OPENCLAW_SANDBOX`                         | Opt in to sandbox bootstrap (`1`, `true`, `yes`, `on`)                                       |
| `OPENCLAW_SKIP_ONBOARDING`                 | Skip the interactive onboarding step (`1`, `true`, `yes`, `on`)                              |
| `OPENCLAW_DOCKER_SOCKET`                   | Override Docker socket path                                                                  |
| `OPENCLAW_DISABLE_BONJOUR`                 | Disable Bonjour/mDNS advertising (defaults to `1` for Docker)                                |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | Disable bundled plugin source bind-mount overlays                                            |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | Shared OTLP/HTTP collector endpoint for OpenTelemetry export                                 |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | Signal-specific OTLP endpoints for traces, metrics, or logs                                  |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP protocol override. Only `http/protobuf` is supported today                              |
| `OTEL_SERVICE_NAME`                        | Service name used for OpenTelemetry resources                                                |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | Opt in to latest experimental GenAI semantic attributes                                      |
| `OPENCLAW_OTEL_PRELOADED`                  | Skip starting a second OpenTelemetry SDK when one is preloaded                               |

Maintainers can test bundled plugin source against a packaged image by mounting
one plugin source directory over its packaged source path, for example
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`.
That mounted source directory overrides the matching compiled
`/app/dist/extensions/synology-chat` bundle for the same plugin id.

### Observability

OpenTelemetry export is outbound from the Gateway container to your OTLP
collector. It does not require a published Docker port. If you build the image
locally and want the bundled OpenTelemetry exporter available inside the image,
include its runtime dependencies:

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

Install the official `@openclaw/diagnostics-otel` plugin from ClawHub in
packaged Docker installs before enabling export. Custom source-built images can
still include the local plugin source with
`OPENCLAW_EXTENSIONS=diagnostics-otel`. To enable export, allow and enable the
`diagnostics-otel` plugin in config, then set
`diagnostics.otel.enabled=true` or use the config example in [OpenTelemetry
export](/fr/gateway/opentelemetry). Collector auth headers are configured through
`diagnostics.otel.headers`, not through Docker environment variables.

Les métriques Prometheus utilisent le port du Gateway déjà publié. Installez
Gateway`clawhub:@openclaw/diagnostics-prometheus`, activez le plugin
`diagnostics-prometheus`, puis scrapez :

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

La route est protégée par l'authentification du Gateway. N'exposez pas de port public
Gateway`/metrics` distinct ni de chemin de reverse-proxy non authentifié. Voir
[Métriques Prometheus](/fr/gateway/prometheus).

### Contrôles de santé

Points de terminaison de sonde de conteneur (aucune authentification requise) :

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

L'image Docker inclut un Docker`HEALTHCHECK` intégré qui effectue un ping sur `/healthz`Docker.
Si les contrôles continuent d'échouer, Docker marque le conteneur comme `unhealthy` et
les systèmes d'orchestration peuvent le redémarrer ou le remplacer.

Instantané de santé approfondi authentifié :

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs boucle locale

`scripts/docker/setup.sh` par défaut est `OPENCLAW_GATEWAY_BIND=lan`, donc l'accès de l'hôte à
`http://127.0.0.1:18789`Docker fonctionne avec la publication de ports Docker.

- `lan`CLI (par défaut) : le navigateur de l'hôte et le CLI de l'hôte peuvent atteindre le port du gateway publié.
- `loopback` : seuls les processus à l'intérieur de l'espace de noms réseau du conteneur peuvent atteindre
  directement le gateway.

<Note>Utilisez les valeurs de mode de liaison dans `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), et non les alias d'hôte comme `0.0.0.0` ou `127.0.0.1`.</Note>

### Fournisseurs locaux à l'hôte

Lorsqu'OpenClaw s'exécute dans Docker, OpenClawDocker`127.0.0.1` à l'intérieur du conteneur est le conteneur
lui-même, et non votre machine hôte. Utilisez `host.docker.internal` pour les fournisseurs d'IA qui
s'exécutent sur l'hôte :

| Fournisseur | URL par défaut de l'hôte | URL de configuration Docker         |
| ----------- | ------------------------ | ----------------------------------- |
| LM Studio   | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama      | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

La configuration Docker incluse utilise ces URL d'hôte comme valeurs par défaut pour l'intégration de LM Studio et Ollama, et DockerOllama`docker-compose.yml` mappe `host.docker.internal` vers la passerelle hôte de Docker pour le moteur Linux Docker. Docker Desktop fournit déjà le même nom d'hôte sur macOS et Windows.

Les services de l'hôte doivent également écouter sur une adresse accessible depuis Docker :

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Si vous utilisez votre propre fichier Compose ou la commande `docker run`, ajoutez vous-même le même mappage d'hôte, par exemple `--add-host=host.docker.internal:host-gateway`.

### Bonjour / mDNS

Le réseau pont Docker ne transfère généralement pas de manière fiable le multidiffusion Bonjour/mDNS (`224.0.0.251:5353`). La configuration Compose incluse définit donc par défaut `OPENCLAW_DISABLE_BONJOUR=1` pour que le Gateway ne boucle pas sur des plantages ou ne redémarre pas la publicité de manière répétée lorsque le pont abandonne le trafic multidiffusion.

Utilisez l'URL publiée du Gateway, Tailscale, ou DNS-SD de zone étendue pour les hôtes Docker. Définissez `OPENCLAW_DISABLE_BONJOUR=0` uniquement lors de l'utilisation avec un réseau hôte, macvlan, ou un autre réseau où la multidiffusion mDNS est connue pour fonctionner.

Pour les pièges et le dépannage, consultez [découverte Bonjour](/fr/gateway/bonjour).

### Stockage et persistance

Docker Compose lie `OPENCLAW_CONFIG_DIR` à `/home/node/.openclaw` et `OPENCLAW_WORKSPACE_DIR` à `/home/node/.openclaw/workspace`, ces chemins survivent donc au remplacement du conteneur. Lorsque l'une ou l'autre de ces variables n'est pas définie, le `docker-compose.yml` inclus revient à `${HOME}/.openclaw` (et `${HOME}/.openclaw/workspace` pour le montage de l'espace de travail), ou `/tmp/.openclaw` lorsque `HOME` lui-même est également manquant. Cela empêche `docker compose up` d'émettre une spécification de volume vide sur les environnements nus.

Ce répertoire de configuration monté est là où OpenClaw conserve :

- `openclaw.json` pour la configuration du comportement
- `agents/<agentId>/agent/auth-profiles.json` pour l'authentification par clé OAuth/API stockée des providers
- `.env` pour les secrets d'exécution sauvegardés dans l'environnement tels que `OPENCLAW_GATEWAY_TOKEN`

Les plugins téléchargeables installés stockent leur état de package sous le répertoire personnel monté de OpenClaw, de sorte que les enregistrements d'installation des plugins et les racines des packages survivent au remplacement du conteneur. Le démarrage du Gateway ne génère pas les arbres de dépendances des plugins groupés.

Pour plus de détails sur la persistance dans les déploiements VM, voir
[Docker VM Runtime - What persists where](/fr/install/docker-vm-runtime#what-persists-where).

**Points chauds de croissance du disque :** surveillez `media/`, les fichiers JSONL de session,
`cron/runs/*.jsonl`, les racines des packages de plugins installés et les journaux de fichiers tournants
sous `/tmp/openclaw/`.

### Helpers Shell (optionnels)

Pour une gestion quotidienne plus facile de Docker, installez `ClawDock` :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si vous avez installé ClawDock à partir de l'ancien chemin brut `scripts/shell-helpers/clawdock-helpers.sh`, relancez la commande d'installation ci-dessus afin que votre fichier helper local suive le nouvel emplacement.

Utilisez ensuite `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Exécutez
`clawdock-help` pour toutes les commandes.
Voir [ClawDock](/fr/install/clawdock) pour le guide complet des helpers.

<AccordionGroup>
  <Accordion title="Activer le bac à sable de l'agent pour le passerelle Docker">
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
    Désactivez l'allocation pseudo-TTY de Compose avec `-T` :

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Note de sécurité sur le réseau partagé">`openclaw-cli` utilise `network_mode: "service:openclaw-gateway"` afin que les commandes CLI puissent atteindre la passerelle via `127.0.0.1`. Considérez cela comme une frontière de confiance partagée. La configuration Compose abandonne `NET_RAW`/`NET_ADMIN` et active `no-new-privileges` sur `openclaw-gateway` et `openclaw-cli`.</Accordion>

  <Accordion title="Échecs DNS de Docker Desktop dans openclaw-cli">
    Certaines configurations Docker Desktop échouent aux recherches DNS depuis le sidecar
    `openclaw-cli` sur le réseau partagé une fois `NET_RAW` abandonné, ce qui se manifeste par
    `EAI_AGAIN` lors des commandes soutenues par npm comme `openclaw plugins install`.
    Conservez le fichier Compose renforcé par défaut pour le fonctionnement normal de la passerelle. La
    substitution locale ci-dessous assouplit la posture de sécurité du conteneur CLI en
    restaurant les capacités par défaut de Docker, utilisez-la donc uniquement pour la commande CLI
    ponctuelle qui nécessite un accès au registre de packages, et non comme votre invocation
    Compose par défaut :

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    Si vous avez déjà créé un conteneur `openclaw-cli` à long terme, recréez-le
    avec la même substitution. `docker compose exec` et `docker exec` ne peuvent pas
    modifier les capacités Linux sur un conteneur déjà créé.

  </Accordion>

  <Accordion title="Autorisations et EACCES">
    L'image s'exécute en tant que `node` (uid 1000). Si vous rencontrez des erreurs de permissions sur
    `/home/node/.openclaw`, assurez-vous que vos montages de liaison (bind mounts) hôtes sont détenus par l'uid 1000 :

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    Le même conflit peut apparaître sous la forme d'un avertissement de plugin tel que
    `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    suivi de `plugin present but blocked`. Cela signifie que l'uid du processus et le
    propriétaire du répertoire du plugin monté ne correspondent pas. Préférez l'exécution du conteneur avec l'uid 1000 par défaut
    et corrigez la propriété du montage de liaison. N'utilisez chown
    `/path/to/openclaw-config/npm` vers `root:root`OpenClaw que si vous exécutez intentionnellement
    OpenClaw en tant que root à long terme.

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

    1. **Conserver `/home/node`** : `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **Intégrer les dépendances système** : `export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **Installer les navigateurs Playwright** :
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **Conserver les téléchargements du navigateur** : utilisez `OPENCLAW_HOME_VOLUME` ou
       `OPENCLAW_EXTRA_MOUNTS`OpenClawDockerLinux. OpenClaw détecte automatiquement le Chromium géré par Playwright
       de l'image Docker sur Linux.

  </Accordion>

<Accordion title="OpenAIOAuthDockerOAuth OpenAI Codex (Docker sans interface)" OpenAIOAuthDocker>
  Si vous choisissez OAuth OpenAI Codex dans l'assistant, cela ouvre une URL de navigateur. Dans des environnements Docker ou sans interface, copiez l'URL de redirection complète sur laquelle vous atterrissez et collez-la dans l'assistant pour terminer l'authentification.
</Accordion>

  <Accordion title="Base image metadata">
    L'image d'exécution principale Docker utilise `node:24-bookworm-slim` et inclut `tini` en tant que processus d'initialisation du point d'entrée (PID 1) pour garantir que les processus zombies sont récupérés et que les signaux sont gérés correctement dans les conteneurs longue durée. Elle publie des annotations d'image de base OCI, notamment `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`, et d'autres. Le résumé de base Node est
    actualisé via les PR d'image de base Dependabot Docker ; les versions de release n'exécutent pas
    une couche de mise à niveau de distribution. Voir
    [annotations d'image OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### Exécution sur un VPS ?

Voir [Hetzner (VPS Docker)](/fr/install/hetznerDocker) et
[Docker VM Runtime](/fr/install/docker-vm-runtime) pour les étapes de déploiement sur VM partagée,
y compris la création de binaire, la persistance et les mises à jour.

## Bac à sable d'agent

Lorsque `agents.defaults.sandbox` est activé avec le backend Docker, la passerelle
exécute les outils de l'agent (shell, lecture/écriture de fichiers, etc.) à l'intérieur de conteneurs Docker
isolés, tandis que la passerelle elle-même reste sur l'hôte. Cela vous offre une barrière stricte
autour des sessions d'agent non fiables ou multi-locataires sans conteneuriser la passerelle
entière.

La portée du bac à sable peut être par agent (par défaut), par session, ou partagée. Chaque portée
obtient son propre espace de travail monté sur `/workspace`. Vous pouvez également configurer
les stratégies d'outils d'autorisation/refus, l'isolement réseau, les limites de ressources et les
conteneurs de navigateur.

Pour la configuration complète, les images, les notes de sécurité et les profiles multi-agents, voir :

- [Bac à sable](/fr/gateway/sandboxing) -- référence complète du bac à sable
- [OpenShell](/fr/gateway/openshell) -- accès shell interactif aux conteneurs du bac à sable
- [Bac à sable et outils multi-agents](/fr/tools/multi-agent-sandbox-tools) -- remplacements par agent

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

Construisez l'image de bac à sable par défaut (à partir d'une extraction des sources) :

```bash
scripts/sandbox-setup.sh
```

Pour les installations npm sans extraction de source, voir [Sandboxing § Images et setup](npm/en/gateway/sandboxing#images-and-setup) pour les commandes `docker build` en ligne.

## Dépannage

<AccordionGroup>
  <Accordion title="Image manquante ou le conteneur de sandbox ne démarre pas">
    Construisez l'image de sandbox avec
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    (extraction de source) ou la commande `docker build` en ligne issue de [Sandboxing § Images et setup](/fr/gateway/sandboxing#images-and-setupnpm) (installation npm),
    ou définissez `agents.defaults.sandbox.docker.image` sur votre image personnalisée.
    Les conteneurs sont créés automatiquement par session à la demande.
  </Accordion>

<Accordion title="Erreurs de permission dans la sandbox">Définissez `docker.user` sur un UID:GID correspondant à la propriété de votre espace de travail monté, ou exécutez chown sur le dossier de l'espace de travail.</Accordion>

<Accordion title="Outils personnalisés introuvables dans la sandbox">OpenClaw exécute les commandes avec `sh -lc` (shell de connexion), ce qui sourcit `/etc/profile` et peut réinitialiser le PATH. Définissez `docker.env.PATH` pour prépendre vos chemins d'outils personnalisés, ou ajoutez un script sous `/etc/profile.d/` dans votre Dockerfile.</Accordion>

<Accordion title="OOM-killed lors de la construction de l'image (exit 137)">La VM nécessite au moins 2 Go de RAM. Utilisez une classe de machine plus grande et réessayez.</Accordion>

  <Accordion title="Non autorisé ou appairage requis dans l'interface de contrôle">
    Récupérez un lien de tableau de bord frais et approuvez l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Plus de détails : [Dashboard](/fr/web/dashboard), [Appareils](/fr/cli/devices).

  </Accordion>

  <Accordion title="La cible du Gateway affiche ws://172.x.x.x ou des erreurs d'appairage depuis le Docker CLI">
    Réinitialisez le mode de passerelle et la liaison :

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Connexe

- [Vue d'ensemble de l'installation](/fr/install) — toutes les méthodes d'installation
- [Podman](/fr/install/podman) — alternative Podman à Docker
- [ClawDock](/fr/install/clawdock) — configuration communautaire Docker Compose
- [Mises à jour](/fr/install/updating) — garder OpenClaw à jour
- [Configuration](/fr/gateway/configuration) — configuration de la passerelle après l'installation

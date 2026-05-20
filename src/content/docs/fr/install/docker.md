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
- **Sandboxing note** : le backend de sandbox par défaut utilise Docker lorsque le sandboxing est activé, mais le sandboxing est désactivé par défaut et n'exige **pas** que l'ensemble de la passerelle s'exécute dans Docker. Les backends de sandbox SSH et OpenShell sont également disponibles. Voir [Sandboxing](/fr/gateway/sandboxing).

## Prérequis

- Docker Desktop (ou Docker Engine) + Docker Compose v2
- Au moins 2 Go de RAM pour la build de l'image (`pnpm install` peut être tué pour manque de mémoire sur des hôtes de 1 Go avec le code de sortie 137)
- Assez d'espace disque pour les images et les journaux
- Si vous exécutez sur un VPS/hôte public, consultez
  [Sécurisation renforcée pour l'exposition réseau](/fr/gateway/security),
  en particulier la politique de pare-feu `DOCKER-USER` de Docker.

## Passerelle conteneurisée

<Steps>
  <Step title="Construire l'image">
    À partir de la racine du dépôt, exécutez le script de configuration :

    ```bash
    ./scripts/docker/setup.sh
    ```

    Cela construit l'image de la passerelle localement. Pour utiliser à la place une image préconstruite :

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Les images préconstruites sont publiées sur le
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Balises courantes : `main`, `latest`, `<version>` (ex. `2026.2.26`).

  </Step>

  <Step title="Terminer l'onboarding"API>
    Le script de configuration exécute l'onboarding automatiquement. Il va :

    - demander les clés API du provider
    - générer un jeton de passerelle et l'écrire dans `.env`
    - créer le répertoire de la clé secrète du profil d'authentification
    - démarrer la passerelle via Docker Compose

    Pendant la configuration, l'onboarding et les écritures de configuration pré-démarrage s'exécutent via
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

  <Step title="Configurer les canaux (facultatif)">
    Utilisez le conteneur CLI pour ajouter des canaux de messagerie :

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    Documentation : [WhatsApp](/fr/channels/whatsapp), [Telegram](/fr/channels/telegram), [Discord](/fr/channels/discord)

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

| Variable                                   | Objectif                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | Utiliser une image distante au lieu de construire localement                                         |
| `OPENCLAW_IMAGE_APT_PACKAGES`              | Installer des packages apt supplémentaires lors de la construction (séparés par des espaces)         |
| `OPENCLAW_EXTENSIONS`                      | Préinstaller les dépendances des plugins au moment de la construction (noms séparés par des espaces) |
| `OPENCLAW_EXTRA_MOUNTS`                    | Extra host bind mounts (comma-separated `source:target[:opts]`)                                      |
| `OPENCLAW_HOME_VOLUME`                     | Persist `/home/node` in a named Docker volume                                                        |
| `OPENCLAW_SANDBOX`                         | Opt in to sandbox bootstrap (`1`, `true`, `yes`, `on`)                                               |
| `OPENCLAW_SKIP_ONBOARDING`                 | Skip the interactive onboarding step (`1`, `true`, `yes`, `on`)                                      |
| `OPENCLAW_DOCKER_SOCKET`                   | Override Docker socket path                                                                          |
| `OPENCLAW_DISABLE_BONJOUR`                 | Disable Bonjour/mDNS advertising (defaults to `1` for Docker)                                        |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | Disable bundled plugin source bind-mount overlays                                                    |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | Shared OTLP/HTTP collector endpoint for OpenTelemetry export                                         |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | Signal-specific OTLP endpoints for traces, metrics, or logs                                          |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP protocol override. Only `http/protobuf` is supported today                                      |
| `OTEL_SERVICE_NAME`                        | Service name used for OpenTelemetry resources                                                        |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | Opt in to latest experimental GenAI semantic attributes                                              |
| `OPENCLAW_OTEL_PRELOADED`                  | Skip starting a second OpenTelemetry SDK when one is preloaded                                       |

L'image officielle Docker n'inclut pas Homebrew. Lors de l'onboarding, OpenClaw
masque les programmes d'installation des dépendances de compétences uniquement brew lorsqu'il s'exécute dans un conteneur Linux
sans `brew` ; ces dépendances doivent être fournies par une image personnalisée
ou installées manuellement. Pour les dépendances disponibles via les paquets Debian, utilisez
`OPENCLAW_IMAGE_APT_PACKAGES` lors de la construction de l'image. L'ancien nom
`OPENCLAW_DOCKER_APT_PACKAGES` est toujours accepté.

Les responsables peuvent tester le code source du groupement de plugins par rapport à une image packagée en montant un répertoire source de plugin sur son chemin source packagé, par exemple `OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`.
Ce répertoire source monté remplace le groupement `/app/dist/extensions/synology-chat` compilé correspondant pour le même identifiant de plugin.

### Observabilité

L'export OpenTelemetry s'effectue du conteneur Gateway vers votre
collecteur OTLP. Il ne nécessite pas de port Docker publié. Si vous construisez l'image
localement et souhaitez que l'exportateur OpenTelemetry groupé soit disponible dans l'image,
incluez ses dépendances d'exécution :

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

Installez le plugin officiel `@openclaw/diagnostics-otel` depuis ClawHub dans les installations Docker packagées avant d'activer l'exportation. Les images personnalisées construites à partir du source peuvent toujours inclure le source du plugin local avec `OPENCLAW_EXTENSIONS=diagnostics-otel`. Pour activer l'exportation, autorisez et activez le plugin `diagnostics-otel` dans la configuration, puis définissez `diagnostics.otel.enabled=true` ou utilisez l'exemple de configuration dans [export OpenTelemetry](/fr/gateway/opentelemetry). Les en-têtes d'authentification du collecteur sont configurés via `diagnostics.otel.headers`, et non via les variables d'environnement Docker.

Les métriques Prometheus utilisent le port Gateway déjà publié. Installez `clawhub:@openclaw/diagnostics-prometheus`, activez le plugin `diagnostics-prometheus`, puis scrapez :

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

La route est protégée par l'authentification Gateway. N'exposez pas de port public `/metrics` séparé ou de chemin de proxy inverse non authentifié. Voir [Métriques Prometheus](/fr/gateway/prometheus).

### Contrôles de santé

Points de terminaison de sonde de conteneur (aucune authentification requise) :

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

L'image Docker inclut une vérification de santé intégrée `HEALTHCHECK` qui effectue un ping sur `/healthz`.
Si les vérifications continuent d'échouer, Docker marque le conteneur comme `unhealthy` et les systèmes d'orchestration peuvent le redémarrer ou le remplacer.

Instantané d'état profond authentifié :

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs boucle locale

`scripts/docker/setup.sh` définit `OPENCLAW_GATEWAY_BIND=lan` par défaut afin que l'accès hôte à `http://127.0.0.1:18789` fonctionne avec la publication de ports Docker.

- `lan` (par défaut) : le navigateur hôte et le CLI hôte peuvent atteindre le port de passerelle publié.
- `loopback` : seuls les processus à l'intérieur de l'espace de noms réseau du conteneur peuvent atteindre
  directement la passerelle.

<Note>Utilisez les valeurs du mode bind dans `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), et non les alias d'hôte comme `0.0.0.0` ou `127.0.0.1`.</Note>

### Fournisseurs locaux à l'hôte

Lorsque OpenClaw s'exécute dans Docker, `127.0.0.1` à l'intérieur du conteneur est le conteneur
lui-même, et non votre machine hôte. Utilisez `host.docker.internal` pour les fournisseurs d'IA qui
s'exécutent sur l'hôte :

| Fournisseur | URL par défaut de l'hôte | URL de configuration Docker         |
| ----------- | ------------------------ | ----------------------------------- |
| LM Studio   | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama      | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

La configuration Docker fournie utilise ces URL d'hôte comme valeurs par défaut d'onboarding pour LM Studio et Ollama,
et `docker-compose.yml` mappe `host.docker.internal` vers
la passerelle hôte de Docker pour le moteur Linux Docker. Docker Desktop fournit déjà
le même nom d'hôte sur macOS et Windows.

Les services de l'hôte doivent également écouter sur une adresse accessible depuis Docker :

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Si vous utilisez votre propre fichier Compose ou une commande `docker run`, ajoutez vous-même le même mappage d'hôte,
par exemple `--add-host=host.docker.internal:host-gateway`.

### Bonjour / mDNS

Le réseau pont Docker ne transmet généralement pas de manière fiable le multidiffusion Bonjour/mDNS
(`224.0.0.251:5353`). La configuration Compose fournie définit donc par défaut
`OPENCLAW_DISABLE_BONJOUR=1` pour que la Gateway ne boucle pas sur des plantages ou ne redémarre pas
répétitivement la publicité lorsque le pont abandonne le trafic multidiffusion.

Utilisez l'URL publiée de la Gateway, Tailscale, ou le DNS-SD de zone étendue pour les hôtes Docker.
Ne définissez `OPENCLAW_DISABLE_BONJOUR=0` que lors de l'exécution avec un réseau hôte, macvlan,
ou un autre réseau où la multidiffusion mDNS est connue pour fonctionner.

Pour les pièges et le dépannage, voir [Découverte Bonjour](/fr/gateway/bonjour).

### Stockage et persistance

Docker Compose lie `OPENCLAW_CONFIG_DIR` à `/home/node/.openclaw`,
`OPENCLAW_WORKSPACE_DIR` à `/home/node/.openclaw/workspace`, et
`OPENCLAW_AUTH_PROFILE_SECRET_DIR` à `/home/node/.config/openclaw`, ces chemins
survivent donc au remplacement du conteneur. Lorsqu'une variable n'est pas définie, le
`docker-compose.yml` intégré revient sous `${HOME}`, ou `/tmp` lorsque `HOME` lui-même est
également manquant. Cela empêche `docker compose up` d'émettre une spécification de
volume source vide sur les environnements nus.

Ce répertoire de configuration monté est l'endroit où OpenClaw conserve :

- `openclaw.json` pour la configuration du comportement
- `agents/<agentId>/agent/auth-profiles.json` pour l'authentification par clé OAuth/API stockée du provider
- `.env` pour les secrets d'exécution soutenus par l'environnement tels que `OPENCLAW_GATEWAY_TOKEN`

Le répertoire des clés secrètes du profil d'authentification stocke la clé de chiffrement locale utilisée pour
le matériel de jeton de profil d'authentification soutenu par OAuth. Conservez-la avec l'état de votre hôte Docker,
mais séparée de `OPENCLAW_CONFIG_DIR`.

Les plugins téléchargeables installés stockent leur état de package sous le répertoire personnel monté de OpenClaw, de sorte que les enregistrements d'installation des plugins et les racines des packages survivent au remplacement du conteneur. Le démarrage du Gateway ne génère pas les arbres de dépendances des plugins groupés.

Pour tous les détails sur la persistance des déploiements VM, consultez
[Docker VM Runtime - What persists where](/fr/install/docker-vm-runtime#what-persists-where).

**Points chauds de croissance du disque :** surveillez `media/`, les fichiers session JSONL,
`cron/runs/*.jsonl`, les racines des packages de plugins installés et les fichiers journaux
roulants sous `/tmp/openclaw/`.

### Assistants Shell (facultatif)

Pour une gestion quotidienne plus facile de Docker, installez `ClawDock` :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si vous avez installé ClawDock à partir de l'ancien chemin brut `scripts/shell-helpers/clawdock-helpers.sh`, relancez la commande d'installation ci-dessus afin que votre fichier d'assistance local suive le nouvel emplacement.

Utilisez ensuite `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Exécutez
`clawdock-help` pour toutes les commandes.
Consultez [ClawDock](/fr/install/clawdock) pour le guide complet de l'assistant.

<AccordionGroup>
  <Accordion title="Activer le bac à sable de l'agent pour la passerelle Docker">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Chemin de socket personnalisé (ex. : Docker sans privilèges) :

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    Le script monte `docker.sock` uniquement après la réussite des prérequis du bac à sable. Si
    la configuration du bac à sable ne peut pas être terminée, le script réinitialise `agents.defaults.sandbox.mode`
    à `off`. Les tours de mode code Codex sont toujours limités au Codex
    `workspace-write` tant que le bac à sable OpenClaw est actif ; ne montez pas
    le socket Docker de l'hôte dans les conteneurs du bac à sable de l'agent.

  </Accordion>

  <Accordion title="Automatisation / CI (non-interactif)">
    Désactivez l'allocation de pseudo-TTY Compose avec `-T` :

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Note de sécurité pour le réseau partagé">`openclaw-cli` utilise `network_mode: "service:openclaw-gateway"` afin que les commandes CLI puissent atteindre la passerelle via `127.0.0.1`. Traitez cela comme une frontière de confiance partagée. La configuration Compose abandonne `NET_RAW`/`NET_ADMIN` et active `no-new-privileges` sur `openclaw-gateway` et `openclaw-cli`.</Accordion>

  <Accordion title="DockerÉchecs DNS Docker Desktop dans openclaw-cli"Docker>
    Certaines configurations Docker Desktop échouent aux recherches DNS à partir du sidecar
    `openclaw-cli` du réseau partagé après que `NET_RAW` a été supprimé, ce qui se manifeste par
    `EAI_AGAIN` lors des commandes soutenues par npm telles que `openclaw plugins install`.
    Conservez le fichier compose renforcé par défaut pour le fonctionnement normal de la passerelle. La
    substitution locale ci-dessous assouplit la posture de sécurité du conteneur CLI en
    restaurant les capacités par défaut de Docker, utilisez-la donc uniquement pour la commande CLI
    ponctuelle qui nécessite un accès au registre de packages, et non comme votre invocation Compose
    par défaut :

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    Si vous avez déjà créé un conteneur `openclaw-cli` à longue durée de vie, recréez-le
    avec la même substitution. `docker compose exec` et `docker exec` ne peuvent pas
    modifier les capacités Linux sur un conteneur déjà créé.

  </Accordion>

  <Accordion title="Autorisations et EACCES">
    L'image s'exécute en tant que `node` (uid 1000). Si vous voyez des erreurs d'autorisation sur
    `/home/node/.openclaw`, assurez-vous que vos montages de liaison d'hôte sont détenus par l'uid 1000 :

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    La même inadéquation peut apparaître sous forme d'avertissement de plugin tel que
    `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    suivi de `plugin present but blocked`. Cela signifie que l'uid du processus et le
    propriétaire du répertoire du plugin monté ne sont pas d'accord. Privilégiez l'exécution du conteneur en tant que
    uid 1000 par défaut et corrigez la propriété du montage de liaison. Ne faites un chown
    de `/path/to/openclaw-config/npm` à `root:root` que si vous exécutez
    intentionnellement OpenClaw en tant que root à long terme.

  </Accordion>

  <Accordion title="Recompilations plus rapides">
    Ordonnez votre Dockerfile afin que les couches de dépendances soient mises en cache. Cela évite de réexécuter
    `pnpm install` sauf si les fichiers de verrouillage changent :

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
    L'image par défaut privilégie la sécurité et s'exécute en tant que `node`. Pour un conteneur
    plus complet :

    1. **Persister `/home/node`** : `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **Intégrer les dépendances système** : `export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. **Intégrer Playwright Chromium** : `export OPENCLAW_INSTALL_BROWSER=1`
    4. **Ou installer les navigateurs Playwright dans un volume persistant** :
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    5. **Persister les téléchargements du navigateur** : utilisez `OPENCLAW_HOME_VOLUME` ou
       `OPENCLAW_EXTRA_MOUNTS`OpenClawDockerLinux. OpenClaw détecte automatiquement le Chromium
       géré par Playwright de l'image Docker sur Linux.

  </Accordion>

<Accordion title="OpenAIOAuthDockerOpenAI Codex OAuth (headless Docker)" OpenAIOAuthDocker>
  Si vous choisissez OpenAI Codex OAuth dans l'assistant, une URL de navigateur s'ouvre. Dans Docker ou les configurations sans interface, copiez l'URL de redirection complète sur laquelle vous atterrissez et collez-la dans l'assistant pour terminer l'authentification.
</Accordion>

  <Accordion title="Métadonnées de l'image de base"Docker>
    L'image d'exécution Docker principale utilise `node:24-bookworm-slim` et inclut `tini` comme processus d'initialisation du point d'entrée (PID 1) pour assurer que les processus zombies sont récoltés et que les signaux sont gérés correctement dans les conteneurs longue durée. Elle publie des annotations d'image de base OCI, y compris `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`Docker, et d'autres. Le digest de base Node est
    actualisé via les PR Dependabot de l'image de base Docker ; les builds de release n'exécutent pas
    une couche de mise à niveau de distribution. Voir
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### Exécution sur un VPS ?

Voir [Hetzner (Docker VPS)](HetznerDocker/en/install/hetznerDocker) et
[Docker VM Runtime](/fr/install/docker-vm-runtime) pour les étapes de déploiement VM partagée,
y compris la préparation des binaires, la persistance et les mises à jour.

## Bac à sable de l'agent

Lorsque `agents.defaults.sandbox`DockerDocker est activé avec le backend Docker, la passerelle
exécute les outils de l'agent (shell, lecture/écriture de fichiers, etc.) à l'intérieur de conteneurs Docker
isolés tandis que la passerelle elle-même reste sur l'hôte. Cela vous offre une barrière stricte
autour des sessions d'agent non fiables ou multi-locataires sans conteneuriser l'ensemble de la
passerelle.

La portée du bac à sable peut être par agent (par défaut), par session, ou partagée. Chaque portée
obtient son propre espace de travail monté sur `/workspace`. Vous pouvez également configurer
les stratégies d'autorisation/refus d'outils, l'isolation du réseau, les limites de ressources et les
conteneurs de navigateur.

Pour la configuration complète, les images, les notes de sécurité et les profils multi-agents, voir :

- [Sandboxing](/fr/gateway/sandboxing) -- référence complète du bac à sable
- [OpenShell](/fr/gateway/openshell) -- accès interactif au shell des conteneurs du bac à sable
- [Multi-Agent Sandbox and Tools](/fr/tools/multi-agent-sandbox-tools) -- substitutions par agent

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

Construire l'image du sandbox par défaut (à partir d'une source extraite) :

```bash
scripts/sandbox-setup.sh
```

Pour les installations npm sans extraction de code source, consultez [Sandboxing § Images and setup](/fr/gateway/sandboxing#images-and-setup) pour les commandes `docker build` en ligne.

## Dépannage

<AccordionGroup>
  <Accordion title="Image manquante ou le conteneur du bac à sable ne démarre pas">
    Générez l'image du bac à sable avec
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    (extraction de code source) ou la commande `docker build` en ligne issue de [Sandboxing § Images and setup](/fr/gateway/sandboxing#images-and-setup) (installation npm),
    ou définissez `agents.defaults.sandbox.docker.image` sur votre image personnalisée.
    Les conteneurs sont créés automatiquement par session à la demande.
  </Accordion>

<Accordion title="Erreurs de permission dans le bac à sable">Définissez `docker.user` sur un UID:GID correspondant à la propriété de votre espace de travail monté, ou utilisez chown sur le dossier de l'espace de travail.</Accordion>

<Accordion title="Outils personnalisés introuvables dans le bac à sable">OpenClaw exécute les commandes avec `sh -lc` (login shell), ce qui sourcit `/etc/profile` et peut réinitialiser le PATH. Définissez `docker.env.PATH` pour prépendre vos chemins d'outils personnalisés, ou ajoutez un script sous `/etc/profile.d/` dans votre Dockerfile.</Accordion>

<Accordion title="OOM-killed during image build (exit 137)">La VM a besoin d'au moins 2 Go de RAM. Utilisez une classe de machine plus grande et réessayez.</Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    Récupérer un nouveau lien de tableau de bord et approuver l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Plus de détails : [Tableau de bord](/fr/web/dashboard), [Appareils](/fr/cli/devices).

  </Accordion>

  <Accordion title="La cible du Gateway affiche ws://172.x.x.x ou des erreurs d'appairage depuis le Docker CLI">
    Réinitialiser le mode et la liaison du gateway :

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Connexes

- [Vue d'ensemble de l'installation](/fr/install) — toutes les méthodes d'installation
- [Podman](/fr/install/podman) — alternative Podman à Docker
- [ClawDock](/fr/install/clawdock) — configuration communautaire Docker Compose
- [Mises à jour](/fr/install/updating) — maintenir OpenClaw à jour
- [Configuration](/fr/gateway/configuration) — configuration de la passerelle après l'installation

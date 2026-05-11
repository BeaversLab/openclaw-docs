---
summary: "Configuration et onboarding optionnels basés sur Docker pour OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker est **optionnel**. Utilisez-le uniquement si vous souhaitez une passerelle conteneurisée ou pour valider le flux Docker.

## Docker est-il fait pour moi ?

- **Oui** : vous souhaitez un environnement de passerelle isolé et éphémère, ou exécuter OpenClaw sur un hôte sans installation locale.
- **Non** : vous exécutez sur votre propre machine et vous voulez simplement la boucle de développement la plus rapide. Utilisez plutôt le flux d'installation normal.
- **Note sur le sandboxing** : le backend de sandbox par défaut utilise Docker lorsque le sandboxing est activé, mais le sandboxing est désactivé par défaut et n'exige **pas** que la passerelle complète s'exécute dans Docker. Les backends de sandbox SSH et OpenShell sont également disponibles. Voir [Sandboxing](/fr/gateway/sandboxing).

## Prérequis

- Docker Desktop (ou Docker Engine) + Docker Compose v2
- Au moins 2 Go de RAM pour la construction de l'image (`pnpm install` peut être tué par OOM sur des hôtes de 1 Go avec le code de sortie 137)
- Assez d'espace disque pour les images et les journaux
- Si vous utilisez un VPS/hôte public, consultez
  [Durcissement de la sécurité pour l'exposition réseau](/fr/gateway/security),
  en particulier la stratégie de pare-feu Docker `DOCKER-USER`.

## Passerelle conteneurisée

<Steps>
  <Step title="Construire l'image">
    Depuis la racine du dépôt, exécutez le script de configuration :

    ```bash
    ./scripts/docker/setup.sh
    ```

    Cela construit localement l'image de la passerelle. Pour utiliser une image pré-construite à la place :

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Les images pré-construites sont publiées sur le
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Tags courants : `main`, `latest`, `<version>` (ex. `2026.2.26`).

  </Step>

  <Step title="Terminer l'onboarding">
    Le script de configuration exécute automatiquement l'onboarding. Il va :

    - demander les clés API du provider
    - générer un jeton de passerelle et l'écrire dans `.env`
    - démarrer la passerelle via Docker Compose

    Lors de la configuration, l'onboarding pré-démarrage et les écritures de configuration s'exécutent via
    `openclaw-gateway` directement. `openclaw-cli` est destiné aux commandes que vous exécutez après
    que le conteneur de la passerelle existe déjà.

  </Step>

  <Step title="Ouvrir l'interface de contrôle">
    Ouvrez `http://127.0.0.1:18789/` dans votre navigateur et collez le secret partagé configuré dans les paramètres. Le script de configuration écrit un jeton dans `.env` par défaut ; si vous basculez la configuration du conteneur vers l'authentification par mot de passe, utilisez plutôt ce mot de passe.

    Vous avez besoin de l'URL à nouveau ?

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

    Docs : [WhatsApp](/fr/channels/whatsapp), [Telegram](/fr/channels/telegram), [Discord](/fr/channels/discord)

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

<Note>Exécutez `docker compose` à partir de la racine du dépôt. Si vous avez activé `OPENCLAW_EXTRA_MOUNTS` ou `OPENCLAW_HOME_VOLUME`, le script de configuration écrit `docker-compose.extra.yml` ; incluez-le avec `-f docker-compose.yml -f docker-compose.extra.yml`.</Note>

<Note>Étant donné que `openclaw-cli` partage l'espace de noms réseau de `openclaw-gateway`, c'est un outil post-démarrage. Avant `docker compose up -d openclaw-gateway`, exécutez l'onboarding et les écritures de configuration au moment de la configuration via `openclaw-gateway` avec `--no-deps --entrypoint node`.</Note>

### Variables d'environnement

Le script de configuration accepte ces variables d'environnement optionnelles :

| Variable                                   | Objectif                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | Utiliser une image distante au lieu de construire localement                                        |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | Installer des packages apt supplémentaires lors de la construction (séparés par des espaces)        |
| `OPENCLAW_EXTENSIONS`                      | Préinstaller les dépendances de plugins au moment de la construction (noms séparés par des espaces) |
| `OPENCLAW_EXTRA_MOUNTS`                    | Montages de liaison d'hôte supplémentaires (séparés par des virgules `source:target[:opts]`)        |
| `OPENCLAW_HOME_VOLUME`                     | Persister `/home/node` dans un volume Docker nommé                                                  |
| `OPENCLAW_SANDBOX`                         | Opter pour le bootstrap du bac à sable (`1`, `true`, `yes`, `on`)                                   |
| `OPENCLAW_DOCKER_SOCKET`                   | Remplacer le chemin du socket Docker                                                                |
| `OPENCLAW_DISABLE_BONJOUR`                 | Désactiver la publicité Bonjour/mDNS (par défaut `1` pour Docker)                                   |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | Désactiver les superpositions de montage bind des sources de plugins groupés                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | Point de terminaison du collecteur OTLP/HTTP partagé pour l'exportation OpenTelemetry               |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | Points de terminaison OTLP spécifiques au Signal pour les traces, les métriques ou les journaux     |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | Remplacement du protocole OTLP. Seul `http/protobuf` est pris en charge aujourd'hui                 |
| `OTEL_SERVICE_NAME`                        | Nom de service utilisé pour les ressources OpenTelemetry                                            |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | Opter pour les derniers attributs sémantiques expérimentaux GenAI                                   |
| `OPENCLAW_OTEL_PRELOADED`                  | Ignorer le démarrage d'un deuxième SDK OpenTelemetry lorsqu'un est préchargé                        |

Les mainteneurs peuvent tester la source du plugin groupé par rapport à une image packagée en montant
un répertoire source de plugin sur son chemin source packagé, par exemple
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`.
Ce répertoire source monté remplace le bundle `/app/dist/extensions/synology-chat` compilé correspondant
pour le même identifiant de plugin.

### Observabilité

L'exportation OpenTelemetry sort du conteneur Gateway vers votre collecteur
OTLP. Elle ne nécessite pas de port Docker publié. Si vous créez l'image
localement et souhaitez que l'exportateur OpenTelemetry groupé soit disponible dans l'image,
incluez ses dépendances d'exécution :

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

L'image de publication officielle Docker OpenClaw inclut la source du plugin
`diagnostics-otel` groupé. Selon l'état de l'image et du cache, la
Gateway peut toujours mettre en scène les dépendances d'exécution OpenTelemetry locales au plugin la
première fois que le plugin est activé, alors permettez à ce premier démarrage d'atteindre le registre
de packages ou préchauffez l'image dans votre voie de publication. Pour activer l'exportation, autorisez et
activez le plugin `diagnostics-otel` dans la configuration, puis définissez
`diagnostics.otel.enabled=true` ou utilisez l'exemple de configuration dans
[OpenTelemetry export](/fr/gateway/opentelemetry). Les en-têtes d'authentification du collecteur sont
configurés via `diagnostics.otel.headers`, et non via les variables d'environnement
Docker.

Les métriques Prometheus utilisent le port Gateway déjà publié. Activez le
plugin `diagnostics-prometheus`, puis effectuez le scraping :

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

La route est protégée par l'authentification du Gateway. N'exposez pas de
port public `/metrics` ou de chemin de reverse-proxy non authentifié. Voir
[Métriques Prometheus](/fr/gateway/prometheus).

### Contrôles de santé

Points de terminaison de sonde de conteneur (aucune authentification requise) :

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

L'image Docker inclut un `HEALTHCHECK` intégré qui envoie un ping à `/healthz`.
Si les contrôles continuent d'échouer, Docker marque le conteneur comme `unhealthy` et
les systèmes d'orchestration peuvent le redémarrer ou le remplacer.

Instantané de santé profonde authentifié :

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs boucle locale (loopback)

`scripts/docker/setup.sh` est `OPENCLAW_GATEWAY_BIND=lan` par défaut afin que l'accès de l'hôte à
`http://127.0.0.1:18789` fonctionne avec la publication de ports Docker.

- `lan` (par défaut) : le navigateur de l'hôte et le CLI de l'hôte peuvent atteindre le port de la passerelle publié.
- `loopback` : seuls les processus à l'intérieur de l'espace de noms réseau du conteneur peuvent atteindre
  directement la passerelle.

<Note>Utilisez les valeurs de mode de liaison dans `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), et non les alias d'hôte comme `0.0.0.0` ou `127.0.0.1`.</Note>

### Fournisseurs locaux de l'hôte

Lorsque OpenClaw s'exécute dans Docker, `127.0.0.1` à l'intérieur du conteneur est le conteneur
lui-même, et non votre machine hôte. Utilisez `host.docker.internal` pour les fournisseurs d'IA qui
s'exécutent sur l'hôte :

| Fournisseur | URL par défaut de l'hôte | URL de configuration Docker         |
| ----------- | ------------------------ | ----------------------------------- |
| LM Studio   | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama      | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

La configuration Docker fournie utilise ces URL d'hôte comme valeurs par défaut d'onboarding pour LM Studio et Ollama,
et `docker-compose.yml` mappe `host.docker.internal` vers la passerelle hôte de Docker
pour le Docker Engine Linux. Docker Desktop fournit déjà
le même nom d'hôte sur macOS et Windows.

Les services de l'hôte doivent également écouter sur une adresse accessible depuis Docker :

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Si vous utilisez votre propre fichier Compose ou la commande `docker run`, ajoutez vous-même le même mappage d'hôte, par exemple `--add-host=host.docker.internal:host-gateway`.

### Bonjour / mDNS

Le réseau pont Docker ne transmet généralement pas de manière fiable le multidiffusion Bonjour/mDNS (`224.0.0.251:5353`). La configuration Compose fournie définit donc `OPENCLAW_DISABLE_BONJOUR=1` par défaut pour que le Gateway ne boucle pas sur les plantages ou ne redémarre pas répétitivement la publicité lorsque le pont abandonne le trafic multidiffusion.

Utilisez l'URL du Gateway publiée, Tailscale, ou le DNS-SD de grande zone pour les hôtes Docker. Définissez `OPENCLAW_DISABLE_BONJOUR=0` uniquement lors de l'exécution avec un réseau hôte, macvlan, ou un autre réseau où la multidiffusion mDNS est connue pour fonctionner.

Pour les pièges et le dépannage, voir [Découverte Bonjour](/fr/gateway/bonjour).

### Stockage et persistance

Le montage de liaison (bind-mount) Docker Compose monte `OPENCLAW_CONFIG_DIR` sur `/home/node/.openclaw` et `OPENCLAW_WORKSPACE_DIR` sur `/home/node/.openclaw/workspace`, ces chemins survivent donc au remplacement du conteneur.

Ce répertoire de configuration monté est l'endroit où OpenClaw stocke :

- `openclaw.json` pour la configuration du comportement
- `agents/<agentId>/agent/auth-profiles.json` pour l'authentification par clé OAuth/API du provider stockée
- `.env` pour les secrets d'exécution sauvegardés par l'environnement tels que `OPENCLAW_GATEWAY_TOKEN`

Pour tous les détails sur la persistance des déploiements VM, voir [Docker VM Runtime - Ce qui persiste où](/fr/install/docker-vm-runtime#what-persists-where).

**Points chauds de croissance du disque :** surveillez `media/`, les fichiers JSONL de session, `cron/runs/*.jsonl` et les fichiers journaux tournants sous `/tmp/openclaw/`.

### Assistants de shell (optionnel)

Pour une gestion quotidienne plus facile de Docker, installez `ClawDock` :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si vous avez installé ClawDock à partir de l'ancien chemin brut `scripts/shell-helpers/clawdock-helpers.sh`, relancez la commande d'installation ci-dessus pour que votre fichier d'assistant local suive le nouvel emplacement.

Utilisez ensuite `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Exécutez `clawdock-help` pour toutes les commandes.
Voir [ClawDock](/fr/install/clawdock) pour le guide complet de l'assistant.

<AccordionGroup>
  <Accordion title="Activer le bac à sable de l'agent pour la passerelle Docker">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Chemin de socket personnalisé (par ex. Docker sans racine) :

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    Le script monte `docker.sock` uniquement après que les prérequis du bac à sable soient remplis. Si
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

<Accordion title="Note de sécurité sur le réseau partagé">`openclaw-cli` utilise `network_mode: "service:openclaw-gateway"` pour que les commandes CLI puissent atteindre la passerelle via `127.0.0.1`. Traitez cela comme une frontière de confiance partagée. La configuration compose supprime `NET_RAW`/`NET_ADMIN` et active `no-new-privileges` sur `openclaw-cli`.</Accordion>

  <Accordion title="Autorisations et EACCES">
    L'image s'exécute en tant que `node` (uid 1000). Si vous voyez des erreurs d'autorisation sur
    `/home/node/.openclaw`, assurez-vous que vos montages de liaison d'hôte sont détenus par uid 1000 :

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="Reconstructions plus rapides">
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
    L'image par défaut privilégie la sécurité et s'exécute en tant que non-root `node`. Pour un conteneur plus complet :

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

<Accordion title="OAuth OpenAI Codex (OAuth headless)">Si vous choisissez Docker Codex OpenAI dans l'assistant, une URL de navigateur s'ouvre. Dans les configurations OAuth ou sans interface graphique (headless), copiez l'URL de redirection complète sur laquelle vous atterrissez et collez-la dans l'assistant pour terminer l'authentification.</Accordion>

  <Accordion title="Métadonnées de l'image de base">
    L'image runtime principale Docker utilise `node:24-bookworm-slim` et publie des annotations d'image de base OCI, y compris `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`, et d'autres. Le condensé de base Node est
    actualisé via les PR d'image de base Dependabot Docker ; les builds de release n'exécutent pas
    de couche de mise à niveau de distribution. Voir
    [annotations d'image OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### Exécution sur un VPS ?

Voir [Hetzner (VPS Docker)](/fr/install/hetzner) et
[Runtime VM Docker](/fr/install/docker-vm-runtime) pour les étapes de déploiement de VM partagée,
y compris l'intégration de binaire, la persistance et les mises à jour.

## Sandbox d'agent

Lorsque `agents.defaults.sandbox` est activé avec le backend Docker, la passerelle
exécute les outils de l'agent (shell, lecture/écriture de fichiers, etc.) à l'intérieur de conteneurs Docker
isolés, tandis que la passerelle elle-même reste sur l'hôte. Cela vous offre une barrière stricte
autour des sessions d'agent non fiables ou multi-locataires sans conteneuriser l'intégralité
de la passerelle.

La portée du sandbox peut être par agent (par défaut), par session, ou partagée. Chaque portée
obtient son propre espace de travail monté sur `/workspace`. Vous pouvez également configurer
les stratégies d'autorisation/refus d'outils, l'isolation du réseau, les limites de ressources et les conteneurs
navigateur.

Pour la configuration complète, les images, les notes de sécurité et les profils multi-agents, voir :

- [Sandboxing](/fr/gateway/sandboxing) -- référence complète sur le sandbox
- [OpenShell](/fr/gateway/openshell) -- accès shell interactif aux conteneurs de sandbox
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

Construisez l'image de sandbox par défaut :

```bash
scripts/sandbox-setup.sh
```

## Dépannage

<AccordionGroup>
  <Accordion title="Image manquante ou conteneur de sandbox ne démarre pas">
    Construisez l'image de sandbox avec
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    ou définissez `agents.defaults.sandbox.docker.image` sur votre image personnalisée.
    Les conteneurs sont créés automatiquement par session à la demande.
  </Accordion>

<Accordion title="Erreurs de permission dans le sandbox">Définissez `docker.user` sur un UID:GID correspondant aux droits de propriété de votre espace de travail monté, ou faites un chown du dossier de l'espace de travail.</Accordion>

<Accordion title="Outils personnalisés introuvables dans le sandbox">OpenClaw exécute les commandes avec `sh -lc` (login shell), qui source `/etc/profile` et peut réinitialiser le PATH. Définissez `docker.env.PATH` pour préparer vos chemins d'outils personnalisés, ou ajoutez un script sous `/etc/profile.d/` dans votre Dockerfile.</Accordion>

<Accordion title="OOM-killed pendant le build de l'image (exit 137)">La VM a besoin d'au moins 2 Go de RAM. Utilisez une classe de machine plus grande et réessayez.</Accordion>

  <Accordion title="Non autorisé ou appairage requis dans l'interface de contrôle">
    Récupérez un lien frais vers le tableau de bord et approuvez l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Plus de détails : [Dashboard](/fr/web/dashboard), [Devices](/fr/cli/devices).

  </Accordion>

  <Accordion title="La cible du Gateway affiche ws://172.x.x.x ou erreurs d'appairage de la Docker CLI">
    Réinitialisez le mode passerelle et la liaison :

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Connexes

- [Install Overview](/fr/install) — toutes les méthodes d'installation
- [Podman](/fr/install/podman) — Alternative Podman à Docker
- [ClawDock](/fr/install/clawdock) — Configuration communautaire Docker Compose
- [Mise à jour](/fr/install/updating) — tenir OpenClaw à jour
- [Configuration](/fr/gateway/configuration) — configuration de la passerelle après l'installation

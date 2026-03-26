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
- **Note sur le sandboxing** : le sandboxing de l'agent utilise également Docker, mais cela ne nécessite **pas** que la passerelle entière s'exécute dans Docker. Voir [Sandboxing](/fr/gateway/sandboxing).

## Prérequis

- Docker Desktop (ou Docker Engine) + Docker Compose v2
- Au moins 2 Go de RAM pour la compilation de l'image (`pnpm install` peut être tué par OOM sur des hôtes de 1 Go avec le code de sortie 137)
- Assez d'espace disque pour les images et les journaux
- Si vous exécutez sur un VPS/hôte public, vérifiez
  [Sécurisation renforcée pour l'exposition réseau](/fr/gateway/security#0-4-network-exposure-bind-port-firewall),
  en particulier la stratégie de pare-feu Docker `DOCKER-USER`.

## Passerelle conteneurisée

<Steps>
  <Step title="Compiler l'image">
    À partir de la racine du dépôt, exécutez le script de configuration :

    ```bash
    ./scripts/docker/setup.sh
    ```

    Cela compile l'image de la passerelle localement. Pour utiliser à la place une image préconstruite :

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Les images préconstruites sont publiées sur le
    [ registre de conteneurs GitHub](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Balises courantes : `main`, `latest`, `<version>` (ex. `2026.2.26`).

  </Step>

  <Step title="Terminer l'intégration">
    Le script de configuration exécute automatiquement l'intégration. Il va :

    - demander les clés API du fournisseur
    - générer un jeton de passerelle et l'écrire dans `.env`
    - démarrer la passerelle via API Compose

  </Step>

  <Step title="Ouvrir l'interface de contrôle">
    Ouvrez `http://127.0.0.1:18789/` dans votre navigateur et collez le jeton dans
    Paramètres.

    Besoin de l'URL à nouveau ?

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

    Docs : [WhatsApp](/fr/channels/whatsapp), [Telegram](/fr/channels/telegram), [Discord](/fr/channels/discord)

  </Step>
</Steps>

### Flux manuel

Si vous préférez exécuter chaque étape vous-même au lieu d'utiliser le script de configuration :

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

<Note>
  Exécutez `docker compose` à partir de la racine du dépôt. Si vous avez activé
  `OPENCLAW_EXTRA_MOUNTS` ou `OPENCLAW_HOME_VOLUME`, le script de configuration écrit
  `docker-compose.extra.yml` ; incluez-le avec `-f docker-compose.yml -f docker-compose.extra.yml`.
</Note>

### Variables d'environnement

Le script de configuration accepte ces variables d'environnement facultatives :

| Variable                       | Objectif                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | Utiliser une image distante au lieu de construire localement                                         |
| `OPENCLAW_DOCKER_APT_PACKAGES` | Installer des paquets apt supplémentaires lors de la construction (séparés par des espaces)          |
| `OPENCLAW_EXTENSIONS`          | Préinstaller les dépendances d'extension au moment de la construction (noms séparés par des espaces) |
| `OPENCLAW_EXTRA_MOUNTS`        | Montages de liaison d'hôte supplémentaires (`source:target[:opts]` séparés par des virgules)         |
| `OPENCLAW_HOME_VOLUME`         | Persister `/home/node` dans un volume Docker nommé                                                   |
| `OPENCLAW_SANDBOX`             | Opter pour le bootstrap du bac à sable (`1`, `true`, `yes`, `on`)                                    |
| `OPENCLAW_DOCKER_SOCKET`       | Remplacer le chemin du socket Docker                                                                 |

### Contrôles de santé

Points de terminaison de sonde de conteneur (aucune authentification requise) :

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

L'image Docker inclut une `HEALTHCHECK` intégrée qui envoie un ping à `/healthz`.
Si les vérifications continuent d'échouer, Docker marque le conteneur comme `unhealthy` et
les systèmes d'orchestration peuvent le redémarrer ou le remplacer.

Instantané de santé approfondie authentifié :

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs boucle locale

`scripts/docker/setup.sh` par défaut `OPENCLAW_GATEWAY_BIND=lan` afin que l'accès hôte à
`http://127.0.0.1:18789` fonctionne avec la publication de ports Docker.

- `lan` (par défaut) : le navigateur hôte et le CLI hôte peuvent atteindre le port de passerelle publié.
- `loopback` : seuls les processus à l'intérieur de l'espace de noms réseau du conteneur peuvent atteindre directement la passerelle.

<Note>
  Utilisez les valeurs de mode de liaison dans `gateway.bind` (`lan` / `loopback` / `custom` /
  `tailnet` / `auto`), et non les alias d'hôte comme `0.0.0.0` ou `127.0.0.1`.
</Note>

### Stockage et persistance

Docker Compose monte `OPENCLAW_CONFIG_DIR` dans `/home/node/.openclaw` et
`OPENCLAW_WORKSPACE_DIR` dans `/home/node/.openclaw/workspace`, ces chemins
survivent donc au remplacement du conteneur.

Pour tous les détails sur la persistance des déploiements sur VM, consultez
[Docker VM Runtime - What persists where](/fr/install/docker-vm-runtime#what-persists-where).

**Points chauds de croissance du disque :** surveillez `media/`, les fichiers JSONL de session, `cron/runs/*.jsonl`,
et les journaux de fichiers avec rotation sous `/tmp/openclaw/`.

### Helpers de shell (facultatif)

Pour une gestion quotidienne plus facile de Docker, installez `ClawDock` :

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Utilisez ensuite `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Exécutez
`clawdock-help` pour toutes les commandes.
Consultez le [`ClawDock` Helper README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md).

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Custom socket path (e.g. rootless Docker):

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    The script mounts `docker.sock` only after sandbox prerequisites pass. If
    sandbox setup cannot complete, the script resets `agents.defaults.sandbox.mode`
    to `off`.

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    Disable Compose pseudo-TTY allocation with `-T`:

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Note de sécurité sur le réseau partagé">
  `openclaw-cli` utilise `network_mode: "service:openclaw-gateway"` afin que les commandes CLI
  puissent atteindre la passerelle via `127.0.0.1`. Considérez cela comme une limite de confiance
  partagée. La configuration compose abandonne `NET_RAW`/`NET_ADMIN` et active `no-new-privileges`
  sur `openclaw-cli`.
</Accordion>

  <Accordion title="Permissions et EACCES">
    L'image s'exécute en tant que `node` (uid 1000). Si vous rencontrez des erreurs de permissions sur
    `/home/node/.openclaw`, assurez-vous que vos montages de liaison hôtes (bind mounts) sont détenus par l'uid 1000 :

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
    L'image par défaut est axée sur la sécurité et s'exécute en tant que `node` non-root. Pour un conteneur
    plus riche en fonctionnalités :

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

<Accordion title="OAuth OpenAI Codex (OAuth sans interface)">
  Si vous choisissez Docker Codex OpenAI dans l'assistant, cela ouvre une URL de navigateur. Dans
  OAuth ou les configurations sans interface, copiez l'URL de redirection complète sur laquelle vous
  atterrissez et collez-la dans l'assistant pour terminer l'authentification.
</Accordion>

  <Accordion title="Métadonnées de l'image de base">
    L'image Docker principale utilise `node:24-bookworm` et publie des annotations d'image de base OCI, notamment `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`, et d'autres. Voir
    [annotations d'image OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### Exécution sur un VPS ?

Voir [Hetzner (Docker VPS)](/fr/install/hetzner) et
[Docker VM Runtime](/fr/install/docker-vm-runtime) pour les étapes de déploiement de VM partagée
incluant la préparation des binaires, la persistance et les mises à jour.

## Bac à sable d'agent

Lorsque `agents.defaults.sandbox` est activé, la passerelle exécute les outils de l'agent
(shell, lecture/écriture de fichiers, etc.) à l'intérieur de conteneurs Docker isolés tandis que la
passerelle elle-même reste sur l'hôte. Cela vous offre une barrière stricte autour des sessions d'agent
non fiables ou multi-locataires sans conteneuriser l'ensemble de la passerelle.

La portée du bac à sable peut être par agent (par défaut), par session, ou partagée. Chaque portée
obtient son propre espace de travail monté sur `/workspace`. Vous pouvez également configurer
les stratégies d'autorisation/refus d'outils, l'isolation du réseau, les limites de ressources et les
conteneurs de navigateur.

Pour la configuration complète, les images, les notes de sécurité et les profils multi-agents, voir :

- [Mise en bac à sable](/fr/gateway/sandboxing) -- référence complète du bac à sable
- [OpenShell](/fr/gateway/openshell) -- accès shell interactif aux conteneurs du bac à sable
- [Bac à sable et outils multi-agents](/fr/tools/multi-agent-sandbox-tools) -- substitutions par agent

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

Construire l'image de bac à sable par défaut :

```bash
scripts/sandbox-setup.sh
```

## Dépannage

<AccordionGroup>
  <Accordion title="Image manquante ou le conteneur du bac à sable ne démarre pas">
    Construisez l'image du bac à sable avec
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    ou définissez `agents.defaults.sandbox.docker.image` sur votre image personnalisée.
    Les conteneurs sont créés automatiquement par session à la demande.
  </Accordion>

<Accordion title="Erreurs de permission dans le bac à sable">
  Définissez `docker.user` sur un UID:GID correspondant à la propriété de votre espace de travail
  monté, ou faites un chown sur le dossier de l'espace de travail.
</Accordion>

<Accordion title="Outils personnalisés introuvables dans le bac à sable">
  OpenClaw exécute des commandes avec `sh -lc` (login shell), ce qui approvisionne `/etc/profile` et
  peut réinitialiser PATH. Définissez `docker.env.PATH` pour ajouter vos chemins d'outils
  personnalisés, ou ajoutez un script sous `/etc/profile.d/` dans votre Dockerfile.
</Accordion>

<Accordion title="OOM-killed lors de la création de l'image (exit 137)">
  La VM a besoin d'au moins 2 Go de RAM. Utilisez une classe de machine plus grande et réessayez.
</Accordion>

  <Accordion title="Non autorisé ou appairage requis dans l'interface de contrôle">
    Récupérez un nouveau lien de tableau de bord et approuvez l'appareil du navigateur :

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Plus de détails : [Tableau de bord](/fr/web/dashboard), [Appareils](/fr/cli/devices).

  </Accordion>

  <Accordion title="La cible Gateway affiche ws://172.x.x.x ou des erreurs d'appairage de la Docker CLI">
    Réinitialisez le mode passerelle et la liaison :

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

import fr from "/components/footer/fr.mdx";

<fr />

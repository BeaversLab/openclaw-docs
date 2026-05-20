---
summary: "OpenClawFonctionnement du sandboxing OpenClaw : modes, portées, accès à l'espace de travail et images"
title: "Sandboxing"
sidebarTitle: "Sandboxing"
read_when: "Vous souhaitez une explication détaillée du sandboxing ou vous devez configurer agents.defaults.sandbox."
status: active
---

OpenClaw peut exécuter des **tools à l'intérieur de backends de sandbox** pour réduire le rayon d'impact. C'est **optionnel** et contrôlé par la configuration (OpenClaw`agents.defaults.sandbox` ou `agents.list[].sandbox`Gateway). Si le sandboxing est désactivé, les outils s'exécutent sur l'hôte. Le Gateway reste sur l'hôte ; l'exécution des outils s'effectue dans un sandbox isolé lorsqu'elle est activée.

<Note>This is not a perfect security boundary, but it materially limits filesystem and process access when the model does something dumb.</Note>

## Ce qui est sandboxé

- Exécution de tools (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navigateur sandboxed optionnel (`agents.defaults.sandbox.browser`).

<AccordionGroup>
  <Accordion title="Détails du navigateur sandboxé">
    - Par défaut, le navigateur sandboxé démarre automatiquement (assure que CDP est accessible) lorsque l'outil navigateur en a besoin. Configurez via `agents.defaults.sandbox.browser.autoStart` et `agents.defaults.sandbox.browser.autoStartTimeoutMs`Docker.
    - Par défaut, les conteneurs du navigateur sandboxé utilisent un réseau Docker dédié (`openclaw-sandbox-browser`) au lieu du réseau global `bridge`. Configurez avec `agents.defaults.sandbox.browser.network`.
    - L'option `agents.defaults.sandbox.browser.cdpSourceRange` restreint l'entrée CDP au niveau du conteneur avec une liste d'autorisation CIDR (par exemple `172.21.0.1/32`OpenClaw).
    - L'accès observateur noVNC est protégé par mot de passe par défaut ; OpenClaw émet une URL de jeton à courte durée de vie qui sert une page d'amorçage locale et ouvre noVNC avec le mot de passe dans le fragment d'URL (et non dans les journaux de requête/en-tête).
    - `agents.defaults.sandbox.browser.allowHostControl` permet aux sessions sandboxées de cibler explicitement le navigateur hôte.
    - Les listes d'autorisation optionnelles verrouillent `target: "custom"` : `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

  </Accordion>
</AccordionGroup>

Non sandboxé :

- Le processus Gateway lui-même.
- Tout outil explicitement autorisé à s'exécuter en dehors du sandbox (par ex. `tools.elevated`).
  - **L'exécution élevée contourne le sandboxing et utilise le chemin d'échappement configuré (`gateway` par défaut, ou `node` lorsque la cible d'exécution est `node`).**
  - Si le sandboxing est désactivé, `tools.elevated` ne modifie pas l'exécution (déjà sur l'hôte). Voir [Mode élevé](/fr/tools/elevated).

## Modes

`agents.defaults.sandbox.mode` contrôle **quand** le sandboxing est utilisé :

<Tabs>
  <Tab title="off">
    Aucun sandboxing.
  </Tab>
  <Tab title="non-main">
    Sandbox uniquement les sessions **non principales** (par défaut si vous voulez des discussions normales sur l'hôte).

    `"non-main"` est basé sur `session.mainKey` (par défaut `"main"`), et non sur l'ID de l'agent. Les sessions de groupe/canal utilisent leurs propres clés, donc elles comptent comme non principales et seront sandboxées.

  </Tab>
  <Tab title="all">
    Chaque session s'exécute dans un sandbox.
  </Tab>
</Tabs>

## Portée

`agents.defaults.sandbox.scope` contrôle **le nombre de conteneurs** créés :

- `"agent"` (par défaut) : un conteneur par agent.
- `"session"` : un conteneur par session.
- `"shared"` : un conteneur partagé par toutes les sessions sandboxées.

## Backend

`agents.defaults.sandbox.backend` contrôle **quel runtime** fournit le sandbox :

- `"docker"` (par défaut lorsque le sandboxing est activé) : runtime de sandbox local pris en charge par Docker.
- `"ssh"` : runtime de sandbox distant générique pris en charge par SSH.
- `"openshell"` : runtime de sandbox pris en charge par OpenShell.

La configuration spécifique à SSH se trouve sous `agents.defaults.sandbox.ssh`. La configuration spécifique à OpenShell se trouve sous `plugins.entries.openshell.config`.

### Choisir un backend

|                                | Docker                                 | SSH                                     | OpenShell                                                                  |
| ------------------------------ | -------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| **Où il s'exécute**            | Conteneur local                        | Tout hôte accessible par SSH            | Bac à sable géré par OpenShell                                             |
| **Configuration**              | `scripts/sandbox-setup.sh`             | Clé SSH + hôte cible                    | Plugin OpenShell activé                                                    |
| **Modèle d'espace de travail** | Bind-mount ou copie                    | À distance canonique (amorcer une fois) | `mirror` ou `remote`                                                       |
| **Contrôle réseau**            | `docker.network` (par défaut : none)   | Dépend de l'hôte distant                | Dépend d'OpenShell                                                         |
| **Sandbox de navigateur**      | Pris en charge                         | Non pris en charge                      | Pas encore pris en charge                                                  |
| **Bind mounts**                | `docker.binds`                         | N/A                                     | N/A                                                                        |
| **Idéal pour**                 | Développement local, isolement complet | Déchargement vers une machine distante  | Sandboxes distants gérés avec synchronisation bidirectionnelle facultative |

### Backend Docker

Le sandboxing est désactivé par défaut. Si vous activez le sandboxing et ne choisissez pas de backend, OpenClaw utilise le backend Docker. Il exécute les outils et les navigateurs de sandbox localement via le socket du démon Docker (`/var/run/docker.sock`). L'isolement du conteneur de sandbox est déterminé par les espaces de noms Docker.

Pour exposer les GPU de l'hôte aux sandboxes Docker, définissez `agents.defaults.sandbox.docker.gpus` ou la substitution par agent `agents.list[].sandbox.docker.gpus`. La valeur est transmise à l'indicateur `--gpus` de Docker en tant qu'argument distinct, par exemple `"all"` ou `"device=GPU-uuid"`, et nécessite un runtime d'hôte compatible tel que NVIDIA Container Toolkit.

<Warning>
**Contraintes de Docker-out-of-Docker (DooD)**

Si vous déployez la DockerDockerOpenClaw Gateway lui-même en tant que conteneur Docker, il orchestre les conteneurs de bac à sable frères en utilisant le socket Docker de l'hôte (DooD). Cela introduit une contrainte spécifique de mappage de chemins :

- **La configuration nécessite des chemins d'hôte** : La configuration `openclaw.json` `workspace` DOIT contenir le **chemin absolu de l'hôte** (par exemple `/home/user/.openclaw/workspaces`), et non le chemin interne du conteneur Gateway. Lorsque OpenClaw demande au démon Docker de créer un bac à sable, le démon évalue les chemins par rapport à l'espace de noms de l'OS hôte, et non par rapport à l'espace de noms Gateway.
- **Parité du pont FS (mappage de volume identique)** : Le processus natif OpenClaw Gateway écrit également les fichiers de pont et de battement de cœur dans le répertoire `workspace`. Étant donné que Gateway évalue la même chaîne exacte (le chemin de l'hôte) depuis son propre environnement conteneurisé, le déploiement Gateway DOIT inclure un mappage de volume identique reliant l'espace de noms de l'hôte de manière native (`-v /home/user/.openclaw:/home/user/.openclaw`).
- **Mode de code Codex** : Lorsqu'un bac à sable OpenClaw est actif, OpenClaw contraint les tours du serveur d'application Codex à la mise en bac à sable `workspace-write` Codex, même si la valeur par défaut du plugin Codex est `danger-full-access`. L'indicateur réseau du tour Codex suit le paramètre de sortie du bac à sable OpenClaw, donc Docker `network: "none"` reste hors ligne et `network: "bridge"` ou un réseau personnalisé Docker autorise l'accès sortant. Ne montez pas le socket Docker de l'hôte dans les conteneurs de bac à sable de l'agent ou les bacs à sable personnalisés Codex.

Si vous mappez les chemins en interne sans parité absolue avec l'hôte, OpenClaw génère nativement une erreur d'autorisation `EACCES` en tentant d'écrire son battement de cœur à l'intérieur de l'environnement conteneurisé, car la chaîne de chemin complet qualifié n'existe pas nativement.

</Warning>

### Backend SSH

Utilisez `backend: "ssh"`OpenClaw lorsque vous souhaitez qu'OpenClaw isole `exec`, les outils de fichiers et les lectures de média sur une machine arbitraire accessible par SSH.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // Or use SecretRefs / inline contents instead of local files:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="How it works">
    - OpenClaw crée une racine distante par portée sous `sandbox.ssh.workspaceRoot`.
    - Lors de la première utilisation après la création ou la recréation, OpenClaw ensemence cet espace de travail distant une fois à partir de l'espace de travail local.
    - Ensuite, `exec`, `read`, `write`, `edit`, `apply_patch`, les lectures de média de prompt et la mise en scène des médias entrants s'exécutent directement sur l'espace de travail distant via SSH.
    - OpenClaw ne synchronise pas automatiquement les modifications distantes avec l'espace de travail local.

  </Accordion>
  <Accordion title="Matériels d'authentification">
    - `identityFile`, `certificateFile`, `knownHostsFile` : utilisent les fichiers locaux existants et les transmettent via la configuration OpenSSH.
    - `identityData`, `certificateData`, `knownHostsData` : utilisent des chaînes en ligne ou des SecretRefs. OpenClaw les résout via l'instantané d'exécution normal des secrets, les écrit dans des fichiers temporaires avec `0600`, et les supprime lorsque la session SSH se termine.
    - Si `*File` et `*Data` sont tous deux définis pour le même élément, `*Data` prévaut pour cette session SSH.

  </Accordion>
  <Accordion title="Conséquences distantes canoniques"OpenClaw>
    Il s'agit d'un modèle **distant canonique**. L'espace de travail SSH distant devient l'état réel du sandbox après l'ensemencement initial.

    - Les modifications locales effectuées en dehors d'OpenClaw après l'étape d'ensemencement ne sont pas visibles à distance tant que vous n'avez pas recréé le sandbox.
    - `openclaw sandbox recreate` supprime la racine distante par étendue et réensemence à partir du local à la prochaine utilisation.
    - Le sandboxing du navigateur n'est pas pris en charge sur le backend SSH.
    - Les paramètres `sandbox.docker.*` ne s'appliquent pas au backend SSH.

  </Accordion>
</AccordionGroup>

### Backend OpenShell

Utilisez `backend: "openshell"` lorsque vous voulez qu'OpenClaw isole les outils dans un environnement distant géré par OpenShell. Pour le guide de configuration complet, la référence de configuration et la comparaison des modes d'espace de travail, consultez la [page dédiée à OpenShell](/fr/gateway/openshell).

OpenShell réutilise le même transport SSH de base et le même pont de système de fichiers distant que le backend SSH générique, et ajoute un cycle de vie spécifique à OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) ainsi que le mode d'espace de travail facultatif `mirror`.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote", // mirror | remote
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

Modes OpenShell :

- `mirror` (par défaut) : l'espace de travail local reste canonique. OpenClaw synchronise les fichiers locaux dans OpenShell avant l'exécution et synchronise l'espace de travail distant après l'exécution.
- `remote` : l'espace de travail OpenShell devient canonique une fois que le bac à sable est créé. OpenClaw initialise l'espace de travail distant une fois à partir de l'espace de travail local, puis les outils de fichiers et l'exécution s'exécutent directement sur le bac à sable distant sans synchroniser les modifications en retour.

<AccordionGroup>
  <Accordion title="Détails du transport distant">
    - OpenClaw demande à OpenShell une configuration SSH spécifique au bac à sable via `openshell sandbox ssh-config <name>`.
    - Core écrit cette configuration SSH dans un fichier temporaire, ouvre la session SSH et réutilise le même pont de système de fichiers distant que celui utilisé par `backend: "ssh"`.
    - En mode `mirror`, seul le cycle de vie diffère : synchronisation du local vers le distant avant l'exécution, puis synchronisation inverse après l'exécution.

  </Accordion>
  <Accordion title="Limitations actuelles d'OpenShell">
    - le sandbox du navigateur n'est pas encore pris en charge
    - `sandbox.docker.binds` n'est pas pris en charge sur le backend OpenShell
    - les paramètres d'exécution spécifiques à Docker sous `sandbox.docker.*` s'appliquent toujours uniquement au backend Docker

  </Accordion>
</AccordionGroup>

#### Modes d'espace de travail

OpenShell possède deux modèles d'espace de travail. C'est la partie qui compte le plus en pratique.

<Tabs>
  <Tab title="mirror (local canonical)">
    Utilisez `plugins.entries.openshell.config.mode: "mirror"` lorsque vous souhaitez que **l'espace de travail local reste canonique**.

    Comportement :

    - Avant `exec`, OpenClaw synchronise l'espace de travail local dans le bac à sable OpenShell.
    - Après `exec`, OpenClaw synchronise l'espace de travail distant vers l'espace de travail local.
    - Les outils de fichiers fonctionnent toujours via le pont du bac à sable, mais l'espace de travail local reste la source de vérité entre les tours.

    Utilisez ceci lorsque :

    - vous modifiez des fichiers localement en dehors de OpenClaw et souhaitez que ces modifications apparaissent automatiquement dans le bac à sable
    - vous souhaitez que le bac à sable OpenShell se comporte autant que possible comme le backend Docker
    - vous souhaitez que l'espace de travail hôte reflète les écritures du bac à sable après chaque tour d'exécution

    Compromis : coût de synchronisation supplémentaire avant et après l'exécution.

  </Tab>
  <Tab title="remote (OpenShell canonique)">
    Utilisez `plugins.entries.openshell.config.mode: "remote"` lorsque vous souhaitez que **l'espace de travail OpenShell devienne canonique**.

    Comportement :

    - Lorsque le bac à sable est créé pour la première fois, OpenClaw ensemence l'espace de travail distant à partir de l'espace de travail local une seule fois.
    - Ensuite, `exec`, `read`, `write`, `edit` et `apply_patch` opèrent directement sur l'espace de travail OpenShell distant.
    - OpenClaw ne synchronise **pas** les modifications distantes dans l'espace de travail local après l'exécution.
    - Les lectures de médias au moment de l'invite fonctionnent toujours car les outils de fichiers et de médias lisent via le pont du bac à sable au lieu de supposer un chemin d'hôte local.
    - Le transport est SSH dans le bac à sable OpenShell renvoyé par `openshell sandbox ssh-config`.

    Conséquences importantes :

    - Si vous modifiez des fichiers sur l'hôte en dehors de OpenClaw après l'étape d'ensemencement, le bac à sable distant ne verra **pas** ces modifications automatiquement.
    - Si le bac à sable est recréé, l'espace de travail distant est de nouveau ensemencé à partir de l'espace de travail local.
    - Avec `scope: "agent"` ou `scope: "shared"`, cet espace de travail distant est partagé à cette même portée.

    Utilisez ceci quand :

    - le bac à sable doit principalement résider du côté OpenShell distant
    - vous souhaitez une charge de synchronisation moindre par tour
    - vous ne voulez pas que les modifications locales de l'hôte écrasent silencieusement l'état du bac à sable distant

  </Tab>
</Tabs>

Choisissez `mirror` si vous considérez le bac à sable comme un environnement d'exécution temporaire. Choisissez `remote` si vous considérez le bac à sable comme l'espace de travail réel.

#### Cycle de vie OpenShell

Les bacs à sable OpenShell sont toujours gérés via le cycle de vie normal du bac à sable :

- `openclaw sandbox list` affiche les runtimes OpenShell ainsi que les runtimes Docker
- `openclaw sandbox recreate` supprime le runtime actuel et permet à OpenClaw de le recréer à la prochaine utilisation
- La logique de nettoyage est également consciente du backend

Pour le mode `remote`, la recréation est particulièrement importante :

- la recréation supprime l'espace de travail distant canonique pour cette portée
- l'utilisation suivante génère un nouvel espace de travail distant à partir de l'espace de travail local

Pour le mode `mirror`, la recréation réinitialise principalement l'environnement d'exécution distant car l'espace de travail local reste de toute façon canonique.

## Accès à l'espace de travail

`agents.defaults.sandbox.workspaceAccess` contrôle **ce que le bac à sable peut voir** :

<Tabs>
  <Tab title="aucun (par défaut)">Les outils voient un espace de travail bac à sable sous `~/.openclaw/sandboxes`.</Tab>
  <Tab title="ro">Monte l'espace de travail de l'agent en lecture seule sur `/agent` (désactive `write`/`edit`/`apply_patch`).</Tab>
  <Tab title="rw">Monte l'espace de travail de l'agent en lecture/écriture sur `/workspace`.</Tab>
</Tabs>

Avec le backend OpenShell :

- Le mode `mirror` utilise toujours l'espace de travail local comme source canonique entre les tours d'exécution
- Le mode `remote` utilise l'espace de travail distant OpenShell comme source canonique après le chargement initial
- `workspaceAccess: "ro"` et `"none"` restreignent toujours le comportement en écriture de la même manière

Les médias entrants sont copiés dans l'espace de travail du bac à sable actif (`media/inbound/*`).

<Note>**Note sur les Skills :** l'outil `read` est ancré dans la racine du bac à sable (sandbox-rooted). Avec `workspaceAccess: "none"`OpenClaw, OpenClaw reflète les compétences éligibles dans l'espace de travail du bac à sable (`.../skills`) afin qu'elles puissent être lues. Avec `"rw"`, les compétences de l'espace de travail sont lisibles depuis `/workspace/skills`.</Note>

## Montages de liaison personnalisés

`agents.defaults.sandbox.docker.binds` monte des répertoires hôtes supplémentaires dans le conteneur. Format : `host:container:mode` (par ex., `"/home/user/source:/source:rw"`).

Les montages globaux et par agent sont **fusionnés** (et non remplacés). Sous `scope: "shared"`, les montages par agent sont ignorés.

`agents.defaults.sandbox.browser.binds` monte des répertoires hôtes supplémentaires uniquement dans le conteneur du **sandbox browser**.

- Lorsqu'il est défini (y compris `[]`), il remplace `agents.defaults.sandbox.docker.binds` pour le conteneur du navigateur.
- Lorsqu'il est omis, le conteneur du navigateur revient à `agents.defaults.sandbox.docker.binds` (rétrocompatible).

Exemple (source en lecture seule + un répertoire de données supplémentaire) :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

<Warning>
**Sécurité des montages (binds)**

- Les montages (binds) contournent le système de fichiers du bac à sable : ils exposent les chemins de l'hôte avec le mode que vous définissez (`:ro` ou `:rw`).
- OpenClaw bloque les sources de montage dangereuses (par exemple : `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, et les montages parents qui les exposeraient).
- OpenClaw bloque également les racines d'identification courantes du répertoire personnel telles que `~/.aws`, `~/.cargo`, `~/.config`, `~/.docker`, `~/.gnupg`, `~/.netrc`, `~/.npm`, et `~/.ssh`.
- La validation des montages n'est pas une simple correspondance de chaînes. OpenClaw normalise le chemin source, puis le résout à nouveau via l'ancêtre existant le plus profond avant de revérifier les chemins bloqués et les racines autorisées.
- Cela signifie que les échappements par liens symboliques parents échouent toujours même lorsque la feuille finale n'existe pas encore. Exemple : `/workspace/run-link/new-file` se résout toujours comme `/var/run/...` si `run-link` pointe vers cet emplacement.
- Les racines sources autorisées sont canonisées de la même manière, donc un chemin qui semble uniquement dans la liste d'autorisation avant la résolution des liens symboliques est toujours rejeté comme `outside allowed roots`.
- Les montages sensibles (secrets, clés SSH, identifiants de service) doivent être `:ro` sauf si cela est absolument nécessaire.
- Combinez avec `workspaceAccess: "ro"` si vous avez uniquement besoin d'un accès en lecture à l'espace de travail ; les modes de montage restent indépendants.
- Voir [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) pour savoir comment les montages interagissent avec la stratégie d'outil et l'exécution élevée.

</Warning>

## Images et configuration

Image Docker par défaut : `openclaw-sandbox:bookworm-slim`

<Note>
**Extraction des sources vs installation npm**

Les scripts d'aide `scripts/sandbox-setup.sh`, `scripts/sandbox-common-setup.sh` et `scripts/sandbox-browser-setup.sh` ne sont disponibles que lors de l'exécution à partir d'une [extraction des sources](https://github.com/openclaw/openclaw). Ils ne sont pas inclus dans le package npm.

Si vous avez installé OpenClaw via `npm install -g openclaw`, utilisez plutôt les commandes en ligne `docker build` indiquées ci-dessous.

</Note>

<Steps>
  <Step title="Créer l'image par défaut">
    À partir d'une source checkout :

    ```bash
    scripts/sandbox-setup.sh
    ```npm

    À partir d'une installation npm (pas besoin de source checkout) :

    ```bash
    docker build -t openclaw-sandbox:bookworm-slim - <<'DOCKERFILE'
    FROM debian:bookworm-slim
    ENV DEBIAN_FRONTEND=noninteractive
    RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq python3 ripgrep \
      && rm -rf /var/lib/apt/lists/*
    RUN useradd --create-home --shell /bin/bash sandbox
    USER sandbox
    WORKDIR /home/sandbox
    CMD ["sleep", "infinity"]
    DOCKERFILE
    ```

    L'image par défaut n'inclut **pas** Node. Si une compétence a besoin de Node (ou d'autres environnements d'exécution), soit créez une image personnalisée, soit installez via `sandbox.docker.setupCommand`OpenClaw (nécessite une sortie réseau + racine inscriptible + utilisateur root).

    OpenClaw ne remplace pas silencieusement le `debian:bookworm-slim` brut lorsque `openclaw-sandbox:bookworm-slim` est manquant. Les exécutions de Sandbox qui ciblent l'image par défaut échouent rapidement avec une instruction de construction jusqu'à ce que vous la construisiez, car l'image groupée transporte `python3` pour les assistants d'écriture/édition de sandbox.

  </Step>
  <Step title="Optionnel : construire l'image commune">
    Pour une image de bac à sable plus fonctionnelle avec des outils courants (par exemple `curl`, `jq`, `nodejs`, `python3`, `git`) :

    Depuis un checkout source :

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    Depuis une installation npm, construisez d'abord l'image par défaut (voir ci-dessus), puis construisez l'image commune par-dessus en utilisant le [`scripts/docker/sandbox/Dockerfile.common`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.common) du dépôt.

    Ensuite, définissez `agents.defaults.sandbox.docker.image` sur `openclaw-sandbox-common:bookworm-slim`.

  </Step>
  <Step title="Optionnel : créer l'image du navigateur de bac à sable">
    Depuis un checkout source :

    ```bash
    scripts/sandbox-browser-setup.sh
    ```npm

    Depuis une installation npm, créez en utilisant le [`scripts/docker/sandbox/Dockerfile.browser`](https://github.com/openclaw/openclaw/blob/main/scripts/docker/sandbox/Dockerfile.browser) à partir du dépôt.

  </Step>
</Steps>

Par défaut, les conteneurs de bac à sable Docker s'exécutent sans **réseau**. Remplacez par `agents.defaults.sandbox.docker.network`.

<AccordionGroup>
  <Accordion title="Sandbox navigateur Chromium par défaut">
    L'image du navigateur sandbox fournie applique également des paramètres de démarrage Chromium conservateurs pour les charges de travail conteneurisées. Les paramètres de conteneur actuels incluent :

    - `--remote-debugging-address=127.0.0.1`
    - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
    - `--user-data-dir=${HOME}/.chrome`
    - `--no-first-run`
    - `--no-default-browser-check`
    - `--disable-3d-apis`
    - `--disable-gpu`
    - `--disable-dev-shm-usage`
    - `--disable-background-networking`
    - `--disable-extensions`
    - `--disable-features=TranslateUI`
    - `--disable-breakpad`
    - `--disable-crash-reporter`
    - `--disable-software-rasterizer`
    - `--no-zygote`
    - `--metrics-recording-only`
    - `--renderer-process-limit=2`
    - `--no-sandbox` lorsque `noSandbox` est activé.
    - Les trois indicateurs de durcissement graphique (`--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu`) sont optionnels et utiles lorsque les conteneurs ne prennent pas en charge le GPU. Définissez `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si votre charge de travail nécessite WebGL ou d'autres fonctionnalités 3D/navigateur.
    - `--disable-extensions` est activé par défaut et peut être désactivé avec `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` pour les flux dépendant des extensions.
    - `--renderer-process-limit=2` est contrôlé par `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, où `0` conserve la valeur par défaut de Chromium.

    Si vous avez besoin d'un profil d'exécution différent, utilisez une image de navigateur personnalisée et fournissez votre propre point d'entrée. Pour les profils Chromium locaux (non conteneurisés), utilisez `browser.extraArgs` pour ajouter des indicateurs de démarrage supplémentaires.

  </Accordion>
  <Accordion title="Paramètres de sécurité réseau par défaut">
    - `network: "host"` est bloqué.
    - `network: "container:<id>"` est bloqué par défaut (risque de contournement de la jointure d'espace de noms).
    - Dérogation en cas de rupture : `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

  </Accordion>
</AccordionGroup>

Docker installe la passerelle conteneurisée se trouve ici : [Docker](/en/install/docker)

Pour les déploiements de passerelle Docker, `scripts/docker/setup.sh` peut amorcer la configuration du bac à sable. Définissez `OPENCLAW_SANDBOX=1` (ou `true`/`yes`/`on`) pour activer ce chemin. Vous pouvez remplacer l'emplacement du socket avec `OPENCLAW_DOCKER_SOCKET`. Configuration complète et référence des variables d'environnement : [Docker](/en/install/docker#agent-sandbox).

## setupCommand (configuration unique du conteneur)

`setupCommand` s'exécute **une seule fois** après la création du conteneur de bac à sable (pas à chaque exécution). Il s'exécute à l'intérieur du conteneur via `sh -lc`.

Chemins :

- Global : `agents.defaults.sandbox.docker.setupCommand`
- Par agent : `agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="Common pitfalls">
    - Default `docker.network` is `"none"` (no egress), so package installs will fail.
    - `docker.network: "container:<id>"` requires `dangerouslyAllowContainerNamespaceJoin: true` and is break-glass only.
    - `readOnlyRoot: true` prevents writes; set `readOnlyRoot: false` or bake a custom image.
    - `user` must be root for package installs (omit `user` or set `user: "0:0"`).
    - Sandbox exec does **not** inherit host `process.env`. Use `agents.defaults.sandbox.docker.env`API (or a custom image) for skill API keys.
    - Values in `agents.defaults.sandbox.docker.env`DockerDockerDocker are passed as explicit Docker container environment variables. Anyone with Docker daemon access can inspect them with Docker metadata commands such as `docker inspect`. Use a custom image, mounted secret file, or another secret delivery path if that metadata exposure is not acceptable.

  </Accordion>
</AccordionGroup>

## Stratégie d'outils et issues de secours

Les stratégies d'autorisation/refus d'outils s'appliquent toujours avant les règles de sandboxing. Si un outil est refusé globalement ou par agent, le sandboxing ne le rétablira pas.

`tools.elevated` est une échappatoire explicite qui exécute `exec` en dehors du sandbox (`gateway` par défaut, ou `node` lorsque la cible d'exécution est `node`). Les directives `/exec` ne s'appliquent que pour les expéditeurs autorisés et persistent par session ; pour désactiver définitivement `exec`, utilisez le refus de la stratégie d'outil (voir [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)).

Débogage :

- Utilisez `openclaw sandbox explain` pour inspecter le mode de Sandbox effectif, la politique d'outil et les clés de configuration de réparation.
- Consultez [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) pour le modèle mental "pourquoi ceci est-il bloqué ?".

Gardez-le verrouillé.

## Remplacements multi-agents

Chaque agent peut remplacer le sandbox + les outils : `agents.list[].sandbox` et `agents.list[].tools` (ainsi que `agents.list[].tools.sandbox.tools` pour la stratégie d'outil de sandbox). Voir [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) pour la priorité.

## Exemple d'activation minimale

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## Connexes

- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) — remplacements par agent et priorité
- [OpenShell](/fr/gateway/openshell) — configuration du backend de sandbox géré, modes d'espace de travail et référence de configuration
- [Configuration du sandbox](/fr/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Stratégie d'outil vs Privilégié](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) — débogage de « pourquoi cela est-il bloqué ? »
- [Sécurité](/fr/gateway/security)

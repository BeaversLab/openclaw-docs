---
summary: "Fonctionnement du sandboxing OpenClaw : modes, portées, accès à l'espace de travail et images"
title: "Sandboxing"
sidebarTitle: "Sandboxing"
read_when: "You want a dedicated explanation of sandboxing or need to tune agents.defaults.sandbox."
status: active
---

OpenClaw peut exécuter des **outils dans des backends de sandbox** pour réduire le rayon d'impact. C'est **optionnel** et contrôlé par la configuration (`agents.defaults.sandbox` ou `agents.list[].sandbox`). Si le sandboxing est désactivé, les outils s'exécutent sur l'hôte. Le Gateway reste sur l'hôte ; l'exécution de l'outil s'effectue dans un sandbox isolé lorsqu'elle est activée.

<Note>This is not a perfect security boundary, but it materially limits filesystem and process access when the model does something dumb.</Note>

## Ce qui est sandboxé

- Exécution de l'outil (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navigateur sandboxé optionnel (`agents.defaults.sandbox.browser`).

<AccordionGroup>
  <Accordion title="Sandboxed browser details">
    - Par défaut, le navigateur sandboxé se lance automatiquement (assure que CDP est accessible) lorsque l'outil navigateur en a besoin. Configurez via `agents.defaults.sandbox.browser.autoStart` et `agents.defaults.sandbox.browser.autoStartTimeoutMs`. - Par défaut, les conteneurs du navigateur sandboxé utilisent un réseau Docker dédié (`openclaw-sandbox-browser`) au lieu du réseau `bridge`
    global. Configurez avec `agents.defaults.sandbox.browser.network`. - L'option `agents.defaults.sandbox.browser.cdpSourceRange` restreint l'ingress CDP au niveau du conteneur avec une liste d'autorisation CIDR (par exemple `172.21.0.1/32`). - L'accès observateur noVNC est protégé par mot de passe par défaut ; OpenClaw émet une URL de jeton à courte durée de vie qui sert une page d'amorçage
    locale et ouvre noVNC avec le mot de passe dans le fragment d'URL (pas dans les journaux de requête/en-tête). - `agents.defaults.sandbox.browser.allowHostControl` permet aux sessions sandboxées de cibler explicitement le navigateur hôte. - Les listes d'autorisation optionnelles filtrent `target: "custom"` : `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.
  </Accordion>
</AccordionGroup>

Non sandboxé :

- Le processus Gateway lui-même.
- Tout tool explicitement autorisé à s'exécuter en dehors du bac à sable (par ex. `tools.elevated`).
  - **L'exécution élevée contourne le sandboxing et utilise le chemin d'échappement configuré (`gateway` par défaut, ou `node` lorsque la cible de l'exécution est `node`).**
  - Si le sandboxing est désactivé, `tools.elevated` ne modifie pas l'exécution (déjà sur l'hôte). Voir [Mode élevé](/fr/tools/elevated).

## Modes

`agents.defaults.sandbox.mode` contrôle **quand** le sandboxing est utilisé :

<Tabs>
  <Tab title="off">
    Aucun sandboxing.
  </Tab>
  <Tab title="non-main">
    Sandbox uniquement les sessions **non principales** (par défaut si vous voulez des discussions normales sur l'hôte).

    `"non-main"` est basé sur `session.mainKey` (par défaut `"main"`), et non sur l'id de l'agent. Les sessions de groupe/canal utilisent leurs propres clés, donc elles comptent comme non principales et seront sandboxées.

  </Tab>
  <Tab title="all">
    Chaque session s'exécute dans un bac à sable.
  </Tab>
</Tabs>

## Portée

`agents.defaults.sandbox.scope` contrôle **combien de conteneurs** sont créés :

- `"agent"` (par défaut) : un conteneur par agent.
- `"session"` : un conteneur par session.
- `"shared"` : un conteneur partagé par toutes les sessions sandboxées.

## Backend

`agents.defaults.sandbox.backend` contrôle **quel runtime** fournit le bac à sable :

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
| **Contrôle réseau**            | `docker.network` (par défaut : aucun)  | Dépend de l'hôte distant                | Dépend d'OpenShell                                                         |
| **Sandbox de navigateur**      | Pris en charge                         | Non pris en charge                      | Pas encore pris en charge                                                  |
| **Bind mounts**                | `docker.binds`                         | N/A                                     | N/A                                                                        |
| **Idéal pour**                 | Développement local, isolement complet | Déchargement vers une machine distante  | Sandboxes distants gérés avec synchronisation bidirectionnelle facultative |

### Backend Docker

Le sandboxing est désactivé par défaut. Si vous activez le sandboxing et ne choisissez pas de backend, OpenClaw utilise le backend Docker. Il exécute les outils et les navigateurs de sandbox localement via le socket du démon Docker (`/var/run/docker.sock`). L'isolement des conteneurs de sandbox est déterminé par les espaces de noms Docker.

<Warning>
**Contraintes de Docker-hors-de-Docker (DooD)**

Si vous déployez la OpenClaw Gateway elle-même en tant que conteneur Docker, elle orchestre les conteneurs de sandbox frères via le socket Docker de l'hôte (DooD). Cela introduit une contrainte spécifique de mappage de chemins :

- **La configuration nécessite des chemins d'hôte** : La configuration `openclaw.json` `workspace` DOIT contenir le **chemin absolu de l'hôte** (par ex. `/home/user/.openclaw/workspaces`), et non le chemin interne du conteneur Gateway. Lorsque OpenClaw demande au démon Docker de créer un sandbox, le démon évalue les chemins par rapport à l'espace de noms de l'OS hôte, et non à l'espace de noms Gateway.
- **Parité du pont FS (carte de volume identique)** : Le processus natif OpenClaw Gateway écrit également les fichiers de pont et de rythme cardiaque dans le répertoire `workspace`. Comme le Gateway évalue la même chaîne exacte (le chemin hôte) depuis son propre environnement conteneurisé, le déploiement du Gateway DOIT inclure une carte de volume identique liant nativement l'espace de noms de l'hôte (`-v /home/user/.openclaw:/home/user/.openclaw`).

Si vous mappez les chemins en interne sans parité absolue avec l'hôte, OpenClaw génère nativement une erreur de permission `EACCES` en essayant d'écrire son rythme cardiaque dans l'environnement du conteneur, car la chaîne de chemin complet qualifié n'existe pas nativement.

</Warning>

### Backend SSH

Utilisez `backend: "ssh"` lorsque vous souhaitez que OpenClaw isole `exec`, les outils de fichiers et les lectures de médias sur une machine arbitraire accessible par SSH.

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
  <Accordion title="Fonctionnement">
    - OpenClaw crée une racine distante par portée sous `sandbox.ssh.workspaceRoot`.
    - Lors de la première utilisation après la création ou la recréation, OpenClaw initialise cet espace de travail distant à partir de l'espace de travail local une seule fois.
    - Ensuite, `exec`, `read`, `write`, `edit`, `apply_patch`, les lectures de médias de prompte et la mise en scène des médias entrants s'exécutent directement contre l'espace de travail distant via SSH.
    - OpenClaw ne synchronise pas automatiquement les modifications distantes vers l'espace de travail local.
  </Accordion>
  <Accordion title="Matériel d'authentification">
    - `identityFile`, `certificateFile`, `knownHostsFile` : utilise les fichiers locaux existants et les transmet via la configuration OpenSSH.
    - `identityData`, `certificateData`, `knownHostsData` : utilise des chaînes en ligne ou SecretRefs. OpenClaw les résout via l'instantané d'exécution des secrets normal, les écrit dans des fichiers temporaires avec `0600`, et les supprime à la fin de la session SSH.
    - Si `*File` et `*Data` sont définis pour le même élément, `*Data` l'emporte pour cette session SSH.
  </Accordion>
  <Accordion title="Conséquences distantes-canonical">
    Il s'agit d'un modèle **remote-canonical**. L'espace de travail SSH distant devient l'état réel du bac à sable après l'initialisation initiale.

    - Les modifications locales à l'hôte effectuées en dehors de OpenClaw après l'étape d'initialisation ne sont pas visibles à distance tant que vous n'avez pas recréé le bac à sable.
    - `openclaw sandbox recreate` supprime la racine distante par portée et réinitialise à partir du local à la prochaine utilisation.
    - Le sandboxing du navigateur n'est pas pris en charge sur le backend SSH.
    - Les paramètres `sandbox.docker.*` ne s'appliquent pas au backend SSH.

  </Accordion>
</AccordionGroup>

### Backend OpenShell

Utilisez `backend: "openshell"` lorsque vous voulez qu'OpenClaw isole les outils dans un environnement distant géré par OpenShell. Pour le guide de configuration complet, la référence de configuration et la comparaison des modes d'espace de travail, consultez la page [OpenShell dédiée](/fr/gateway/openshell).

OpenShell réutilise le même transport SSH central et le même pont de système de fichiers distant que le backend SSH générique, et ajoute un cycle de vie spécifique à OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) ainsi que le mode d'espace de travail optionnel `mirror`.

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

- `mirror` (par défaut) : l'espace de travail local reste canonique. OpenClaw synchronise les fichiers locaux vers OpenShell avant l'exécution et synchronise l'espace de travail distant après l'exécution.
- `remote` : l'espace de travail OpenShell est canonique après la création du bac à sable. OpenClaw ensemence l'espace de travail distant une fois à partir de l'espace de travail local, puis les outils de fichiers et l'exécution s'exécutent directement sur le bac à sable distant sans re-synchroniser les modifications.

<AccordionGroup>
  <Accordion title="Détails du transport distant">
    - OpenClaw demande à OpenShell une configuration SSH spécifique au bac à sable via `openshell sandbox ssh-config <name>`.
    - Core écrit cette configuration SSH dans un fichier temporaire, ouvre la session SSH et réutilise le même pont de système de fichiers distant que celui utilisé par `backend: "ssh"`.
    - En mode `mirror`, seul le cycle de vie diffère : synchronisation de local vers distant avant l'exécution, puis synchronisation inverse après l'exécution.
  </Accordion>
  <Accordion title="Limitations actuelles d'OpenShell">
    - le navigateur de bac à sable n'est pas encore pris en charge
    - `sandbox.docker.binds` n'est pas pris en charge sur le backend OpenShell
    - les paramètres d'exécution spécifiques à Docker sous `sandbox.docker.*` s'appliquent toujours uniquement au backend Docker
  </Accordion>
</AccordionGroup>

#### Modes d'espace de travail

OpenShell propose deux modèles d'espace de travail. C'est la partie la plus importante dans la pratique.

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
    - vous souhaitez que l'espace de travail de l'hôte reflète les écritures du bac à sable après chaque tour d'exécution

    Compromis : coût de synchronisation supplémentaire avant et après l'exécution.

  </Tab>
  <Tab title="remote (OpenShell canonical)">
    Utilisez `plugins.entries.openshell.config.mode: "remote"` lorsque vous souhaitez que **l'espace de travail OpenShell devienne canonique**.

    Comportement :

    - Lorsque le bac à sable est créé pour la première fois, OpenClaw amorce l'espace de travail distant à partir de l'espace de travail local une seule fois.
    - Après cela, `exec`, `read`, `write`, `edit` et `apply_patch` opèrent directement sur l'espace de travail distant OpenShell.
    - OpenClaw ne synchronise **pas** les modifications distantes vers l'espace de travail local après l'exécution.
    - Les lectures de média au moment de l'invite fonctionnent toujours car les outils de fichiers et de média lisent via le pont du bac à sable au lieu de supposer un chemin d'hôte local.
    - Le transport est SSH dans le bac à sable OpenShell renvoyé par `openshell sandbox ssh-config`.

    Conséquences importantes :

    - Si vous modifiez des fichiers sur l'hôte en dehors de OpenClaw après l'étape d'amorçage, le bac à sable distant ne verra **pas** ces modifications automatiquement.
    - Si le bac à sable est recréé, l'espace de travail distant est de nouveau amorcé à partir de l'espace de travail local.
    - Avec `scope: "agent"` ou `scope: "shared"`, cet espace de travail distant est partagé dans cette même portée.

    Utilisez ceci lorsque :

    - le bac à sable doit principalement résider du côté distant OpenShell
    - vous souhaitez un coût de synchronisation par tour plus faible
    - vous ne voulez pas que les modifications locales de l'hôte écrasent silencieusement l'état du bac à sable distant

  </Tab>
</Tabs>

Choisissez `mirror` si vous considérez le bac à sable comme un environnement d'exécution temporaire. Choisissez `remote` si vous considérez le bac à sable comme l'espace de travail réel.

#### Cycle de vie OpenShell

Les bacs à sable OpenShell sont toujours gérés via le cycle de vie normal du bac à sable :

- `openclaw sandbox list` affiche les runtimes OpenShell ainsi que les runtimes Docker
- `openclaw sandbox recreate` supprime le runtime actuel et permet à OpenClaw de le recréer à la prochaine utilisation
- La logique de nettoyage (prune) est également consciente du backend

Pour le mode `remote`, la recréation est particulièrement importante :

- recreate supprime l'espace de travail distant canonique pour cette portée
- la prochaine utilisation initialise un nouvel espace de travail distant à partir de l'espace de travail local

Pour le mode `mirror`, recreate réinitialise principalement l'environnement d'exécution distant car l'espace de travail local reste canonique de toute façon.

## Accès à l'espace de travail

`agents.defaults.sandbox.workspaceAccess` contrôle **ce que le bac à sable peut voir** :

<Tabs>
  <Tab title="none (par défaut)">Les outils voient un espace de travail bac à sable sous `~/.openclaw/sandboxes`.</Tab>
  <Tab title="ro">Monte l'espace de travail de l'agent en lecture seule à `/agent` (désactive `write`/`edit`/`apply_patch`).</Tab>
  <Tab title="rw">Monte l'espace de travail de l'agent en lecture/écriture à `/workspace`.</Tab>
</Tabs>

Avec le backend OpenShell :

- Le mode `mirror` utilise toujours l'espace de travail local comme source canonique entre les tours d'exécution
- Le mode `remote` utilise l'espace de travail distant OpenShell comme source canonique après l'initialisation initiale
- `workspaceAccess: "ro"` et `"none"` restreignent toujours le comportement en écriture de la même manière

Les médias entrants sont copiés dans l'espace de travail bac à sable actif (`media/inbound/*`).

<Note>**Note sur les Skills :** l'outil `read` est ancré dans le bac à sable (sandbox-rooted). Avec `workspaceAccess: "none"`, OpenClaw reflète les skills éligibles dans l'espace de travail du bac à sable (`.../skills`) afin qu'ils puissent être lus. Avec `"rw"`, les skills de l'espace de travail sont lisibles depuis `/workspace/skills`.</Note>

## Montages de liaison personnalisés (Custom bind mounts)

`agents.defaults.sandbox.docker.binds` monte des répertoires hôtes supplémentaires dans le conteneur. Format : `host:container:mode` (par exemple, `"/home/user/source:/source:rw"`).

Les liaisons globales et par agent sont **fusionnées** (et non remplacées). Sous `scope: "shared"`, les liaisons par agent sont ignorées.

`agents.defaults.sandbox.browser.binds` monte des répertoires hôtes supplémentaires uniquement dans le conteneur du **navigateur bac à sable**.

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
**Sécurité des liaisons**

- Les liaisons contournent le système de fichiers du bac à sable : elles exposent les chemins de l'hôte avec le mode que vous avez défini (`:ro` ou `:rw`).
- OpenClaw bloque les sources de liaison dangereuses (par exemple : `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, et les montages parents qui les exposeraient).
- OpenClaw bloque également les racines d'identifiants courantes du répertoire personnel telles que `~/.aws`, `~/.cargo`, `~/.config`, `~/.docker`, `~/.gnupg`, `~/.netrc`, `~/.npm`, et `~/.ssh`.
- La validation des liaisons n'est pas une simple correspondance de chaînes. OpenClaw normalise le chemin source, puis le résout à nouveau via l'ancêtre existant le plus profond avant de revérifier les chemins bloqués et les racines autorisées.
- Cela signifie que les échappements par lien symbolique parent échouent toujours même lorsque la feuille finale n'existe pas encore. Exemple : `/workspace/run-link/new-file` est toujours résolu comme `/var/run/...` si `run-link` pointe vers cet emplacement.
- Les racines sources autorisées sont mises en canonique de la même manière, donc un chemin qui ne semble être que dans la liste d'autorisation avant la résolution du lien symbolique est toujours rejeté comme `outside allowed roots`.
- Les montages sensibles (secrets, clés SSH, identifiants de service) doivent être `:ro` sauf si absolument nécessaire.
- Combinez avec `workspaceAccess: "ro"` si vous avez uniquement besoin d'un accès en lecture à l'espace de travail ; les modes de liaison restent indépendants.
- Voir [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) pour savoir comment les liaisons interagissent avec la stratégie d'outil et l'exécution élevée.
  </Warning>

## Images et configuration

Image Docker par défaut : `openclaw-sandbox:bookworm-slim`

<Steps>
  <Step title="Construire l'image par défaut">
    ```bash
    scripts/sandbox-setup.sh
    ```

    L'image par défaut n'inclut **pas** Node. Si une compétence a besoin de Node (ou d'autres environnements d'exécution), créez une image personnalisée ou installez via `sandbox.docker.setupCommand` (nécessite une sortie réseau + une racine inscriptible + utilisateur root).

  </Step>
  <Step title="Optionnel : construire l'image commune">
    Pour une image de bac à sable plus fonctionnelle avec des outils courants (par exemple `curl`, `jq`, `nodejs`, `python3`, `git`) :

    ```bash
    scripts/sandbox-common-setup.sh
    ```

    Définissez ensuite `agents.defaults.sandbox.docker.image` sur `openclaw-sandbox-common:bookworm-slim`.

  </Step>
  <Step title="Optionnel : construire l'image du navigateur de bac à sable">
    ```bash
    scripts/sandbox-browser-setup.sh
    ```
  </Step>
</Steps>

Par défaut, les conteneurs de bac à sable Docker s'exécutent **sans réseau**. Remplacez cette configuration par `agents.defaults.sandbox.docker.network`.

<AccordionGroup>
  <Accordion title="Sandbox browser Chromium defaults">
    L'image de navigateur sandbox groupée applique également des paramètres de démarrage Chromium prudents pour les charges de travail conteneurisées. Les paramètres de conteneur actuels incluent :

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
    - Les trois indicateurs de durcissement graphique (`--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu`) sont facultatifs et utiles lorsque les conteneurs ne prennent pas en charge le GPU. Définissez `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si votre charge de travail nécessite WebGL ou d'autres fonctionnalités 3D/navigateur.
    - `--disable-extensions` est activé par défaut et peut être désactivé avec `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` pour les flux dépendant des extensions.
    - `--renderer-process-limit=2` est contrôlé par `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, où `0` conserve les paramètres par défaut de Chromium.

    Si vous avez besoin d'un profil d'exécution différent, utilisez une image de navigateur personnalisée et fournissez votre propre point d'entrée. Pour les profils Chromium locaux (non conteneurisés), utilisez `browser.extraArgs` pour ajouter des indicateurs de démarrage supplémentaires.

  </Accordion>
  <Accordion title="Network security defaults">
    - `network: "host"` est bloqué.
    - `network: "container:<id>"` est bloqué par défaut (risque de contournement de la jointure d'espace de noms).
    - Remplacement en cas d'urgence : `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.
  </Accordion>
</AccordionGroup>

Les installations Docker et la passerelle conteneurisée se trouvent ici : [Docker](/fr/install/docker)

Pour les déploiements de passerelle Docker, `scripts/docker/setup.sh` peut amorcer la configuration du bac à sable (sandbox). Définissez `OPENCLAW_SANDBOX=1` (ou `true`/`yes`/`on`) pour activer ce chemin. Vous pouvez remplacer l'emplacement du socket avec `OPENCLAW_DOCKER_SOCKET`. Configuration complète et référence des variables d'environnement : [Docker](/fr/install/docker#agent-sandbox).

## setupCommand (configuration unique du conteneur)

`setupCommand` s'exécute **une seule fois** après la création du conteneur de bac à sable (pas à chaque exécution). Il s'exécute à l'intérieur du conteneur via `sh -lc`.

Chemins :

- Global : `agents.defaults.sandbox.docker.setupCommand`
- Par agent : `agents.list[].sandbox.docker.setupCommand`

<AccordionGroup>
  <Accordion title="Pièges courants">
    - Le `docker.network` par défaut est `"none"` (pas de trafic sortant), donc les installations de paquets échoueront.
    - `docker.network: "container:<id>"` nécessite `dangerouslyAllowContainerNamespaceJoin: true` et n'est qu'une solution de secours.
    - `readOnlyRoot: true` empêche les écritures ; définissez `readOnlyRoot: false` ou créez une image personnalisée.
    - `user` doit être root pour les installations de paquets (omettez `user` ou définissez `user: "0:0"`).
    - L'exécution dans le bac à sable n'hérite **pas** du `process.env` de l'hôte. Utilisez `agents.defaults.sandbox.docker.env` (ou une image personnalisée) pour les clés d'API de compétences.
  </Accordion>
</AccordionGroup>

## Stratégie d'outils et échappatoires

Les stratégies d'autorisation/refus d'outils s'appliquent toujours avant les règles du bac à sable. Si un outil est refusé globalement ou par agent, le bac à sable ne le rétablira pas.

`tools.elevated` est une échappatoire explicite qui exécute `exec` en dehors du bac à sable (`gateway` par défaut, ou `node` lorsque la cible d'exécution est `node`). Les directives `/exec` ne s'appliquent que pour les expéditeurs autorisés et persistent par session ; pour désactiver définitivement `exec`, utilisez le refus de stratégie d'outil (voir [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)).

Débogage :

- Utilisez `openclaw sandbox explain` pour inspecter le mode de sandbox effectif, la politique de tool et les clés de configuration fix-it.
- Voir [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) pour le modèle mental "pourquoi cela est-il bloqué ?".

Gardez-le verrouillé.

## Remplacements multi-agent

Chaque agent peut remplacer le sandbox + les tools : `agents.list[].sandbox` et `agents.list[].tools` (ainsi que `agents.list[].tools.sandbox.tools` pour la politique de tool du sandbox). Voir [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) pour la priorité.

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

- [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) — remplacements et priorité par agent
- [OpenShell](/fr/gateway/openshell) — configuration du backend de sandbox géré, modes de workspace et référence de configuration
- [Configuration du Sandbox](/fr/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) — débogage de "pourquoi cela est-il bloqué ?"
- [Sécurité](/fr/gateway/security)

---
summary: "Fonctionnement du sandboxing OpenClaw : modes, portées, accès à l'espace de travail et images"
title: Sandboxing
read_when: "Vous souhaitez une explication dédiée sur le sandboxing ou vous avez besoin de régler agents.defaults.sandbox."
status: active
---

# Sandboxing

OpenClaw peut exécuter des **outils dans des backends de sandbox** pour réduire le rayon d'impact.
Ceci est **optionnel** et contrôlé par la configuration (`agents.defaults.sandbox` ou
`agents.list[].sandbox`). Si le sandboxing est désactivé, les outils s'exécutent sur l'hôte.
Le Gateway reste sur l'hôte ; l'exécution des outils s'effectue dans un sandbox isolé
lorsqu'elle est activée.

Ce n'est pas une limite de sécurité parfaite, mais cela limite matériellement l'accès au système de fichiers
et aux processus lorsque le modèle fait une bêtise.

## Ce qui est sandboxé

- Exécution d'outils (`exec`, `read`, `write`, `edit`, `apply_patch`, `process`, etc.).
- Navigateur sandboxé optionnel (`agents.defaults.sandbox.browser`).
  - Par défaut, le navigateur sandboxé démarre automatiquement (assure que CDP est joignable) lorsque l'outil navigateur en a besoin.
    Configurez via `agents.defaults.sandbox.browser.autoStart` et `agents.defaults.sandbox.browser.autoStartTimeoutMs`.
  - Par défaut, les conteneurs du navigateur sandboxé utilisent un réseau Docker dédié (`openclaw-sandbox-browser`) au lieu du réseau global `bridge`.
    Configurez avec `agents.defaults.sandbox.browser.network`.
  - Optionnel, `agents.defaults.sandbox.browser.cdpSourceRange` restreint l'ingress CDP du bord du conteneur avec une liste d'autorisation CIDR (par exemple `172.21.0.1/32`).
  - L'accès observateur noVNC est protégé par mot de passe par défaut ; OpenClaw émet une URL de jeton à courte durée de vie qui sert une page d'amorçage locale et ouvre noVNC avec le mot de passe dans le fragment d'URL (pas dans les journaux de requête/en-tête).
  - `agents.defaults.sandbox.browser.allowHostControl` permet aux sessions sandboxées de cibler explicitement le navigateur de l'hôte.
  - Les listes d'autorisation optionnelles contrôlent `target: "custom"` : `allowedControlUrls`, `allowedControlHosts`, `allowedControlPorts`.

Non sandboxé :

- Le processus Gateway lui-même.
- Tout tool autorisé explicitement à s'exécuter en dehors du bac à sable (par ex. `tools.elevated`).
  - **L'exécution élevée contourne le sandboxing et utilise le chemin d'échappement configuré (`gateway` par défaut, ou `node` lorsque la cible de l'exécution est `node`).**
  - Si le sandboxing est désactivé, `tools.elevated` ne modifie pas l'exécution (déjà sur l'hôte). Voir [Mode élevé](/en/tools/elevated).

## Modes

`agents.defaults.sandbox.mode` contrôle **quand** le sandboxing est utilisé :

- `"off"` : pas de sandboxing.
- `"non-main"` : bac à sable uniquement pour les sessions **non principales** (par défaut si vous souhaitez des discussions normales sur l'hôte).
- `"all"` : chaque session s'exécute dans un bac à sable.
  Remarque : `"non-main"` est basé sur `session.mainKey` (par défaut `"main"`), et non sur l'id de l'agent.
  Les sessions de groupe/de canal utilisent leurs propres clés, elles comptent donc comme non principales et seront sandboxed.

## Portée

`agents.defaults.sandbox.scope` contrôle **combien de conteneurs** sont créés :

- `"agent"` (par défaut) : un conteneur par agent.
- `"session"` : un conteneur par session.
- `"shared"` : un conteneur partagé par toutes les sessions sandboxed.

## Backend

`agents.defaults.sandbox.backend` contrôle **quel runtime** fournit le bac à sable :

- `"docker"` (par défaut) : runtime de bac à sable local supporté par Docker.
- `"ssh"` : runtime de bac à sable distant supporté par SSH générique.
- `"openshell"` : runtime de bac à sable supporté par OpenShell.

La configuration spécifique à SSH se trouve sous `agents.defaults.sandbox.ssh`.
La configuration spécifique à OpenShell se trouve sous `plugins.entries.openshell.config`.

### Choisir un backend

|                                | Docker                                | SSH                                    | OpenShell                                                                     |
| ------------------------------ | ------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| **Où il s'exécute**            | Conteneur local                       | Tout hôte accessible par SSH           | Bac à sable géré par OpenShell                                                |
| **Configuration**              | `scripts/sandbox-setup.sh`            | Clé SSH + hôte cible                   | Plugin OpenShell activé                                                       |
| **Modèle d'espace de travail** | Bind-mount ou copie                   | Canonique distant (amorçage unique)    | `mirror` ou `remote`                                                          |
| **Contrôle réseau**            | `docker.network` (par défaut : aucun) | Dépend de l'hôte distant               | Dépend d'OpenShell                                                            |
| **Bac à sable du navigateur**  | Pris en charge                        | Non pris en charge                     | Pas encore pris en charge                                                     |
| **Bind mounts**                | `docker.binds`                        | N/A                                    | N/A                                                                           |
| **Idéal pour**                 | Dév local, isolement complet          | Déchargement vers une machine distante | Bacs à sable distants gérés avec synchronisation bidirectionnelle facultative |

### Backend SSH

Utilisez `backend: "ssh"` lorsque vous voulez qu'OpenClaw isole `exec`, les outils de fichiers et les lectures de médias sur
une machine arbitraire accessible par SSH.

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

Fonctionnement :

- OpenClaw crée une racine distante par portée sous `sandbox.ssh.workspaceRoot`.
- Lors de la première utilisation après la création ou la recréation, OpenClaw amorce cet espace de travail distant à partir de l'espace de travail local une seule fois.
- Après cela, `exec`, `read`, `write`, `edit`, `apply_patch`, les lectures de médias de prompt, et la mise en zone de transit des médias entrants s'exécutent directement contre l'espace de travail distant via SSH.
- OpenClaw ne synchronise pas automatiquement les modifications distantes vers l'espace de travail local.

Matériels d'authentification :

- `identityFile`, `certificateFile`, `knownHostsFile` : utiliser les fichiers locaux existants et les transmettre via la configuration OpenSSH.
- `identityData`, `certificateData`, `knownHostsData` : utiliser des chaînes en ligne ou SecretRefs. OpenClaw les résout via l'instantané d'exécution normal des secrets, les écrit dans des fichiers temporaires avec `0600`, et les supprime lorsque la session SSH se termine.
- Si les deux `*File` et `*Data` sont définis pour le même élément, `*Data` prime pour cette session SSH.

Il s'agit d'un modèle **remote-canonical**. L'espace de travail SSH distant devient l'état réel du sandbox après l'amorçage initial.

Conséquences importantes :

- Les modifications locales à l'hôte effectuées en dehors de OpenClaw après l'étape d'amorçage ne sont pas visibles à distance tant que vous n'avez pas recréé le sandbox.
- `openclaw sandbox recreate` supprime la racine distante par portée et réensemence à partir du local à la prochaine utilisation.
- Le sandboxing du navigateur n'est pas pris en charge sur le backend SSH.
- Les paramètres `sandbox.docker.*` ne s'appliquent pas au backend SSH.

### Backend OpenShell

Utilisez `backend: "openshell"` lorsque vous souhaitez qu'OpenClaw isole les outils dans un environnement distant géré par OpenShell. Pour le guide de configuration complet, la référence de configuration et la comparaison des modes d'espace de travail, consultez la [page OpenShell dédiée](/en/gateway/openshell).

OpenShell réutilise le même transport SSH principal et le même pont de système de fichiers distant que le backend SSH générique, et ajoute un cycle de vie spécifique à OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) ainsi que le mode d'espace de travail optionnel `mirror`.

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
- `remote` : l'espace de travail OpenShell est canonique après la création du bac à sable. OpenClaw ensemence l'espace de travail distant une fois à partir de l'espace de travail local, puis les outils de fichiers et l'exécution s'exécutent directement contre le bac à sable distant sans synchroniser les modifications en retour.

Détails du transport distant :

- OpenClaw demande à OpenShell une configuration SSH spécifique au bac à sable via `openshell sandbox ssh-config <name>`.
- Core écrit cette configuration SSH dans un fichier temporaire, ouvre la session SSH et réutilise le même pont de système de fichiers distant utilisé par `backend: "ssh"`.
- En mode `mirror`, seul le cycle de vie diffère : synchroniser le local vers le distant avant l'exécution, puis synchroniser le retour après l'exécution.

Limitations actuelles d'OpenShell :

- le navigateur sandbox n'est pas encore pris en charge
- `sandbox.docker.binds` n'est pas pris en charge sur le backend OpenShell
- Les paramètres d'exécution spécifiques à Docker sous `sandbox.docker.*` s'appliquent toujours uniquement au backend Docker

#### Modes d'espace de travail

OpenShell dispose de deux modèles d'espace de travail. C'est la partie qui compte le plus en pratique.

##### `mirror`

Utilisez `plugins.entries.openshell.config.mode: "mirror"` lorsque vous voulez que **l'espace de travail local reste canonique**.

Comportement :

- Avant `exec`, OpenClaw synchronise l'espace de travail local dans le bac à sable OpenShell.
- Après `exec`, OpenClaw synchronise l'espace de travail distant vers l'espace de travail local.
- Les outils de fichiers fonctionnent toujours via le pont du bac à sable, mais l'espace de travail local reste la source de vérité entre les tours.

Utilisez ceci quand :

- vous modifiez des fichiers localement en dehors de OpenClaw et vous voulez que ces modifications apparaissent automatiquement dans le bac à sable
- vous voulez que le bac à sable OpenShell se comporte autant que possible comme le backend Docker
- vous voulez que l'espace de travail de l'hôte reflète les écritures du bac à sable après chaque tour d'exécution

Compromis :

- coût de synchronisation supplémentaire avant et après l'exécution

##### `remote`

Utilisez `plugins.entries.openshell.config.mode: "remote"` lorsque vous voulez que **l'espace de travail OpenShell devienne canonique**.

Comportement :

- Lorsque le bac à sable est créé pour la première fois, OpenClaw peuple l'espace de travail distant à partir de l'espace de travail local une seule fois.
- Après cela, `exec`, `read`, `write`, `edit` et `apply_patch` opèrent directement sur l'espace de travail distant OpenShell.
- OpenClaw ne synchronise **pas** les modifications distantes dans l'espace de travail local après l'exécution.
- Les lectures de médias au moment de l'invite fonctionnent toujours car les outils de fichiers et de médias lisent via le pont du bac à sable au lieu de supposer un chemin d'hôte local.
- Le transport est SSH dans le bac à sable OpenShell renvoyé par `openshell sandbox ssh-config`.

Conséquences importantes :

- Si vous modifiez des fichiers sur l'hôte en dehors de OpenClaw après l'étape d'initialisation, le bac à sable distant ne verra **pas** automatiquement ces modifications.
- Si le bac à sable est recréé, l'espace de travail distant est à nouveau peuplé à partir de l'espace de travail local.
- Avec `scope: "agent"` ou `scope: "shared"`, cet espace de travail distant est partagé à cette même portée.

Utilisez ceci quand :

- le bac à sable doit résider principalement du côté distant OpenShell
- vous souhaitez une charge de synchronisation par tour moins élevée
- vous ne voulez pas que les modifications locales écrasent silencieusement l'état du bac à sable distant

Choisissez `mirror` si vous considérez le bac à sable comme un environnement d'exécution temporaire.
Choisissez `remote` si vous considérez le bac à sable comme l'espace de travail réel.

#### Cycle de vie d'OpenShell

Les bacs à sable OpenShell sont toujours gérés via le cycle de vie normal des bacs à sable :

- `openclaw sandbox list` affiche les runtimes OpenShell ainsi que les runtimes Docker
- `openclaw sandbox recreate` supprime le runtime actuel et permet à OpenClaw de le recréer à la prochaine utilisation
- la logique de nettoyage (prune) est également consciente du backend

Pour le mode `remote`, la recréation est particulièrement importante :

- recréer supprime l'espace de travail distant canonique pour cette portée
- la prochaine utilisation initialise un nouvel espace de travail distant à partir de l'espace de travail local

Pour le mode `mirror`, la recréation réinitialise principalement l'environnement d'exécution distant
car l'espace de travail local reste de toute façon canonique.

## Accès à l'espace de travail

`agents.defaults.sandbox.workspaceAccess` contrôle **ce que le bac à sable peut voir** :

- `"none"` (par défaut) : les outils voient un espace de travail de bac à sable sous `~/.openclaw/sandboxes`.
- `"ro"` : monte l'espace de travail de l'agent en lecture seule à `/agent` (désactive `write`/`edit`/`apply_patch`).
- `"rw"` : monte l'espace de travail de l'agent en lecture/écriture à `/workspace`.

Avec le backend OpenShell :

- Le mode `mirror` utilise toujours l'espace de travail local comme source canonique entre les tours d'exécution
- Le mode `remote` utilise l'espace de travail distant OpenShell comme source canonique après l'amorçage initial
- `workspaceAccess: "ro"` et `"none"` restreignent toujours le comportement en écriture de la même manière

Les médias entrants sont copiés dans l'espace de travail du bac à sable actif (`media/inbound/*`).
Note pour les compétences : l'outil `read` est ancré dans le bac à sable. Avec `workspaceAccess: "none"`,
OpenClaw met en miroir les compétences éligibles dans l'espace de travail du bac à sable (`.../skills`) afin qu'elles
puissent être lues. Avec `"rw"`, les compétences de l'espace de travail sont lisibles depuis
`/workspace/skills`.

## Montages de liaison personnalisés

`agents.defaults.sandbox.docker.binds` monte des répertoires hôtes supplémentaires dans le conteneur.
Format : `host:container:mode` (par exemple, `"/home/user/source:/source:rw"`).

Les montages globaux et par agent sont **fusionnés** (et non remplacés). Sous `scope: "shared"`, les montages par agent sont ignorés.

`agents.defaults.sandbox.browser.binds` monte des répertoires hôtes supplémentaires uniquement dans le conteneur du **navigateur de bac à sable**.

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

Notes de sécurité :

- Les montages (binds) contournent le système de fichiers du bac à sable : ils exposent les chemins de l'hôte avec le mode que vous avez défini (`:ro` ou `:rw`).
- OpenClaw bloque les sources de montage dangereuses (par exemple : `docker.sock`, `/etc`, `/proc`, `/sys`, `/dev`, et les montages parents qui les exposeraient).
- OpenClaw bloque également les racines d'informations d'identification courantes du répertoire personnel telles que `~/.aws`, `~/.cargo`, `~/.config`, `~/.docker`, `~/.gnupg`, `~/.netrc`, `~/.npm` et `~/.ssh`.
- La validation de liaison n'est pas une simple correspondance de chaînes. OpenClaw normalise le chemin source, puis le résout à nouveau via l'ancêtre existant le plus profond avant de revérifier les chemins bloqués et les racines autorisées.
- Cela signifie que les échappements par parents de liens symboliques échouent toujours même lorsque la feuille finale n'existe pas encore. Exemple : `/workspace/run-link/new-file` se résout toujours comme `/var/run/...` si `run-link` pointe vers cet emplacement.
- Les racines sources autorisées sont canonifiées de la même manière, donc un chemin qui ne semble être qu'à l'intérieur de la liste d'autorisation avant la résolution des liens symboliques est tout de même rejeté comme `outside allowed roots`.
- Les montages sensibles (secrets, clés SSH, informations d'identification de service) doivent être `:ro` sauf en cas de nécessité absolue.
- Combinez avec `workspaceAccess: "ro"` si vous avez uniquement besoin d'un accès en lecture à l'espace de travail ; les modes de liaison restent indépendants.
- Consultez [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) pour savoir comment les liaisons interagissent avec la stratégie d'outil et l'exécution élevée.

## Images + configuration

Image Docker par défaut : `openclaw-sandbox:bookworm-slim`

Construisez-la une fois :

```bash
scripts/sandbox-setup.sh
```

Remarque : l'image par défaut n'inclut **pas** Node. Si une compétence a besoin de Node (ou d'autres environnements d'exécution), préparez une image personnalisée ou installez via `sandbox.docker.setupCommand` (nécessite un accès réseau sortant + une racine accessible en écriture + un utilisateur root).

Si vous souhaitez une image de sandbox plus fonctionnelle avec des outils courants (par exemple `curl`, `jq`, `nodejs`, `python3`, `git`), construisez :

```bash
scripts/sandbox-common-setup.sh
```

Ensuite, définissez `agents.defaults.sandbox.docker.image` sur `openclaw-sandbox-common:bookworm-slim`.

Image de navigateur isolée :

```bash
scripts/sandbox-browser-setup.sh
```

Par défaut, les conteneurs de sandbox Docker s'exécutent **sans réseau**.
Remplacez avec `agents.defaults.sandbox.docker.network`.

L'image de navigateur de bac à sable (sandbox) groupée applique également des paramètres de démarrage Chromium prudents pour les charges de travail conteneurisées. Les paramètres de conteneur actuels incluent :

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
- `--no-sandbox` et `--disable-setuid-sandbox` lorsque `noSandbox` est activé.
- Les trois indicateurs de durcissement graphique (`--disable-3d-apis`,
  `--disable-software-rasterizer`, `--disable-gpu`) sont facultatifs et utiles
  lorsque les conteneurs ne prennent pas en charge le GPU. Définissez `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`
  si votre charge de travail nécessite WebGL ou d'autres fonctionnalités 3D/navigateur.
- `--disable-extensions` est activé par défaut et peut être désactivé avec
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` pour les flux dépendant des extensions.
- `--renderer-process-limit=2` est contrôlé par
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`, où `0` conserve la valeur par défaut de Chromium.

Si vous avez besoin d'un profil d'exécution différent, utilisez une image de navigateur personnalisée et fournissez
votre propre point d'entrée. Pour les profils Chromium locaux (non conteneurisés), utilisez
`browser.extraArgs` pour ajouter des indicateurs de démarrage supplémentaires.

Paramètres de sécurité par défaut :

- `network: "host"` est bloqué.
- `network: "container:<id>"` est bloqué par défaut (risque de contournement de la jonction d'espace de noms).
- Contournement de secours (break-glass) : `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.

Les installations Docker et la passerelle conteneurisée se trouvent ici :
[Docker](/en/install/docker)

Pour les déploiements de passerelle Docker, `scripts/docker/setup.sh` peut amorcer la configuration du bac à sable.
Définissez `OPENCLAW_SANDBOX=1` (ou `true`/`yes`/`on`) pour activer ce chemin. Vous pouvez
remplacer l'emplacement du socket avec `OPENCLAW_DOCKER_SOCKET`. Configuration complète et référence des variables d'environnement
: [Docker](/en/install/docker#agent-sandbox).

## setupCommand (configuration unique du conteneur)

`setupCommand` s'exécute **une seule fois** après la création du conteneur de bac à sable (pas à chaque exécution).
Il est exécuté à l'intérieur du conteneur via `sh -lc`.

Chemins :

- Global : `agents.defaults.sandbox.docker.setupCommand`
- Par agent : `agents.list[].sandbox.docker.setupCommand`

Pièges courants :

- Le `docker.network` par défaut est `"none"` (pas de trafic sortant), donc l'installation des packages échouera.
- `docker.network: "container:<id>"` nécessite `dangerouslyAllowContainerNamespaceJoin: true` et ne doit être utilisé qu'en cas de bris de glace.
- `readOnlyRoot: true` empêche les écritures ; définissez `readOnlyRoot: false` ou créez une image personnalisée.
- `user` doit être root pour l'installation des packages (omettez `user` ou définissez `user: "0:0"`).
- L'exécution dans le bac à sable n'hérite **pas** du `process.env` de l'hôte. Utilisez
  `agents.defaults.sandbox.docker.env` (ou une image personnalisée) pour les clés d'API des compétences.

## Stratégie d'outil + échappatoires

Les stratégies d'autorisation/refus d'outils s'appliquent toujours avant les règles du bac à sable. Si un outil est refusé
globalement ou par agent, le bac à sable ne le rétablira pas.

`tools.elevated` est une échappatoire explicite qui exécute `exec` en dehors du bac à sable (`gateway` par défaut, ou `node` lorsque la cible d'exécution est `node`).
Les directives `/exec` ne s'appliquent que pour les expéditeurs autorisés et persistent par session ; pour désactiver définitivement
`exec`, utilisez le refus de stratégie d'outil (voir [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)).

Débogage :

- Utilisez `openclaw sandbox explain` pour inspecter le mode effectif du bac à sable, la stratégie d'outil et les clés de configuration de réparation.
- Voir [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) pour le modèle mental « pourquoi est-ce bloqué ? ».
  Gardez-le verrouillé.

## Remplacements multi-agents

Chaque agent peut remplacer le sandbox + les outils :
`agents.list[].sandbox` et `agents.list[].tools` (plus `agents.list[].tools.sandbox.tools` pour la stratégie d'outil de sandbox).
Voir [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) pour la priorité.

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

## Documentation connexe

- [OpenShell](/en/gateway/openshell) -- configuration du backend de sandbox géré, modes de workspace et référence de configuration
- [Configuration du Sandbox](/en/gateway/configuration-reference#agentsdefaultssandbox)
- [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) -- débogage de « pourquoi est-ce bloqué ? »
- [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) -- remplacements par agent et priorité
- [Sécurité](/en/gateway/security)
